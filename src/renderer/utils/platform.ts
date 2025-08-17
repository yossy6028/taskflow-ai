// プラットフォーム判定ユーティリティ
import { getWebGeminiService } from '../services/geminiService';
import type { TaskBreakdownContext, ConversationMessage } from '../../shared/types';

export type { TaskBreakdownContext } from '../../shared/types';

export const isElectron = () => {
	return typeof window !== 'undefined' && 
			window.electronAPI !== undefined;
};

export const isWeb = () => {
	return !isElectron();
};

// Web環境用のGemini APIラッパー
// getWebGeminiServiceはgeminiService.tsからインポート済み

// プラットフォーム統一APIインターフェース
export const geminiAPI = {
	async chat(prompt: string, conversationHistory: ConversationMessage[] = []) {
		if (isElectron()) {
			try {
				return await window.electronAPI.geminiChat(prompt, conversationHistory);
			} catch (error: any) {
				return { success: false, message: error.message || 'Electron Gemini API error' };
			}
		} else {
			try {
				const service = getWebGeminiService();
				const message = await service.chatWithContext(prompt, conversationHistory);
				return { success: true, message };
			} catch (error: any) {
				return { success: false, message: error.message || 'Web Gemini API error' };
			}
		}
	},

	async breakdown(userInput: string, context: TaskBreakdownContext = {}) {
		if (isElectron()) {
			try {
				return await window.electronAPI.geminiBreakdown(userInput, context);
			} catch (error: any) {
				return { success: false, message: error.message || 'Electron Gemini breakdown error' };
			}
		} else {
			try {
				const service = getWebGeminiService();
				const data = await service.generateTaskBreakdown(userInput, context);
				return { success: true, data };
			} catch (error: any) {
				return { success: false, message: error.message || 'Web Gemini breakdown error' };
			}
		}
	},

	async breakdownEnriched(userInput: string, context: TaskBreakdownContext = {}) {
		if (isElectron()) {
			try {
				return await window.electronAPI.geminiBreakdownEnriched(userInput, context);
			} catch (error: any) {
				return { success: false, message: error.message || 'Electron Gemini enriched breakdown error' };
			}
		} else {
			try {
				const service = getWebGeminiService();
				const data = await service.generateTaskBreakdownEnriched(userInput, context);
				return { success: true, data };
			} catch (error: any) {
				return { success: false, message: error.message || 'Web Gemini enriched breakdown error' };
			}
		}
	},

	async breakdownTask(params: { title: string; targetCount?: number }) {
		if (isElectron()) {
			try {
				return await window.electronAPI.geminiBreakdownTask(params);
			} catch (error: any) {
				return { success: false, message: error.message || 'Electron Gemini task breakdown error' };
			}
		} else {
			try {
				const service = getWebGeminiService();
				const data = await service.breakdownTask(params);
				return { success: true, data };
			} catch (error: any) {
				return { success: false, message: error.message || 'Web Gemini task breakdown error' };
			}
		}
	},

	async analyzeDependencies(tasks: Array<{ id: string; title: string; dependencies?: string[] }>) {
		if (isElectron()) {
			try {
				return await window.electronAPI.geminiAnalyzeDependencies(tasks as any);
			} catch (error: any) {
				return { success: false, message: error.message || 'Electron Gemini dependency analysis error' };
			}
		} else {
			try {
				const service = getWebGeminiService();
				const data = await service.analyzeDependencies(tasks as any);
				return { success: true, data };
			} catch (error: any) {
				return { success: false, message: error.message || 'Web Gemini dependency analysis error' };
			}
		}
	}
};

// プラットフォームに応じたストレージAPI
export const storage = {
	async saveTask(task: any) {
		if (isElectron()) {
			// Electron: SQLite経由 - dbCreateTaskを使用
			return window.electronAPI.dbCreateTask(task);
		} else {
			// Web: Firebase経由
			const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
			const user = firebaseAuth.getCurrentUser();
			if (user) {
				return firebaseDB.saveTask(user.uid, task);
			}
			return { success: false, error: 'Not authenticated' };
		}
	},

	async getTasks(projectId?: string) {
		if (isElectron()) {
			// Electron: SQLite経由
			return window.electronAPI.dbGetTasks({ projectId });
		} else {
			// Web: Firebase経由
			const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
			const user = firebaseAuth.getCurrentUser();
			if (user) {
				const result = await firebaseDB.getTasks(user.uid);
				if (result.success && result.data) {
					// Firebaseのオブジェクトを配列に変換
					const tasks = Object.values(result.data);
					if (projectId) {
						return { 
							success: true, 
							data: tasks.filter((t: any) => t.projectId === projectId) 
						};
					}
					return { success: true, data: tasks };
				}
			}
			return { success: false, error: 'Not authenticated', data: [] };
		}
	},

	async saveProject(project: any) {
		if (isElectron()) {
			// Electron: 未対応（Reduxで管理）
			return { success: true } as any;
		} else {
			// Web: Firebase経由
			const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
			const user = firebaseAuth.getCurrentUser();
			if (user) {
				return firebaseDB.saveProject(user.uid, project);
			}
			return { success: false, error: 'Not authenticated' };
		}
	},

	async getProjects() {
		if (isElectron()) {
			// Electron: 未対応（Reduxで管理）
			return { success: true, data: [] } as any;
		} else {
			// Web: Firebase経由
			const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
			const user = firebaseAuth.getCurrentUser();
			if (user) {
				const result = await firebaseDB.getProjects(user.uid);
				if (result.success && result.data) {
					return { success: true, data: Object.values(result.data) };
				}
			}
			return { success: false, error: 'Not authenticated', data: [] };
		}
	},

	async saveChatMessage(conversationId: string, message: any) {
		if (isElectron()) {
			// Electron: 未対応
			return { success: true } as any;
		} else {
			// Web: Firebase経由
			const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
			const user = firebaseAuth.getCurrentUser();
			if (user) {
				return firebaseDB.saveChatMessage(user.uid, conversationId, message);
			}
			return { success: false, error: 'Not authenticated' };
		}
	},

	async getChatHistory(conversationId: string) {
		if (isElectron()) {
			// Electron: 未対応
			return { success: true, data: [] } as any;
		} else {
			// Web: Firebase経由
			const { firebaseAuth, firebaseDB } = await import('../../services/firebase');
			const user = firebaseAuth.getCurrentUser();
			if (user) {
				const result = await firebaseDB.getChatHistory(user.uid, conversationId);
				if (result.success && result.data) {
					return { success: true, data: Object.values(result.data) };
				}
			}
			return { success: false, error: 'Not authenticated', data: [] };
		}
	}
};