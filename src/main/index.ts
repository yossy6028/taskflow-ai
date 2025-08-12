import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { config } from 'dotenv';
import GeminiService from './services/geminiService';
import OpenAIService from './services/openaiService';
import WebSearchService from './services/webSearchService';
import DatabaseService from '../database/database';
import { validateTaskInput, validateQueryParams, validateId } from './validators';
import type { Task as SharedTask } from '../shared/types';
import { handleServiceError } from './errorHandler';

// Load environment variables
config();

let mainWindow: BrowserWindow | null = null;
let geminiService: GeminiService | OpenAIService;
let dbService: DatabaseService;
let webSearchService: WebSearchService;

/**
 * 環境変数のバリデーション
 */
function validateEnvironment(): boolean {
  const provider = (process.env.AI_PROVIDER || 'GEMINI').toUpperCase();
  const required = provider === 'OPENAI' ? ['OPENAI_API_KEY'] : ['GEMINI_API_KEY'];
  const missing: string[] = [];
  const invalid: string[] = [];
  
  for (const key of required) {
    const value = process.env[key];
    
    if (!value) {
      missing.push(key);
    } else if (value.includes('your_') || value === 'your_gemini_api_key_here') {
      invalid.push(key);
    }
  }
  
  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.join(', ')}\n\nPlease set them in the .env file.`;
    console.error(message);
    
    if (app.isReady()) {
      dialog.showErrorBox('Configuration Error', message);
    }
    return false;
  }
  
  if (invalid.length > 0) {
    const message = `Invalid environment variables:\n${invalid.join(', ')}\n\nPlease replace placeholder values with actual API keys.`;
    console.error(message);
    
    if (app.isReady()) {
      dialog.showErrorBox('Configuration Error', message);
    }
    return false;
  }
  
  console.log(`Environment validation passed (provider=${provider})`);
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
  });

  // Development or production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4000');
    // DevToolsは必要な時だけ開く
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 環境変数を検証 (開発環境では警告のみ)
  if (!validateEnvironment()) {
    if (process.env.NODE_ENV === 'production') {
      app.quit();
      return;
    } else {
      console.warn('Environment validation failed, but continuing in development mode...');
    }
  }
  
  createWindow();
  
  // Initialize AI service (switchable)
  try {
    const provider = (process.env.AI_PROVIDER || 'GEMINI').toUpperCase();
    if (provider === 'OPENAI') {
      geminiService = new OpenAIService();
      console.log('OpenAI service initialized successfully');
    } else {
      geminiService = new GeminiService();
      console.log('Gemini service initialized successfully');
    }
  } catch (error: unknown) {
    console.error('Failed to initialize AI service:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize AI service:\n${(error as { message?: string }).message ?? 'Unknown error'}\n\nPlease check your configuration and restart the application.`
    );
  }
  
  // Initialize database
  try {
    dbService = new DatabaseService();
    dbService.ensureCleanup(); // クリーンアップハンドラーを設定
    console.log('Database service initialized successfully');
  } catch (error: unknown) {
    console.error('Failed to initialize database:', error);
    dialog.showErrorBox(
      'Database Error',
      `Failed to initialize database:\n${(error as { message?: string }).message ?? 'Unknown error'}`
    );
  }

  // Initialize web search (optional)
  try {
    webSearchService = new WebSearchService();
  } catch (error) {
    console.warn('Web search service not initialized:', (error as { message?: string }).message ?? error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // データベースのクリーンアップ
  if (dbService) {
    dbService.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーション終了前のクリーンアップ
app.on('before-quit', () => {
  if (dbService) {
    dbService.close();
  }
});

// Helper function to create timeout promise
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

// IPC handlers for API communication
ipcMain.handle('gemini:chat', async (event: IpcMainInvokeEvent, prompt: string, conversationHistory?: { role: string; content: string }[]) => {
  try {
    // サービス初期化チェック
    if (!geminiService) {
      console.error('Gemini service not initialized');
      return { success: false, message: 'AI service is not available. Please restart the application.' };
    }
    
    // 入力検証
    if (!prompt || typeof prompt !== 'string') {
      return { success: false, message: 'Invalid input provided' };
    }
    
    if (prompt.length > 2000) {
      return { success: false, message: 'Message is too long. Please limit to 2000 characters.' };
    }
    
    // タイムアウト付きでAPI呼び出し
    const response = await withTimeout(
      geminiService.chatWithContext(prompt, conversationHistory || []),
      30000 // 30秒タイムアウト
    );
    
    return { success: true, message: response };
  } catch (error: unknown) {
    return handleServiceError('Gemini Chat', error);
  }
});

ipcMain.handle('gemini:breakdown', async (event: IpcMainInvokeEvent, userInput: string, context?: Record<string, unknown>) => {
  try {
    if (!geminiService) {
      return { success: false, message: 'AI service is not available. Please restart the application.' };
    }
    
    // 入力検証
    if (!userInput || typeof userInput !== 'string') {
      return { success: false, message: 'Invalid input provided' };
    }
    
    if (userInput.length > 5000) {
      return { success: false, message: 'Input is too long. Please limit to 5000 characters.' };
    }
    
    // タイムアウト付きでAPI呼び出し
    // プロジェクト名がcontextにあればプロンプト前置き
    const projectPrefix = typeof context?.projectName === 'string' && (context?.projectName as string).trim().length > 0
      ? `プロジェクト名: ${(context?.projectName as string).trim()}\nこのプロジェクトに直接関係するタスクのみを分解してください。無関係な一般タスクは除外。\n\n` : ''

    const breakdown = await withTimeout(
      geminiService.generateTaskBreakdown(projectPrefix + userInput, context || {}),
      45000 // 45秒タイムアウト（タスク分解は時間がかかる）
    );
    
    return { success: true, data: breakdown };
  } catch (error: unknown) {
    console.error('Task breakdown error:', error);
    
    let userMessage = 'Failed to breakdown tasks. Please try again.';
    
    if ((error as { message?: string }).message === 'Request timeout') {
      userMessage = 'Task analysis took too long. Please try with a simpler description.';
    } else if ((error as { message?: string }).message?.includes('limit')) {
      userMessage = (error as { message?: string }).message as string;
    }
    
    return { success: false, message: userMessage };
  }
});

// Enriched breakdown: web検索結果を踏まえてAIに詳細補完させ、厳密JSONで返す
ipcMain.handle('gemini:breakdown-enriched', async (event: IpcMainInvokeEvent, userInput: string, context?: Record<string, unknown>) => {
  try {
    if (!geminiService) {
      return { success: false, message: 'AI service is not available. Please restart the application.' };
    }

    // 1) ベース分解
    const projectPrefix = typeof context?.projectName === 'string' && (context?.projectName as string).trim().length > 0
      ? `プロジェクト名: ${(context?.projectName as string).trim()}\nこのプロジェクトに直接関係するタスクのみを分解/補完してください。無関係な一般タスクは除外。\n\n` : ''

    const base = await withTimeout(
      geminiService.generateTaskBreakdown(projectPrefix + userInput, context || {}),
      45000
    );

    // 2) 簡易ウェブ検索（任意）
    let findings: Array<{ title: string; url: string; snippet?: string; date?: string }> = [];
    if (webSearchService) {
      const q = typeof context?.industry === 'string' ? `${userInput} ${String(context?.industry)}` : userInput;
      findings = await webSearchService.searchBrief(q);
    }

    // 3) AIに詳細補完を依頼（開始/終了日・工数・優先度・担当案など）
    // プロンプト肥大化を避けるため、JSON文字列の長さを制限
    const safeJson = (obj: unknown, max = 4000) => {
      const s = JSON.stringify(obj);
      return s.length > max ? s.slice(0, max) + '…' : s;
    };

    const enrichPrompt = `以下のベース分解結果に対し、各タスクの開始日・終了日（ISO日付）、推定工数（時間）、優先度、担当者（仮）、不足タスクの補完を行い、厳密なJSONのみで返してください。\n\n前提: この出力はプロジェクト名「${typeof context?.projectName === 'string' ? (context?.projectName as string).trim() : '（未設定）'}」に直接関係するタスクに限定します。無関係な一般タスクは含めないでください。\n\nベース: ${safeJson(base)}\n\n参考（検索結果の要約）: ${safeJson(findings)}\n\n返却JSONの型:\n{\n  "tasks": [{\n    "title": string,\n    "description": string,\n    "estimatedHours": number,\n    "priority": "low"|"medium"|"high",\n    "dependencies": string[],\n    "category": string,\n    "startDate": string,\n    "endDate": string,\n    "assignee": string\n  }],\n  "summary": string,\n  "totalEstimatedHours": number,\n  "suggestedDeadline": string,\n  "risks": string[],\n  "recommendations": string[]\n}`;

    // 会話履歴はプロジェクトを跨いで残さない
    const enrichText = await geminiService.chatWithContext(enrichPrompt, []);
    // 4) パース（geminiService内の堅牢パーサを活用するため、privateアクセス回避のため直接JSON.parseを試行→失敗時は簡易修復）
    let enriched: unknown;
    try {
      enriched = JSON.parse(enrichText);
    } catch {
      try {
        const start = enrichText.indexOf('{');
        const end = enrichText.lastIndexOf('}');
        if (start >= 0 && end > start) {
          enriched = JSON.parse(enrichText.slice(start, end + 1));
        } else {
          enriched = base;
        }
      } catch {
        enriched = base;
      }
    }

    return { success: true, data: enriched };
  } catch (error: unknown) {
    console.error('Enriched breakdown error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : 'Failed to enrich breakdown';
    return { success: false, message: msg };
  }
});

ipcMain.handle('gemini:analyze-dependencies', async (event: IpcMainInvokeEvent, tasks: Array<Pick<SharedTask, 'id' | 'title' | 'dependencies'>>) => {
  try {
    if (!geminiService) {
      throw new Error('Gemini service not initialized');
    }
    
    const analysis = await geminiService.analyzeDependencies(tasks as unknown as SharedTask[]);
    return { success: true, data: analysis };
  } catch (error: unknown) {
    console.error('Dependency analysis error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : 'Failed to analyze dependencies';
    return { success: false, message: msg };
  }
});

// Gemini task breakdown to TODOs handler
ipcMain.handle('gemini:breakdown-task', async (event: IpcMainInvokeEvent, params: any) => {
  try {
    if (!geminiService) {
      throw new Error('Gemini service not initialized');
    }
    
    const prompt = `
タスク「${params.title}」を${params.targetCount || 8}個の具体的で実行可能なTODOに細分化してください。

重要な観点:
1. 情報収集・リサーチ段階（Web検索、資料収集、競合調査など）
2. 計画・設計段階（要件整理、構成検討、スケジュール策定など）
3. 実行・作成段階（ドラフト作成、実装、執筆など）
4. レビュー・改善段階（チェック、修正、最適化など）
5. 必要に応じてAIツールやWeb検索の活用も含める

例えば「資料作成」なら:
- Web検索で参考資料を収集
- 競合他社の資料を調査
- Gensparkで資料の初稿を生成依頼
- ChatGPT/Claudeで内容をブラッシュアップ
- デザインツール（Canva等）でビジュアル化
- レビューと修正

各TODOは:
- 1-2時間で完了できる粒度
- 具体的なアクション（「〜を検索する」「〜を作成する」「〜に問い合わせる」など）
- 必要なツールやリソースも明記

以下のJSON形式で返してください:
{
  "todos": [
    {
      "title": "具体的なアクション（例：関連情報をWeb検索で収集）",
      "description": "詳細な作業内容と使用ツール"
    }
  ]
}
`;

    const result = await geminiService.chatWithContext(prompt, []);
    
    try {
      // JSONの抽出と解析
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, data: parsed };
      }
      return { success: false, message: 'No valid JSON found in response' };
    } catch (parseError) {
      console.error('Failed to parse TODOs:', parseError);
      return { success: false, message: 'Failed to parse response' };
    }
    
    // フォールバックTODO生成
    const fallbackTodos = {
      todos: [
        { title: "要件の詳細確認", description: "タスクの詳細要件を確認し、不明点を洗い出す" },
        { title: "計画の作成", description: "実装計画を立てる" },
        { title: "必要なリソースの準備", description: "必要なツール、データ、環境を準備する" },
        { title: "メイン作業の実施", description: "タスクのメイン作業を実施する" },
        { title: "確認とテスト", description: "作業結果を確認し、テストを行う" },
        { title: "ドキュメント作成", description: "必要なドキュメントを作成する" },
        { title: "レビュー依頼", description: "関係者にレビューを依頼する" },
        { title: "最終確認と完了", description: "最終確認を行い、タスクを完了する" }
      ]
    };
    
    return { success: true, data: fallbackTodos };
  } catch (error: unknown) {
    console.error('Task breakdown error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : 'Unknown error';
    return { success: false, message: msg };
  }
});

// Database handlers
ipcMain.handle('db:getTasks', async (event: IpcMainInvokeEvent, filter?: { status?: string; priority?: string; projectId?: string }) => {
  try {
    if (!dbService) {
      return { success: false, message: 'Database service not initialized' };
    }
    
    // クエリパラメータの検証
    if (filter) {
      const validation = validateQueryParams(filter);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }
    }
    
    const tasks = dbService.getTasks(filter);
    return { success: true, data: tasks };
  } catch (error: unknown) {
    console.error('Database error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : 'Unknown error';
    return { success: false, message: msg };
  }
});

ipcMain.handle('db:createTask', async (event: IpcMainInvokeEvent, task: unknown) => {
  try {
    if (!dbService) {
      return { success: false, message: 'Database service not initialized' };
    }
    
    // タスクデータの検証
    const validation = validateTaskInput(task);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    const newTask = dbService.createTask(validation.data!);
    return { success: true, data: newTask };
  } catch (error: unknown) {
    console.error('Database error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : 'Unknown error';
    return { success: false, message: msg };
  }
});

ipcMain.handle('db:updateTask', async (event: IpcMainInvokeEvent, id: string, updates: Record<string, unknown>) => {
  try {
    if (!dbService) {
      return { success: false, message: 'Database service not initialized' };
    }
    
    // IDの検証
    if (!validateId(id)) {
      return { success: false, message: 'Invalid task ID' };
    }
    
    // 更新データの検証
    const validation = validateTaskInput({ ...updates, title: updates.title || 'dummy' });
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    dbService.updateTask(id, validation.data!);
    return { success: true };
  } catch (error: unknown) {
    console.error('Database error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : 'Unknown error';
    return { success: false, message: msg };
  }
});

ipcMain.handle('db:deleteTask', async (event: IpcMainInvokeEvent, id: string) => {
  try {
    if (!dbService) {
      return { success: false, message: 'Database service not initialized' };
    }
    
    dbService.deleteTask(id);
    return { success: true };
  } catch (error: unknown) {
    console.error('Database error:', error);
    const msg = typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : 'Unknown error';
    return { success: false, message: msg };
  }
});