import express from "express";
import chatController from "../controllers/chatController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Kiểm tra đăng nhập cho tất cả route chat
router.use(authMiddleware);

// Lấy hoặc tạo cuộc trò chuyện trực tiếp với người dùng
router.post("/direct/:targetUserId", chatController.getOrCreateDirectConversation);
router.get("/direct/:targetUserId", chatController.getOrCreateDirectConversation);

// Lấy danh sách cuộc trò chuyện của người dùng
router.get("/conversations", chatController.getUserConversations);

// Lấy danh sách tin nhắn trong cuộc trò chuyện
router.get("/conversations/:id/messages", chatController.getConversationMessages);

// Gửi tin nhắn mới
router.post("/conversations/:id/messages", chatController.sendMessage);

// Đánh dấu tin nhắn đã đọc
router.put("/conversations/:id/read", chatController.markAsRead);

export default router;
