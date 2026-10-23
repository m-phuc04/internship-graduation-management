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

// Lecturer (GVGS): Grade Internship
router.post(
  "/internship/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  evaluationController.gradeInternship,
);

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


// TBM: Publish Single Score
router.post(
  "/tbm/publish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.publishScore,
);

// TBM: Publish Bulk Scores
router.post(
  "/tbm/publish-bulk",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.publishScoresBulk,
);

// TBM: Delete evaluation result
router.delete(
  "/tbm/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmDeleteEvaluation,
);

// ==========================================
// 4. Student Evaluation Status Endpoints
// ==========================================

// Student: Get my evaluation request and results
router.get(
  "/student/my-request",
  authMiddleware,
  authorizeRoles("STUDENT"),
  evaluationController.getStudentEvaluationRequest,
);

// ==========================================
// 5. Shared Endpoints
// ==========================================

// Get evaluation by ID (Secured with role & ownership check)
router.get(
  "/:id",
  authMiddleware,
  evaluationController.getEvaluationById,
);

export default router;
