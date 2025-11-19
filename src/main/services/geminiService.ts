import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { config } from 'dotenv';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

config();

const DEFAULT_GEMINI_MODEL_ID = 'gemini-1.5-flash';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 400;
const DEFAULT_REQUEST_TIMEOUT_MS = 45000;

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel | null = null;
  private purify: { sanitize: (input: string, options?: Record<string, unknown>) => string } | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // APIキーの存在確認
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    // プレースホルダーチェック
    if (apiKey === 'your_gemini_api_key_here' || apiKey.includes('your_')) {
      throw new Error('GEMINI_API_KEY must be set to a valid API key, not a placeholder');
    }
    
    // APIキーフォーマット検証
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
      throw new Error('Invalid GEMINI_API_KEY format. Please check your API key.');
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Gemini 1.5 Flash を使用（高速で低コスト）
      this.model = this.genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL_ID });
      
      // Initialize DOMPurify
      const window = new JSDOM('').window;
      this.purify = DOMPurify(window as any);
      
      console.log('Gemini service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      throw new Error('Failed to initialize Gemini AI service');
    }
  }

  private checkInitialization() {
    if (!this.model) {
      throw new Error('Gemini service is not properly initialized');
    }
  }

  private sanitizeInput(input: string): string {
    // DOMPurifyを使用してすべてのHTMLタグを除去し、プレーンテキストのみを許可
    if (!this.purify) return input;
    return this.purify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true 
    });
  }

  // 指数バックオフ付きリトライユーティリティ
  private async retryWithBackoff<T>(operation: () => Promise<T>, options?: { retries?: number; baseDelayMs?: number; timeoutMs?: number }): Promise<T> {
    const retries = Math.max(0, options?.retries ?? DEFAULT_MAX_RETRIES);
    const baseDelayMs = Math.max(0, options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS);
    const timeoutMs = Math.max(0, options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ]);
        return result;
      } catch (error: any) {
        lastError = error;
        const isTimeout = typeof error?.message === 'string' && error.message.toLowerCase().includes('timeout');
        const isNetwork = typeof error?.message === 'string' && (
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('fetch') ||
          error.message.toLowerCase().includes('connection')
        );
        const isRetriable = isTimeout || isNetwork || error?.code === 'RESOURCE_EXHAUSTED' || error?.code === 'UNAVAILABLE';
        if (attempt === retries || !isRetriable) {
          throw error;
        }
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * baseDelayMs);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    // 型上ここには来ないが、保険で投げる
    throw lastError instanceof Error ? lastError : new Error('Unknown error');
  }

  async generateTaskBreakdown(userInput: string, context: any = {}) {
    this.checkInitialization();
    
    // 入力検証
    if (!userInput?.trim()) {
      throw new Error('User input is required');
    }
    
    if (userInput.length > 5000) {
      throw new Error('Input too long. Please limit to 5000 characters.');
    }
    
    // 包括的なXSS対策: DOMPurifyを使用してすべてのHTMLタグを除去
    const sanitizedInput = this.sanitizeInput(userInput);
    
    const prompt = this.createTaskBreakdownPrompt(sanitizedInput, context);
    
    try {
      const exec = async () => {
        const result = await (this.model as GenerativeModel).generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return this.parseTaskResponse(text);
      };
      return await this.retryWithBackoff(exec);
    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      // APIキーを含むエラーメッセージを隠蔽
      const msg = (error as { message?: string }).message;
      if (msg?.includes('API') || msg?.includes('key')) {
        throw new Error('AI service authentication failed. Please check your configuration.');
      }
      throw error;
    }
  }

  async chatWithContext(message: string, conversationHistory: Array<{role: string, content: string}> = []) {
    this.checkInitialization();
    
    // 入力検証
    if (!message?.trim()) {
      throw new Error('Message is required');
    }
    
    // 長文制限（テストおよびIPCハンドラの仕様に合わせる）
    if (message.length > 2000) {
      throw new Error('Message too long. Please limit to 2000 characters.');
    }
    
    // 包括的なサニタイゼーション
    const sanitizedMessage = this.sanitizeInput(message);
    
    const systemPrompt = `あなたは TaskFlow AI のアシスタントです。
ユーザーの漠然としたアイデアや業務内容を、具体的で実行可能なタスクに分解することが役割です。
特に以下の分野に精通しています：
- 企画・イベント運営
- ブログ執筆・コンテンツ制作
- 学習塾運営・教育コンサルティング
- ビジネスコンサルティング

対話を通じて以下の情報を引き出してください：
1. プロジェクトの目的と期待される成果
2. 利用可能なリソース（人、時間、予算）
3. 締切や重要なマイルストーン
4. 制約条件やリスク
5. 優先順位

回答は具体的で実用的なものにしてください。`;

    const conversationContext = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}\n\n過去の会話:\n${conversationContext}\n\nユーザー: ${sanitizedMessage}\n\nアシスタント:`;

    try {
      const exec = async () => {
        const result = await (this.model as GenerativeModel).generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
      };
      return await this.retryWithBackoff(exec);
    } catch (error) {
      console.error('Gemini Chat Error:', error);
      throw error;
    }
  }

  private createTaskBreakdownPrompt(userInput: string, context: any) {
    return `以下のプロジェクト/タスクを、実行可能な具体的なタスクに分解してください。

