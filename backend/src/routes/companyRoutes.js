import express from "express";
import companyController from "../controllers/companyController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Chỉ TBM và ADMIN được quản lý danh mục doanh nghiệp
router.use(authMiddleware);
router.use(authorizeRoles("TBM", "ADMIN"));

// Quản lý thông tin doanh nghiệp
router.get("/", companyController.getAllCompanies);
router.get("/:id", companyController.getCompanyById);
router.post("/", companyController.createCompany);
router.put("/:id", companyController.updateCompany);
router.delete("/:id", companyController.deleteCompany);

export default router;
