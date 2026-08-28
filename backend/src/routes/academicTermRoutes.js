import express from "express";
import academicTermController from "../controllers/academicTermController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ====================
// Public / Authenticated Read Routes
// ====================

// Get current academic term (by date matching or active status)
router.get("/current", academicTermController.getCurrentTerm);

// Get active academic term
router.get("/active", academicTermController.getActiveTerm);

// Get all academic terms
router.get(
  "/",
  authMiddleware,
  academicTermController.getAllTerms,
);

// Get term by ID
router.get(
  "/:id",
  authMiddleware,
  academicTermController.getTermById,
);

// ====================
// Admin / TBM Management Routes
// ====================

// Create term
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.createTerm,
);

// Update term
router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.updateTerm,
);

// Activate term
router.patch(
  "/:id/activate",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.activateTerm,
);

// Close term
router.patch(
  "/:id/close",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.closeTerm,
);

// Delete term (Safe delete)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.deleteTerm,
);

export default router;
