import express from "express";
import evaluationController from "../controllers/evaluationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// 1. Chức năng dành cho Giảng viên (GVGS)

// GVGS chấm điểm và chỉnh sửa điểm thực tập
router.post(
  "/internship/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  evaluationController.gradeInternship,
);

router.put(
  "/internship/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  evaluationController.gradeInternship,
);

// GVGS xem danh sách đánh giá của sinh viên phụ trách
router.get(
  "/lecturer/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  evaluationController.getEvaluationsForLecturer,
);

// 2. Chức năng dành cho TBM và Quản trị

// TBM xem toàn bộ đánh giá thực tập
router.get(
  "/tbm/all",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.getAllEvaluationsForTbm,
);

// Công bố điểm đơn lẻ
router.post(
  "/tbm/publish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  evaluationController.publishScore,
);

router.post(
  "/publish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  evaluationController.publishScore,
);

// Công bố hàng loạt điểm
router.post(
  "/tbm/publish-bulk",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.publishScoresBulk,
);

// Ẩn điểm đơn lẻ
router.post(
  "/tbm/hide/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.hideScore,
);

// Ẩn hàng loạt điểm
router.post(
  "/tbm/hide-bulk",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.hideScoresBulk,
);

// Công bố lại điểm
router.post(
  "/tbm/republish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.republishScore,
);

// Xóa kết quả đánh giá (chỉ TBM / ADMIN)
router.delete(
  "/tbm/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmDeleteEvaluation,
);

// 3. Chức năng dùng chung

// Xem chi tiết đánh giá theo ID
router.get(
  "/:id",
  authMiddleware,
  evaluationController.getEvaluationById,
);

export default router;
