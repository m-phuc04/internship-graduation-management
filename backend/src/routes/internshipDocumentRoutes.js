import express from "express";
import internshipDocumentController from "../controllers/internshipDocumentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadInternshipDocumentFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Phía Giảng viên Giám sát (GVGS) & TBM & Admin
// ==========================================

// Lấy danh sách hồ sơ thực tập đang giám sát (cho dropdown chọn phạm vi áp dụng)
router.get(
  "/lecturer/internships-list",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipDocumentController.getLecturerSupervisedInternships,
);

// Lấy danh sách tài liệu hướng dẫn do giảng viên tải lên
router.get(
  "/lecturer/guides",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipDocumentController.getLecturerGuides,
);

// Thêm mới tài liệu hướng dẫn
router.post(
  "/lecturer/guides",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  uploadInternshipDocumentFile.single("file"),
  internshipDocumentController.createLecturerGuide,
);

// Cập nhật tài liệu hướng dẫn (sửa tiêu đề, mô tả, phạm vi, hoặc thay file)
router.put(
  "/lecturer/guides/:id",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  uploadInternshipDocumentFile.single("file"),
  internshipDocumentController.updateLecturerGuide,
);

// Gỡ / xóa tài liệu hướng dẫn
router.delete(
  "/lecturer/guides/:id",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipDocumentController.deleteLecturerGuide,
);

// Xem danh sách file do sinh viên nộp lên (kèm thống kê nộp/chưa nộp)
router.get(
  "/lecturer/submissions",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipDocumentController.getLecturerSubmissions,
);

// ==========================================
// 2. Phía Sinh viên (Student)
// ==========================================

// Lấy danh sách tài liệu hướng dẫn từ GVGS
router.get(
  "/student/guides",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipDocumentController.getStudentGuides,
);

// Lấy danh sách các file sinh viên đã nộp
router.get(
  "/student/submissions",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipDocumentController.getStudentSubmissions,
);

// Sinh viên nộp file cho GVGS
router.post(
  "/student/submissions",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipDocumentFile.single("file"),
  internshipDocumentController.createStudentSubmission,
);

// Sinh viên xóa / gỡ file đã nộp
router.delete(
  "/student/submissions/:id",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipDocumentController.deleteStudentSubmission,
);

// ==========================================
// 3. Phía Trưởng Bộ Môn (TBM / Quản trị hệ thống)
// ==========================================

// GET all department documents: accessible by all authenticated users (STUDENT, TBM, LECTURER, ADMIN)
router.get(
  "/",
  authMiddleware,
  internshipDocumentController.getDocuments,
);

// POST create department document: only TBM and ADMIN
router.post(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  uploadInternshipDocumentFile.single("file"),
  internshipDocumentController.createDocument,
);

// DELETE department document: only TBM and ADMIN
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipDocumentController.deleteDocument,
);

export default router;
