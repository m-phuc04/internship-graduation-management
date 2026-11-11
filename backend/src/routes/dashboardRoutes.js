import express from "express";
import dashboardController from "../controllers/dashboardController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Student Dashboard
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("STUDENT"),
  dashboardController.getStudentDashboard,
);

// TBM Dashboard
router.get(
  "/tbm",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  dashboardController.getTbmDashboard,
);

// Lecturer Dashboard
router.get(
  "/lecturer",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  dashboardController.getLecturerDashboard,
);

export default router;
