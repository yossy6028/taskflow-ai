import OpenAI from 'openai'
import { config } from 'dotenv'

config()

export default class OpenAIService {
  private client: OpenAI
  private chatModel: string

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

    this.client = new OpenAI({ apiKey })
    // ChatGPT-5 系モデル名（実際の提供名に合わせて変更可）
    this.chatModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  async chatWithContext(message: string, conversationHistory: Array<{ role: string; content: string }> = []) {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are TaskFlow AI assistant.' },
      ...conversationHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ]

    const res = await this.client.chat.completions.create({
      model: this.chatModel,
      messages,
      temperature: 0.7,
    })

    return res.choices[0]?.message?.content ?? ''
  }

  async generateTaskBreakdown(userInput: string, context: Record<string, unknown> = {}) {
    const system = 'Return a JSON with tasks, summary, totalEstimatedHours, suggestedDeadline, risks, recommendations.'
    const user = `User Input: ${userInput}\nContext: ${JSON.stringify(context)}`

    const res = await this.client.chat.completions.create({
      model: this.chatModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })

    const text = res.choices[0]?.message?.content ?? '{}'
    try {
      const match = text.match(/```json\n?([\s\S]*?)\n?```/)
      return match ? JSON.parse(match[1]) : JSON.parse(text)
    } catch {
      return { tasks: [], summary: text }
    }
  }

  async analyzeDependencies(tasks: Array<{ id: string; title?: string }>) {
    const prompt = `Analyze dependencies and return JSON with optimizedOrder, criticalPath, parallelizable, bottlenecks, recommendations.\nTasks:\n${JSON.stringify(tasks, null, 2)}`
    const res = await this.client.chat.completions.create({
      model: this.chatModel,
      messages: [
        { role: 'system', content: 'You are a scheduling expert.' },
        { role: 'user', content: prompt },
      ],
    })
    const text = res.choices[0]?.message?.content ?? '{}'
    try {
      const match = text.match(/```json\n?([\s\S]*?)\n?```/)
      return match ? JSON.parse(match[1]) : JSON.parse(text)
    } catch {
      return { optimizedOrder: [], criticalPath: [], parallelizable: [], bottlenecks: [], recommendations: [], raw: text }
    }
  }
}







