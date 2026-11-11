import express from "express";
import evaluationController from "../controllers/evaluationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ==========================================
// 1. Lecturer Endpoints
// ==========================================

// Lecturer (GVGS): Grade Internship & Edit Score
router.post(
  "/internship/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  evaluationController.gradeInternship,
);

router.put(
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
// 2. TBM Endpoints
// ==========================================

// TBM: View all evaluations across companies
router.get(
  "/tbm/all",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.getAllEvaluationsForTbm,
);


// TBM / Lecturer: Publish Single Score
router.post(
  "/tbm/publish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  evaluationController.publishScore,
);

router.post(
  "/publish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  evaluationController.publishScore,
);

// TBM: Publish Bulk Scores
router.post(
  "/tbm/publish-bulk",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.publishScoresBulk,
);

// TBM: Hide Published Score
router.post(
  "/tbm/hide/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.hideScore,
);

// TBM: Hide Bulk Scores
router.post(
  "/tbm/hide-bulk",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.hideScoresBulk,
);

// TBM: Republish Score
router.post(
  "/tbm/republish/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.republishScore,
);

// TBM: Delete evaluation result
router.delete(
  "/tbm/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  evaluationController.tbmDeleteEvaluation,
);

// ==========================================
// 3. Shared Endpoints
// ==========================================

// Get evaluation by ID (Secured with role & ownership check)
router.get(
  "/:id",
  authMiddleware,
  evaluationController.getEvaluationById,
);

export default router;
