import express from "express";
import scheduleController from "../controllers/scheduleController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// 1. GET /api/schedules - Open to all authenticated users (SV, GV, TBM, ADMIN, COMPANY)
router.get("/", scheduleController.getAllSchedules);

// 2. POST /api/schedules - ONLY TBM and ADMIN
router.post("/", roleMiddleware("TBM", "ADMIN"), scheduleController.createSchedule);

// 3. PUT /api/schedules/:id - ONLY TBM and ADMIN
router.put("/:id", roleMiddleware("TBM", "ADMIN"), scheduleController.updateSchedule);
router.patch("/:id", roleMiddleware("TBM", "ADMIN"), scheduleController.updateSchedule);

// 4. DELETE /api/schedules/:id - ONLY TBM and ADMIN
router.delete("/:id", roleMiddleware("TBM", "ADMIN"), scheduleController.deleteSchedule);

export default router;
