import express from "express";
import academicTermController from "../controllers/academicTermController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Lấy học kỳ hiện tại
router.get("/current", academicTermController.getCurrentTerm);

// Lấy học kỳ đang kích hoạt
router.get("/active", academicTermController.getActiveTerm);

// Lấy danh sách tất cả học kỳ
router.get(
  "/",
  authMiddleware,
  academicTermController.getAllTerms,
);

// Lấy thông tin chi tiết học kỳ theo ID
router.get(
  "/:id",
  authMiddleware,
  academicTermController.getTermById,
);

// Tạo học kỳ mới (chỉ ADMIN)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.createTerm,
);

// Cập nhật thông tin học kỳ (ADMIN hoặc TBM)
router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.updateTerm,
);

// Kích hoạt học kỳ (chỉ ADMIN)
router.patch(
  "/:id/activate",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.activateTerm,
);

// Đóng học kỳ (chỉ ADMIN)
router.patch(
  "/:id/close",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.closeTerm,
);

// Bật/tắt khóa đăng ký khóa luận (ADMIN hoặc TBM)
router.patch(
  "/:id/toggle-thesis-registration-lock",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.toggleThesisRegistrationLock,
);

// Xóa học kỳ (chỉ ADMIN)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.deleteTerm,
);

export default router;
