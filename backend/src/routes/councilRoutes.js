import express from "express";
import councilController from "../controllers/councilController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Lecturer, TBM, Admin can view councils
router.get("/", councilController.getCouncils);
router.get("/:id", councilController.getCouncilById);

// TBM / Admin only for council management
router.post(
  "/",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.createCouncil
);

router.put(
  "/:id",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.updateCouncil
);

router.delete(
  "/clear-all",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.clearAllCouncils
);

router.delete(
  "/:id",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.deleteCouncil
);

router.post(
  "/assign-thesis",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.assignCouncilToThesis
);

export default router;
