import notificationService from "../services/notificationService.js";

// Get user's notifications
const getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, unreadOnly } = req.query;

    const result = await notificationService.getMyNotifications(
      req.user.userId,
      {
        page,
        limit,
        unreadOnly: unreadOnly === "true",
      },
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách thông báo thành công",
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Mark single notification as read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Đánh dấu thông báo đã đọc",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all as read
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get unread count
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Lấy số lượng thông báo chưa đọc thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Send notification when assigned to council
const notifyCouncilAssignment = async (req, res, next) => {
  try {
    const { lecturerUserIds = [], councilName = "Hội đồng", councilRoom = "" } = req.body;
    const cleanCouncilName = (councilName || "Hội đồng").replace(/\s*\([^)]*\)/g, "").trim();
    const cleanRoom = councilRoom ? ` (Phòng ${councilRoom})` : "";

    const notifications = [];
    for (const uId of lecturerUserIds) {
      if (uId) {
        const notif = await notificationService.createNotification({
          recipientId: uId,
          senderId: req.user?.userId || null,
          type: "THESIS",
          title: "Phân công Hội đồng đánh giá Khóa luận",
          message: `Bạn đã được phân công vào ${cleanCouncilName}${cleanRoom}.`,
          link: "/lecturer/theses?tab=council",
          priority: "HIGH",
        });
        if (notif) notifications.push(notif);
      }
    }

    res.status(200).json({
      success: true,
      message: "Đã gửi thông báo phân công hội đồng cho giảng viên",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Email Notification Settings (TTDN, KLTN, News)
// ====================

const getEmailSettings = async (req, res, next) => {
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.userId)
      .select("email emailNotificationEnabled emailThesisEnabled emailNewsEnabled fullName")
      .lean();
    if (!user) {
      const error = new Error("Không tìm thấy thông tin tài khoản");
      error.statusCode = 404;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasValidEmail = Boolean(user.email && emailRegex.test(user.email.trim()));

    res.status(200).json({
      success: true,
      message: "Lấy cài đặt nhận email thông báo thành công",
      data: {
        email: user.email || "",
        emailNotificationEnabled: Boolean(user.emailNotificationEnabled),
        emailThesisEnabled: Boolean(user.emailThesisEnabled),
        emailNewsEnabled: Boolean(user.emailNewsEnabled),
        hasValidEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateEmailSettings = async (req, res, next) => {
  try {
    const { enabled, emailNotificationEnabled, emailThesisEnabled, emailNewsEnabled } = req.body;
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.userId);
    if (!user) {
      const error = new Error("Không tìm thấy thông tin tài khoản");
      error.statusCode = 404;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasValidEmail = Boolean(user.email && emailRegex.test(user.email.trim()));

    // Xác định các trường cần update
    const updates = {};
    if (enabled !== undefined) {
      updates.emailNotificationEnabled = Boolean(enabled);
    }
    if (emailNotificationEnabled !== undefined) {
      updates.emailNotificationEnabled = Boolean(emailNotificationEnabled);
    }
    if (emailThesisEnabled !== undefined) {
      updates.emailThesisEnabled = Boolean(emailThesisEnabled);
    }
    if (emailNewsEnabled !== undefined) {
      updates.emailNewsEnabled = Boolean(emailNewsEnabled);
    }

    // Nếu có ít nhất 1 tùy chọn bật mà tài khoản chưa có email hợp lệ
    const willEnableAny =
      (updates.emailNotificationEnabled && !user.emailNotificationEnabled) ||
      (updates.emailThesisEnabled && !user.emailThesisEnabled) ||
      (updates.emailNewsEnabled && !user.emailNewsEnabled);

    if (willEnableAny && !hasValidEmail) {
      const error = new Error(
        "Tài khoản của bạn chưa có địa chỉ email hợp lệ. Vui lòng cập nhật email trong phần Hồ sơ cá nhân trước khi bật nhận email thông báo."
      );
      error.statusCode = 400;
      throw error;
    }

    if (updates.emailNotificationEnabled !== undefined) {
      user.emailNotificationEnabled = updates.emailNotificationEnabled;
    }
    if (updates.emailThesisEnabled !== undefined) {
      user.emailThesisEnabled = updates.emailThesisEnabled;
    }
    if (updates.emailNewsEnabled !== undefined) {
      user.emailNewsEnabled = updates.emailNewsEnabled;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật cài đặt nhận email thông báo thành công.",
      data: {
        email: user.email || "",
        emailNotificationEnabled: Boolean(user.emailNotificationEnabled),
        emailThesisEnabled: Boolean(user.emailThesisEnabled),
        emailNewsEnabled: Boolean(user.emailNewsEnabled),
        hasValidEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  notifyCouncilAssignment,
  getEmailSettings,
  updateEmailSettings,
};
