/**
 * 統一的なエラーハンドリングユーティリティ
 */

export enum ErrorCode {
  // System errors
  UNKNOWN = 'UNKNOWN_ERROR',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  
  // API errors
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  
  // Database errors
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // Maintain proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

/**
 * エラーを適切な形式に変換
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // API関連のエラー
    if (error.message.includes('API') || error.message.includes('key')) {
      return new AppError(
        'API service error',
        ErrorCode.API_REQUEST_FAILED,
        503
      );
    }

    // タイムアウトエラー
    if (error.message.includes('timeout')) {
      return new AppError(
        'Request timeout',
        ErrorCode.TIMEOUT,
        408
      );
    }

    // その他のエラー
    return new AppError(
      error.message,
      ErrorCode.UNKNOWN,
      500,
      true,
      { originalError: error.name }
    );
  }

  // 文字列エラー
  if (typeof error === 'string') {
    return new AppError(error, ErrorCode.UNKNOWN);
  }

  // 不明なエラー
  return new AppError(
    'An unexpected error occurred',
    ErrorCode.UNKNOWN,
    500,
    false,
    { originalError: error }
  );
};

/**
 * ユーザー向けのエラーメッセージを生成
 */
export const getUserFriendlyMessage = (error: AppError): string => {
  switch (error.code) {
    case ErrorCode.API_KEY_INVALID:
      return 'AIサービスの認証に失敗しました。設定を確認してください。';
    
    case ErrorCode.API_TIMEOUT:
      return 'リクエストがタイムアウトしました。もう一度お試しください。';
    
    case ErrorCode.API_RATE_LIMIT:
      return 'APIの利用制限に達しました。しばらくお待ちください。';
    
    case ErrorCode.INVALID_INPUT:
      return '入力内容が不正です。確認してください。';
    
    case ErrorCode.INPUT_TOO_LONG:
      return '入力が長すぎます。短くしてください。';
    
    case ErrorCode.NETWORK_ERROR:
      return 'ネットワークエラーが発生しました。接続を確認してください。';
    
    case ErrorCode.DB_CONNECTION_FAILED:
      return 'データベースに接続できません。';
    
    default:
      return 'エラーが発生しました。もう一度お試しください。';
  }
};

/**
 * エラーログ出力用のフォーマット
 */
export const formatErrorForLogging = (error: AppError): string => {
  const timestamp = error.timestamp.toISOString();
  const stack = error.stack?.split('\n').slice(0, 3).join('\n');
  
  return `
[${timestamp}] ${error.code}
Message: ${error.message}
Status: ${error.statusCode}
Operational: ${error.isOperational}
Context: ${JSON.stringify(error.context, null, 2)}
Stack: ${stack}
  `.trim();
};

/**
 * エラーが再試行可能かどうかを判定
 */
export const isRetryableError = (error: AppError): boolean => {
  const retryableCodes = [
    ErrorCode.API_TIMEOUT,
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.DB_CONNECTION_FAILED,
  ];
  
  return retryableCodes.includes(error.code);
};

/**
 * エラーハンドリングのヘルパー関数
 */
export const handleError = (error: unknown, context?: string): AppError => {
  const appError = normalizeError(error);
  
  // コンソールにログ出力（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.error(`Error in ${context || 'unknown context'}:`, formatErrorForLogging(appError));
  }
  
  return appError;
};