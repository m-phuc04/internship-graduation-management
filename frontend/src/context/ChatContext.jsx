import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import chatApi from '../api/chatApi';

const ChatContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const ChatProvider = ({ children }) => {
  const { user: currentUser, token, accessToken } = useAuth();
  const effectiveToken = accessToken || token;
  const socketRef = useRef(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Widget state
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [currentView, setCurrentView] = useState('inbox'); // 'inbox' | 'chat'

  // Conversations list & unread count
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Active chat state
  const [activeChat, setActiveChat] = useState({
    conversationId: null,
    conversation: null,
    otherUser: null,
    messages: [],
    loading: false,
    isTyping: false,
  });

  // Keep ref of activeChat so socket callbacks always have current state without re-triggering effect
  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const isWidgetOpenRef = useRef(isWidgetOpen);
  useEffect(() => {
    isWidgetOpenRef.current = isWidgetOpen;
  }, [isWidgetOpen]);

  // Calculate total unread count across all conversations
  const unreadTotal = isAdmin
    ? 0
    : conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);

  // Fetch all conversations for current user
  const fetchConversations = useCallback(async () => {
    if (!currentUser?._id || !effectiveToken || currentUser?.role === 'ADMIN') return;
    try {
      setLoadingConversations(true);
      const res = await chatApi.getUserConversations();
      if (res?.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.warn('Conversations fetch note:', err?.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUser?._id, effectiveToken]);

  // Initial fetch conversations when user logs in
  useEffect(() => {
    if (currentUser?._id && currentUser?.role !== 'ADMIN') {
      fetchConversations();
    } else {
      setConversations([]);
      setIsWidgetOpen(false);
      setActiveChat({
        conversationId: null,
        conversation: null,
        otherUser: null,
        messages: [],
        loading: false,
        isTyping: false,
      });
    }
  }, [currentUser?._id, currentUser?.role, fetchConversations]);

  // Initialize Socket.IO connection
  useEffect(() => {
    // If not logged in, or is ADMIN: disconnect socket if any and exit
    if (!currentUser?._id || !effectiveToken || currentUser?.role === 'ADMIN') {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
      return;
    }

    let socket = null;
    try {
      socket = io(SOCKET_URL, {
        auth: { token: effectiveToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      socketRef.current = socket;

      // Handle connection errors gracefully without crashing
      socket.on('connect_error', (err) => {
        console.warn('Socket connect note:', err?.message);
      });

      socket.on('error', (err) => {
        console.warn('Socket error note:', err?.message);
      });

      socket.on('connect', () => {
        // Re-join active conversation room if one is open
        if (activeChatRef.current?.conversationId) {
          socket.emit('join_conversation', activeChatRef.current.conversationId);
        }
      });

      // Listen for incoming messages
      socket.on('new_message', ({ conversationId, message }) => {
        if (!message) return;

        // 1. If currently inside this conversation in chat view:
        setActiveChat((prev) => {
          if (prev.conversationId === conversationId) {
            chatApi.markAsRead(conversationId).catch(() => {});
            const exists = (prev.messages || []).some((m) => m._id === message._id);
            return {
              ...prev,
              messages: exists ? prev.messages : [...prev.messages, message],
              isTyping: false,
            };
          }
          return prev;
        });

        // 2. Update conversation in the conversations list
        setConversations((prev) => {
          const index = prev.findIndex((c) => String(c._id) === String(conversationId));
          if (index !== -1) {
            const updated = [...prev];
            const isViewingThisChat =
              activeChatRef.current?.conversationId === conversationId && isWidgetOpenRef.current;
            updated[index] = {
              ...updated[index],
              lastMessage: {
                text: message.text,
                sender: message.sender,
                createdAt: message.createdAt,
              },
              unreadCount: isViewingThisChat ? 0 : (updated[index].unreadCount || 0) + 1,
              updatedAt: message.createdAt || new Date().toISOString(),
            };
            const [movedItem] = updated.splice(index, 1);
            return [movedItem, ...updated];
          } else {
            fetchConversations();
            return prev;
          }
        });
      });

      // Listen for conversation badge updates
      socket.on('conversation_updated', () => {
        fetchConversations();
      });

      // Listen for typing indicators
      socket.on('user_typing', ({ conversationId, userId }) => {
        setActiveChat((prev) => {
          if (prev.conversationId === conversationId && String(userId) !== String(currentUser._id)) {
            return { ...prev, isTyping: true };
          }
          return prev;
        });
      });

      socket.on('user_stop_typing', ({ conversationId, userId }) => {
        setActiveChat((prev) => {
          if (prev.conversationId === conversationId && String(userId) !== String(currentUser._id)) {
            return { ...prev, isTyping: false };
          }
          return prev;
        });
      });
    } catch (socketErr) {
      console.warn('Socket initialization exception:', socketErr);
    }

    return () => {
      if (socket) {
        try {
          socket.disconnect();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
    };
  }, [currentUser?._id, currentUser?.role, effectiveToken, fetchConversations]);

  // Open a specific conversation from the list
  const selectConversation = useCallback(
    async (conv) => {
      if (!conv) return;
      const conversationId = conv._id;

      if (socketRef.current && activeChat.conversationId !== conversationId) {
        try {
          if (activeChat.conversationId) {
            socketRef.current.emit('leave_conversation', activeChat.conversationId);
          }
          socketRef.current.emit('join_conversation', conversationId);
        } catch {
          // ignore
        }
      }

      setIsWidgetOpen(true);
      setCurrentView('chat');

      setActiveChat({
        conversationId,
        conversation: conv,
        otherUser: conv.otherUser,
        messages: [],
        loading: true,
        isTyping: false,
      });

      // Clear unread count locally and in backend
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
      chatApi.markAsRead(conversationId).catch(() => {});

      try {
        const msgRes = await chatApi.getConversationMessages(conversationId, { limit: 50 });
        const messages = msgRes?.success && Array.isArray(msgRes.data) ? msgRes.data : [];
        setActiveChat((prev) => ({
          ...prev,
          messages,
          loading: false,
        }));
      } catch (err) {
        console.warn('Failed to load messages:', err?.message);
        setActiveChat((prev) => ({ ...prev, loading: false }));
      }
    },
    [activeChat.conversationId],
  );

  // Open chat with a target user (called from profile, user cards, etc.)
  const openChatWithUser = useCallback(
    async (targetUserOrId) => {
      if (!targetUserOrId || currentUser?.role === 'ADMIN') return;

      let targetUserId = null;
      let initialUserObj = null;

      if (typeof targetUserOrId === 'string') {
        targetUserId = targetUserOrId;
      } else if (typeof targetUserOrId === 'object') {
        targetUserId =
          targetUserOrId.userId?._id ||
          targetUserOrId.userId ||
          targetUserOrId._id ||
          targetUserOrId.id;
        initialUserObj = targetUserOrId.userId || targetUserOrId;
      }

      if (!targetUserId) return;

      // Don't open chat with oneself
      if (currentUser?._id && String(targetUserId) === String(currentUser._id)) {
        return;
      }

      setIsWidgetOpen(true);
      setCurrentView('chat');

      setActiveChat({
        conversationId: null,
        conversation: null,
        otherUser: initialUserObj || null,
        messages: [],
        loading: true,
        isTyping: false,
      });

      try {
        const res = await chatApi.getOrCreateDirectConversation(targetUserId);
        if (res?.success && res.data) {
          const conversation = res.data;
          const conversationId = conversation._id;

          // Join socket room
          if (socketRef.current) {
            try {
              socketRef.current.emit('join_conversation', conversationId);
            } catch {
              // ignore
            }
          }

          // Fetch recent messages
          const msgRes = await chatApi.getConversationMessages(conversationId, { limit: 50 });
          const messages = msgRes?.success && Array.isArray(msgRes.data) ? msgRes.data : [];

          // Mark as read
          chatApi.markAsRead(conversationId).catch(() => {});

          setActiveChat({
            conversationId,
            conversation,
            otherUser: conversation.otherUser || initialUserObj,
            messages,
            loading: false,
            isTyping: false,
          });

          // Update/Insert in conversations list
          setConversations((prev) => {
            const exists = prev.some((c) => String(c._id) === String(conversationId));
            if (exists) {
              return prev.map((c) =>
                String(c._id) === String(conversationId) ? { ...conversation, unreadCount: 0 } : c,
              );
            }
            return [{ ...conversation, unreadCount: 0 }, ...prev];
          });
        }
      } catch (err) {
        console.warn('Failed to open direct chat:', err?.message);
        setActiveChat((prev) => ({ ...prev, loading: false }));
      }
    },
    [currentUser],
  );

  // Send message
  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim() || !activeChat.conversationId) return;

      const trimmed = text.trim();
      const conversationId = activeChat.conversationId;

      // Stop typing
      if (socketRef.current) {
        try {
          socketRef.current.emit('stop_typing', { conversationId });
        } catch {
          // ignore
        }
      }

      try {
        const res = await chatApi.sendMessage(conversationId, { text: trimmed });
        if (res?.success && res.data) {
          setActiveChat((prev) => {
            const exists = (prev.messages || []).some((m) => m._id === res.data._id);
            if (exists) return prev;
            return {
              ...prev,
              messages: [...prev.messages, res.data],
            };
          });

          // Update conversation lastMessage in list
          setConversations((prev) =>
            prev.map((c) =>
              String(c._id) === String(conversationId)
                ? {
                    ...c,
                    lastMessage: {
                      text: trimmed,
                      sender: currentUser,
                      createdAt: new Date().toISOString(),
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : c,
            ),
          );
        }
      } catch (err) {
        console.warn('Failed to send message:', err?.message);
      }
    },
    [activeChat.conversationId, currentUser],
  );

  // Typing emitter
  const emitTyping = useCallback(
    (isTypingNow) => {
      if (!socketRef.current || !activeChat.conversationId) return;
      try {
        if (isTypingNow) {
          socketRef.current.emit('typing', {
            conversationId: activeChat.conversationId,
            userName: currentUser?.fullName || '',
          });
        } else {
          socketRef.current.emit('stop_typing', {
            conversationId: activeChat.conversationId,
          });
        }
      } catch {
        // ignore
      }
    },
    [activeChat.conversationId, currentUser?.fullName],
  );

  // Toggle widget open/close
  const toggleWidget = useCallback(() => {
    setIsWidgetOpen((prev) => {
      const next = !prev;
      if (next && conversations.length === 0) {
        fetchConversations();
      }
      return next;
    });
  }, [conversations.length, fetchConversations]);

  // Back from chat view to inbox list
  const backToInbox = useCallback(() => {
    if (activeChat.conversationId && socketRef.current) {
      try {
        socketRef.current.emit('leave_conversation', activeChat.conversationId);
      } catch {
        // ignore
      }
    }
    setCurrentView('inbox');
    setActiveChat({
      conversationId: null,
      conversation: null,
      otherUser: null,
      messages: [],
      loading: false,
      isTyping: false,
    });
    fetchConversations();
  }, [activeChat.conversationId, fetchConversations]);

  // Close widget
  const closeWidget = useCallback(() => {
    setIsWidgetOpen(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isWidgetOpen,
        currentView,
        conversations,
        loadingConversations,
        activeChat,
        unreadTotal,
        toggleWidget,
        openChatWithUser,
        selectConversation,
        backToInbox,
        closeWidget,
        sendMessage,
        emitTyping,
        fetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    return {
      isWidgetOpen: false,
      currentView: 'inbox',
      conversations: [],
      loadingConversations: false,
      activeChat: { conversationId: null, messages: [], loading: false, otherUser: null },
      unreadTotal: 0,
      toggleWidget: () => {},
      openChatWithUser: () => {},
      selectConversation: () => {},
      backToInbox: () => {},
      closeWidget: () => {},
      sendMessage: () => {},
      emitTyping: () => {},
      fetchConversations: () => {},
    };
  }
  return context;
};

export default ChatContext;
