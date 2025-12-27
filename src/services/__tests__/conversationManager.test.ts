/**
 * Property-based tests for conversation management and context maintenance
 * Tests conversation context persistence and multi-language chat support
 */

import * as fc from 'fast-check';
import { ConversationManager, ConversationContext } from '../conversationManager';
import { ChatMessage, ChatSession } from '../../types';

describe('Conversation Manager Property Tests', () => {
  let conversationManager: ConversationManager;

  beforeEach(() => {
    conversationManager = new ConversationManager();
  });

  afterEach(() => {
    conversationManager.cleanup();
  });

  // Generator for user IDs
  const userIdArb = fc.uuid();

  // Generator for supported languages
  const languageArb = fc.oneof(
    fc.constant('en'),
    fc.constant('hi'),
    fc.constant('mr'),
    fc.constant('gu'),
    fc.constant('ta')
  );

  // Generator for user roles
  const userRoleArb = fc.oneof(
    fc.constant('passenger'),
    fc.constant('operator'),
    fc.constant('admin')
  );

  // Generator for message content
  const messageContentArb = fc.oneof(
    fc.constant('How do I get from Bandra to Andheri?'),
    fc.constant('What is the fastest route?'),
    fc.constant('Show me optimization suggestions'),
    fc.constant('मुझे बस रूट की जानकारी चाहिए'),
    fc.constant('बांद्रा से अंधेरी कैसे जाएं?'),
    fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
  );

  // Generator for chat messages
  const chatMessageArb = fc.record({
    content: messageContentArb,
    role: fc.oneof(fc.constant('user'), fc.constant('assistant')),
    timestamp: fc.date(),
    context: fc.option(fc.record({
      routeId: fc.option(fc.uuid(), { nil: undefined }),
      stopIds: fc.option(fc.array(fc.uuid(), { maxLength: 5 }), { nil: undefined }),
    }), { nil: undefined }),
  });

  // Generator for conversation context
  const conversationContextArb = fc.record({
    userId: userIdArb,
    sessionId: fc.uuid(),
    language: languageArb,
    userRole: userRoleArb,
    currentRoute: fc.option(fc.uuid(), { nil: undefined }),
    selectedStops: fc.option(fc.array(fc.uuid(), { maxLength: 10 }), { nil: undefined }),
    preferences: fc.option(fc.record({
      theme: fc.oneof(fc.constant('light'), fc.constant('dark')),
      notifications: fc.boolean(),
    }), { nil: undefined }),
  });

  /**
   * **Feature: city-circuit, Property 18: Conversation context maintenance**
   * **Validates: Requirements 4.5**
   * 
   * Property: For any conversation, the system should maintain conversation 
   * context for better assistance across multiple interactions
   */
  describe('Property 18: Conversation context maintenance', () => {
    it('should maintain conversation context across multiple messages', () => {
      fc.assert(
        fc.property(
          userIdArb,
          languageArb,
          conversationContextArb,
          fc.array(chatMessageArb, { minLength: 1, maxLength: 10 }),
          (userId, language, context, messages) => {
            // Property: Session creation should be consistent
            const session1 = conversationManager.getOrCreateSession(userId, language);
            const session2 = conversationManager.getOrCreateSession(userId, language);
            
            expect(session1.id).toBe(session2.id); // Same user should get same session
            expect(session1.userId).toBe(userId);
            expect(session1.language).toBe(language);

            // Property: Context should be maintainable
            conversationManager.updateContext(session1.id, context);
            const retrievedContext = conversationManager.getContext(session1.id);
            
            expect(retrievedContext).not.toBeNull();
            expect(retrievedContext?.userId).toBe(context.userId);
            expect(retrievedContext?.language).toBe(context.language);
            expect(retrievedContext?.userRole).toBe(context.userRole);

            // Property: Messages should be addable and retrievable
            const addedMessages: ChatMessage[] = [];
            for (const messageData of messages) {
              const addedMessage = conversationManager.addMessage(session1.id, messageData);
              addedMessages.push(addedMessage);
              
              expect(addedMessage.id).toBeDefined();
              expect(addedMessage.content).toBe(messageData.content);
              expect(addedMessage.role).toBe(messageData.role);
            }

            // Property: Conversation history should be complete and ordered
            const history = conversationManager.getConversationHistory(session1.id);
            expect(history.length).toBe(messages.length);
            
            for (let i = 0; i < history.length; i++) {
              expect(history[i].content).toBe(messages[i].content);
              expect(history[i].role).toBe(messages[i].role);
            }

            // Property: Context should persist across message additions
            const contextAfterMessages = conversationManager.getContext(session1.id);
            expect(contextAfterMessages?.userId).toBe(context.userId);
            expect(contextAfterMessages?.language).toBe(context.language);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle context updates correctly for any valid context data', () => {
      fc.assert(
        fc.property(
          userIdArb,
          languageArb,
          fc.array(conversationContextArb, { minLength: 1, maxLength: 5 }),
          (userId, language, contextUpdates) => {
            const session = conversationManager.getOrCreateSession(userId, language);

            let expectedContext: Partial<ConversationContext> = {};

            // Property: Sequential context updates should be cumulative
            for (const contextUpdate of contextUpdates) {
              conversationManager.updateContext(session.id, contextUpdate);
              expectedContext = { ...expectedContext, ...contextUpdate };

              const currentContext = conversationManager.getContext(session.id);
              expect(currentContext).not.toBeNull();

              // Verify all expected fields are present
              Object.keys(expectedContext).forEach(key => {
                expect(currentContext![key as keyof ConversationContext]).toBe(
                  expectedContext[key as keyof ConversationContext]
                );
              });
            }

            // Property: Final context should contain all updates
            const finalContext = conversationManager.getContext(session.id);
            expect(finalContext).toEqual(expectedContext);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain separate contexts for different users', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(userIdArb, languageArb, conversationContextArb), { minLength: 2, maxLength: 5 }),
          (userSessions) => {
            const sessions: Array<{ session: ChatSession; context: ConversationContext }> = [];

            // Property: Each user should have independent context
            for (const [userId, language, context] of userSessions) {
              const session = conversationManager.getOrCreateSession(userId, language);
              conversationManager.updateContext(session.id, context);
              sessions.push({ session, context });
            }

            // Property: Contexts should not interfere with each other
            for (let i = 0; i < sessions.length; i++) {
              const { session, context } = sessions[i];
              const retrievedContext = conversationManager.getContext(session.id);
              
              expect(retrievedContext?.userId).toBe(context.userId);
              expect(retrievedContext?.language).toBe(context.language);
              expect(retrievedContext?.userRole).toBe(context.userRole);

              // Property: Context should not contain data from other users
              for (let j = 0; j < sessions.length; j++) {
                if (i !== j) {
                  const otherContext = sessions[j].context;
                  if (context.userId !== otherContext.userId) {
                    expect(retrievedContext?.userId).not.toBe(otherContext.userId);
                  }
                }
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle conversation search correctly', () => {
      fc.assert(
        fc.property(
          userIdArb,
          languageArb,
          fc.array(messageContentArb, { minLength: 3, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (userId, language, messageContents, searchQuery) => {
            const session = conversationManager.getOrCreateSession(userId, language);

            // Add messages to conversation
            const addedMessages: ChatMessage[] = [];
            for (const content of messageContents) {
              const message = conversationManager.addMessage(session.id, {
                content,
                role: 'user',
                timestamp: new Date(),
              });
              addedMessages.push(message);
            }

            // Property: Search should return relevant messages
            const searchResults = conversationManager.searchConversations(userId, searchQuery);
            
            // All results should belong to the user
            searchResults.forEach(message => {
              expect(addedMessages.some(added => added.id === message.id)).toBe(true);
            });

            // Property: Search results should contain the query (case-insensitive)
            const lowerQuery = searchQuery.toLowerCase();
            searchResults.forEach(message => {
              expect(message.content.toLowerCase()).toContain(lowerQuery);
            });

            // Property: Results should be sorted by timestamp (newest first)
            for (let i = 1; i < searchResults.length; i++) {
              expect(searchResults[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
                searchResults[i].timestamp.getTime()
              );
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should generate accurate conversation summaries', () => {
      fc.assert(
        fc.property(
          userIdArb,
          languageArb,
          userRoleArb,
          fc.array(chatMessageArb, { minLength: 1, maxLength: 20 }),
          (userId, language, userRole, messages) => {
            const session = conversationManager.getOrCreateSession(userId, language);
            
            // Set up context
            conversationManager.updateContext(session.id, {
              userId,
              sessionId: session.id,
              language,
              userRole,
            });

            // Add messages
            for (const messageData of messages) {
              conversationManager.addMessage(session.id, messageData);
            }

            // Property: Summary should accurately reflect conversation
            const summary = conversationManager.getConversationSummary(session.id);
            expect(summary).not.toBeNull();
            
            if (summary) {
              expect(summary.sessionId).toBe(session.id);
              expect(summary.messageCount).toBe(messages.length);
              expect(summary.language).toBe(language);
              expect(summary.userRole).toBe(userRole);
              expect(summary.startTime).toEqual(session.createdAt);
              expect(summary.lastActivity).toEqual(session.updatedAt);

              // Property: Topics should be extracted from message content
              expect(Array.isArray(summary.topics)).toBe(true);
              
              // Property: Topics should be relevant to message content
              const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
              summary.topics.forEach(topic => {
                // Topic should be a valid topic category
                expect(['route_search', 'optimization', 'stops', 'schedule', 'accessibility', 'fare'])
                  .toContain(topic);
              });
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle conversation export and import correctly', () => {
      fc.assert(
        fc.property(
          userIdArb,
          languageArb,
          conversationContextArb,
          fc.array(chatMessageArb, { minLength: 1, maxLength: 5 }),
          (userId, language, context, messages) => {
            const session = conversationManager.getOrCreateSession(userId, language);
            conversationManager.updateContext(session.id, context);

            // Add messages
            for (const messageData of messages) {
              conversationManager.addMessage(session.id, messageData);
            }

            // Property: Export should contain complete conversation data
            const exportData = conversationManager.exportConversation(session.id);
            expect(exportData).not.toBeNull();
            expect(exportData.session).toBeDefined();
            expect(exportData.context).toBeDefined();
            expect(exportData.summary).toBeDefined();
            expect(exportData.exportedAt).toBeDefined();

            // Property: Exported session should match original
            expect(exportData.session.id).toBe(session.id);
            expect(exportData.session.userId).toBe(userId);
            expect(exportData.session.language).toBe(language);
            expect(exportData.session.messages.length).toBe(messages.length);

            // Property: Import should recreate the conversation
            const newManager = new ConversationManager();
            const importSuccess = newManager.importConversation(exportData);
            expect(importSuccess).toBe(true);

            // Verify imported data
            const importedHistory = newManager.getConversationHistory(session.id);
            expect(importedHistory.length).toBe(messages.length);

            const importedContext = newManager.getContext(session.id);
            expect(importedContext?.userId).toBe(context.userId);
            expect(importedContext?.language).toBe(context.language);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should manage session lifecycle correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(userIdArb, languageArb), { minLength: 1, maxLength: 10 }),
          (userLanguagePairs) => {
            const createdSessions: string[] = [];

            // Property: Session creation should be consistent
            for (const [userId, language] of userLanguagePairs) {
              const session = conversationManager.getOrCreateSession(userId, language);
              createdSessions.push(session.id);
              
              expect(session.userId).toBe(userId);
              expect(session.language).toBe(language);
              expect(session.messages).toEqual([]);
            }

            // Property: Statistics should reflect created sessions
            const stats = conversationManager.getStatistics();
            expect(stats.totalSessions).toBeGreaterThan(0);
            expect(stats.totalMessages).toBe(0); // No messages added yet
            expect(stats.languageDistribution).toBeDefined();

            // Property: Session deletion should work correctly
            const sessionToDelete = createdSessions[0];
            const deleteSuccess = conversationManager.deleteConversation(sessionToDelete);
            expect(deleteSuccess).toBe(true);

            // Property: Deleted session should not be retrievable
            const deletedHistory = conversationManager.getConversationHistory(sessionToDelete);
            expect(deletedHistory).toEqual([]);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Additional unit tests for edge cases
  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent session gracefully', () => {
      const nonExistentId = 'non-existent-session';
      
      expect(() => {
        conversationManager.addMessage(nonExistentId, {
          content: 'test',
          role: 'user',
          timestamp: new Date(),
        });
      }).toThrow();

      expect(conversationManager.getConversationHistory(nonExistentId)).toEqual([]);
      expect(conversationManager.getContext(nonExistentId)).toBeNull();
      expect(conversationManager.getConversationSummary(nonExistentId)).toBeNull();
    });

    it('should handle empty search queries', () => {
      const userId = 'test-user';
      const session = conversationManager.getOrCreateSession(userId);
      
      conversationManager.addMessage(session.id, {
        content: 'test message',
        role: 'user',
        timestamp: new Date(),
      });

      const results = conversationManager.searchConversations(userId, '');
      expect(results).toEqual([]);
    });

    it('should handle conversation history limits', () => {
      const userId = 'test-user';
      const session = conversationManager.getOrCreateSession(userId);

      // Add more messages than the limit (50)
      for (let i = 0; i < 60; i++) {
        conversationManager.addMessage(session.id, {
          content: `Message ${i}`,
          role: 'user',
          timestamp: new Date(),
        });
      }

      const history = conversationManager.getConversationHistory(session.id);
      expect(history.length).toBeLessThanOrEqual(50);
      
      // Should keep the most recent messages
      expect(history[history.length - 1].content).toBe('Message 59');
    });

    it('should handle invalid import data', () => {
      const invalidData = [
        null,
        undefined,
        {},
        { session: null },
        { session: { id: null } },
        'invalid json string',
      ];

      invalidData.forEach(data => {
        const result = conversationManager.importConversation(data);
        expect(result).toBe(false);
      });
    });
  });
});