import express from "express";
import thesisProgressController from "../controllers/thesisProgressController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import uploadProgressFile from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Student Thesis Progress Routes
// ==========================================

// Student: Create new progress report (WEEKLY / MONTHLY) with optional file upload
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadProgressFile.single("file"),
  thesisProgressController.createProgress,
);

// Student: Get own Thesis & Progress list
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisProgressController.getMyThesisProgress,
);

// Student: Submit Draft progress
router.patch(
  "/:id/submit",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisProgressController.submitDraftProgress,
);

// ==========================================
// 2. Lecturer Supervision Routes
// ==========================================

// Lecturer / TBM / Admin: Get all supervised theses with progress reports
router.get(
  "/lecturer/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisProgressController.getSupervisedThesesProgress,
);

// Lecturer / TBM / Admin: Review, Grade, Approve, Reject progress
router.patch(
  "/:id/review",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisProgressController.reviewProgress,
);

// ==========================================
// 3. Detail Route
// ==========================================

// View progress by thesis ID
router.get(
  "/thesis/:thesisId",
  authMiddleware,
  authorizeRoles("STUDENT", "LECTURER", "TBM", "ADMIN"),
  thesisProgressController.getProgressByThesis,
);

export default router;
