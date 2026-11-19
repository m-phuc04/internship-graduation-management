import express from "express";
import dashboardController from "../controllers/dashboardController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Bảng điều khiển sinh viên
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("STUDENT"),
  dashboardController.getStudentDashboard,
);

// Bảng điều khiển TBM
router.get(
  "/tbm",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  dashboardController.getTbmDashboard,
);

// Bảng điều khiển giảng viên
router.get(
  "/lecturer",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  dashboardController.getLecturerDashboard,
);

export default router;
