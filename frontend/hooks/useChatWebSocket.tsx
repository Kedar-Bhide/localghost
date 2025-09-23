import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'booking_request' | 'booking_confirmation';
  status: 'sent' | 'delivered' | 'read';
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  read_at?: string;
  delivered_at?: string;
  sender_name: string;
  sender_avatar?: string;
}

interface TypingStatus {
  user_id: string;
  is_typing: boolean;
}

interface UseChatWebSocketOptions {
  conversationId: string | null;
  onNewMessage?: (message: Message) => void;
  onTypingStatus?: (status: TypingStatus) => void;
  onMessagesRead?: (messageIds: string[], readerId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface ChatWebSocketReturn {
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (content: string, messageType?: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  markMessagesAsRead: (messageIds: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useChatWebSocket(options: UseChatWebSocketOptions): ChatWebSocketReturn {
  const {
    conversationId,
    onNewMessage,
    onTypingStatus,
    onMessagesRead,
    onConnectionChange
  } = options;

  const [typingTimeoutId, setTypingTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Get token for WebSocket authentication
  const getToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  }, []);

  // Build WebSocket URL
  const wsUrl = conversationId ?
    `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/v1/ws/chats/${conversationId}?token=${getToken()}` :
    null;

  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connection_established':
        console.log('WebSocket connection established');
        break;

      case 'new_message':
        if (data.message && onNewMessage) {
          onNewMessage(data.message);
        }
        break;

      case 'typing_status':
        if (onTypingStatus) {
          onTypingStatus({
            user_id: data.user_id,
            is_typing: data.is_typing
          });
        }
        break;

      case 'messages_read':
        if (onMessagesRead) {
          onMessagesRead(data.message_ids, data.reader_id);
        }
        break;

      case 'error':
        console.error('WebSocket error:', data.message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, [onNewMessage, onTypingStatus, onMessagesRead]);

  const handleOpen = useCallback(() => {
    console.log('Chat WebSocket connected');
    onConnectionChange?.(true);
  }, [onConnectionChange]);

  const handleClose = useCallback(() => {
    console.log('Chat WebSocket disconnected');
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const handleError = useCallback((error: Event) => {
    console.error('Chat WebSocket error:', error);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const { connectionState, sendMessage: sendWsMessage, connect, disconnect } = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
    reconnectAttempts: 5,
    reconnectInterval: 3000
  });

  const sendMessage = useCallback((content: string, messageType: string = 'text') => {
    sendWsMessage({
      type: 'send_message',
      content: content.trim(),
      message_type: messageType
    });
  }, [sendWsMessage]);

  const startTyping = useCallback(() => {
    sendWsMessage({
      type: 'typing_start'
    });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutId) {
      clearTimeout(typingTimeoutId);
    }

    const timeoutId = setTimeout(() => {
      sendWsMessage({
        type: 'typing_stop'
      });
    }, 3000);

    setTypingTimeoutId(timeoutId);
  }, [sendWsMessage, typingTimeoutId]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutId) {
      clearTimeout(typingTimeoutId);
      setTypingTimeoutId(null);
    }

    sendWsMessage({
      type: 'typing_stop'
    });
  }, [sendWsMessage, typingTimeoutId]);

  const markMessagesAsRead = useCallback((messageIds: string[]) => {
    if (messageIds.length > 0) {
      sendWsMessage({
        type: 'mark_as_read',
        message_ids: messageIds
      });
    }
  }, [sendWsMessage]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
      }
    };
  }, [typingTimeoutId]);

  // Send periodic ping to keep connection alive
  useEffect(() => {
    if (connectionState === 'connected') {
      const pingInterval = setInterval(() => {
        sendWsMessage({
          type: 'ping'
        });
      }, 30000); // Ping every 30 seconds

      return () => clearInterval(pingInterval);
    }
  }, [connectionState, sendWsMessage]);

  return {
    connectionState,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    connect,
    disconnect
  };
}