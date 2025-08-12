import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API設定
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// デバッグ情報
if (import.meta.env.DEV) {
  console.log('Gemini API Key configured:', API_KEY ? 'Yes' : 'No');
}

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
    try {
      this.ensureInitialized();
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });
      
      const chat = model.startChat({
        history: conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async chatWithContext(message: string, conversationHistory: any[] = []): Promise<string> {
    return this.chat(message, conversationHistory);
  }

  async generateTaskBreakdown(userInput: string, context: TaskBreakdownContext = {}): Promise<any> {
    try {
      this.ensureInitialized();
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = this.buildTaskBreakdownPrompt(userInput, context);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONレスポンスを解析
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // JSONマーカーがない場合は全体をパース
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Task breakdown error:', error);
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
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });

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
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });

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
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });

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
    if (error.message?.includes('API key not valid')) {
      return 'Gemini APIキーが無効です。環境変数を確認してください。';
    }
    if (error.message?.includes('quota')) {
      return 'APIクォータを超過しました。しばらく待ってから再試行してください。';
    }
    if (error.message?.includes('network')) {
      return 'ネットワークエラーが発生しました。接続を確認してください。';
    }
    return error.message || 'タスク生成中にエラーが発生しました。';
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