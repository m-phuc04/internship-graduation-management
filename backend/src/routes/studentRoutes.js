import express from "express";
import studentController from "../controllers/studentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Tất cả các thao tác dữ liệu sinh viên chỉ dành cho TBM và Admin
router.use(authMiddleware);
router.use(authorizeRoles("TBM", "ADMIN"));

// Lấy danh sách sinh viên
router.get("/", studentController.getAllStudents);

// Lấy chi tiết sinh viên theo ID
router.get("/:id", studentController.getStudentById);

// Thêm mới sinh viên
router.post("/", studentController.createStudent);

// Cập nhật thông tin sinh viên
router.put("/:id", studentController.updateStudent);

// Xóa sinh viên
router.delete("/:id", studentController.deleteStudent);

// Đặt lại mật khẩu sinh viên
router.patch("/:id/reset-password", studentController.resetStudentPassword);

// Khóa / Mở khóa tài khoản sinh viên
router.patch("/:id/toggle-active", studentController.toggleStudentActive);

export default router;
