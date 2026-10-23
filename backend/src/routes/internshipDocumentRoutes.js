import express from "express";
import internshipDocumentController from "../controllers/internshipDocumentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";
import { uploadInternshipDocumentFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// GET all documents: accessible by all authenticated users (STUDENT, TBM, LECTURER, ADMIN)
router.get(
  "/",
  authMiddleware,
  internshipDocumentController.getDocuments,
);

// POST create document: only TBM and ADMIN
router.post(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  uploadInternshipDocumentFile.single("file"),
  internshipDocumentController.createDocument,
);

// DELETE document: only TBM and ADMIN
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  internshipDocumentController.deleteDocument,
);

export default router;

