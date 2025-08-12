import { addDays, subDays, startOfDay, endOfDay, differenceInDays, format, isWeekend } from 'date-fns'
import { ja } from 'date-fns/locale'

export interface ScheduleEvent {
  id: string
  title: string
  start: Date
  end: Date
  isBlocking?: boolean // タスクをブロックするイベントかどうか
}

export interface TaskRequirement {
  title: string
  estimatedHours: number
  priority: 'low' | 'medium' | 'high'
  dependencies?: string[]
  fixedDate?: Date // 固定日程がある場合
}

export interface ScheduledTask {
  title: string
  startDate: Date
  endDate: Date
  estimatedHours: number
  priority: 'low' | 'medium' | 'high'
  reason?: string // スケジューリングの理由
  conflicts?: string[] // 競合するイベント
}

// 優先度に基づく作業時間の配分
const PRIORITY_HOURS_PER_DAY = {
  high: 4,    // 高優先度: 1日4時間
  medium: 2,  // 中優先度: 1日2時間
  low: 1      // 低優先度: 1日1時間
}

// バッファ日数（優先度別）
const BUFFER_DAYS = {
  high: 2,
  medium: 3,
  low: 5
}

export class TaskScheduler {
  private calendarEvents: ScheduleEvent[] = []
  private workingHoursPerDay = 8 // 1日の作業可能時間
  private startHour = 9 // 作業開始時刻
  private endHour = 18 // 作業終了時刻

  constructor(events: ScheduleEvent[] = []) {
    this.calendarEvents = events
  }

  /**
   * ゴール日程から逆算してタスクをスケジューリング
   */
  scheduleTasksFromGoal(
    goalDate: Date,
    tasks: TaskRequirement[],
    projectStartDate?: Date
  ): ScheduledTask[] {
    const scheduledTasks: ScheduledTask[] = []
    const startDate = projectStartDate || new Date()
    
    // タスクを優先度でソート（高優先度を先に）
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    // 各タスクのスケジューリング
    let currentDate = startDate
    
    for (const task of sortedTasks) {
      const scheduled = this.scheduleTask(
        task,
        currentDate,
        goalDate,
        scheduledTasks
      )
      
      if (scheduled) {
        scheduledTasks.push(scheduled)
        // 次のタスクの開始日を更新（並行作業も考慮）
        if (task.priority === 'high') {
          currentDate = scheduled.endDate
        } else {
          // 中・低優先度は並行作業可能
          currentDate = addDays(currentDate, 1)
        }
      }
    }

    return this.optimizeSchedule(scheduledTasks, goalDate)
  }

  /**
   * 個別タスクのスケジューリング
   */
  private scheduleTask(
    task: TaskRequirement,
    earliestStart: Date,
    deadline: Date,
    existingTasks: ScheduledTask[]
  ): ScheduledTask | null {
    // 必要日数の計算
    const hoursPerDay = PRIORITY_HOURS_PER_DAY[task.priority]
    const requiredDays = Math.ceil(task.estimatedHours / hoursPerDay)
    const bufferDays = BUFFER_DAYS[task.priority]
    
    // 固定日程がある場合はそれを使用
    if (task.fixedDate) {
      return {
        title: task.title,
        startDate: task.fixedDate,
        endDate: addDays(task.fixedDate, requiredDays),
        estimatedHours: task.estimatedHours,
        priority: task.priority,
        reason: '固定日程'
      }
    }

    // 利用可能な期間を探す
    let startDate = this.findAvailableSlot(
      earliestStart,
      deadline,
      requiredDays + bufferDays,
      task.priority
    )

    if (!startDate) {
      // 期間が見つからない場合は最適化を試みる
      startDate = this.compressSchedule(
        earliestStart,
        deadline,
        requiredDays
      )
    }

    if (!startDate) {
      return null
    }

    const endDate = addDays(startDate, requiredDays)
    
    // カレンダーとの競合チェック
    const conflicts = this.findConflicts(startDate, endDate)

    return {
      title: task.title,
      startDate,
      endDate,
      estimatedHours: task.estimatedHours,
      priority: task.priority,
      reason: conflicts.length > 0 ? '競合を避けてスケジュール' : '最適な期間',
      conflicts
    }
  }

  /**
   * 利用可能な期間を探す
   */
  private findAvailableSlot(
    startDate: Date,
    endDate: Date,
    requiredDays: number,
    priority: 'low' | 'medium' | 'high'
  ): Date | null {
    let currentDate = startDate
    const maxDate = subDays(endDate, requiredDays)

    while (currentDate <= maxDate) {
      const testEndDate = addDays(currentDate, requiredDays)
      const conflicts = this.findConflicts(currentDate, testEndDate)
      
      // 高優先度タスクは競合を避ける
      if (priority === 'high' && conflicts.length === 0) {
        return currentDate
      }
      
      // 中・低優先度は部分的な競合を許容
      if (priority !== 'high' && conflicts.length <= 2) {
        return currentDate
      }

      // 週末をスキップ
      if (isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 2)
      } else {
        currentDate = addDays(currentDate, 1)
      }
    }

