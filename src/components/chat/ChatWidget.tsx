import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../utils/translations';
import { ChatInterface } from './ChatInterface';
import { ChatContext } from '../../services/geminiAI';

export interface ChatWidgetProps {
  context?: Partial<ChatContext>;
  position?: 'bottom-right' | 'bottom-left';
  onActionClick?: (action: any) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  context,
  position = 'bottom-right',
  onActionClick,
}) => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-80 h-96 shadow-2xl rounded-lg overflow-hidden"
          >
            <ChatInterface
              context={context}
              onActionClick={onActionClick}
              maxHeight="320px"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Toggle Button */}
      <motion.button
        onClick={toggleChat}
        className="relative w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-4 focus:ring-primary-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? t('chatbot.close') || 'Close chat' : t('chatbot.open') || 'Open chat'}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* New Message Indicator */}
        {hasNewMessage && !isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
          >
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </motion.div>
        )}

        {/* Pulse Animation for Attention */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 bg-primary-600 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        )}
      </motion.button>

      {/* Tooltip */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, x: position === 'bottom-right' ? 10 : -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`absolute top-1/2 transform -translate-y-1/2 ${
            position === 'bottom-right' ? 'right-16' : 'left-16'
          } bg-neutral-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none`}
        >
          {t('chatbot.tooltip') || 'Need help? Ask CityCircuit AI!'}
          <div
            className={`absolute top-1/2 transform -translate-y-1/2 w-2 h-2 bg-neutral-900 rotate-45 ${
              position === 'bottom-right' ? '-right-1' : '-left-1'
            }`}
          />
        </motion.div>
      )}
    </div>
  );
};

export { ChatWidget };