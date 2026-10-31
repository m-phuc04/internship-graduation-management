import express from "express";
import researchFieldController from "../controllers/researchFieldController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// 1. Get all fields (authenticated)
router.get("/", authMiddleware, researchFieldController.getAllFields);

// 2. Create field (TBM / ADMIN)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.createField
);

// 3. Delete field (TBM / ADMIN)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.deleteField
);

// 4. Get lecturers with fields (TBM / ADMIN)
router.get(
  "/lecturers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.getLecturersWithFields
);

// 5. Assign fields to lecturers (TBM / ADMIN)
router.put(
  "/lecturers/assign",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.assignFields
);

// 6. Lecturer gets own pending request & current fields (LECTURER / TBM)
router.get(
  "/my-request",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  researchFieldController.getMyRequest
);

// 7. Lecturer submits a field change request (LECTURER / TBM)
router.post(
  "/request",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  researchFieldController.createRequest
);

// 8. TBM gets all pending requests (TBM / ADMIN)
router.get(
  "/requests",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.getAllRequests
);

// 9. TBM approves request (TBM / ADMIN)
router.post(
  "/requests/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.approveRequest
);

// 10. TBM rejects request (TBM / ADMIN)
router.post(
  "/requests/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  researchFieldController.rejectRequest
);

export default router;
