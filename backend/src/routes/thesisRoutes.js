import express from "express";
import thesisController from "../controllers/thesisController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Student Registration & Profile Routes
// ==========================================

// Student: Register a new Thesis (1 or 2 students)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.createThesis,
);

// Student: Get own Thesis profile
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.getMyThesis,
);

// ==========================================
// 2. Shared Utilities (Supervisors & Lookup)
// ==========================================

// Get available supervisor lecturers with capacity stats
router.get(
  "/available-supervisors",
  authMiddleware,
  thesisController.getAvailableSupervisors,
);

// Lookup student by MSSV (for group partner selection)
router.get(
  "/lookup-student/:studentCode",
  authMiddleware,
  thesisController.lookupStudent,
);

// ==========================================
// 3. Thesis Evaluations (Only reviewer1Id != null AND reviewer2Id != null)
// ==========================================

// TBM, Lecturer, ADMIN: Get Theses For Evaluation with Stats
router.get(
  "/evaluations",
  authMiddleware,
  authorizeRoles("TBM", "LECTURER", "ADMIN"),
  thesisController.getThesesForEvaluation,
);

// ==========================================
// 4. Lecturer / Reviewer / Admin Supervision & Grading Routes
// ==========================================

// Lecturer / Admin: Get all assigned theses (Supervisor / Reviewer 1 / Reviewer 2)
router.get(
  "/lecturer/assigned",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.getAssignedThesesForLecturer,
);

// Lecturer / Admin: Grade thesis with strict role-based score isolation
router.patch(
  "/:id/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.gradeThesisByLecturer,
);

// Lecturer / Admin: Accept / Approve supervision of thesis
router.patch(
  "/:id/supervisor-accept",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorAcceptThesis,
);

router.patch(
  "/:id/supervisor-approve",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorAcceptThesis,
);

// Lecturer / Admin: Reject supervision of thesis
router.patch(
  "/:id/supervisor-reject",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorRejectThesis,
);

// TBM & ADMIN: Export theses to Excel
router.get(
  "/export",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.exportTheses,
);

// TBM: Get all Theses with Search & Filter
router.get(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.getAllThesesForTbm,
);

// TBM: Approve Thesis
router.patch(
  "/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.approveThesis,
);

// TBM: Reject Thesis
router.patch(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectThesis,
);

// TBM: Assign / Change Supervisor
router.patch(
  "/:id/assign-supervisor",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.assignSupervisor,
);

// TBM: Assign Reviewers (Reviewer 1 & 2)
router.patch(
  "/:id/assign-reviewers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.assignReviewers,
);

// TBM: Complete Thesis Evaluation (COMPLETED)
router.patch(
  "/:id/complete",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.completeThesisEvaluation,
);

// ==========================================
// 6. Detail by Student ID
// ==========================================

// Get thesis by student ID (Shared detail)
router.get(
  "/student/:studentId",
  authMiddleware,
  thesisController.getThesisByStudent,
);

export default router;
