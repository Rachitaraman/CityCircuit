/**
 * Gemini AI integration service for CityCircuit chatbot
 * Provides context-aware responses for bus route optimization queries
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { Route, BusStop, User } from '../types';

export interface ChatContext {
  userId?: string;
  userRole?: 'passenger' | 'operator' | 'admin';
  currentRoute?: Route;
  selectedStops?: BusStop[];
  language?: string;
  sessionHistory?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ChatResponse {
  content: string;
  suggestions?: string[];
  actions?: ChatAction[];
  context?: Record<string, any>;
}

export interface ChatAction {
  type: 'route_search' | 'route_optimize' | 'show_stops' | 'navigate_to';
  label: string;
  data: Record<string, any>;
}

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private activeSessions: Map<string, ChatSession> = new Map();

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key is required. Set NEXT_PUBLIC_GEMINI_API_KEY or GEMINI_API_KEY environment variable.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
  }

  /**
   * Generate context-aware prompt based on user activity and system state
   */
  private generateContextPrompt(context: ChatContext): string {
    const systemPrompt = `You are CityCircuit AI, a helpful assistant for Mumbai's bus route optimization system. 

SYSTEM CONTEXT:
- You help users with bus routes, optimization, and navigation in Mumbai
- You can provide information about routes, stops, travel times, and optimization suggestions
- You should be concise, helpful, and context-aware
- Always consider the user's role and current activity

USER CONTEXT:
- Role: ${context.userRole || 'passenger'}
- Language: ${context.language || 'en'}
${context.currentRoute ? `- Currently viewing route: ${context.currentRoute.name}` : ''}
${context.selectedStops?.length ? `- Selected stops: ${context.selectedStops.map(s => s.name).join(', ')}` : ''}

CAPABILITIES:
- Route search and recommendations
- Route optimization analysis
- Stop information and amenities
- Travel time estimates
- Real-time updates (when available)
- Multi-language support

RESPONSE GUIDELINES:
- Be conversational and helpful
- Provide actionable suggestions when possible
- Use Mumbai-specific context and landmarks
- Consider traffic patterns and peak hours
- Suggest optimizations for operators
- Help passengers find efficient routes
- Respond in ${context.language === 'hi' ? 'Hindi' : context.language === 'mr' ? 'Marathi' : 'English'} when requested

Remember: You're helping improve Mumbai's public transportation through smart route optimization.`;

    return systemPrompt;
  }

  /**
   * Process user message and generate contextual response
   */
  async generateResponse(
    message: string,
    context: ChatContext = {}
  ): Promise<ChatResponse> {
    try {
      const sessionId = context.userId || 'anonymous';
      let chatSession = this.activeSessions.get(sessionId);

      if (!chatSession) {
        const systemPrompt = this.generateContextPrompt(context);
        chatSession = this.model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
            },
            {
              role: 'model',
              parts: [{ text: 'Hello! I\'m CityCircuit AI, your Mumbai bus route assistant. How can I help you optimize your journey today?' }],
            },
          ],
        });
        this.activeSessions.set(sessionId, chatSession);
      }

      // Add context information to the message if available
      let enhancedMessage = message;
      if (context.currentRoute) {
        enhancedMessage += `\n\nCurrent route context: ${context.currentRoute.name} with ${context.currentRoute.stops.length} stops, optimization score: ${context.currentRoute.optimizationScore}%`;
      }

      const result = await chatSession.sendMessage(enhancedMessage);
      const responseText = result.response.text();

      // Parse response for actions and suggestions
      const actions = this.extractActions(responseText, context);
      const suggestions = this.generateSuggestions(message, context);

      return {
        content: responseText,
        suggestions,
        actions,
        context: {
          sessionId,
          timestamp: new Date().toISOString(),
          userRole: context.userRole,
        },
      };
    } catch (error) {
      console.error('Gemini AI error:', error);
      
      // Fallback response
      return {
        content: this.getFallbackResponse(message, context),
        suggestions: ['Try asking about routes', 'Search for bus stops', 'Get optimization tips'],
        context: {
          error: 'AI service temporarily unavailable',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Extract actionable items from AI response
   */
  private extractActions(response: string, context: ChatContext): ChatAction[] {
    const actions: ChatAction[] = [];

    // Route search patterns
    if (response.toLowerCase().includes('search') && response.toLowerCase().includes('route')) {
      actions.push({
        type: 'route_search',
        label: 'Search Routes',
        data: { context: 'ai_suggestion' },
      });
    }

    // Optimization patterns
    if (response.toLowerCase().includes('optim') && context.userRole === 'operator') {
      actions.push({
        type: 'route_optimize',
        label: 'Optimize Route',
        data: { routeId: context.currentRoute?.id },
      });
    }

    // Stop information patterns
    if (response.toLowerCase().includes('stop') && response.toLowerCase().includes('information')) {
      actions.push({
        type: 'show_stops',
        label: 'View Stops',
        data: { context: 'ai_suggestion' },
      });
    }

    return actions;
  }

  /**
   * Generate contextual suggestions based on user input and context
   */
  private generateSuggestions(message: string, context: ChatContext): string[] {
    const suggestions: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Role-based suggestions
    if (context.userRole === 'passenger') {
      if (lowerMessage.includes('route') || lowerMessage.includes('bus')) {
        suggestions.push('Find fastest route to destination');
        suggestions.push('Check real-time bus locations');
      }
      if (lowerMessage.includes('time') || lowerMessage.includes('schedule')) {
        suggestions.push('Show departure times');
        suggestions.push('Get travel time estimates');
      }
    } else if (context.userRole === 'operator') {
      if (lowerMessage.includes('optim') || lowerMessage.includes('improve')) {
        suggestions.push('Analyze route efficiency');
        suggestions.push('Get optimization recommendations');
      }
      if (lowerMessage.includes('passenger') || lowerMessage.includes('crowd')) {
        suggestions.push('View passenger density data');
        suggestions.push('Optimize for peak hours');
      }
    }

    // General suggestions
    if (lowerMessage.includes('help') || lowerMessage.includes('what')) {
      suggestions.push('Ask about Mumbai bus routes');
      suggestions.push('Get route optimization tips');
      suggestions.push('Find nearby bus stops');
    }

    // Language-specific suggestions
    if (context.language === 'hi') {
      suggestions.push('मुंबई बस रूट के बारे में पूछें');
    } else if (context.language === 'mr') {
      suggestions.push('मुंबई बस मार्गाबद्दल विचारा');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Provide fallback response when AI service is unavailable
   */
  private getFallbackResponse(message: string, context: ChatContext): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('route')) {
      return "I can help you find bus routes in Mumbai. Please use the route search feature to find the best path between your origin and destination.";
    }

    if (lowerMessage.includes('optim') && context.userRole === 'operator') {
      return "For route optimization, I recommend analyzing your current route's efficiency score and passenger density data. The optimization feature can suggest improvements.";
    }

    if (lowerMessage.includes('stop')) {
      return "You can find information about bus stops including amenities, accessibility features, and nearby connections using the stops feature.";
    }

    if (context.language === 'hi') {
      return "मैं मुंबई की बस सेवाओं के साथ आपकी सहायता कर सकता हूं। कृपया अपना प्रश्न दोबारा पूछें।";
    }

    if (context.language === 'mr') {
      return "मी मुंबईच्या बस सेवांसाठी मदत करू शकतो. कृपया तुमचा प्रश्न पुन्हा विचारा.";
    }

    return "I'm here to help with Mumbai bus routes and optimization. How can I assist you today?";
  }

  /**
   * Clear chat session for a user
   */
  clearSession(userId: string): void {
    this.activeSessions.delete(userId);
  }

  /**
   * Get active session count (for monitoring)
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Process batch messages for testing or bulk operations
   */
  async processBatchMessages(
    messages: Array<{ message: string; context: ChatContext }>
  ): Promise<ChatResponse[]> {
    const responses: ChatResponse[] = [];

    for (const { message, context } of messages) {
      try {
        const response = await this.generateResponse(message, context);
        responses.push(response);
      } catch (error) {
        responses.push({
          content: this.getFallbackResponse(message, context),
          context: { error: 'Batch processing error' },
        });
      }
    }

    return responses;
  }

  /**
   * Validate API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      const testResponse = await this.generateResponse('Hello', {});
      return testResponse.content.length > 0;
    } catch (error) {
      console.error('Gemini AI configuration validation failed:', error);
      return false;
    }
  }
}