import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API設定（複数の環境変数をチェック）
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ||
                import.meta.env.GEMINI_API_KEY ||
                process.env.GEMINI_API_KEY ||
                process.env.VITE_GEMINI_API_KEY || '';

// デバッグ情報（本番環境でもAPIキー設定を確認）
console.log('=== Gemini API Configuration Debug ===');
console.log('Environment check:', {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  importMetaEnv: {
    VITE_GEMINI_API_KEY: !!import.meta.env.VITE_GEMINI_API_KEY,
    GEMINI_API_KEY: !!import.meta.env.GEMINI_API_KEY
  },
  processEnv: {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY
  }
});
console.log('Final API Key configured:', API_KEY ? 'Yes' : 'No');
if (!API_KEY) {
  console.error('⚠️  Gemini API Key is NOT configured! This will cause API calls to fail.');
} else {
  console.log('✅ Gemini API Key is configured');
}
console.log('====================================');

// タスク分解のコンテキスト
export interface TaskBreakdownContext {
  projectName?: string;
  projectDescription?: string;
  existingTasks?: string[];
  userRole?: string;
  deadline?: string;
  additionalContext?: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (API_KEY) {
      this.genAI = new GoogleGenerativeAI(API_KEY);
    } else {
      console.warn('Gemini API key not configured');
    }
  }

  private ensureInitialized() {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in environment variables.');
    }
  }

  async chat(message: string, conversationHistory: any[] = []): Promise<string> {
    console.log('💬 Starting Gemini chat');
    console.log('Message length:', message.length);
    console.log('History length:', conversationHistory.length);

    try {
      this.ensureInitialized();
      console.log('✅ Gemini service initialized for chat');

      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('🤖 Chat model created');

      const chat = model.startChat({
        history: conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      });
      console.log('📝 Chat session started');

      console.log('⏳ Sending message to Gemini...');
      const result = await chat.sendMessage(message);
      console.log('📥 Chat response received');

      const response = await result.response;
      const text = response.text();
      console.log('💬 Chat response text length:', text.length);

      return text;
    } catch (error: any) {
      console.error('❌ Gemini chat error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async chatWithContext(message: string, conversationHistory: any[] = []): Promise<string> {
    return this.chat(message, conversationHistory);
  }

  async generateTaskBreakdown(userInput: string, context: TaskBreakdownContext = {}): Promise<any> {
    console.log('🚀 Starting generateTaskBreakdown');
    console.log('Input length:', userInput.length);
    console.log('Context:', context);

    try {
      this.ensureInitialized();
      console.log('✅ Gemini service initialized');

      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('🤖 Model created: gemini-1.5-flash');

      const prompt = this.buildTaskBreakdownPrompt(userInput, context);
      console.log('📝 Prompt built, length:', prompt.length);

      console.log('⏳ Calling Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('📥 API response received');

      const response = await result.response;
      const text = response.text();
      console.log('📄 Response text length:', text.length);

      // JSONレスポンスを解析
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        console.log('🔍 Found JSON in code blocks');
        const parsed = JSON.parse(jsonMatch[1]);
        console.log('✅ Successfully parsed JSON from code blocks');
        return parsed;
      }

      // JSONマーカーがない場合は全体をパース
      console.log('🔍 No JSON code blocks found, parsing entire text');
      const parsed = JSON.parse(text);
      console.log('✅ Successfully parsed JSON from entire text');
      return parsed;
    } catch (error: any) {
      console.error('❌ Task breakdown error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        name: error.name
      });
      throw new Error(this.getErrorMessage(error));
    }
  }

  async generateTaskBreakdownEnriched(userInput: string, context: TaskBreakdownContext = {}): Promise<any> {
    // generateTaskBreakdownと同じ実装で、より詳細なタスク分解を行う
    return this.generateTaskBreakdown(userInput, context);
  }

  async breakdownTask(params: { title: string; targetCount?: number }): Promise<any> {
    try {
      this.ensureInitialized();
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const targetCount = params.targetCount || 3;
      const prompt = `
タスク「${params.title}」を${targetCount}個の実行可能なサブタスクに分解してください。

以下のJSON形式で返してください：
\`\`\`json
{
  "subtasks": [
    {
      "title": "サブタスクのタイトル",
      "description": "サブタスクの説明",
      "estimatedHours": 推定時間（数値）,
      "priority": "high/medium/low"
    }
  ]
}
\`\`\`
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Task breakdown error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async generateSubtasks(taskTitle: string, taskDescription: string): Promise<any> {
    try {
      this.ensureInitialized();
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
タスク「${taskTitle}」を実行可能なサブタスクに分解してください。

タスクの説明: ${taskDescription}

以下のJSON形式で返してください：
\`\`\`json
{
  "subtasks": [
    {
      "title": "サブタスクのタイトル",
      "description": "サブタスクの説明",
      "estimatedHours": 推定時間（数値）,
      "priority": "high/medium/low"
    }
  ]
}
\`\`\`
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Subtask generation error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async analyzeDependencies(tasks: any[]): Promise<any> {
    try {
      this.ensureInitialized();
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const taskList = tasks.map(t => `- ${t.title}: ${t.description || '説明なし'}`).join('\n');
      const prompt = `
以下のタスクの依存関係を分析してください：

${taskList}

以下のJSON形式で返してください：
\`\`\`json
{
  "dependencies": [
    {
      "taskId": "依存元タスクのID",
      "dependsOn": ["依存先タスクのID"]
    }
  ],
  "suggestedOrder": ["タスクID1", "タスクID2", ...],
  "parallelizable": [["並列実行可能なタスクID群"]]
}
\`\`\`
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Dependency analysis error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  private buildTaskBreakdownPrompt(userInput: string, context: TaskBreakdownContext): string {
    let prompt = `ユーザーの入力を基に、実行可能なタスクに分解してください。

ユーザーの入力: ${userInput}`;

    if (context.projectName) {
      prompt += `\nプロジェクト名: ${context.projectName}`;
    }
    if (context.projectDescription) {
      prompt += `\nプロジェクト説明: ${context.projectDescription}`;
    }
    if (context.deadline) {
      prompt += `\n締切: ${context.deadline}`;
    }
    if (context.additionalContext) {
      prompt += `\n追加コンテキスト: ${context.additionalContext}`;
    }

    prompt += `

以下のJSON形式で返してください：
\`\`\`json
{
  "tasks": [
    {
      "title": "タスクのタイトル",
      "description": "タスクの詳細説明",
      "estimatedHours": 推定時間（数値）,
      "priority": "high/medium/low",
      "dependencies": [],
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD"
    }
  ],
  "summary": "全体の要約",
  "totalEstimatedHours": 合計推定時間
}
\`\`\``;

    return prompt;
  }

  private getErrorMessage(error: any): string {
    console.error('=== Gemini API Error Details ===');
    console.error('Error object:', error);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error status:', error?.status);
    console.error('Error name:', error?.name);
    console.error('=============================');

    // APIキー関連のエラー
    if (error?.message?.includes('API_KEY_INVALID') ||
        error?.message?.includes('API key not valid') ||
        error?.message?.includes('invalid api key') ||
        error?.code === 'API_KEY_INVALID') {
      return 'Gemini APIキーが無効または設定されていません。管理者に連絡してください。';
    }

    // 認証エラー
    if (error?.message?.includes('PERMISSION_DENIED') ||
        error?.message?.includes('permission') ||
        error?.code === 'PERMISSION_DENIED') {
      return 'APIアクセス権限がありません。APIキーの権限を確認してください。';
    }

    // レート制限エラー
    if (error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('rate limit') ||
        error?.code === 'RESOURCE_EXHAUSTED') {
      return 'APIの利用制限を超過しました。しばらく待ってから再試行してください。';
    }

    // ネットワークエラー
    if (error?.message?.includes('network') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('connection') ||
        error?.code === 'NETWORK_ERROR' ||
        !navigator.onLine) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    }

    // タイムアウトエラー
    if (error?.message?.includes('timeout') ||
        error?.code === 'DEADLINE_EXCEEDED') {
      return 'APIリクエストがタイムアウトしました。しばらく待ってから再試行してください。';
    }

    // 無効なリクエスト
    if (error?.message?.includes('INVALID_ARGUMENT') ||
        error?.code === 'INVALID_ARGUMENT') {
      return 'リクエスト内容に問題があります。内容を見直してください。';
    }

    // サーバーエラー
    if (error?.message?.includes('INTERNAL') ||
        error?.message?.includes('UNAVAILABLE') ||
        error?.code === 'INTERNAL' ||
        error?.code === 'UNAVAILABLE' ||
        (error?.status >= 500 && error?.status < 600)) {
      return 'Gemini APIサーバーで一時的なエラーが発生しています。しばらく待ってから再試行してください。';
    }

    // その他のエラー
    return error?.message || 'タスク生成中に予期しないエラーが発生しました。';
  }
}

// シングルトンインスタンス
let geminiServiceInstance: GeminiService | null = null;

export const getWebGeminiService = (): GeminiService => {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
};