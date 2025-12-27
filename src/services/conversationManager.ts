/**
 * Conversation management service for CityCircuit chatbot
 * Handles conversation context, history, and multi-language support
 */

import { ChatMessage, ChatSession } from '../types';

export interface ConversationContext {
  userId: string;
  sessionId: string;
  language: string;
  userRole: 'passenger' | 'operator' | 'admin';
  currentRoute?: string;
  selectedStops?: string[];
  preferences?: Record<string, any>;
}

export interface ConversationSummary {
  sessionId: string;
  messageCount: number;
  startTime: Date;
  lastActivity: Date;
  topics: string[];
  language: string;
  userRole: string;
}

export class ConversationManager {
  private conversations: Map<string, ChatSession> = new Map();
  private contextCache: Map<string, ConversationContext> = new Map();
  private readonly maxHistoryLength: number = 50;
  private readonly sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  /**
   * Create or retrieve a conversation session
   */
  getOrCreateSession(userId: string, language: string = 'en'): ChatSession {
    const existingSession = Array.from(this.conversations.values())
      .find(session => session.userId === userId);

    if (existingSession && !this.isSessionExpired(existingSession)) {
      return existingSession;
    }

    // Create new session
    const newSession: ChatSession = {
      id: this.generateSessionId(),
      userId,
      messages: [],
      language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(newSession.id, newSession);
    return newSession;
  }

  /**
   * Add a message to a conversation
   */
  addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): ChatMessage {
    const session = this.conversations.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const newMessage: ChatMessage = {
      ...message,
      id: this.generateMessageId(),
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date();

    // Trim history if it gets too long
    if (session.messages.length > this.maxHistoryLength) {
      session.messages = session.messages.slice(-this.maxHistoryLength);
    }

    return newMessage;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId: string, limit?: number): ChatMessage[] {
    const session = this.conversations.get(sessionId);
    if (!session) {
      return [];
    }

    const messages = session.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Update conversation context
   */
  updateContext(sessionId: string, context: Partial<ConversationContext>): void {
    const existingContext = this.contextCache.get(sessionId) || {} as ConversationContext;
    const updatedContext = { ...existingContext, ...context };
    this.contextCache.set(sessionId, updatedContext);
  }

  /**
   * Get conversation context
   */
  getContext(sessionId: string): ConversationContext | null {
    return this.contextCache.get(sessionId) || null;
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(sessionId: string): ConversationSummary | null {
    const session = this.conversations.get(sessionId);
    if (!session) {
      return null;
    }

    const topics = this.extractTopics(session.messages);

    return {
      sessionId,
      messageCount: session.messages.length,
      startTime: session.createdAt,
      lastActivity: session.updatedAt,
      topics,
      language: session.language,
      userRole: this.contextCache.get(sessionId)?.userRole || 'passenger',
    };
  }

  /**
   * Search conversations by content
   */
  searchConversations(userId: string, query: string): ChatMessage[] {
    const userSessions = Array.from(this.conversations.values())
      .filter(session => session.userId === userId);

    const matchingMessages: ChatMessage[] = [];
    const lowerQuery = query.toLowerCase();

    for (const session of userSessions) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          matchingMessages.push(message);
        }
      }
    }

    return matchingMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get recent conversations for a user
   */
  getRecentConversations(userId: string, limit: number = 10): ConversationSummary[] {
    const userSessions = Array.from(this.conversations.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);

    return userSessions.map(session => this.getConversationSummary(session.id)!)
      .filter(summary => summary !== null);
  }

  /**
   * Clear old conversations
   */
  clearExpiredSessions(): number {
    let clearedCount = 0;
    const now = new Date();

    for (const [sessionId, session] of this.conversations.entries()) {
      if (this.isSessionExpired(session, now)) {
        this.conversations.delete(sessionId);
        this.contextCache.delete(sessionId);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Delete a specific conversation
   */
  deleteConversation(sessionId: string): boolean {
    const deleted = this.conversations.delete(sessionId);
    this.contextCache.delete(sessionId);
    return deleted;
  }

  /**
   * Export conversation data
   */
  exportConversation(sessionId: string): any {
    const session = this.conversations.get(sessionId);
    const context = this.contextCache.get(sessionId);

    if (!session) {
      return null;
    }

    return {
      session,
      context,
      summary: this.getConversationSummary(sessionId),
      exportedAt: new Date(),
    };
  }

  /**
   * Import conversation data
   */
  importConversation(data: any): boolean {
    try {
      if (!data.session || !data.session.id) {
        return false;
      }

      // Validate and sanitize the data
      const session: ChatSession = {
        id: data.session.id,
        userId: data.session.userId,
        messages: data.session.messages || [],
        language: data.session.language || 'en',
        createdAt: new Date(data.session.createdAt),
        updatedAt: new Date(data.session.updatedAt),
      };

      this.conversations.set(session.id, session);

      if (data.context) {
        this.contextCache.set(session.id, data.context);
      }

      return true;
    } catch (error) {
      console.error('Failed to import conversation:', error);
      return false;
    }
  }

  /**
   * Get conversation statistics
   */
  getStatistics(): {
    totalSessions: number;
    totalMessages: number;
    activeSessionsLast24h: number;
    averageMessagesPerSession: number;
    languageDistribution: Record<string, number>;
  } {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let totalMessages = 0;
    let activeSessionsLast24h = 0;
    const languageDistribution: Record<string, number> = {};

    for (const session of this.conversations.values()) {
      totalMessages += session.messages.length;

      if (session.updatedAt > last24h) {
        activeSessionsLast24h++;
      }

      languageDistribution[session.language] = (languageDistribution[session.language] || 0) + 1;
    }

    return {
      totalSessions: this.conversations.size,
      totalMessages,
      activeSessionsLast24h,
      averageMessagesPerSession: this.conversations.size > 0 ? totalMessages / this.conversations.size : 0,
      languageDistribution,
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: ChatSession, now: Date = new Date()): boolean {
    return (now.getTime() - session.updatedAt.getTime()) > this.sessionTimeout;
  }

  /**
   * Extract topics from conversation messages
   */
  private extractTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();
    const topicKeywords = {
      'route_search': ['route', 'path', 'direction', 'way', 'travel'],
      'optimization': ['optimize', 'improve', 'efficiency', 'better'],
      'stops': ['stop', 'station', 'terminal', 'depot'],
      'schedule': ['time', 'schedule', 'timing', 'departure', 'arrival'],
      'accessibility': ['wheelchair', 'accessible', 'disability', 'access'],
      'fare': ['fare', 'price', 'cost', 'ticket', 'payment'],
    };

    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(keyword => content.includes(keyword))) {
          topics.add(topic);
        }
      }
    }

    return Array.from(topics);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearExpiredSessions();
  }
}