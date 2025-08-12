import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from 'dotenv';

config();

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  taskId?: string;
}

class GoogleCalendarService {
  private calendar: any;
  private auth: OAuth2Client | null = null;
  private isInitialized: boolean = false;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_CALENDAR_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Google Calendar API key not configured');
      return;
    }

    // APIキーのみを使用した認証（読み取り専用）
    // 完全な双方向同期にはOAuth2が必要
    this.auth = new google.auth.GoogleAuth({
      apiKey: this.apiKey,
    }) as any;

    this.calendar = google.calendar({ 
      version: 'v3',
      auth: this.apiKey
    });

    this.isInitialized = true;
    console.log('Google Calendar service initialized (API key mode)');
  }

  /**
   * OAuth2認証の初期化（将来の実装用）
   */
  async initializeOAuth2(clientId: string, clientSecret: string, redirectUri: string) {
    this.auth = new OAuth2Client(clientId, clientSecret, redirectUri);
    
    // OAuth2フローの実装が必要
    // 1. 認証URLの生成
    // 2. ユーザーの認証
    // 3. トークンの取得と保存
    
    this.calendar = google.calendar({ 
      version: 'v3',
      auth: this.auth
    });
  }

  /**
   * カレンダーリストの取得（OAuth2必要）
   */
  async getCalendarList() {
    if (!this.isInitialized) {
      throw new Error('Google Calendar service not initialized');
    }

    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error: any) {
      console.error('Failed to get calendar list:', error);
      throw new Error('Calendar access requires OAuth2 authentication');
    }
  }

  /**
   * イベントの作成（OAuth2必要）
   */
  async createEvent(calendarId: string, event: CalendarEvent) {
    if (!this.isInitialized) {
      throw new Error('Google Calendar service not initialized');
    }

    const eventData = {
      summary: event.summary,
      description: event.description || '',
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: calendarId || 'primary',
        resource: eventData,
      });

      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        ...response.data
      };
    } catch (error: any) {
      console.error('Failed to create calendar event:', error);
      
      if (error.code === 401) {
        throw new Error('Authentication required. Please sign in to Google Calendar.');
      }
      
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * イベントの更新（OAuth2必要）
   */
  async updateEvent(calendarId: string, eventId: string, updates: Partial<CalendarEvent>) {
    if (!this.isInitialized) {
      throw new Error('Google Calendar service not initialized');
    }

    const eventData: any = {};
    
    if (updates.summary) eventData.summary = updates.summary;
    if (updates.description) eventData.description = updates.description;
    if (updates.start) {
      eventData.start = {
        dateTime: updates.start.toISOString(),
        timeZone: 'Asia/Tokyo',
      };
    }
    if (updates.end) {
      eventData.end = {
        dateTime: updates.end.toISOString(),
        timeZone: 'Asia/Tokyo',
      };
    }

    try {
      const response = await this.calendar.events.patch({
        calendarId: calendarId || 'primary',
        eventId: eventId,
        resource: eventData,
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to update calendar event:', error);
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * イベントの削除（OAuth2必要）
   */
  async deleteEvent(calendarId: string, eventId: string) {
    if (!this.isInitialized) {
      throw new Error('Google Calendar service not initialized');
    }

    try {
      await this.calendar.events.delete({
        calendarId: calendarId || 'primary',
        eventId: eventId,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete calendar event:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * イベントリストの取得（APIキーで可能、ただし公開カレンダーのみ）
   */
  async getEvents(calendarId: string, timeMin?: Date, timeMax?: Date) {
    if (!this.isInitialized) {
      throw new Error('Google Calendar service not initialized');
    }

    const params: any = {
      calendarId: calendarId || 'primary',
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMin) params.timeMin = timeMin.toISOString();
    if (timeMax) params.timeMax = timeMax.toISOString();

    try {
      const response = await this.calendar.events.list(params);
      return response.data.items || [];
    } catch (error: any) {
      console.error('Failed to get calendar events:', error);
      
      if (error.code === 401 || error.code === 403) {
        throw new Error('This calendar requires authentication to access.');
      }
      
      throw new Error(`Failed to get events: ${error.message}`);
    }
  }

  /**
   * タスクからカレンダーイベントへの変換
   */
  taskToCalendarEvent(task: any): CalendarEvent {
    return {
      summary: task.title,
      description: `${task.description || ''}\n\n優先度: ${task.priority}\n進捗: ${task.progress}%`,
      start: new Date(task.startDate),
      end: new Date(task.endDate),
      taskId: task.id,
    };
  }

  /**
   * バッチでイベントを作成
   */
  async createEventsFromTasks(calendarId: string, tasks: any[]) {
    const results = [];
    
    for (const task of tasks) {
      try {
        const event = this.taskToCalendarEvent(task);
        const created = await this.createEvent(calendarId, event);
        results.push({ success: true, taskId: task.id, event: created });
      } catch (error: any) {
        results.push({ success: false, taskId: task.id, error: error.message });
      }
    }
    
    return results;
  }
}

export default GoogleCalendarService;