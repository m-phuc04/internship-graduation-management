import express from "express";
import studentController from "../controllers/studentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// All student master data operations are restricted to TBM
router.use(authMiddleware);
router.use(authorizeRoles("TBM", "ADMIN"));

router.get("/", studentController.getAllStudents);
router.get("/:id", studentController.getStudentById);
router.post("/", studentController.createStudent);
router.put("/:id", studentController.updateStudent);
router.delete("/:id", studentController.deleteStudent);
router.patch("/:id/reset-password", studentController.resetStudentPassword);
router.patch("/:id/toggle-active", studentController.toggleStudentActive);

export default router;
