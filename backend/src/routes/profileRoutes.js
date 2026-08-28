import express from "express";
import authController from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, authController.getProfile);
router.patch("/", authMiddleware, authController.updateProfile);
router.get("/public/:id", authMiddleware, authController.getPublicProfile);
router.get("/user/:id", authMiddleware, authController.getPublicProfile);
router.get("/:id", authMiddleware, authController.getPublicProfile);

export default router;
