import express from "express";
import lecturerController from "../controllers/lecturerController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Tất cả thao tác dữ liệu giảng viên yêu cầu xác thực
router.use(authMiddleware);

// Lấy danh sách giảng viên (TBM, Admin)
router.get("/", authorizeRoles("TBM", "ADMIN"), lecturerController.getAllLecturers);

// Lấy thông tin giảng viên theo ID
router.get("/:id", authorizeRoles("TBM", "ADMIN", "LECTURER"), lecturerController.getLecturerById);

// Thêm mới giảng viên (TBM, Admin)
router.post("/", authorizeRoles("TBM", "ADMIN"), lecturerController.createLecturer);

// Cập nhật thông tin giảng viên (TBM, Admin)
router.put("/:id", authorizeRoles("TBM", "ADMIN"), lecturerController.updateLecturer);

// Cập nhật số lượng sinh viên tối đa hướng dẫn
router.patch("/:id/max-students", authorizeRoles("TBM", "ADMIN", "LECTURER"), lecturerController.updateMaxSupervisedStudents);

// Xóa giảng viên (TBM, Admin)
router.delete("/:id", authorizeRoles("TBM", "ADMIN"), lecturerController.deleteLecturer);

// Khóa / Mở khóa tài khoản giảng viên (TBM, Admin)
router.patch("/:id/toggle-active", authorizeRoles("TBM", "ADMIN"), lecturerController.toggleLecturerActive);

export default router;
