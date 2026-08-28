import chatService from "../services/chatService.js";
import { emitNewMessage, emitMessageRead } from "../socket/socketHandler.js";

/**
 * Get or create a direct conversation with target user
 * POST /api/chat/direct/:targetUserId
 */
const getOrCreateDirectConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const { targetUserId } = req.params;

    const conversation = await chatService.getOrCreateDirectConversation(
      currentUserId,
      targetUserId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy thông tin cuộc hội thoại thành công",
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations of logged in user
 * GET /api/chat/conversations
 */
const getUserConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const conversations = await chatService.getUserConversations(currentUserId);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách cuộc hội thoại thành công",
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages of a conversation
 * GET /api/chat/conversations/:id/messages
 */
const getConversationMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;
    const { page, limit } = req.query;

    const result = await chatService.getConversationMessages(
      conversationId,
      currentUserId,
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      message: "Lấy lịch sử tin nhắn thành công",
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message
 * POST /api/chat/conversations/:id/messages
 */
const sendMessage = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;
    const { text, attachments } = req.body;

    const message = await chatService.sendMessage(
      conversationId,
      currentUserId,
      text,
      attachments,
      (conv, msg) => emitNewMessage(conv, msg),
    );

    res.status(201).json({
      success: true,
      message: "Gửi tin nhắn thành công",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages in conversation as read
 * PUT /api/chat/conversations/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;

    await chatService.markAsRead(
      conversationId,
      currentUserId,
      (convId, uId) => emitMessageRead(convId, uId),
    );

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu đã đọc",
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getOrCreateDirectConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
};

