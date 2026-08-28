import express from "express";
import internshipController from "../controllers/internshipController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

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

// TBM & ADMIN: Export internships to Excel
router.get(
  "/export",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
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

// Lecturer / TBM / Admin: Complete internship and permanently lock evaluation
router.patch(
  "/:id/complete",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  internshipController.completeInternship,
);

// ==========================================
// 4. Shared Detail Endpoint
// ==========================================

// Get internship by document ID (Secured with role & ownership check)
router.get(
  "/:id",
  authMiddleware,
  internshipController.getInternshipById,
);

export default router;
