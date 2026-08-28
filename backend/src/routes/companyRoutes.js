import express from "express";
import companyController from "../controllers/companyController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// All company master data operations are restricted to TBM
router.use(authMiddleware);
router.use(authorizeRoles("TBM", "ADMIN"));

router.get("/", companyController.getAllCompanies);
router.get("/:id", companyController.getCompanyById);
router.post("/", companyController.createCompany);
router.put("/:id", companyController.updateCompany);
router.delete("/:id", companyController.deleteCompany);

export default router;
