import express from "express";
import evaluationController from "../controllers/evaluationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Company Endpoints
// ==========================================

// Company: Get all interning students with evaluation status
router.get(
  "/company/internships",
  authMiddleware,
  authorizeRoles("COMPANY"),
  evaluationController.getCompanyInternships,
);

// Company: Create or update evaluation
router.post(
  "/",
  authMiddleware,
  authorizeRoles("COMPANY"),
  evaluationController.createOrUpdateEvaluation,
);

// ==========================================
// 2. Lecturer Endpoints
// ==========================================

// Lecturer: View evaluations of supervised students
router.get(
  "/lecturer/supervised",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  evaluationController.getEvaluationsForLecturer,
);

// ==========================================
// 3. TBM Endpoints
// ==========================================

// TBM: View all evaluations across companies
router.get(
  "/tbm/all",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.getAllEvaluationsForTbm,
);

// ==========================================
// 5. Student Evaluation Link Endpoints
// ==========================================

// Student: Create or retrieve single evaluation link for current internship
router.post(
  "/student/create-link",
  authMiddleware,
  authorizeRoles("STUDENT"),
  evaluationController.createStudentEvaluationLink,
);

// Student: Get my evaluation request and results
router.get(
  "/student/my-request",
  authMiddleware,
  authorizeRoles("STUDENT"),
  evaluationController.getStudentEvaluationRequest,
);

// Student: Request Re-creating Evaluation Link
router.post(
  "/student/request-recreate",
  authMiddleware,
  authorizeRoles("STUDENT"),
  evaluationController.studentRequestRecreateLink,
);

// ==========================================
// 6. Public Evaluation Endpoints (No Auth / No Login Required)
// ==========================================

// Public: Get evaluation form metadata by secure token
router.get(
  "/public/:token",
  evaluationController.getPublicEvaluationByToken,
);

// Public: Submit evaluation form by secure token
router.post(
  "/public/:token",
  evaluationController.submitPublicEvaluation,
);

// ==========================================
// 7. TBM Evaluation Request Management
// ==========================================

// TBM: Get all evaluation requests across university
router.get(
  "/tbm/requests",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmGetAllEvaluationRequests,
);

// TBM: Get all re-create evaluation link requests
router.get(
  "/tbm/recreate-requests",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmGetRecreateRequests,
);

// TBM: Approve re-create evaluation link request
router.post(
  "/tbm/approve-recreate/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmApproveRecreateRequest,
);

// TBM: Reject re-create evaluation link request
router.post(
  "/tbm/reject-recreate/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmRejectRecreateRequest,
);

// TBM: Reset request to allow student to re-create
router.post(
  "/tbm/reset-request/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmResetEvaluationRequest,
);

// Get evaluation by ID (Secured with role & ownership check)
router.get(
  "/:id",
  authMiddleware,
  evaluationController.getEvaluationById,
);

export default router;

