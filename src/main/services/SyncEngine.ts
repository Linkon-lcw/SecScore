import { WsClient } from './WsClient';
import { DbManager } from '../db/DbManager';
import { StudentRepository } from '../repos/StudentRepository';
import { EventRepository } from '../repos/EventRepository';
import { ReasonRepository } from '../repos/ReasonRepository';

export class SyncEngine {
  private wsClient: WsClient;
  private db: DbManager;
  private _studentRepo: StudentRepository;
  private _eventRepo: EventRepository;
  private _reasonRepo: ReasonRepository;
  private isSyncing: boolean = false;

  constructor(wsClient: WsClient, db: DbManager) {
    this.wsClient = wsClient;
    this.db = db;
    this._studentRepo = new StudentRepository(db.getDb());
    this._eventRepo = new EventRepository(db.getDb());
    this._reasonRepo = new ReasonRepository(db.getDb());

    this.init();
  }

  private init() {
    // 监听 WS 事件
    this.wsClient.on('connected', () => {
      this.syncAll();
    });

    this.wsClient.on('event', (msg) => {
      this.handleRemoteEvent(msg);
    });

    this.wsClient.on('reason_sync', (msg) => {
      this.handleReasonSync(msg);
    });
  }

  // 启动同步任务（处理 Outbox）
  async startOutboxSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. 获取未同步的事件
      const unsyncedEvents = this.db.getDb().prepare(
        'SELECT * FROM score_events WHERE sync_state = 0 ORDER BY id ASC'
      ).all() as any[];

      for (const event of unsyncedEvents) {
        if (!this.wsClient.isConnected()) break;

        try {
          await this.wsClient.send({
            type: 'score_event',
            data: {
              uuid: event.uuid,
              student_name: event.student_name,
              reason_content: event.reason_content,
              delta: event.delta,
              event_time: event.event_time
            }
          });

          // 标记为已同步
          this.db.getDb().prepare(
            'UPDATE score_events SET sync_state = 1 WHERE id = ?'
          ).run(event.id);
        } catch (e) {
          console.error(`[Sync] Failed to sync event ${event.uuid}`, e);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // 触发全量同步
  async triggerFullSync() {
    await this.syncAll();
  }

  // 全量对齐
  private async syncAll() {
    if (!this.wsClient.isConnected()) return;

    console.log('[Sync] Starting full sync...');
    try {
      // 1. 同步理由
      const resReasons = await this.wsClient.send({ type: 'query_reasons' });
      if (resReasons.data) {
        this.handleReasonSync(resReasons);
      }

      // 2. 同步学生分值 (Local-first: 本地值为准，除非服务器有更正)
      const _resStudents = await this.wsClient.send({ type: 'query_students' });
      // TODO: 实现更复杂的对齐逻辑

      // 3. 处理 Outbox
      await this.startOutboxSync();
      
      console.log('[Sync] Full sync completed');
    } catch (e) {
      console.error('[Sync] Full sync failed', e);
    }
  }

  private handleRemoteEvent(msg: any) {
    // 远程推送的事件，通常是其他客户端的操作
    // 本地需要根据此事件更新分值，但不要再产生新的同步事件（避免循环）
    const { data } = msg;
    if (!data) return;

    this.db.getDb().transaction(() => {
      // 更新学生分值
      this.db.getDb().prepare(
        'UPDATE students SET score = score + ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?'
      ).run(data.delta, data.student_name);

      // 记录事件（标记为已同步，防止回环）
      this.db.getDb().prepare(`
        INSERT INTO score_events (uuid, student_name, reason_content, delta, val_prev, val_curr, event_time, sync_state)
        SELECT ?, ?, ?, ?, score - ?, score, ?, 1 FROM students WHERE name = ?
      `).run(data.uuid, data.student_name, data.reason_content, data.delta, data.delta, data.event_time || new Date().toISOString(), data.student_name);
    })();
  }

  private handleReasonSync(msg: any) {
    const reasons = msg.data;
    if (!Array.isArray(reasons)) return;

    this.db.getDb().transaction(() => {
      for (const r of reasons) {
        // 如果是系统理由，且 category 匹配，则归入 __config__ 组 (按照协议要求)
        const category = r.is_system ? '__config__' : r.category;
        
        this.db.getDb().prepare(`
          INSERT INTO reasons (content, category, delta, is_system)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(content) DO UPDATE SET
            category = excluded.category,
            delta = excluded.delta
        `).run(r.content, category, r.delta, r.is_system ? 1 : 0);
      }
    })();
  }
}
