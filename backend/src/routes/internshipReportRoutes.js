import express from "express";
import internshipReportController from "../controllers/internshipReportController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadInternshipReportFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Student Endpoints
// ==========================================

// Student: Create or submit report with file upload
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipReportController.createReport,
);

// Student: View own reports list
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipReportController.getMyReports,
);

// ==========================================
// 2. Lecturer Endpoints
// ==========================================

// Lecturer: View reports of supervised students
router.get(
  "/lecturer/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipReportController.getReportsForLecturer,
);

// ==========================================
// 3. TBM Endpoints
// ==========================================

// TBM: View all reports across university
router.get(
  "/tbm/all",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipReportController.getAllReportsForTbm,
);

// ==========================================
// 4. Shared Detail & Review Endpoints
// ==========================================

// Get report by ID (Secured with role & ownership check)
router.get(
  "/:id",
  authMiddleware,
  internshipReportController.getReportById,
);

// Lecturer & TBM: Review report (score, comment, approve/reject)
router.patch(
  "/:id/review",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipReportController.reviewReport,
);

export default router;
