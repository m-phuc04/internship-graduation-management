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

// Student: Update progress report (when DRAFT or NEEDS_REVISION) with optional file upload
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadProgressFile.single("file"),
  thesisProgressController.updateProgress,
);

// Student 2: Confirm or Reject thesis progress
router.patch(
  "/:id/confirm-student2",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisProgressController.confirmStudent2,
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

// Update Thesis timeline (startDate & endDate) - Only GVHD, TBM, ADMIN
router.patch(
  "/thesis/:thesisId/timeline",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisProgressController.updateTimeline,
);


export default router;

