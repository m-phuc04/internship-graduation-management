import express from "express";
import authController from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Lấy thông tin cá nhân của người dùng hiện tại
router.get("/", authMiddleware, authController.getProfile);

// Cập nhật thông tin cá nhân
router.patch("/", authMiddleware, authController.updateProfile);

// Lấy thông tin công khai của người dùng theo ID
router.get("/public/:id", authMiddleware, authController.getPublicProfile);
router.get("/user/:id", authMiddleware, authController.getPublicProfile);
router.get("/:id", authMiddleware, authController.getPublicProfile);

export default router;
