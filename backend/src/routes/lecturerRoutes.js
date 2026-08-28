import express from "express";
import lecturerController from "../controllers/lecturerController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// All lecturer master data operations are restricted to TBM
router.use(authMiddleware);
router.get("/", authorizeRoles("TBM", "ADMIN"), lecturerController.getAllLecturers);
router.get("/:id", authorizeRoles("TBM", "ADMIN", "LECTURER"), lecturerController.getLecturerById);
router.post("/", authorizeRoles("TBM", "ADMIN"), lecturerController.createLecturer);
router.put("/:id", authorizeRoles("TBM", "ADMIN"), lecturerController.updateLecturer);
router.patch("/:id/max-students", authorizeRoles("TBM", "ADMIN", "LECTURER"), lecturerController.updateMaxSupervisedStudents);
router.delete("/:id", authorizeRoles("TBM", "ADMIN"), lecturerController.deleteLecturer);
router.patch("/:id/toggle-active", authorizeRoles("TBM", "ADMIN"), lecturerController.toggleLecturerActive);

export default router;
