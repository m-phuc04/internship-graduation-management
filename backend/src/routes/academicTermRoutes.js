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

// Create term (Admin only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.createTerm,
);

// Update term (Admin for general term info, TBM for registration timelines)
router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN", "TBM"),
  academicTermController.updateTerm,
);

// Activate term (Admin only)
router.patch(
  "/:id/activate",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.activateTerm,
);

// Close term (Admin only)
router.patch(
  "/:id/close",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.closeTerm,
);

// Delete term (Safe delete, Admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  academicTermController.deleteTerm,
);

export default router;
