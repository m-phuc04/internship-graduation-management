import express from "express";

import authController from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/captcha", authController.getCaptcha);

router.post("/register", authController.register);

router.post("/login", authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Access token hợp lệ",
    data: {
      user: req.user,
    },
  });
});

// Test RBAC - chỉ ADMIN được truy cập
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

router.get("/profile", authMiddleware, authController.getProfile);
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post("/change-password", authMiddleware, authController.changePassword);

export default router;
