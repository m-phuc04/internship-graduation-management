import express from "express";
import adminController from "../controllers/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Strict RBAC: All admin routes require ADMIN role
router.use(authMiddleware, authorizeRoles("ADMIN"));

// Permissions Management
router.get("/permissions", adminController.getPermissionsList);
router.patch("/permissions/:lecturerId", adminController.updateLecturerPermissions);

// User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/status", adminController.toggleUserStatus);
router.post("/users/:userId/reset-password", adminController.resetPassword);

export default router;
