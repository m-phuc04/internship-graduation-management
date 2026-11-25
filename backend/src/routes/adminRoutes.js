import express from "express";
import adminController from "../controllers/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadExcelFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Kiểm tra đăng nhập và quyền ADMIN
router.use(authMiddleware, authorizeRoles("ADMIN"));

// Quản lý phân quyền giảng viên
router.get("/permissions", adminController.getPermissionsList);
router.patch("/permissions/:lecturerId", adminController.updateLecturerPermissions);

// Quản lý người dùng
router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/status", adminController.toggleUserStatus);
router.post("/users/:userId/reset-password", adminController.resetPassword);

// Import Excel sinh viên
router.get("/students/excel-template", adminController.getExcelTemplate);
router.post(
  "/students/import-preview",
  uploadExcelFile.single("file"),
  adminController.previewStudentExcel
);
router.post("/students/import-confirm", adminController.importStudentExcel);

// Nhật ký hoạt động hệ thống
router.get("/logs", adminController.getSystemLogs);

export default router;
