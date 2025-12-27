import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GeminiAIService, ChatMessage, ChatResponse, ChatContext } from '../../services/geminiAI';
import { useAuth } from '../../contexts/AuthContext';
import { Route, BusStop } from '../../types';

export interface ChatInterfaceProps {
  context?: Partial<ChatContext>;
  onActionClick?: (action: any) => void;
  className?: string;
  maxHeight?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  context = {},
  onActionClick,
  className = '',
  maxHeight = '400px',
}) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiService] = useState(() => new GeminiAIService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: t('chatbot.welcome') || "Hello! I'm CityCircuit AI. How can I help you with Mumbai bus routes today?",
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [t]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const chatContext: ChatContext = {
        userId: user?.id,
        userRole: user?.role,
        language: user?.profile.preferences.language || 'en',
        sessionHistory: messages,
        ...context,
      };

      const response = await aiService.generateResponse(inputValue, chatContext);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        context: response.context,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Add suggestions as quick reply options if available
      if (response.suggestions && response.suggestions.length > 0) {
        // Store suggestions for quick replies
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: t('errors.chatbot') || 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col bg-white border border-neutral-200 rounded-lg shadow-sm ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-900">CityCircuit AI</h3>
            <p className="text-xs text-neutral-500">{t('chatbot.subtitle') || 'Mumbai Bus Route Assistant'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-neutral-500">{t('chatbot.online') || 'Online'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-primary-100' : 'text-neutral-500'
              }`}>
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 rounded-lg px-4 py-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-neutral-600 ml-2">
                {t('chatbot.typing') || 'AI is typing...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 mb-2">{t('chatbot.suggestions') || 'Try asking:'}</p>
          <div className="flex flex-wrap gap-2">
            {[
              t('chatbot.suggestion1') || 'Find route from Bandra to Andheri',
              t('chatbot.suggestion2') || 'Optimize my current route',
              t('chatbot.suggestion3') || 'Show nearby bus stops',
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chatbot.placeholder') || 'Ask about routes, stops, or optimization...'}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="px-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          {t('chatbot.disclaimer') || 'AI responses are generated and may not always be accurate.'}
        </p>
      </div>
    </div>
  );
};

export { ChatInterface };