import express from "express";
import internshipReportController from "../controllers/internshipReportController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadInternshipReportFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Phía Sinh viên (Student)
// ==========================================

// Sinh viên: Tạo hoặc nộp báo cáo định kỳ kèm tệp
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipReportController.createReport,
);

// Sinh viên: Cập nhật báo cáo (khi là bản nháp hoặc cần chỉnh sửa) kèm tệp
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipReportController.updateReport,
);

// Sinh viên 2: Xác nhận hoặc từ chối báo cáo nhóm kèm lý do
router.patch(
  "/:id/confirm-student2",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipReportController.confirmStudent2,
);

// Sinh viên: Xem danh sách báo cáo của mình
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipReportController.getMyReports,
);

// ==========================================
// 2. Phía Giảng viên (Lecturer)
// ==========================================

// Giảng viên: Xem báo cáo của sinh viên đang giám sát (đã nộp/xác nhận)
router.get(
  "/lecturer/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipReportController.getReportsForLecturer,
);

// ==========================================
// 3. Phía Trưởng bộ môn (TBM)
// ==========================================

// TBM: Xem tất cả báo cáo thực tập trong khoa/trường
router.get(
  "/tbm/all",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipReportController.getAllReportsForTbm,
);

// ==========================================
// 4. Chi tiết và Đánh giá báo cáo dùng chung
// ==========================================

// Lấy toàn bộ báo cáo định kỳ theo mã hồ sơ thực tập
router.get(
  "/internship/:internshipId",
  authMiddleware,
  internshipReportController.getReportsByInternshipId,
);

// Lấy thông tin chi tiết một báo cáo theo ID
router.get(
  "/:id",
  authMiddleware,
  internshipReportController.getReportById,
);

// Giảng viên & TBM: Đánh giá báo cáo (cho điểm, nhận xét, duyệt/từ chối)
router.patch(
  "/:id/review",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipReportController.reviewReport,
);

export default router;
