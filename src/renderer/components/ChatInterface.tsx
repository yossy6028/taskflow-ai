import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addMessage, setLoading } from '../store/slices/chatSlice';

const ChatInterface: React.FC = () => {
  const dispatch = useDispatch();
  const { messages, isLoading } = useSelector((state: RootState) => state.chat);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: new Date(),
    };

    dispatch(addMessage(userMessage));
    setInput('');
    dispatch(setLoading(true));

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await window.electronAPI.geminiChat(input, conversationHistory);
      
      if (response.success) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: response.message,
          timestamp: new Date(),
        };
        
        dispatch(addMessage(assistantMessage));
        
        // Check if the response suggests task breakdown
        if (response.message.includes('タスク') || response.message.includes('分解')) {
          // Optionally trigger task breakdown
          setTimeout(() => handleTaskBreakdown(input), 1000);
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error: unknown) {
      console.error('Error calling Gemini API:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `エラーが発生しました: ${typeof error === 'object' && error !== null && 'message' in (error as { message?: string }) ? (error as { message?: string }).message : '通信エラー'}`,
        timestamp: new Date(),
      };
      dispatch(addMessage(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleTaskBreakdown = async (projectDescription: string) => {
    try {
      const context = {
        industry: '教育・コンサルティング',
        priority: 'medium' as const,
      };
      
      const result = await window.electronAPI.geminiBreakdown(projectDescription, context);
      
      if (result.success && result.data) {
        // TODO: Process and add tasks to the task list
        console.log('Task breakdown result:', result.data);
      }
    } catch (error) {
      console.error('Task breakdown error:', error);
    }
  };

  return (
    <div className="grid grid-rows-[auto,1fr,auto] h-full bg-white dark:bg-neutral-900">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h2 className="text-lg font-semibold">AI対話でタスクを具体化</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          あなたのアイデアを実行可能なタスクに分解します
        </p>
      </div>

      {/* Messages Area */}
      <div className="overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              対話を始めましょう
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              実現したいことや、取り組みたいプロジェクトについて教えてください。
              AIが具体的なタスクに分解してスケジュールを作成します。
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4"
      >
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="プロジェクトやタスクについて教えてください..."
            className="flex-1 input-field"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;