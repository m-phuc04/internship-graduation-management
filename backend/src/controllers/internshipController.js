import internshipService from "../services/internshipService.js";
import exportService from "../services/exportService.js";

// ====================
// Student Creates Internship Registration
// ====================
const createInternship = async (req, res, next) => {
  try {
    const internship = await internshipService.createInternship({
      userId: req.user.userId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thực tập thành công. Hồ sơ đang ở trạng thái PENDING chờ xét duyệt.",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Get All Internships (Search, Filter, Pagination)
// ====================
const getAllInternships = async (req, res, next) => {
  try {
    const { page, limit, search, status, academicTermId } = req.query;

    const result = await internshipService.getAllInternships({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      status: status || "",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách hồ sơ thực tập thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Get Available Lecturers for Assignment
// ====================
const getAvailableLecturers = async (req, res, next) => {
  try {
    const lecturers = await internshipService.getAvailableLecturers();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách giảng viên khả dụng thành công",
      data: lecturers,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Assign Lecturer to Internship
// ====================
const assignLecturer = async (req, res, next) => {
  try {
    const { lecturerId } = req.body;
    if (!lecturerId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn giảng viên hướng dẫn",
      });
    }

    const internship = await internshipService.assignLecturer(
      req.params.id,
      lecturerId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Phân công giảng viên hướng dẫn thành công",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Approve Internship
// ====================
const approveInternship = async (req, res, next) => {
  try {
    const { lecturerId } = req.body;
    const internship = await internshipService.approveInternship(
      req.params.id,
      req.user.userId,
      lecturerId,
    );

    res.status(200).json({
      success: true,
      message: "Phê duyệt hồ sơ thực tập thành công",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Reject Internship
// ====================
const rejectInternship = async (req, res, next) => {
  try {
    const reason = req.body?.rejectionReason || req.body?.reason;

    const internship = await internshipService.rejectInternship(
      req.params.id,
      req.user.userId,
      reason,
    );

    res.status(200).json({
      success: true,
      message: "Từ chối hồ sơ thực tập thành công",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Logged-in Student Gets Their Internship Profile
// ====================
const getMyInternship = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const result = await internshipService.getMyInternship(
      req.user.userId,
      academicTermId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy thông tin hồ sơ thực tập thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Active Companies for Dropdown Selection
// ====================
const getActiveCompanies = async (req, res, next) => {
  try {
    const companies = await internshipService.getActiveCompanies();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách doanh nghiệp thành công",
      data: companies,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Internship By ID
// ====================
const getInternshipById = async (req, res, next) => {
  try {
    const internship = await internshipService.getInternshipById(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Lấy thông tin hồ sơ thực tập thành công",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer: Get Supervised Internships
// ====================
const getSupervisedInternships = async (req, res, next) => {
  try {
    const { page, limit, search, academicTermId } = req.query;

    const result = await internshipService.getSupervisedInternships({
      userId: req.user.userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách sinh viên thực tập hướng dẫn thành công",
      data: result.data,
      stats: result.stats,
      lecturer: result.lecturer,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Supervision Document Data (Document A)
// ====================
const getSupervisionDocument = async (req, res, next) => {
  try {
    const { lecturerId, companyId } = req.query;

    const documentData =
      await internshipService.getSupervisionConfirmationDocument({
        userId: req.user.userId,
        userRole: req.user.role,
        lecturerId: lecturerId || null,
        companyId: companyId || null,
      });

    res.status(200).json({
      success: true,
      message: "Lấy dữ liệu giấy xác nhận hướng dẫn thực tập thành công",
      data: documentData,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer Accepts Internship Supervision
// ====================
const supervisorAcceptInternship = async (req, res, next) => {
  try {
    const internship = await internshipService.supervisorAcceptInternship(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Đã chấp nhận hướng dẫn sinh viên thực tập thành công",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer Rejects Internship Supervision
// ====================
const supervisorRejectInternship = async (req, res, next) => {
  try {
    const reason = req.body?.reason || req.body?.rejectionReason;
    const internship = await internshipService.supervisorRejectInternship(
      req.params.id,
      req.user,
      { reason },
    );

    res.status(200).json({
      success: true,
      message: "Đã từ chối hướng dẫn sinh viên thực tập",
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Export Internships to Excel
// ====================
const exportInternships = async (req, res, next) => {
  try {
    const { academicTermId, status, search, companyId, lecturerId } = req.query;

    const { buffer, filename } = await exportService.exportInternships({
      academicTermId: academicTermId || "",
      status: status || "",
      search: search || "",
      companyId: companyId || "",
      lecturerId: lecturerId || "",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer / TBM Completes Internship Evaluation
// ====================
const completeInternship = async (req, res, next) => {
  try {
    const result = await internshipService.completeInternship(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Đã xác nhận hoàn thành thực tập và khóa phiếu đánh giá thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createInternship,
  getAllInternships,
  getAvailableLecturers,
  assignLecturer,
  approveInternship,
  rejectInternship,
  supervisorAcceptInternship,
  supervisorRejectInternship,
  completeInternship,
  getMyInternship,
  getSupervisedInternships,
  getSupervisionDocument,
  getActiveCompanies,
  getInternshipById,
  exportInternships,
};
