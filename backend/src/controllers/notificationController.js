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

export default {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  notifyCouncilAssignment,
};
