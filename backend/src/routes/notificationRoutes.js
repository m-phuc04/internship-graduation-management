import express from "express";
import notificationController from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// All notification endpoints require authentication
router.use(authMiddleware);

// Get my notifications (paginated)
router.get("/", notificationController.getMyNotifications);

// Get unread count
router.get("/unread-count", notificationController.getUnreadCount);

// Mark all as read
router.patch("/read-all", notificationController.markAllAsRead);

// Mark single notification as read
router.patch("/:id/read", notificationController.markAsRead);

export default router;
