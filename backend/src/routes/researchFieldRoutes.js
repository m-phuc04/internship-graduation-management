import express from "express";
import researchFieldController from "../controllers/researchFieldController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// 1. Lấy tất cả hướng nghiên cứu (đã đăng nhập)
router.get("/", authMiddleware, researchFieldController.getAllFields);

// 2. Tạo hướng nghiên cứu mới (TBM / ADMIN)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.createField
);

// 3. Xóa hướng nghiên cứu (TBM / ADMIN)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.deleteField
);

// 4. Lấy danh sách giảng viên kèm hướng nghiên cứu (TBM / ADMIN)
router.get(
  "/lecturers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.getLecturersWithFields
);

// 5. Gán hướng nghiên cứu cho giảng viên (TBM / ADMIN)
router.put(
  "/lecturers/assign",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.assignFields
);

// 6. Giảng viên xem yêu cầu thay đổi đang chờ và hướng hiện tại (LECTURER / TBM)
router.get(
  "/my-request",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  researchFieldController.getMyRequest
);

// 7. Giảng viên gửi yêu cầu thay đổi hướng nghiên cứu (LECTURER / TBM)
router.post(
  "/request",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  researchFieldController.createRequest
);

// 8. TBM xem tất cả yêu cầu thay đổi đang chờ duyệt (TBM / ADMIN)
router.get(
  "/requests",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.getAllRequests
);

// 9. TBM phê duyệt yêu cầu thay đổi (TBM / ADMIN)
router.post(
  "/requests/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.approveRequest
);

// 10. TBM từ chối yêu cầu thay đổi (TBM / ADMIN)
router.post(
  "/requests/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.rejectRequest
);

export default router;
