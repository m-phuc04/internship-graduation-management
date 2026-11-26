import express from "express";
import adminController from "../controllers/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadExcelFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Kiểm tra đăng nhập
router.use(authMiddleware);

// Quản lý phân quyền giảng viên
router.get("/permissions", authorizeRoles("ADMIN"), adminController.getPermissionsList);
router.patch("/permissions/:lecturerId", authorizeRoles("ADMIN"), adminController.updateLecturerPermissions);

// Quản lý người dùng
router.get("/users", authorizeRoles("ADMIN"), adminController.getAllUsers);
router.patch("/users/:userId/status", authorizeRoles("ADMIN"), adminController.toggleUserStatus);
router.post("/users/:userId/reset-password", authorizeRoles("ADMIN"), adminController.resetPassword);

// Cấu hình Email hệ thống (CHỈ DÀNH CHO ADMIN)
router.get("/email-settings", authorizeRoles("ADMIN"), adminController.getEmailSettings);
router.patch("/email-settings", authorizeRoles("ADMIN"), adminController.updateEmailSettings);

// Import Excel sinh viên (ADMIN và TBM)
router.get("/students/excel-template", authorizeRoles("ADMIN", "TBM"), adminController.getExcelTemplate);
router.post(
  "/students/import-preview",
  authorizeRoles("ADMIN", "TBM"),
  uploadExcelFile.single("file"),
  adminController.previewStudentExcel
);
router.post("/students/import-confirm", authorizeRoles("ADMIN", "TBM"), adminController.importStudentExcel);
router.post("/students/resend-credentials", authorizeRoles("ADMIN", "TBM"), adminController.resendStudentCredentials);

// Nhật ký hoạt động hệ thống
router.get("/logs", authorizeRoles("ADMIN"), adminController.getSystemLogs);

export default router;
