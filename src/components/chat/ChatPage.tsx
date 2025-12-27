import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { motion } from 'framer-motion';
import { ChatInterface } from './ChatInterface';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ConversationManager, ConversationSummary } from '../../services/conversationManager';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';

export interface ChatPageProps {
  className?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const [conversationManager] = useState(() => new ConversationManager());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationSummary[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Initialize conversation session
  useEffect(() => {
    if (user) {
      const session = conversationManager.getOrCreateSession(
        user.id,
        preferences?.language || 'en'
      );
      setCurrentSessionId(session.id);
      
      // Update context
      conversationManager.updateContext(session.id, {
        userId: user.id,
        sessionId: session.id,
        language: preferences?.language || 'en',
        userRole: user.role,
        preferences: preferences || {},
      });

      // Load conversation history
      loadConversationHistory();
    }
  }, [user, preferences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversationManager.cleanup();
    };
  }, []);

  const loadConversationHistory = () => {
    if (user) {
      const history = conversationManager.getRecentConversations(user.id, 20);
      setConversationHistory(history);
    }
  };

  const loadStatistics = () => {
    const stats = conversationManager.getStatistics();
    setStatistics(stats);
  };

  const handleNewConversation = () => {
    if (user) {
      // Clear current session
      if (currentSessionId) {
        conversationManager.deleteConversation(currentSessionId);
      }

      // Create new session
      const session = conversationManager.getOrCreateSession(
        user.id,
        preferences?.language || 'en'
      );
      setCurrentSessionId(session.id);
      
      conversationManager.updateContext(session.id, {
        userId: user.id,
        sessionId: session.id,
        language: preferences?.language || 'en',
        userRole: user.role,
        preferences: preferences || {},
      });

      loadConversationHistory();
    }
  };

  const handleDeleteConversation = (sessionId: string) => {
    conversationManager.deleteConversation(sessionId);
    loadConversationHistory();
    
    if (sessionId === currentSessionId) {
      handleNewConversation();
    }
  };

  const handleExportConversation = (sessionId: string) => {
    const data = conversationManager.exportConversation(sessionId);
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation_${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(preferences?.language || 'en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTopicBadgeVariant = (topic: string) => {
    const variants: Record<string, any> = {
      route_search: 'primary',
      optimization: 'success',
      stops: 'secondary',
      schedule: 'warning',
      accessibility: 'info',
      fare: 'neutral',
    };
    return variants[topic] || 'neutral';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-600">{t('auth.loginRequired') || 'Please log in to use the chat feature.'}</p>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {t('chatbot.title') || 'CityCircuit AI Assistant'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewConversation}
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    }
                  >
                    {t('chatbot.newChat') || 'New Chat'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    {t('chatbot.history') || 'History'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {currentSessionId && (
                <ChatInterface
                  context={{
                    userId: user.id,
                    userRole: user.role,
                    language: preferences?.language || 'en',
                  }}
                  maxHeight="600px"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('chatbot.quickActions') || 'Quick Actions'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              >
                {t('routes.search') || 'Search Routes'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                }
              >
                {t('stops.title') || 'Find Stops'}
              </Button>
              {user.role === 'operator' && (
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                >
                  {t('optimization.title') || 'Optimize Routes'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t('chatbot.recentChats') || 'Recent Chats'}</CardTitle>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={loadStatistics}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversationHistory.slice(0, 5).map((conversation) => (
                  <motion.div
                    key={conversation.sessionId}
                    className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neutral-500">
                        {formatDate(conversation.lastActivity)}
                      </span>
                      <Badge variant="neutral" size="xs">
                        {conversation.messageCount}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {conversation.topics.slice(0, 2).map((topic) => (
                        <Badge
                          key={topic}
                          variant={getTopicBadgeVariant(topic)}
                          size="xs"
                        >
                          {topic.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {conversationHistory.length === 0 && (
                  <p className="text-xs text-neutral-500 text-center py-4">
                    {t('chatbot.noHistory') || 'No conversation history'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('chatbot.statistics') || 'Chat Statistics'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">{t('chatbot.totalChats') || 'Total Chats'}:</span>
                    <span className="font-medium">{statistics.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">{t('chatbot.totalMessages') || 'Total Messages'}:</span>
                    <span className="font-medium">{statistics.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">{t('chatbot.avgMessages') || 'Avg per Chat'}:</span>
                    <span className="font-medium">{Math.round(statistics.averageMessagesPerSession)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Conversation History Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={t('chatbot.conversationHistory') || 'Conversation History'}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {conversationHistory.map((conversation) => (
            <div
              key={conversation.sessionId}
              className="p-4 border border-neutral-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">
                    {formatDate(conversation.startTime)} - {formatDate(conversation.lastActivity)}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {conversation.messageCount} {t('chatbot.messages') || 'messages'} • {conversation.language}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleExportConversation(conversation.sessionId)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleDeleteConversation(conversation.sessionId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {conversation.topics.map((topic) => (
                  <Badge
                    key={topic}
                    variant={getTopicBadgeVariant(topic)}
                    size="xs"
                  >
                    {topic.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export { ChatPage };