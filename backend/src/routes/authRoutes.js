import express from "express";

import authController from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Lấy mã CAPTCHA
router.get("/captcha", authController.getCaptcha);

// Đăng ký tài khoản
router.post("/register", authController.register);

// Đăng nhập hệ thống
router.post("/login", authController.login);

// Làm mới access token
router.post("/refresh", authController.refresh);

// Đăng xuất hệ thống
router.post("/logout", authController.logout);

// Lấy thông tin tài khoản đang đăng nhập
router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Access token hợp lệ",
    data: {
      user: req.user,
    },
  });
});

// Kiểm tra quyền ADMIN
router.get(
  "/admin-test",
  authMiddleware,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Bạn có quyền Admin",
      data: {
        user: req.user,
      },
    });
  },
);

// Quản lý thông tin cá nhân và đổi mật khẩu
router.get("/profile", authMiddleware, authController.getProfile);
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post("/change-password", authMiddleware, authController.changePassword);

export default router;
