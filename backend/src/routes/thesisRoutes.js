import express from "express";
import thesisController from "../controllers/thesisController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ==========================================
// 1. KLTN Topic Management Routes (GV -> TBM -> SV FIFO)
// ==========================================

// GV: Tạo danh sách đề tài KLTN hàng loạt
router.post(
  "/topics/batch",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  thesisController.batchCreateTopics,
);

// GV: Xem danh sách đề tài do mình đề xuất
router.get(
  "/topics/my-created",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  thesisController.getMyCreatedTopics,
);

// TBM: Xem tất cả đề tài GV gửi lên
router.get(
  "/topics/tbm",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.getTopicsForTbm,
);

// TBM: Duyệt đề tài
router.patch(
  "/topics/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.approveTopicByTbm,
);

// TBM: Từ chối đề tài
router.patch(
  "/topics/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectTopicByTbm,
);

// SV: Xem danh sách đề tài APPROVED
router.get(
  "/topics/approved",
  authMiddleware,
  thesisController.getApprovedTopicsForStudent,
);

// SV: Đăng ký chọn đề tài (FIFO)
router.post(
  "/topics/:id/register",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.registerTopicByStudent,
);

// ==========================================
// 2. Student Registration & Profile Routes
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

// Search students by code or name for group selection
router.get(
  "/search-students",
  authMiddleware,
  thesisController.searchStudents,
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

// Lecturer / Admin: Toggle lock on single thesis score
router.patch(
  "/:id/score-lock",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.toggleThesisScoreLock,
);

// Lecturer / Admin: Toggle lock on all assigned theses scores
router.patch(
  "/lecturer/score-lock-all",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.toggleAllThesisScoresLock,
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
