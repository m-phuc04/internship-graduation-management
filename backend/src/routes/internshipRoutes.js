import express from "express";
import evaluationController from "../controllers/evaluationController.js";
import internshipController from "../controllers/internshipController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadInternshipReportFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Phía Trưởng Bộ Môn (TBM & Admin)
// ==========================================

// TBM: Lấy danh sách hồ sơ thực tập kèm tìm kiếm, lọc, phân trang
router.get(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.getAllInternships,
);

// Xuất danh sách hồ sơ thực tập ra Excel (TBM, ADMIN, LECTURER)
router.get(
  "/export",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  internshipController.exportInternships,
);

// TBM: Lấy danh sách giảng viên khả dụng để phân công
router.get(
  "/available-lecturers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.getAvailableLecturers,
);

// TBM: Duyệt hồ sơ thực tập
router.patch(
  "/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.approveInternship,
);

// TBM: Từ chối hồ sơ thực tập
router.patch(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.rejectInternship,
);

// TBM: Phân công giảng viên giám sát cho hồ sơ thực tập
router.patch(
  "/:id/assign-lecturer",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.assignLecturer,
);

// ==========================================
// 2. Phía Sinh viên (Student)
// ==========================================

// Sinh viên: Xem thông tin hồ sơ thực tập của mình
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipController.getMyInternship,
);

// Sinh viên: Đăng ký hồ sơ thực tập mới
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipController.createInternship,
);

// Sinh viên: Tải lên tệp báo cáo thực tập tổng kết
router.post(
  "/my/report-file",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipController.uploadReportFile,
);

router.post(
  "/:id/report-file",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipController.uploadReportFile,
);

// Sinh viên & GVGS: Xóa tệp báo cáo thực tập
router.delete(
  "/my/report-file",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipController.deleteReportFile,
);

router.delete(
  "/:id/report-file",
  authMiddleware,
  authorizeRoles("STUDENT", "LECTURER", "TBM", "ADMIN"),
  internshipController.deleteReportFile,
);

// ==========================================
// 3. Phía Giảng viên Giám sát (GVGS)
// ==========================================

// GVGS / TBM / Admin: Lấy danh sách hồ sơ thực tập được phân công giám sát
router.get(
  "/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.getSupervisedInternships,
);

// GVGS & TBM: Lấy dữ liệu giấy xác nhận giám sát (Document A)
router.get(
  "/supervision-document",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.getSupervisionDocument,
);

// GVGS / TBM / Admin: Tiếp nhận giám sát hồ sơ thực tập
router.patch(
  "/:id/supervisor-accept",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.supervisorAcceptInternship,
);

// GVGS / TBM / Admin: Từ chối giám sát hồ sơ thực tập
router.patch(
  "/:id/supervisor-reject",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.supervisorRejectInternship,
);

// GVGS: Xác nhận sinh viên đạt bài kiểm tra đầu vào (Pretest)
router.patch(
  "/:id/pass-pretest",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.updatePretestStatus,
);

// GVGS: Đánh giá và chấm điểm thực tập
router.post(
  "/:id/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  (req, res, next) => {
    req.body.internshipId = req.params.id;
    return evaluationController.gradeInternship(req, res, next);
  },
);

router.put(
  "/:id/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  (req, res, next) => {
    req.body.internshipId = req.params.id;
    return evaluationController.gradeInternship(req, res, next);
  },
);

// GVGS / TBM / Admin: Hoàn thành thực tập và khóa đánh giá vĩnh viễn
router.patch(
  "/:id/complete",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.completeInternship,
);

// GVGS / TBM / Admin: Cập nhật chu kỳ báo cáo cho toàn bộ học kỳ
router.put(
  "/report-cycle",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.updateTermReportCycle,
);
router.patch(
  "/report-cycle",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.updateTermReportCycle,
);

// GVGS / TBM / Admin: Cập nhật chu kỳ báo cáo (1, 2 hoặc 3 tuần/lần)
router.patch(
  "/:id/report-cycle",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.updateReportCycle,
);

// ==========================================
// 4. Chi tiết và Tệp dùng chung
// ==========================================

// Lấy thông tin tệp báo cáo và kiểm tra quyền truy cập
router.get(
  "/:id/report-file",
  authMiddleware,
  internshipController.getReportFile,
);

// Lấy thông tin chi tiết hồ sơ thực tập theo ID
router.get(
  "/:id",
  authMiddleware,
  internshipController.getInternshipById,
);

export default router;
