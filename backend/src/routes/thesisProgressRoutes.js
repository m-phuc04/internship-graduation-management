import express from "express";
import thesisProgressController from "../controllers/thesisProgressController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import uploadProgressFile from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Phía Sinh viên (Tiến độ KLTN)
// ==========================================

// Sinh viên: Tạo báo cáo tiến độ mới (Tuần / Tháng) kèm tệp tùy chọn
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadProgressFile.single("file"),
  thesisProgressController.createProgress,
);

// Sinh viên: Lấy danh sách đề tài và tiến độ của mình
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisProgressController.getMyThesisProgress,
);

// Sinh viên: Cập nhật báo cáo tiến độ (khi là BẢN NHÁP hoặc CẦN CHỈNH SỬA) kèm tệp tùy chọn
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadProgressFile.single("file"),
  thesisProgressController.updateProgress,
);

// Sinh viên 2: Xác nhận hoặc từ chối báo cáo tiến độ của nhóm
router.patch(
  "/:id/confirm-student2",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisProgressController.confirmStudent2,
);

// ==========================================
// 2. Phía Giảng viên hướng dẫn (Giám sát tiến độ)
// ==========================================

// GVHD / TBM / Admin: Lấy danh sách đề tài hướng dẫn kèm các báo cáo tiến độ
router.get(
  "/lecturer/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisProgressController.getSupervisedThesesProgress,
);

// GVHD / TBM / Admin: Nhận xét, chấm điểm, duyệt hoặc yêu cầu sửa báo cáo tiến độ
router.patch(
  "/:id/review",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisProgressController.reviewProgress,
);

// ==========================================
// 3. Chi tiết và Mốc thời gian
// ==========================================

// Xem danh sách báo cáo tiến độ theo mã đề tài
router.get(
  "/thesis/:thesisId",
  authMiddleware,
  authorizeRoles("STUDENT", "LECTURER", "TBM", "ADMIN"),
  thesisProgressController.getProgressByThesis,
);

// Cập nhật mốc thời gian đề tài (ngày bắt đầu và kết thúc) - Chỉ GVHD, TBM, ADMIN
router.patch(
  "/thesis/:thesisId/timeline",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisProgressController.updateTimeline,
);


export default router;