入力: ${userInput}

コンテキスト:
- 業界: ${context.industry || '未指定'}
- 期限: ${context.deadline || '未指定'}
- 優先度: ${context.priority || '中'}

以下の形式でJSONとして返してください：
{
  "tasks": [
    {
      "title": "タスク名",
      "description": "詳細説明",
      "estimatedHours": 推定時間（数値）,
      "priority": "high/medium/low",
      "dependencies": ["依存するタスクのタイトル"],
      "category": "カテゴリ名"
    }
  ],
  "summary": "プロジェクト全体の要約",
  "totalEstimatedHours": 合計推定時間,
  "suggestedDeadline": "推奨締切日",
  "risks": ["潜在的なリスク"],
  "recommendations": ["推奨事項"]
}`;
  }

  private parseTaskResponse(text: string) {
    // 1) コードブロック優先
    const fence = text.match(/```json\n?([\s\S]*?)\n?```/i) || text.match(/```\n?([\s\S]*?)\n?```/i);
    const candidates: string[] = [];
    if (fence) candidates.push(fence[1]);
    candidates.push(text);

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // 続行
      }
      // 2) JSONライク部分抽出（最初の{から最後の}まで）
      const start = candidate.indexOf('{');
      const end = candidate.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const slice = candidate.slice(start, end + 1);
        try {
          return JSON.parse(slice);
        } catch (e) {
          void e;
        }
      }
      // 3) キーをダブルクオートに修復
      const repaired = candidate
        .replace(/([,{\s])([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'([^']*)'/g, '"$1"');
      const s2 = repaired.indexOf('{');
      const e2 = repaired.lastIndexOf('}');
      if (s2 !== -1 && e2 !== -1 && e2 > s2) {
        const slice2 = repaired.slice(s2, e2 + 1);
        try {
          return JSON.parse(slice2);
        } catch (e) {
          void e;
        }
      }
    }

    console.error('Failed to parse Gemini response:', text);
    return {
      tasks: [],
      summary: text,
      error: 'Failed to parse structured response'
    };
  }

  async analyzeDependencies(tasks: Array<{ id: string; title?: string }>) {
    this.checkInitialization();
    const prompt = `以下のタスクリストの依存関係を分析し、最適な実行順序を提案してください。
クリティカルパスも特定してください。

タスク:
${JSON.stringify(tasks, null, 2)}

以下の形式で返してください：
{
  "optimizedOrder": ["タスク1", "タスク2", ...],
  "criticalPath": ["クリティカルパス上のタスク"],
  "parallelizable": [["並行実行可能なタスクグループ1"], ["グループ2"]],
  "bottlenecks": ["ボトルネックとなる可能性のあるタスク"],
  "recommendations": ["スケジューリングに関する推奨事項"]
}`;

    try {
      const exec = async () => {
        const result = await (this.model as GenerativeModel).generateContent(prompt);
        const response = await result.response;
        return this.parseTaskResponse(response.text());
      };
      return await this.retryWithBackoff(exec);
    } catch (error) {
      console.error('Dependency analysis error:', error);
      throw error;
    }
  }
}

export default GeminiService;
