import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

// ===== INLINED TYPES AND API =====
interface User {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url?: string;
}

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

interface Conversation {
  id: string;
  traveler_id: string;
  local_id: string;
  last_message_at: string;
  last_message_content?: string;
  last_message_sender_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_avatar?: string;
  unread_count: number;
}

interface ChatListResponse {
  conversations: Conversation[];
  total: number;
  has_more: boolean;
}

interface MessageListResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function getConversations(limit = 20, offset = 0): Promise<ChatListResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(`${API_BASE_URL}/chats/?limit=${limit}&offset=${offset}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  return response.json();
}

async function getMessages(conversationId: string, limit = 50, offset = 0): Promise<MessageListResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(
    `${API_BASE_URL}/chats/${conversationId}/messages?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  return response.json();
}

async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(`${API_BASE_URL}/chats/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      message_type: 'text'
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

async function createConversation(localId: string, initialMessage: string): Promise<Conversation> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(`${API_BASE_URL}/chats/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      local_id: localId,
      initial_message: initialMessage
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.statusText}`);
  }

  return response.json();
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadConversations();
  }, [user, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (selectedConversation) {
      // Poll for new messages every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 3000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getConversations();
      setConversations(response.conversations);

      // Auto-select first conversation if available
      if (response.conversations.length > 0 && !selectedConversation) {
        setSelectedConversation(response.conversations[0]);
        loadMessages(response.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await getMessages(conversationId);
      setMessages(response.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const message = await sendMessage(selectedConversation.id, messageContent);
      setMessages(prev => [...prev, message]);

      // Update conversation list with new last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                last_message_content: messageContent,
                last_message_at: message.created_at,
                last_message_sender_id: message.sender_id
              }
            : conv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!user) return null;

  return (
    <div className=\"min-h-screen bg-white\">
      <Head>
        <title>Messages - LocalGhost</title>
        <meta name=\"description\" content=\"Your conversations with local guides\" />
        <link rel=\"icon\" href=\"/favicon.ico\" />
      </Head>

      <div className=\"flex h-screen\">
        {/* Conversations Sidebar */}
        <div className=\"w-1/3 border-r border-neutral-200 flex flex-col\">
          {/* Sidebar Header */}
          <div className=\"p-4 border-b border-neutral-200\">
            <h1 className=\"text-xl font-bold text-neutral-900\">Messages</h1>
          </div>

          {/* Conversations List */}
          <div className=\"flex-1 overflow-y-auto\">
            {loading ? (
              <div className=\"flex items-center justify-center p-8\">
                <div className=\"animate-spin rounded-full h-6 w-6 border-b-2 border-primary\"></div>
                <span className=\"ml-3 text-neutral-600\">Loading conversations...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className=\"p-8 text-center text-neutral-600\">
                <div className=\"text-4xl mb-4\">💬</div>
                <p className=\"text-lg font-medium mb-2\">No conversations yet</p>
                <p className=\"text-sm\">Start chatting with local guides from their profiles</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    loadMessages(conversation.id);
                  }}
                  className={`p-4 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                >
                  <div className=\"flex items-center space-x-3\">
                    {conversation.other_participant_avatar ? (
                      <img
                        src={conversation.other_participant_avatar}
                        alt={conversation.other_participant_name}
                        className=\"w-12 h-12 rounded-full object-cover\"
                      />
                    ) : (
                      <div className=\"w-12 h-12 bg-primary rounded-full flex items-center justify-center\">
                        <span className=\"text-lg font-bold text-white\">
                          {conversation.other_participant_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className=\"flex-1 min-w-0\">
                      <div className=\"flex items-center justify-between\">
                        <p className=\"text-sm font-medium text-neutral-900 truncate\">
                          {conversation.other_participant_name}
                        </p>
                        <p className=\"text-xs text-neutral-500\">
                          {formatMessageTime(conversation.last_message_at)}
                        </p>
                      </div>
                      <p className=\"text-sm text-neutral-600 truncate\">
                        {conversation.last_message_content || 'No messages yet'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <div className=\"inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full mt-1\">
                          {conversation.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className=\"flex-1 flex flex-col\">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className=\"p-4 border-b border-neutral-200 bg-white\">
                <div className=\"flex items-center space-x-3\">
                  {selectedConversation.other_participant_avatar ? (
                    <img
                      src={selectedConversation.other_participant_avatar}
                      alt={selectedConversation.other_participant_name}
                      className=\"w-10 h-10 rounded-full object-cover\"
                    />
                  ) : (
                    <div className=\"w-10 h-10 bg-primary rounded-full flex items-center justify-center\">
                      <span className=\"text-lg font-bold text-white\">
                        {selectedConversation.other_participant_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className=\"text-lg font-semibold text-neutral-900\">
                      {selectedConversation.other_participant_name}
                    </h2>
                    <p className=\"text-sm text-neutral-600\">Local Guide</p>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className=\"flex-1 overflow-y-auto p-4 space-y-4\">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.sender_id === user.id
                          ? 'bg-primary text-white'
                          : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      <p className=\"text-sm\">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === user.id ? 'text-primary-200' : 'text-neutral-500'
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                        {message.is_edited && <span className=\"ml-1\">(edited)</span>}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className=\"p-4 border-t border-neutral-200 bg-white\">
                {error && (
                  <div className=\"mb-3 p-3 bg-red-50 border border-red-200 rounded-lg\">
                    <p className=\"text-sm text-red-600\">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className=\"text-xs text-red-500 hover:text-red-700 mt-1\"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className=\"flex space-x-3\">
                  <input
                    type=\"text\"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder=\"Type a message...\"
                    className=\"flex-1 px-4 py-2 border border-neutral-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent\"
                    disabled={sendingMessage}
                  />
                  <button
                    type=\"submit\"
                    disabled={!newMessage.trim() || sendingMessage}
                    className=\"px-6 py-2 bg-primary text-white rounded-2xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors\"
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className=\"flex-1 flex items-center justify-center text-neutral-500\">
              <div className=\"text-center\">
                <div className=\"text-6xl mb-4\">💬</div>
                <h3 className=\"text-xl font-medium mb-2\">Select a conversation</h3>
                <p className=\"text-sm\">Choose a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}