import express from "express";
import newsController from "../controllers/newsController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", newsController.getPublicNews);
router.get("/:id", newsController.getNewsById);

// Protected routes (Lecturer, TBM, Admin)
router.use(authMiddleware);
router.use(authorizeRoles("LECTURER", "TBM", "ADMIN"));

router.get("/manage/my", newsController.getMyNews);
router.post("/", newsController.createNews);
router.put("/:id", newsController.updateNews);
router.patch("/:id/status", newsController.togglePublishNews);
router.delete("/:id", newsController.deleteNews);

export default router;
