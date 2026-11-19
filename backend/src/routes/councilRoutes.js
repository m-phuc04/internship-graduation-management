import express from "express";
import councilController from "../controllers/councilController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Kiểm tra đăng nhập
router.use(authMiddleware);

// Xem danh sách và chi tiết hội đồng
router.get("/", councilController.getCouncils);
router.get("/:id", councilController.getCouncilById);

// Quản lý hội đồng khóa luận (TBM / ADMIN)
router.post(
  "/",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.createCouncil
);

router.put(
  "/bulk/report-date",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.bulkUpdateReportDate
);

router.post(
  "/batch/assign-theses",
  authorizeRoles("TBM", "ADMIN", "DEAN", "LECTURER"),
  councilController.batchAssignTheses
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
