import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";

/**
 * Format conversation and attach helper information
 */
const formatConversationForUser = async (conversation, currentUserId) => {
  const convObj = conversation.toObject ? conversation.toObject() : conversation;
  
  // Find other participant(s)
  const otherParticipants = (convObj.participants || []).filter(
    (p) => String(p.user?._id || p.user) !== String(currentUserId),
  );

  // If 1-on-1 direct conversation, get detailed profile of the other user
  const otherUser = otherParticipants[0]?.user || null;
  let academicTitle = null;

  if (otherUser?._id && otherUser.role === "LECTURER") {
    const lec = await Lecturer.findOne({ userId: otherUser._id }).select("academicTitle");
    if (lec) academicTitle = lec.academicTitle;
  }

  // Get current user unread count
  const myParticipant = (convObj.participants || []).find(
    (p) => String(p.user?._id || p.user) === String(currentUserId),
  );

  return {
    ...convObj,
    otherUser: otherUser
      ? {
          ...otherUser,
          academicTitle,
          displayName: academicTitle
            ? `${academicTitle} ${otherUser.fullName}`
            : otherUser.fullName,
        }
      : null,
    unreadCount: myParticipant?.unreadCount || 0,
  };
};

/**
 * Get or create a direct conversation between two users
 */
const getOrCreateDirectConversation = async (userId1, userId2) => {
  if (!userId1 || !userId2) {
    throw new Error("Cần đầy đủ thông tin người gửi và người nhận");
  }

  if (String(userId1) === String(userId2)) {
    throw new Error("Không thể tạo cuộc trò chuyện với chính mình");
  }

  // Check if target user exists
  const targetUser = await User.findById(userId2).select("_id fullName email avatar role isActive");
  if (!targetUser) {
    throw new Error("Người nhận không tồn tại");
  }

  // Find existing direct conversation
  let conversation = await Conversation.findOne({
    type: "DIRECT",
    "participants.user": { $all: [userId1, userId2] },
    participants: { $size: 2 },
  }).populate("participants.user", "_id fullName email avatar role isActive");

  if (!conversation) {
    // Create new direct conversation
    conversation = await Conversation.create({
      type: "DIRECT",
      participants: [
        { user: userId1, unreadCount: 0, lastSeenAt: new Date() },
        { user: userId2, unreadCount: 0, lastSeenAt: new Date() },
      ],
      lastMessage: {
        text: "Bắt đầu cuộc trò chuyện",
        sender: userId1,
        createdAt: new Date(),
      },
    });

    conversation = await Conversation.findById(conversation._id).populate(
      "participants.user",
      "_id fullName email avatar role isActive",
    );
  }

  return await formatConversationForUser(conversation, userId1);
};

/**
 * Get all conversations for a user
 */
const getUserConversations = async (userId) => {
  const conversations = await Conversation.find({
    "participants.user": userId,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .populate("participants.user", "_id fullName email avatar role isActive")
    .populate("lastMessage.sender", "_id fullName");

  const formattedList = await Promise.all(
    conversations.map((c) => formatConversationForUser(c, userId)),
  );

  return formattedList;
};

/**
 * Get messages in a conversation
 */
const getConversationMessages = async (conversationId, userId, page = 1, limit = 50) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    "participants.user": userId,
  });

  if (!conversation) {
    throw new Error("Bạn không có quyền truy cập cuộc trò chuyện này");
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "_id fullName avatar role email"),
    Message.countDocuments({ conversationId }),
  ]);

  return {
    messages,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Send a message
 */
const sendMessage = async (conversationId, senderId, text = "", attachments = [], socketEmitter = null) => {
  if (!text.trim() && (!attachments || attachments.length === 0)) {
    throw new Error("Tin nhắn không được để trống");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    "participants.user": senderId,
  });

  if (!conversation) {
    throw new Error("Cuộc trò chuyện không tồn tại hoặc bạn không phải thành viên");
  }

  // Create message
  const newMessage = await Message.create({
    conversationId,
    sender: senderId,
    text: text.trim(),
    attachments: attachments || [],
    isRead: false,
  });

  const populatedMessage = await Message.findById(newMessage._id).populate(
    "sender",
    "_id fullName avatar role email",
  );

  // Update conversation lastMessage & unread count
  conversation.lastMessage = {
    text: text.trim() || (attachments.length > 0 ? "[Đính kèm tệp]" : ""),
    sender: senderId,
    createdAt: new Date(),
  };

  conversation.participants.forEach((p) => {
    if (String(p.user) !== String(senderId)) {
      p.unreadCount = (p.unreadCount || 0) + 1;
    } else {
      p.lastSeenAt = new Date();
    }
  });

  await conversation.save();

  // Socket notification if emitter is provided
  if (socketEmitter && typeof socketEmitter === "function") {
    socketEmitter(conversation, populatedMessage);
  }

  return populatedMessage;
};

/**
 * Mark messages in a conversation as read by a user
 */
const markAsRead = async (conversationId, userId, socketEmitter = null) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    "participants.user": userId,
  });

  if (!conversation) return;

  // Reset unread count for user
  let changed = false;
  conversation.participants.forEach((p) => {
    if (String(p.user) === String(userId)) {
      if (p.unreadCount > 0) {
        p.unreadCount = 0;
        changed = true;
      }
      p.lastSeenAt = new Date();
    }
  });

  if (changed) {
    await conversation.save();
  }

  // Update messages
  await Message.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  if (socketEmitter && typeof socketEmitter === "function") {
    socketEmitter(conversationId, userId);
  }

  return true;
};

export default {
  getOrCreateDirectConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
};