    return null
  }

  /**
   * カレンダーイベントとの競合を検出
   */
  private findConflicts(startDate: Date, endDate: Date): string[] {
    const conflicts: string[] = []
    
    for (const event of this.calendarEvents) {
      if (event.isBlocking === false) continue
      
      const eventStart = startOfDay(event.start)
      const eventEnd = endOfDay(event.end)
      const taskStart = startOfDay(startDate)
      const taskEnd = endOfDay(endDate)
      
      // 期間が重なっているかチェック
      if (taskStart <= eventEnd && taskEnd >= eventStart) {
        conflicts.push(event.title)
      }
    }
    
    return conflicts
  }

  /**
   * スケジュールの圧縮（期限に間に合わない場合）
   */
  private compressSchedule(
    startDate: Date,
    endDate: Date,
    requiredDays: number
  ): Date | null {
    const availableDays = differenceInDays(endDate, startDate)
    
    if (availableDays < requiredDays) {
      // 期間が足りない場合は開始日を早める
      return subDays(endDate, requiredDays)
    }
    
    return startDate
  }

  /**
   * スケジュール全体の最適化
   */
  private optimizeSchedule(
    tasks: ScheduledTask[],
    goalDate: Date
  ): ScheduledTask[] {
    // ゴールまでの余裕を計算
    const lastTask = tasks.reduce((latest, task) => 
      task.endDate > latest.endDate ? task : latest
    , tasks[0])
    
    if (!lastTask) return tasks
    
    const buffer = differenceInDays(goalDate, lastTask.endDate)
    
    // 余裕がある場合は均等に配分
    if (buffer > 0) {
      const spacing = Math.floor(buffer / tasks.length)
      
      return tasks.map((task, index) => ({
        ...task,
        startDate: addDays(task.startDate, spacing * index),
        endDate: addDays(task.endDate, spacing * index),
        reason: task.reason + '（最適化済み）'
      }))
    }
    
    return tasks
  }

  /**
   * カレンダーイベントの更新
   */
  updateCalendarEvents(events: ScheduleEvent[]) {
    this.calendarEvents = events
  }

  /**
   * 推奨される作業時間の取得
   */
  getRecommendedWorkingHours(date: Date): { start: number; end: number; available: boolean } {
    const dayEvents = this.calendarEvents.filter(event => {
      const eventDate = startOfDay(event.start)
      const targetDate = startOfDay(date)
      return eventDate.getTime() === targetDate.getTime()
    })

    if (dayEvents.length === 0) {
      return {
        start: this.startHour,
        end: this.endHour,
        available: true
      }
    }

    // イベントがある日は作業時間を調整
    const blockedHours = dayEvents.map(event => ({
      start: event.start.getHours(),
      end: event.end.getHours()
    }))

    // 利用可能な時間帯を探す
    for (let hour = this.startHour; hour < this.endHour; hour++) {
      const isBlocked = blockedHours.some(
        block => hour >= block.start && hour < block.end
      )
      
      if (!isBlocked) {
        return {
          start: hour,
          end: Math.min(hour + 4, this.endHour),
          available: true
        }
      }
    }

    return {
      start: this.startHour,
      end: this.endHour,
      available: false
    }
  }

  /**
   * タスクサマリーの生成
   */
  generateScheduleSummary(tasks: ScheduledTask[]): string {
    if (tasks.length === 0) return 'タスクがありません'

    const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0)
    const earliestStart = tasks.reduce((earliest, task) => 
      task.startDate < earliest ? task.startDate : earliest
    , tasks[0].startDate)
    
    const latestEnd = tasks.reduce((latest, task) => 
      task.endDate > latest ? task.endDate : latest
    , tasks[0].endDate)

    const totalDays = differenceInDays(latestEnd, earliestStart)
    const highPriorityCount = tasks.filter(t => t.priority === 'high').length
    const conflicts = tasks.flatMap(t => t.conflicts || [])

    return `
## スケジュール概要
- タスク数: ${tasks.length}件
- 総工数: ${totalHours}時間
- 期間: ${format(earliestStart, 'yyyy/MM/dd', { locale: ja })} 〜 ${format(latestEnd, 'yyyy/MM/dd', { locale: ja })} (${totalDays}日間)
- 高優先度タスク: ${highPriorityCount}件
${conflicts.length > 0 ? `- 競合イベント: ${[...new Set(conflicts)].join(', ')}` : ''}
    `.trim()
  }
}