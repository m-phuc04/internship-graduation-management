import companyService from "../services/companyService.js";

const getAllCompanies = async (req, res, next) => {
  try {
    const result = await companyService.getAllCompanies(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách doanh nghiệp thành công",
      data: result.companies,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy chi tiết doanh nghiệp thành công",
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const company = await companyService.createCompany(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo doanh nghiệp mới thành công",
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const company = await companyService.updateCompany(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin doanh nghiệp thành công",
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const result = await companyService.deleteCompany(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
