import axiosClient from './axiosClient';

const chatApi = {
  // Get or create direct conversation with a target user
  getOrCreateDirectConversation: (targetUserId) => {
    return axiosClient.post(`/chat/direct/${targetUserId}`);
  },

  // Get list of user conversations
  getUserConversations: () => {
    return axiosClient.get('/chat/conversations');
  },

  // Get messages of a conversation
  getConversationMessages: (conversationId, params = {}) => {
    return axiosClient.get(`/chat/conversations/${conversationId}/messages`, { params });
  },

  // Send message
  sendMessage: (conversationId, data) => {
    return axiosClient.post(`/chat/conversations/${conversationId}/messages`, data);
  },

  // Mark conversation messages as read
  markAsRead: (conversationId) => {
    return axiosClient.put(`/chat/conversations/${conversationId}/read`);
  },
};

export default chatApi;

