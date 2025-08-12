import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// メッセージの最大保持数
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 2000;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentConversationId: string | null;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  currentConversationId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      // メッセージ長の制限
      const message = {
        ...action.payload,
        content: action.payload.content.slice(0, MAX_MESSAGE_LENGTH)
      };
      
      state.messages.push(message);
      
      // メッセージ数の上限を超えた場合、古いメッセージを削除
      if (state.messages.length > MAX_MESSAGES) {
        // 最初の10件を削除（バッチ削除でパフォーマンス向上）
        state.messages = state.messages.slice(-MAX_MESSAGES);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
    },
    setConversationId: (state, action: PayloadAction<string>) => {
      state.currentConversationId = action.payload;
    },
  },
});

export const { addMessage, setLoading, clearChat, setConversationId } = chatSlice.actions;
export default chatSlice.reducer;