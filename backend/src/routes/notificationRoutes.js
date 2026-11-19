import express from "express";
import notificationController from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Tất cả các tuyến đường thông báo đều yêu cầu đăng nhập
router.use(authMiddleware);

// Lấy danh sách thông báo của người dùng hiện tại (phân trang)
router.get("/", notificationController.getMyNotifications);

// Tạo thông báo mới
router.post("/", notificationController.createNotification);

// Lấy số lượng thông báo chưa đọc
router.get("/unread-count", notificationController.getUnreadCount);

// Đánh dấu tất cả thông báo là đã đọc
router.patch("/read-all", notificationController.markAllAsRead);

// Đánh dấu một thông báo là đã đọc
router.patch("/:id/read", notificationController.markAsRead);

// Gửi thông báo cho giảng viên khi được phân công vào hội đồng
router.post("/notify-council", notificationController.notifyCouncilAssignment);

// Cấu hình thông báo qua email (TTDN)
router.get("/email-settings", notificationController.getEmailSettings);
router.put("/email-settings", notificationController.updateEmailSettings);

export default router;
