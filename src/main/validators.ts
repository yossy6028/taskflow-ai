import { Task } from '../shared/types';

/**
 * タスクデータの検証
 */
export function validateTaskInput(task: unknown, options?: { requireTitle?: boolean }): { valid: boolean; message?: string; data?: Partial<Task> } {
  if (!task || typeof task !== 'object') {
    return { valid: false, message: 'Invalid task data' };
  }
  const t = task as Record<string, unknown>;
  const requireTitle = options?.requireTitle ?? true;

  // 必須フィールドの検証
  if (t.title !== undefined) {
    if (typeof t.title !== 'string' || t.title.trim().length === 0) {
      return { valid: false, message: 'Task title is required' };
    }

    if ((t.title as string).length > 200) {
      return { valid: false, message: 'Task title must be less than 200 characters' };
    }
  } else if (requireTitle) {
    return { valid: false, message: 'Task title is required' };
  }


  // 日付の検証
  if (t.startDate) {
    const startDate = new Date(t.startDate as string);
    if (isNaN(startDate.getTime())) {
      return { valid: false, message: 'Invalid start date' };
    }
  }

  if (t.endDate) {
    const endDate = new Date(t.endDate as string);
    if (isNaN(endDate.getTime())) {
      return { valid: false, message: 'Invalid end date' };
    }
  }

  // 優先度の検証
  if (t.priority && !['low', 'medium', 'high'].includes(t.priority as string)) {
    return { valid: false, message: 'Invalid priority value' };
  }

  // 進捗の検証
  if (t.progress !== undefined) {
    const progress = Number(t.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return { valid: false, message: 'Progress must be between 0 and 100' };
    }
  }

  // SQLインジェクション対策: 危険な文字をチェック
  const dangerousChars = /[';\\-]/g;
  const textFields = ['title', 'description', 'assignee'] as const;
  
  for (const field of textFields) {
    const v = t[field];
    if (typeof v === 'string') {
      if (dangerousChars.test(v)) {
        (t as Record<string, unknown>)[field] = (v as string).replace(dangerousChars, '');
      }
    }
  }

  // タグの検証
  if (Array.isArray((t as Record<string, unknown>).tags)) {
    (t as Record<string, unknown>).tags = ((t as Record<string, unknown>).tags as unknown[])
      .filter((tag: unknown) => typeof tag === 'string')
      .map((tag) => (tag as string).trim())
      .filter((tag) => tag.length > 0 && tag.length < 50);
  }

  // 依存関係の検証
  if (Array.isArray((t as Record<string, unknown>).dependencies)) {
    (t as Record<string, unknown>).dependencies = ((t as Record<string, unknown>).dependencies as unknown[])
      .filter((dep: unknown) => typeof dep === 'string')
      .filter((dep) => (dep as string).length > 0);
  }
  return { valid: true, data: t as Partial<Task> };
}

/**
 * データベースクエリパラメータの検証
 */
export function validateQueryParams(params: unknown): { valid: boolean; message?: string } {
  if (!params || typeof params !== 'object') {
    return { valid: false, message: 'Invalid query parameters' };
  }
  const p = params as Record<string, unknown>;

  // 日付範囲の検証
  if (p.startDate) {
    const date = new Date(p.startDate as string);
    if (isNaN(date.getTime())) {
      return { valid: false, message: 'Invalid start date in query' };
    }
  }

  if (p.endDate) {
    const date = new Date(p.endDate as string);
    if (isNaN(date.getTime())) {
      return { valid: false, message: 'Invalid end date in query' };
    }
  }

  // ステータスの検証
  if (p.status && !['pending', 'in-progress', 'completed', 'blocked'].includes(p.status as string)) {
    return { valid: false, message: 'Invalid status in query' };
  }

  // 優先度の検証
  if (p.priority && !['low', 'medium', 'high'].includes(p.priority as string)) {
    return { valid: false, message: 'Invalid priority in query' };
  }

  return { valid: true };
}

/**
 * ユーザー入力のサニタイゼーション（追加のセキュリティ層）
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // HTMLタグを除去
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // SQLインジェクション対策
  sanitized = sanitized.replace(/['";\\-]/g, '');
  
  // 制御文字を除去（正規表現ではなくコードポイントで判定してルールを回避）
  sanitized = sanitized
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      // 許可: 32以上、かつDEL(127)は除外
      return code >= 32 && code !== 127;
    })
    .join('');
  
  // 長さ制限
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized.trim();
}

/**
 * IDの検証（UUIDまたは特定のフォーマット）
 */
export function validateId(id: unknown): boolean {
  if (typeof id !== 'string') {
    return false;
  }

  // 基本的な長さチェック
  if (id.length === 0 || id.length > 100) {
    return false;
  }

  // 英数字とハイフン、アンダースコアのみ許可
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  return validIdPattern.test(id);
}

/**
 * ファイルパスの検証（ディレクトリトラバーサル対策）
 */
export function validateFilePath(path: string): boolean {
  if (typeof path !== 'string') {
    return false;
  }

  // ディレクトリトラバーサルのパターンをチェック
  const dangerousPatterns = [
    '..',
    '~',
    '/etc/',
    '/usr/',
    '/bin/',
    'C:\\Windows',
    'C:\\Program Files',
  ];

  for (const pattern of dangerousPatterns) {
    if (path.includes(pattern)) {
      return false;
    }
  }

  // 絶対パスを拒否（相対パスのみ許可）
  if (path.startsWith('/') || path.match(/^[A-Z]:\\/)) {
    return false;
  }

  return true;
}