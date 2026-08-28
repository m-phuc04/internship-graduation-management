import Notification from "../models/Notification.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Create a Single Notification
// ====================
const createNotification = async ({
  recipientId,
  senderId = null,
  type = "SYSTEM",
  title,
  message,
  referenceId = null,
  referenceModel = null,
  link = null,
  priority = "NORMAL",
}) => {
  if (!recipientId || !title || !message) {
    return null;
  }

  try {
    // Avoid duplicate unread notification for the same reference
    if (referenceId && referenceModel && recipientId) {
      const existing = await Notification.findOne({
        recipientId,
        referenceId,
        referenceModel,
        isRead: false,
      });
      if (existing) {
        return existing;
      }
    }

    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      title: title.trim(),
      message: message.trim(),
      referenceId,
      referenceModel,
      link,
      priority,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error.message);
    return null;
  }
};

// ====================
// 2. Broadcast Notification to All Users with a Specific Role (e.g., TBM & ADMIN)
// ====================
const createNotificationForRole = async (
  role,
  {
    senderId = null,
    type = "SYSTEM",
    title,
    message,
    referenceId = null,
    referenceModel = null,
    link = null,
    priority = "NORMAL",
  },
) => {
  try {
    const roleQuery = Array.isArray(role)
      ? { $in: role }
      : role === "TBM"
      ? { $in: ["TBM", "ADMIN"] }
      : role;

    const users = await User.find({ role: roleQuery, isActive: true }).select("_id");
    if (!users || users.length === 0) return [];

    const notifications = await Promise.all(
      users.map((u) =>
        createNotification({
          recipientId: u._id,
          senderId,
          type,
          title,
          message,
          referenceId,
          referenceModel,
          link,
          priority,
        }),
      ),
    );

    return notifications.filter(Boolean);
  } catch (error) {
    console.error(`Error notifying role ${role}:`, error.message);
    return [];
  }
};

// ====================
// 3. Get User's Notifications
// ====================
const getMyNotifications = async (
  userId,
  { page = 1, limit = 20, unreadOnly = false } = {},
) => {
  const query = { recipientId: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("senderId", "fullName email avatar role")
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// 4. Mark Single Notification as Read
// ====================
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId,
  });

  if (!notification) {
    throw new AppError("Không tìm thấy thông báo hoặc bạn không có quyền", 404);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

// ====================
// 5. Mark All Notifications as Read for User
// ====================
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );

  return {
    updatedCount: result.modifiedCount,
  };
};

// ====================
// 6. Get Unread Count
// ====================
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
  });
  return { unreadCount: count };
};

export default {
  createNotification,
  createNotificationForRole,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
