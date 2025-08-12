# TaskFlow AI - 共通パターン集

## 開発コマンド

### 初期セットアップ
```bash
# プロジェクト初期化
npm init -y
npm install electron electron-builder --save-dev
npm install react react-dom @types/react @types/react-dom
npm install typescript @types/node
npm install vibelogger

# Electron開発環境
npm install --save-dev @electron-forge/cli
npx electron-forge import
```

### 日常的な開発コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test
npm run test:watch  # ウォッチモード

# コード品質チェック
npm run lint
npm run typecheck
npm run format

# Electronアプリ起動
npm run electron:dev  # 開発モード
npm run electron:build  # ビルド版
```

### Git操作
```bash
# 機能ブランチ作成
git checkout -b feature/task-name

# コミット前の確認
npm run lint && npm run typecheck && npm test

# セマンティックコミット
git commit -m "feat: AI対話機能の実装"
git commit -m "fix: タスク依存関係のバグ修正"
git commit -m "docs: README更新"
```

## コードテンプレート

### React コンポーネント
```typescript
import React, { useState, useEffect } from 'react';
import { vibelogger } from 'vibelogger';

interface ComponentProps {
  // Props定義
}

export const ComponentName: React.FC<ComponentProps> = (props) => {
  const logger = vibelogger.createLogger('ComponentName');
  
  useEffect(() => {
    logger.info('Component mounted');
    return () => {
      logger.info('Component unmounted');
    };
  }, []);

  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### AI API呼び出しパターン
```typescript
async function callAI(prompt: string): Promise<string> {
  const logger = vibelogger.createLogger('AI-Service');
  
  try {
    logger.info('AI call started', { prompt });
    
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    logger.info('AI call successful');
    return data.result;
    
  } catch (error) {
    logger.error('AI call failed', error);
    throw error;
  }
}
```

### SQLiteクエリパターン
```typescript
import Database from 'better-sqlite3';

class TaskRepository {
  private db: Database.Database;
  
  constructor() {
    this.db = new Database('taskflow.db');
    this.initialize();
  }
  
  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  create(task: TaskInput): Task {
    const stmt = this.db.prepare(
      'INSERT INTO tasks (title, description, due_date) VALUES (?, ?, ?)'
    );
    const result = stmt.run(task.title, task.description, task.dueDate);
    return { id: result.lastInsertRowid, ...task };
  }
}
```

## デバッグパターン

### Electron メインプロセスデバッグ
```bash
# VSCodeでのデバッグ設定
{
  "type": "node",
  "request": "launch",
  "name": "Electron Main",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "args": [".", "--inspect=5858"],
  "protocol": "inspector"
}
```

### React DevTools
```bash
# Electron内でReact DevToolsを使用
npm install --save-dev electron-devtools-installer
```

## テストパターン

### ユニットテスト
```typescript
import { describe, it, expect } from '@jest/globals';
import { taskParser } from './taskParser';

describe('TaskParser', () => {
  it('should parse simple task', () => {
    const input = 'ブログ記事を書く';
    const result = taskParser.parse(input);
    expect(result.title).toBe('ブログ記事を書く');
  });
});
```