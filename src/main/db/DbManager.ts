import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DbManager {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new BetterSqlite3(dbPath);
    this.init();
  }

  private init() {
    // 开启外键支持
    this.db.pragma('foreign_keys = ON');
    
    // 执行 Migration (简单实现)
    this.migrate();
  }

  private migrate() {
    // 建立学生表 - 仅保留姓名
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        extra_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 建立系统设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // 初始设置
    const setSetting = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    setSetting.run('ws_server', 'ws://localhost:8080');
    setSetting.run('sync_mode', 'local'); // local | remote
    setSetting.run('is_wizard_completed', '0'); // 0: 未完成, 1: 已完成

    // 建立积分理由分类/预设表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL UNIQUE,
        category TEXT DEFAULT '其他',
        delta INTEGER NOT NULL,
        is_system INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_state INTEGER DEFAULT 0
      )
    `);

    // 初始数据种子
    const reasonCount = this.db.prepare('SELECT count(*) as count FROM reasons').get() as { count: number };
    if (reasonCount.count === 0) {
      const insert = this.db.prepare('INSERT INTO reasons (content, category, delta, is_system) VALUES (?, ?, ?, ?)');
      insert.run('课堂表现优秀', '学习', 2, 1);
      insert.run('作业未交', '学习', -2, 1);
      insert.run('帮助同学', '品德', 5, 1);
      insert.run('打架斗殴', '纪律', -10, 1);
    }

    // 建立积分事件流水表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS score_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        student_name TEXT NOT NULL,
        reason_content TEXT,
        delta INTEGER NOT NULL,
        val_prev INTEGER NOT NULL,
        val_curr INTEGER NOT NULL,
        event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_state INTEGER DEFAULT 0, -- 0: 待同步, 1: 已同步
        remote_id TEXT
      )
    `);

    // 插入一些初始 Reasons (如果为空)
    const count = this.db.prepare('SELECT COUNT(*) as count FROM reasons').get() as { count: number };
    if (count.count === 0) {
      const insert = this.db.prepare('INSERT INTO reasons (content, category, delta, is_system) VALUES (?, ?, ?, ?)');
      insert.run('作业优秀', '学习', 2, 1);
      insert.run('课堂积极', '学习', 1, 1);
      insert.run('打架斗殴', '纪律', -5, 1);
      insert.run('迟到', '纪律', -1, 1);
    }
  }

  public getDb(): BetterSqlite3.Database {
    return this.db;
  }
}
