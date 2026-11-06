import evaluationController from "../controllers/evaluationController.js";
import express from "express";
import internshipController from "../controllers/internshipController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadInternshipReportFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ==========================================
// 1. TBM Endpoints (Search, Filter, Management)
// ==========================================

// TBM: List all internships with search, filter, pagination
router.get(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.getAllInternships,
);

// Export internships to Excel (TBM, ADMIN, LECTURER)
router.get(
  "/export",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  internshipController.exportInternships,
);

// TBM: Get available lecturers with active workload
router.get(
  "/available-lecturers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.getAvailableLecturers,
);

// TBM: Approve internship
router.patch(
  "/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.approveInternship,
);

// TBM: Reject internship
router.patch(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.rejectInternship,
);

// TBM: Assign lecturer to internship
router.patch(
  "/:id/assign-lecturer",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipController.assignLecturer,
);

// ==========================================
// 2. Student Endpoints
// ==========================================

// Student: View own internship profile
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipController.getMyInternship,
);

// Get active companies for registration
router.get(
  "/active-companies",
  authMiddleware,
  internshipController.getActiveCompanies,
);

// Student: Register new internship
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  internshipController.createInternship,
);

// Student: Upload internship report file (Prompt 2 - Requirement 1)
router.post(
  "/my/report-file",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipController.uploadReportFile,
);

router.post(
  "/:id/report-file",
  authMiddleware,
  authorizeRoles("STUDENT"),
  uploadInternshipReportFile.single("file"),
  internshipController.uploadReportFile,
);

// ==========================================
// 3. Lecturer Endpoints
// ==========================================

// Lecturer / TBM / Admin: Get assigned supervised internships
router.get(
  "/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.getSupervisedInternships,
);

// Lecturer & TBM: Get Supervision Confirmation Document Data (Document A)
router.get(
  "/supervision-document",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.getSupervisionDocument,
);

// Lecturer / TBM / Admin: Accept supervision of internship
router.patch(
  "/:id/supervisor-accept",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.supervisorAcceptInternship,
);

// Lecturer / TBM / Admin: Reject supervision of internship
router.patch(
  "/:id/supervisor-reject",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.supervisorRejectInternship,
);

// Lecturer (GVGS): Confirm PASS PRETEST (Prompt 2 - Requirement 3)
router.patch(
  "/:id/pass-pretest",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.updatePretestStatus,
);

// Lecturer / TBM / Admin: Complete internship and permanently lock evaluation
// Lecturer (GVGS): Grade Internship & Edit Score (Prompt 2 - Requirement 5)
router.post(
  "/:id/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  (req, res, next) => {
    req.body.internshipId = req.params.id;
    return evaluationController.gradeInternship(req, res, next);
  },
);

router.put(
  "/:id/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  (req, res, next) => {
    req.body.internshipId = req.params.id;
    return evaluationController.gradeInternship(req, res, next);
  },
);

router.patch(
  "/:id/complete",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.completeInternship,
);

// Lecturer / TBM / Admin: Update report cycle (1, 2, or 3 weeks/time)
router.patch(
  "/:id/report-cycle",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.updateReportCycle,
);

// ==========================================
// 4. Shared Detail & File Endpoints
// ==========================================

// Get report file info & access check
router.get(
  "/:id/report-file",
  authMiddleware,
  internshipController.getReportFile,
);

// Get internship by document ID (Secured with role & ownership check)
router.get(
  "/:id",
  authMiddleware,
  internshipController.getInternshipById,
);

export default router;
