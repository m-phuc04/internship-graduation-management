import express from "express";
import thesisDocumentController from "../controllers/thesisDocumentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadThesisDocumentFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Phía Giảng viên (Lecturer & TBM)
// ==========================================

// Lấy danh sách đề tài đang hướng dẫn (cho select box phạm vi áp dụng)
router.get(
  "/lecturer/theses-list",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisDocumentController.getLecturerSupervisedTheses,
);

// Lấy danh sách tài liệu hướng dẫn do giảng viên tải lên
router.get(
  "/lecturer/guides",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisDocumentController.getLecturerGuides,
);

// Thêm mới tài liệu hướng dẫn (áp dụng tất cả các nhóm hoặc đề tài cụ thể)
router.post(
  "/lecturer/guides",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  uploadThesisDocumentFile.single("file"),
  thesisDocumentController.createLecturerGuide,
);

// Gỡ tài liệu hướng dẫn
router.delete(
  "/lecturer/guides/:id",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisDocumentController.deleteLecturerGuide,
);

// Xem danh sách file do sinh viên các nhóm hướng dẫn nộp lên
router.get(
  "/lecturer/submissions",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisDocumentController.getLecturerSubmissions,
);

// ==========================================
// 2. Phía Sinh viên (Student)
// ==========================================

// Lấy danh sách tài liệu từ giảng viên hướng dẫn (lọc theo phạm vi áp dụng)
router.get(
  "/student/guides",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisDocumentController.getStudentGuides,
);

// Lấy danh sách các file/báo cáo sinh viên/nhóm đã nộp
router.get(
  "/student/submissions",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisDocumentController.getStudentSubmissions,
);

// Sinh viên nộp file cho giảng viên hướng dẫn
router.post(
  "/student/submissions",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadThesisDocumentFile.single("file"),
  thesisDocumentController.createStudentSubmission,
);

// Sinh viên xóa/gỡ file đã nộp
router.delete(
  "/student/submissions/:id",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisDocumentController.deleteStudentSubmission,
);

export default router;
