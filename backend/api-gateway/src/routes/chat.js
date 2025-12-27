/**
 * Chat and AI assistant routes for CityCircuit API Gateway
 * Handles integration with Gemini AI for chatbot functionality
 */

const express = require('express');
const axios = require('axios');
const { 
  optionalAuth,
  authenticate 
} = require('../middleware/auth');
const { 
  validateChatMessage,
  sanitizeInput 
} = require('../middleware/validation');
const { chatRateLimit } = require('../middleware/security');
const { asyncHandler, APIError } = require('../middleware/errorHandler');

const router = express.Router();

// Apply rate limiting to chat routes
router.use(chatRateLimit);

// Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Send message to chatbot
 * POST /api/chat/message
 */
router.post('/message',
  optionalAuth,
  sanitizeInput,
  validateChatMessage,
  asyncHandler(async (req, res) => {
    const { message, context = {}, language = 'en' } = req.body;
    const userId = req.user?.id || 'anonymous';

    try {
      let chatResponse;

      if (GEMINI_API_KEY) {
        // Prepare context for Gemini AI
        const systemPrompt = `You are a helpful assistant for CityCircuit, a bus route optimization system for Mumbai. 
        You help users with:
        - Finding bus routes between locations
        - Understanding route optimization features
        - Explaining how to use the platform
        - Providing information about Mumbai's public transportation
        
        Keep responses concise, helpful, and focused on transportation and the CityCircuit platform.
        Respond in ${language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English'}.`;

        const prompt = `${systemPrompt}\n\nUser: ${message}`;

        const response = await axios.post(GEMINI_API_URL, {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          },
          timeout: 15000
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
          chatResponse = {
            message: response.data.candidates[0].content.parts[0].text,
            confidence: 0.9,
            provider: 'gemini',
            language,
            context: {
              conversationId: context.conversationId || `conv_${Date.now()}`,
              messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
          };
        }
      } else {
        // Fallback to rule-based responses for development
        chatResponse = generateFallbackResponse(message, language, context);
      }

      // TODO: Store conversation in database for context maintenance
      
      res.json({
        response: chatResponse,
        timestamp: new Date().toISOString(),
        userId
      });

    } catch (error) {
      if (error.code === 'ETIMEDOUT') {
        throw new APIError('Chat service timeout', 504, 'CHAT_TIMEOUT');
      } else if (error.response?.status === 403) {
        throw new APIError('Invalid API key for chat service', 403, 'INVALID_CHAT_API_KEY');
      } else {
        // Fallback to rule-based response on AI service failure
        const fallbackResponse = generateFallbackResponse(message, language, context);
        
        res.json({
          response: fallbackResponse,
          timestamp: new Date().toISOString(),
          userId,
          fallback: true
        });
      }
    }
  })
);

/**
 * Get conversation history
 * GET /api/chat/conversations/:conversationId
 */
router.get('/conversations/:conversationId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // TODO: Fetch conversation history from database
    // For now, return mock data
    const mockConversation = {
      id: conversationId,
      userId: req.user.id,
      messages: [
        {
          id: 'msg_001',
          type: 'user',
          content: 'How do I find routes between CST and Gateway of India?',
          timestamp: '2024-01-15T10:30:00.000Z'
        },
        {
          id: 'msg_002',
          type: 'assistant',
          content: 'You can use the route search feature by entering CST as origin and Gateway of India as destination. The system will show you all available routes with travel times and transfers.',
          timestamp: '2024-01-15T10:30:15.000Z'
        }
      ],
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:15.000Z'
    };

    res.json({
      conversation: mockConversation,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockConversation.messages.length,
        pages: Math.ceil(mockConversation.messages.length / limit)
      }
    });
  })
);

/**
 * Get user's conversation list
 * GET /api/chat/conversations
 */
router.get('/conversations',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // TODO: Fetch user's conversations from database
    const mockConversations = [
      {
        id: 'conv_001',
        title: 'Route Search Help',
        lastMessage: 'Thank you for the help!',
        messageCount: 8,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:45:00.000Z'
      }
    ];

    res.json({
      conversations: mockConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockConversations.length,
        pages: Math.ceil(mockConversations.length / limit)
      }
    });
  })
);

/**
 * Delete conversation
 * DELETE /api/chat/conversations/:conversationId
 */
router.delete('/conversations/:conversationId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    // TODO: Delete conversation from database (check ownership)

    res.json({
      message: 'Conversation deleted successfully'
    });
  })
);

/**
 * Get chat service status
 * GET /api/chat/status
 */
router.get('/status',
  asyncHandler(async (req, res) => {
    res.json({
      service: 'chat',
      status: 'operational',
      ai_provider: GEMINI_API_KEY ? 'gemini' : 'fallback',
      supported_languages: ['en', 'hi', 'mr', 'gu'],
      features: [
        'route_assistance',
        'platform_help',
        'multilingual_support',
        'conversation_history'
      ],
      fallback_available: true
    });
  })
);

/**
 * Generate fallback response for when AI service is unavailable
 * @param {string} message - User message
 * @param {string} language - Response language
 * @param {Object} context - Conversation context
 * @returns {Object} Fallback response
 */
function generateFallbackResponse(message, language, context) {
  const lowerMessage = message.toLowerCase();
  
  // Route-related responses
  if (lowerMessage.includes('route') || lowerMessage.includes('bus')) {
    return {
      message: language === 'hi' 
        ? 'आप रूट खोजने के लिए मुख्य पृष्ठ पर जा सकते हैं और अपना प्रारंभिक और गंतव्य स्थान दर्ज कर सकते हैं।'
        : 'You can search for routes by going to the main page and entering your origin and destination locations.',
      confidence: 0.7,
      provider: 'fallback',
      language,
      context: {
        conversationId: context.conversationId || `conv_${Date.now()}`,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };
  }
  
  // Optimization-related responses
  if (lowerMessage.includes('optim') || lowerMessage.includes('improve')) {
    return {
      message: language === 'hi'
        ? 'रूट ऑप्टिमाइज़ेशन सुविधा का उपयोग करके आप अपने रूट की दक्षता में सुधार कर सकते हैं।'
        : 'You can improve route efficiency using our route optimization feature available for operators.',
      confidence: 0.7,
      provider: 'fallback',
      language,
      context: {
        conversationId: context.conversationId || `conv_${Date.now()}`,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };
  }
  
  // Help-related responses
  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return {
      message: language === 'hi'
        ? 'मैं CityCircuit प्लेटफॉर्म के साथ आपकी सहायता कर सकता हूं। आप रूट खोजने, ऑप्टिमाइज़ेशन, या प्लेटफॉर्म सुविधाओं के बारे में पूछ सकते हैं।'
        : 'I can help you with the CityCircuit platform. You can ask about finding routes, optimization, or platform features.',
      confidence: 0.8,
      provider: 'fallback',
      language,
      context: {
        conversationId: context.conversationId || `conv_${Date.now()}`,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };
  }
  
  // Default response
  return {
    message: language === 'hi'
      ? 'मुझे खुशी होगी कि मैं आपकी सहायता कर सकूं। कृपया CityCircuit प्लेटफॉर्म के बारे में अपना प्रश्न पूछें।'
      : 'I\'d be happy to help you with CityCircuit. Please ask me about routes, optimization, or how to use the platform.',
    confidence: 0.6,
    provider: 'fallback',
    language,
    context: {
      conversationId: context.conversationId || `conv_${Date.now()}`,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  };
}

module.exports = router;