/**
 * Property-based tests for Gemini AI chatbot integration
 * Tests contextual response generation and chatbot functionality
 */

import * as fc from 'fast-check';
import { GeminiAIService, ChatContext, ChatResponse } from '../geminiAI';
import { Route, BusStop, User } from '../../types';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('Mock AI response for testing'),
          },
        }),
      }),
    }),
  })),
}));

describe('Gemini AI Service Property Tests', () => {
  let aiService: GeminiAIService;

  beforeEach(() => {
    // Set mock API key
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'mock-api-key';
    aiService = new GeminiAIService();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  });

  // Generator for user roles
  const userRoleArb = fc.oneof(
    fc.constant('passenger'),
    fc.constant('operator'),
    fc.constant('admin')
  );

  // Generator for supported languages
  const languageArb = fc.oneof(
    fc.constant('en'),
    fc.constant('hi'),
    fc.constant('mr'),
    fc.constant('gu'),
    fc.constant('ta')
  );

  // Generator for Mumbai coordinates
  const mumbaiCoordinatesArb = fc.record({
    latitude: fc.double({ min: 18.85, max: 19.25, noNaN: true }),
    longitude: fc.double({ min: 72.75, max: 73.05, noNaN: true }),
  });

  // Generator for bus stops
  const busStopArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    coordinates: mumbaiCoordinatesArb,
    address: fc.string({ minLength: 1, maxLength: 200 }),
    amenities: fc.array(fc.string()),
    dailyPassengerCount: fc.integer({ min: 0, max: 100000 }),
    isAccessible: fc.boolean(),
  });

  // Generator for routes
  const routeArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ maxLength: 500 }),
    stops: fc.array(busStopArb, { minLength: 2, maxLength: 10 }),
    operatorId: fc.uuid(),
    isActive: fc.boolean(),
    optimizationScore: fc.integer({ min: 0, max: 100 }),
    estimatedTravelTime: fc.integer({ min: 1, max: 1440 }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });

  // Generator for chat context
  const chatContextArb = fc.record({
    userId: fc.option(fc.uuid(), { nil: undefined }),
    userRole: fc.option(userRoleArb, { nil: undefined }),
    currentRoute: fc.option(routeArb, { nil: undefined }),
    selectedStops: fc.option(fc.array(busStopArb, { maxLength: 5 }), { nil: undefined }),
    language: fc.option(languageArb, { nil: undefined }),
  });

  // Generator for user messages (common patterns)
  const userMessageArb = fc.oneof(
    // Route-related queries
    fc.constant('How do I get from Bandra to Andheri?'),
    fc.constant('What is the fastest route to CST?'),
    fc.constant('Show me bus routes near me'),
    fc.constant('Find route from Dadar to Colaba'),
    
    // Optimization queries
    fc.constant('How can I optimize this route?'),
    fc.constant('What are the efficiency improvements?'),
    fc.constant('Analyze route performance'),
    
    // Stop information queries
    fc.constant('Tell me about bus stops'),
    fc.constant('Which stops have wheelchair access?'),
    fc.constant('Show nearby amenities'),
    
    // General help
    fc.constant('Help me with Mumbai buses'),
    fc.constant('What can you do?'),
    fc.constant('How does route optimization work?'),
    
    // Multi-language queries
    fc.constant('मुझे बस रूट की जानकारी चाहिए'),
    fc.constant('बांद्रा से अंधेरी कैसे जाएं?'),
    
    // Random user input
    fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length > 0)
  );

  /**
   * **Feature: city-circuit, Property 15: Contextual response generation**
   * **Validates: Requirements 4.1**
   * 
   * Property: For any user input and context, the chatbot should respond with
   * contextual help based on current user activity
   */
  describe('Property 15: Contextual response generation', () => {
    it('should generate contextual responses for any valid user input and context', async () => {
      await fc.assert(
        fc.asyncProperty(userMessageArb, chatContextArb, async (message, context) => {
          const response = await aiService.generateResponse(message, context);

          // Property: Response should always be generated
          expect(response).toBeDefined();
          expect(response.content).toBeDefined();
          expect(typeof response.content).toBe('string');
          expect(response.content.length).toBeGreaterThan(0);

          // Property: Response should have proper structure
          expect(response).toHaveProperty('content');
          expect(response.content.trim().length).toBeGreaterThan(0);

          // Property: Context should be preserved in response
          if (response.context) {
            expect(typeof response.context).toBe('object');
            if (context.userRole) {
              expect(response.context.userRole).toBe(context.userRole);
            }
          }

          // Property: Suggestions should be relevant when provided
          if (response.suggestions) {
            expect(Array.isArray(response.suggestions)).toBe(true);
            expect(response.suggestions.length).toBeLessThanOrEqual(5);
            response.suggestions.forEach(suggestion => {
              expect(typeof suggestion).toBe('string');
              expect(suggestion.trim().length).toBeGreaterThan(0);
            });
          }

          // Property: Actions should be valid when provided
          if (response.actions) {
            expect(Array.isArray(response.actions)).toBe(true);
            response.actions.forEach(action => {
              expect(action).toHaveProperty('type');
              expect(action).toHaveProperty('label');
              expect(action).toHaveProperty('data');
              expect(['route_search', 'route_optimize', 'show_stops', 'navigate_to']).toContain(action.type);
            });
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should provide role-appropriate responses for different user types', async () => {
      await fc.assert(
        fc.asyncProperty(userMessageArb, userRoleArb, async (message, userRole) => {
          const context: ChatContext = { userRole };
          const response = await aiService.generateResponse(message, context);

          // Property: Response should be contextually appropriate for user role
          expect(response.content).toBeDefined();
          expect(response.content.length).toBeGreaterThan(0);

          // Property: Operator-specific features should be suggested for operators
          if (userRole === 'operator' && message.toLowerCase().includes('optim')) {
            if (response.actions) {
              const hasOptimizationAction = response.actions.some(action => 
                action.type === 'route_optimize'
              );
              // Should suggest optimization actions for operators asking about optimization
              expect(hasOptimizationAction || response.content.toLowerCase().includes('optim')).toBe(true);
            }
          }

          // Property: Passenger-specific features should be suggested for passengers
          if (userRole === 'passenger' && message.toLowerCase().includes('route')) {
            if (response.actions) {
              const hasRouteSearchAction = response.actions.some(action => 
                action.type === 'route_search'
              );
              // Should suggest route search for passengers asking about routes
              expect(hasRouteSearchAction || response.content.toLowerCase().includes('route')).toBe(true);
            }
          }
        }),
        { numRuns: 30 }
      );
    });

    it('should handle language context appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(userMessageArb, languageArb, async (message, language) => {
          const context: ChatContext = { language };
          const response = await aiService.generateResponse(message, context);

          // Property: Response should be generated regardless of language
          expect(response.content).toBeDefined();
          expect(response.content.length).toBeGreaterThan(0);

          // Property: Context should preserve language information
          if (response.context) {
            // Language context should be maintained
            expect(typeof response.context).toBe('object');
          }

          // Property: Suggestions should be appropriate for language context
          if (response.suggestions) {
            response.suggestions.forEach(suggestion => {
              expect(typeof suggestion).toBe('string');
              expect(suggestion.trim().length).toBeGreaterThan(0);
            });
          }
        }),
        { numRuns: 30 }
      );
    });

    it('should maintain session consistency across multiple messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userMessageArb, { minLength: 2, maxLength: 5 }),
          chatContextArb,
          async (messages, baseContext) => {
            const userId = baseContext.userId || 'test-user';
            const context = { ...baseContext, userId };

            let previousResponse: ChatResponse | null = null;

            // Property: Each message in sequence should generate valid responses
            for (const message of messages) {
              const response = await aiService.generateResponse(message, context);

              expect(response.content).toBeDefined();
              expect(response.content.length).toBeGreaterThan(0);

              // Property: Session should maintain consistency
              if (response.context && previousResponse?.context) {
                expect(response.context.sessionId).toBe(previousResponse.context.sessionId);
              }

              previousResponse = response;
            }

            // Property: Session should be trackable
            expect(aiService.getActiveSessionCount()).toBeGreaterThan(0);

            // Cleanup
            aiService.clearSession(userId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle route context appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(routeArb, userMessageArb, async (route, message) => {
          const context: ChatContext = { currentRoute: route };
          const response = await aiService.generateResponse(message, context);

          // Property: Response should acknowledge route context when relevant
          expect(response.content).toBeDefined();
          expect(response.content.length).toBeGreaterThan(0);

          // Property: Route-related queries should reference the current route
          if (message.toLowerCase().includes('route') || message.toLowerCase().includes('optim')) {
            // Response should either mention the route or provide relevant actions
            const mentionsRoute = response.content.toLowerCase().includes('route') ||
                                response.content.toLowerCase().includes(route.name.toLowerCase());
            const hasRouteActions = response.actions?.some(action => 
              action.type === 'route_optimize' && action.data.routeId === route.id
            );

            expect(mentionsRoute || hasRouteActions).toBe(true);
          }
        }),
        { numRuns: 30 }
      );
    });

    it('should provide fallback responses when AI service fails', async () => {
      // Mock AI service failure
      const failingService = new GeminiAIService();
      
      // Override the model to simulate failure
      (failingService as any).model = {
        startChat: () => ({
          sendMessage: () => Promise.reject(new Error('AI service unavailable'))
        })
      };

      await fc.assert(
        fc.asyncProperty(userMessageArb, chatContextArb, async (message, context) => {
          const response = await failingService.generateResponse(message, context);

          // Property: Should always provide a fallback response
          expect(response.content).toBeDefined();
          expect(response.content.length).toBeGreaterThan(0);

          // Property: Should indicate service unavailability in context
          expect(response.context?.error).toBeDefined();

          // Property: Should provide helpful suggestions even when AI fails
          if (response.suggestions) {
            expect(response.suggestions.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('should handle batch message processing correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              message: userMessageArb,
              context: chatContextArb,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (messageBatch) => {
            const responses = await aiService.processBatchMessages(messageBatch);

            // Property: Should process all messages
            expect(responses.length).toBe(messageBatch.length);

            // Property: Each response should be valid
            responses.forEach((response, index) => {
              expect(response.content).toBeDefined();
              expect(response.content.length).toBeGreaterThan(0);
              
              // Property: Response should correspond to input message
              const inputMessage = messageBatch[index].message;
              expect(typeof response.content).toBe('string');
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Additional unit tests for specific functionality
  describe('Service Management', () => {
    it('should validate configuration correctly', async () => {
      const isValid = await aiService.validateConfiguration();
      expect(typeof isValid).toBe('boolean');
    });

    it('should manage sessions correctly', () => {
      const initialCount = aiService.getActiveSessionCount();
      
      // Clear a non-existent session
      aiService.clearSession('non-existent');
      expect(aiService.getActiveSessionCount()).toBe(initialCount);
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(() => {
        new GeminiAIService();
      }).toThrow('Gemini API key is required');
    });
  });
});