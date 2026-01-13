import { Database } from 'better-sqlite3';

export interface Student {
  id: number;
  name: string;
  score: number;
  extra_json?: string;
}

export class StudentRepository {
  constructor(private db: Database) {}

  findAll() {
    return this.db.prepare('SELECT * FROM students ORDER BY score DESC, name ASC').all() as Student[];
  }

  create(student: { name: string }) {
    const info = this.db.prepare(
      'INSERT INTO students (name) VALUES (?)'
    ).run(student.name);
    return info.lastInsertRowid as number;
  }

  update(id: number, student: Partial<Student>) {
    const sets: string[] = [];
    const vals: any[] = [];
    Object.entries(student).forEach(([key, val]) => {
      if (key !== 'id') {
        sets.push(`${key} = ?`);
        vals.push(val);
      }
    });
    vals.push(id);
    this.db.prepare(`UPDATE students SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...vals);
  }

  delete(id: number) {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM score_events WHERE student_id = ?').run(id);
      this.db.prepare('DELETE FROM students WHERE id = ?').run(id);
    })();
  }
}
