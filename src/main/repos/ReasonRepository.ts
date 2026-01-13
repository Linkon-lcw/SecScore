import { Database } from 'better-sqlite3';

export interface Reason {
  id: number;
  content: string;
  category: string;
  delta: number;
  is_system: number;
  sync_state: number;
}

export class ReasonRepository {
  constructor(private db: Database) {}

  findAll() {
    return this.db.prepare('SELECT * FROM reasons ORDER BY category ASC, content ASC').all() as Reason[];
  }

  create(reason: Omit<Reason, 'id' | 'sync_state' | 'is_system'>) {
    const info = this.db.prepare(
      'INSERT INTO reasons (content, category, delta, is_system) VALUES (?, ?, ?, 0)'
    ).run(reason.content, reason.category, reason.delta);
    return info.lastInsertRowid as number;
  }

  update(id: number, reason: Partial<Reason>) {
    const sets: string[] = [];
    const vals: any[] = [];
    Object.entries(reason).forEach(([key, val]) => {
      if (key !== 'id') {
        sets.push(`${key} = ?`);
        vals.push(val);
      }
    });
    vals.push(id);
    this.db.prepare(`UPDATE reasons SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...vals);
  }

  delete(id: number) {
    this.db.prepare('DELETE FROM reasons WHERE id = ? AND is_system = 0').run(id);
  }
}
