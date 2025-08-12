import { dialog } from 'electron';

export enum ErrorCode {
  SERVICE_INIT_FAILED = 'SERVICE_INIT_FAILED',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  code: ErrorCode;
  details?: unknown;
  userMessage: string;

  constructor(code: ErrorCode, message: string, userMessage?: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.name = 'AppError';
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.SERVICE_INIT_FAILED:
        return 'サービスの初期化に失敗しました。設定を確認してください。';
      case ErrorCode.API_KEY_INVALID:
        return 'APIキーが無効です。正しいAPIキーを設定してください。';
      case ErrorCode.API_REQUEST_FAILED:
        return 'APIリクエストが失敗しました。しばらく待ってから再試行してください。';
      case ErrorCode.DATABASE_ERROR:
        return 'データベースエラーが発生しました。';
      case ErrorCode.VALIDATION_ERROR:
        return '入力データが無効です。';
      case ErrorCode.NETWORK_ERROR:
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      case ErrorCode.TIMEOUT_ERROR:
        return 'リクエストがタイムアウトしました。しばらく待ってから再試行してください。';
      default:
        return '予期しないエラーが発生しました。';
    }
  }
}

/**
 * 統一されたエラーハンドリング
 */
export function handleServiceError(
  serviceName: string,
  error: unknown,
  showDialog: boolean = false
): { success: false; message: string; code?: ErrorCode } {
  console.error(`${serviceName} error:`, error);

  let code: ErrorCode = ErrorCode.UNKNOWN_ERROR;
  let message: string;

  // AppErrorの場合
  if (error instanceof AppError) {
    code = error.code;
    message = error.userMessage;
  }
  // タイムアウトエラー
  else if (typeof error === 'object' && error !== null && 'message' in error && (error as { message?: string }).message === 'Request timeout') {
    code = ErrorCode.TIMEOUT_ERROR;
    message = '処理がタイムアウトしました。もう一度お試しください。';
  }
  // ネットワークエラー
  else if (typeof error === 'object' && error !== null && ('code' in (error as { code?: string })) && ((((error as { code?: string }).code) === 'ENOTFOUND') || (((error as { code?: string }).code) === 'ECONNREFUSED'))) {
    code = ErrorCode.NETWORK_ERROR;
    message = 'ネットワーク接続に問題があります。';
  }
  // APIキーエラー
  else if (typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) && typeof (error as { message?: string }).message === 'string' && (((error as { message: string }).message).includes('API key') || ((error as { message: string }).message).includes('api_key'))) {
    code = ErrorCode.API_KEY_INVALID;
    message = 'APIキーの設定に問題があります。';
  }
  // データベースエラー
  else if (typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) && typeof (error as { message?: string }).message === 'string' && ((((error as { message: string }).message).includes('database')) || (((error as { message: string }).message).includes('Database')))) {
    code = ErrorCode.DATABASE_ERROR;
    message = 'データベース操作中にエラーが発生しました。';
  }
  // その他のエラー
  else {
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) && typeof (error as { message?: string }).message === 'string' ? (error as { message: string }).message : 'Unknown error occurred';
    message = sanitizeErrorMessage(msg);
  }

  // ダイアログ表示が必要な場合
  if (showDialog) {
    dialog.showErrorBox(`${serviceName} エラー`, message);
  }

  return {
    success: false,
    message,
    code
  };
}

/**
 * エラーメッセージのサニタイゼーション（機密情報の除去）
 */
export function sanitizeErrorMessage(message: string): string {
  // APIキーやトークンのパターンを除去
  let sanitized = message.replace(/[A-Za-z0-9]{20,}/g, '[REDACTED]');
  
  // URLのクエリパラメータを除去
  sanitized = sanitized.replace(/\?[^?\s]*/g, '?[PARAMS]');
  
  // メールアドレスを除去
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // ファイルパスのユーザー名を除去
  sanitized = sanitized.replace(/\/Users\/[^/]+/g, '/Users/[USER]');
  sanitized = sanitized.replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[USER]');
  
  return sanitized;
}

/**
 * 非同期関数のエラーハンドリングラッパー
 */
export function wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  serviceName: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleServiceError(serviceName, error);
    }
  }) as T;
}

/**
 * リトライ機能付きの非同期実行
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // リトライ不可能なエラーの場合は即座に失敗
      if (error instanceof AppError && 
          (error.code === ErrorCode.API_KEY_INVALID || 
           error.code === ErrorCode.VALIDATION_ERROR)) {
        throw error;
      }
      
      // 最後の試行でない場合は待機
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, i)));
      }
    }
  }
  
  throw lastError;
}

/**
 * エラーログの記録
 */
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : String(error),
    stack: typeof error === 'object' && error !== null && 'stack' in (error as { stack?: string }) ? (error as { stack?: string }).stack : undefined,
    code: typeof error === 'object' && error !== null && 'code' in (error as { code?: string }) ? (error as { code?: string }).code : 'UNKNOWN',
    details: typeof error === 'object' && error !== null && 'details' in (error as { details?: unknown }) ? (error as { details?: unknown }).details : undefined
  };
  
  console.error('Error logged:', errorInfo);
  
  // TODO: ファイルやリモートサービスへのログ送信を実装
  // fs.appendFileSync(logPath, JSON.stringify(errorInfo) + '\n');
}