import express from "express";
import chatController from "../controllers/chatController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Apply authMiddleware to all chat routes
router.use(authMiddleware);

// Get or create direct conversation with a specific user
router.post("/direct/:targetUserId", chatController.getOrCreateDirectConversation);
router.get("/direct/:targetUserId", chatController.getOrCreateDirectConversation);

// Get user conversations list
router.get("/conversations", chatController.getUserConversations);

// Get messages in a conversation
router.get("/conversations/:id/messages", chatController.getConversationMessages);

// Send message in a conversation
router.post("/conversations/:id/messages", chatController.sendMessage);

// Mark conversation messages as read
router.put("/conversations/:id/read", chatController.markAsRead);

export default router;
