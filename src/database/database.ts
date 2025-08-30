import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Task } from '../shared/types';

class DatabaseService {
  private db: Database.Database;
  private dbPath: string;
  private isClosing: boolean = false;

  constructor() {
    // データベースファイルの保存場所
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'taskflow.db');
    
    console.log('Database path:', this.dbPath);
    
    // データベース接続
    this.db = new Database(this.dbPath, {
      verbose: console.log // デバッグ用
    });
    
    // 初期化
    this.initialize();
  }

  private initialize() {
    // テーブル作成
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed')),
        estimated_hours REAL,
        actual_hours REAL,
        assignee TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        depends_on_task_id TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id)
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, tag)
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        google_event_id TEXT UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        synced_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      -- インデックス作成（project_id関連はマイグレーション後に作成）
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_task ON calendar_events(task_id);
    `);

    // 既存DBに project_id 列が無い場合に追加し、既存行を 'default' で埋める
    const columns = this.db.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
    const hasProjectId = columns.some(c => c.name === 'project_id');
    if (!hasProjectId) {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN project_id TEXT`);
      this.db.exec(`UPDATE tasks SET project_id = 'default' WHERE project_id IS NULL`);
    }

    // project_id インデックスは列の存在が保証された後に作成
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);`);

    // タイトル正規化用の補助列（空白・句読点除去 + 小文字化）
    const columns2 = this.db.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
    const hasNormTitle = columns2.some(c => c.name === 'title_norm');
    if (!hasNormTitle) {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN title_norm TEXT`);
      this.db.exec(`UPDATE tasks SET title_norm = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', ''), '　', ''), '、', ''), '。', ''))`);
    }

    // 重複防止用ユニークインデックス（プロジェクト/正規化タイトル/担当/開始/終了）
    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_task_nodup ON tasks(
        project_id, COALESCE(title_norm, ''), COALESCE(assignee, ''), start_date, end_date
      );`);
    } catch (e) {
      // 既存データに重複がある場合は一意制約作成で失敗するため、重複を除去してから再試行
      console.warn('Creating unique index failed, attempting to cleanup duplicates...', e)
      // まず title_norm を最新に更新
      this.db.exec(`UPDATE tasks SET title_norm = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', ''), '　', ''), '、', ''), '。', '')) WHERE title_norm IS NULL OR title_norm = ''`)
      // 重複行を削除（同キーで最小rowidのみ残す）
      this.db.exec(`DELETE FROM tasks WHERE rowid NOT IN (
        SELECT MIN(rowid) FROM tasks GROUP BY project_id, COALESCE(title_norm, ''), COALESCE(assignee, ''), start_date, end_date
      )`)
      try {
        this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_task_nodup ON tasks(
          project_id, COALESCE(title_norm, ''), COALESCE(assignee, ''), start_date, end_date
        );`);
      } catch (e2) {
        console.warn('Failed to create unique index after cleanup. Proceeding without unique constraint.', e2)
        // フォールバックとして通常インデックスのみ作成
        try {
          this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_nodup ON tasks(
            project_id, COALESCE(title_norm, ''), COALESCE(assignee, ''), start_date, end_date
          );`)
        } catch {}
      }
    }

    console.log('Database initialized successfully');
  }

  // Conversation methods
  createConversation(id: string) {
    const stmt = this.db.prepare('INSERT INTO conversations (id) VALUES (?)');
    return stmt.run(id);
  }

  // Message methods
  addMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(id, conversationId, role, content);
  }

  getConversationMessages(conversationId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
    );
    return stmt.all(conversationId);
  }

  // Task methods
  createTask(task: Partial<Task>) {
    // タイトル正規化（DBのtitle_normと同一ロジック: 小文字化 + 空白/句読点除去）
    const normalizeTitle = (s: string | undefined): string => {
      const src = (s || '').toLowerCase()
      return src
        .replace(/[\s\u3000]/g, '')
        .replace(/[、，。．・,\.\-_/\\()\[\]{}【】]/g, '')
    }

    // 既存重複の事前チェック（プロジェクト/正規化タイトル/担当者/開始/終了）
    const projectId = (task as any).projectId || 'default';
    const title = task.title || '';
    const assignee = task.assignee || null;
    const startDate = task.startDate as string;
    const endDate = task.endDate as string;
    const titleNorm = normalizeTitle(title);

    const existingStmt = this.db.prepare(`
      SELECT id FROM tasks 
      WHERE project_id = ? 
        AND COALESCE(title_norm, '') = ?
        AND COALESCE(assignee, '') = COALESCE(?, '')
        AND start_date = ?
        AND end_date = ?
      LIMIT 1
    `);
    const existing = existingStmt.get(projectId, titleNorm, assignee, startDate, endDate) as { id: string } | undefined;
    if (existing) {
      // 既に存在する場合は、承認起因の変更（例: ステータス遷移）を反映してIDを返す
      try {
        if (task.status) {
          const upd = this.db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
          upd.run(task.status, existing.id);
        }
      } catch (e) {
        // 更新に失敗しても挿入スキップは維持（ログのみ）
        console.warn('Duplicate task found; failed to update existing row status.', e);
      }
      return { ...task, id: existing.id };
    }

    const id = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, project_id, title, title_norm, description, start_date, end_date, 
        progress, priority, status, estimated_hours, assignee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      projectId,
      title,
      titleNorm,
      task.description || null,
      startDate,
      endDate,
      task.progress || 0,
      task.priority || 'medium',
      task.status || 'pending',
      task.estimatedHours || null,
      assignee
    );

    // タグを追加
    if (task.tags && task.tags.length > 0) {
      const tagStmt = this.db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)');
      for (const tag of task.tags) {
        tagStmt.run(id, tag);
      }
    }

    // 依存関係を追加
    if (task.dependencies && task.dependencies.length > 0) {
      const depStmt = this.db.prepare(
        'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)'
      );
      for (const depId of task.dependencies) {
        depStmt.run(id, depId);
      }
    }

    return { ...task, id };
  }

  updateTask(id: string, updates: Partial<Task>) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'description', 'start_date', 'end_date', 'project_id',
      'progress', 'priority', 'status', 'estimated_hours', 'actual_hours', 'assignee'
    ];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    return stmt.run(...values);
  }

  deleteTask(id: string) {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    return stmt.run(id);
  }

  getTasks(filter?: { status?: string; priority?: string; projectId?: string }) {
    let query = 'SELECT * FROM tasks';
    const conditions = [];
    const values = [];
    
    if (filter?.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }
    
    if (filter?.priority) {
      conditions.push('priority = ?');
      values.push(filter.priority);
    }

    if (filter?.projectId) {
      conditions.push('project_id = ?');
      values.push(filter.projectId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY start_date ASC';
    
    const stmt = this.db.prepare(query);
    const tasks = stmt.all(...values) as any[];
    
    // タグと依存関係を取得
    for (const task of tasks) {
      const tagStmt = this.db.prepare('SELECT tag FROM task_tags WHERE task_id = ?');
      task.tags = tagStmt.all(task.id).map((row: any) => row.tag);
      
      const depStmt = this.db.prepare(
        'SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?'
      );
      task.dependencies = depStmt.all(task.id).map((row: any) => row.depends_on_task_id);
    }
    
    return tasks;
  }

  getTask(id: string) {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const task = stmt.get(id) as any;
    
    if (task) {
      const tagStmt = this.db.prepare('SELECT tag FROM task_tags WHERE task_id = ?');
      task.tags = tagStmt.all(id).map((row: any) => row.tag);
      
      const depStmt = this.db.prepare(
        'SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?'
      );
      task.dependencies = depStmt.all(id).map((row: any) => row.depends_on_task_id);
    }
    
    return task;
  }

  // Calendar event methods
  createCalendarEvent(event: any) {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO calendar_events (
        id, task_id, google_event_id, title, description, start_time, end_time, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      id,
      event.taskId || null,
      event.googleEventId || null,
      event.title,
      event.description || null,
      event.startTime,
      event.endTime,
      event.syncedAt || null
    );
  }

  updateCalendarSync(googleEventId: string, syncedAt: Date) {
    const stmt = this.db.prepare(
      'UPDATE calendar_events SET synced_at = ? WHERE google_event_id = ?'
    );
    return stmt.run(syncedAt.toISOString(), googleEventId);
  }

  // Backup method
  backup(backupPath: string) {
    return this.db.backup(backupPath);
  }

  // Clean up database connection properly
  close() {
    if (this.isClosing) {
      return;
    }
    
    this.isClosing = true;
    
    try {
      if (this.db) {
        // WALモードのチェックポイントを実行
        this.db.pragma('wal_checkpoint(TRUNCATE)');
        // データベース接続を閉じる
        this.db.close();
        console.log('Database connection closed successfully');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  // Ensure database is closed on process exit
  ensureCleanup() {
    process.on('exit', () => this.close());
    process.on('SIGINT', () => {
      this.close();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.close();
      process.exit(0);
    });
  }
}

export default DatabaseService;
