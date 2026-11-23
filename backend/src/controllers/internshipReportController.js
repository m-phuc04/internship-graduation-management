import internshipReportService from "../services/internshipReportService.js";

// ====================
// Sinh viên tạo hoặc nộp báo cáo thực tập
// ====================
const createReport = async (req, res, next) => {
  try {
    let fileMeta = null;
    if (req.file) {
      fileMeta = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileUrl: `/uploads/internship-reports/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: req.body.category || req.body.fileCategory || null,
        uploadedAt: new Date(),
      };
    } else if (req.body.file && typeof req.body.file === "object") {
      fileMeta = {
        ...req.body.file,
        category: req.body.category || req.body.fileCategory || req.body.file.category || null,
      };
    }

    const report = await internshipReportService.createReport({
      userId: req.user.userId,
      ...req.body,
      file: fileMeta,
      fileCategory: req.body.category || req.body.fileCategory || fileMeta?.category || null,
    });

    res.status(201).json({
      success: true,
      message:
        report.status === "DRAFT"
          ? "Lưu bản nháp nhật ký thành công"
          : "Nộp nhật ký thực tập thành công",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên cập nhật báo cáo (Bản nháp hoặc Cần chỉnh sửa)
// ====================
const updateReport = async (req, res, next) => {
  try {
    let fileMeta = undefined;
    if (req.file) {
      fileMeta = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileUrl: `/uploads/internship-reports/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: req.body.category || req.body.fileCategory || null,
        uploadedAt: new Date(),
      };
    } else if (req.body.file && typeof req.body.file === "object") {
      fileMeta = {
        ...req.body.file,
        category: req.body.category || req.body.fileCategory || req.body.file.category || null,
      };
    }

    const report = await internshipReportService.updateReport({
      reportId: req.params.id,
      userId: req.user.userId,
      ...req.body,
      file: fileMeta,
      fileCategory: req.body.category || req.body.fileCategory || fileMeta?.category || undefined,
    });

    res.status(200).json({
      success: true,
      message:
        report.status === "DRAFT"
          ? "Lưu bản nháp thành công"
          : "Cập nhật và nộp nhật ký thực tập thành công",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 2 xác nhận hoặc từ chối báo cáo
// ====================
const confirmStudent2 = async (req, res, next) => {
  try {
    return res.status(400).json({
      success: false,
      message: "Chức năng xác nhận nhóm cho Thực tập Doanh nghiệp đã được loại bỏ",
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên lấy toàn bộ báo cáo của mình
// ====================
const getMyReports = async (req, res, next) => {
  try {
    const result = await internshipReportService.getReportsForStudent(
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách nhật ký thực tập thành công",
      data: result.reports,
      student: result.student,
      internship: result.internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên lấy danh sách báo cáo của sinh viên được phân công giám sát
// ====================
const getReportsForLecturer = async (req, res, next) => {
  try {
    const { page, limit, search, status, reportType, fileCategory, category } = req.query;

    const result = await internshipReportService.getReportsForLecturer(
      req.user.userId,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search: search || "",
        status: status || "",
        reportType: reportType || "",
        fileCategory: (fileCategory || category || "").trim(),
      },
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách nhật ký sinh viên hướng dẫn thành công",
      data: result.data,
      lecturer: result.lecturer,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Trưởng bộ môn lấy danh sách tất cả báo cáo thực tập
// ====================
const getAllReportsForTbm = async (req, res, next) => {
  try {
    const { page, limit, search, status, reportType } = req.query;

    const result = await internshipReportService.getAllReportsForTbm({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      status: status || "",
      reportType: reportType || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách toàn bộ nhật ký thực tập thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lấy thông tin báo cáo theo ID
// ====================
const getReportById = async (req, res, next) => {
  try {
    const report = await internshipReportService.getReportById(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết nhật ký thành công",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên / Trưởng bộ môn đánh giá, phản hồi báo cáo
// ====================
const reviewReport = async (req, res, next) => {
  try {
    const { lecturerScore, lecturerComment, status } = req.body;

    const report = await internshipReportService.reviewReport(
      req.params.id,
      req.user,
      {
        lecturerScore,
        lecturerComment,
        status,
      },
    );

    res.status(200).json({
      success: true,
      message: `Đánh giá nhật ký thành công (Trạng thái: ${report.status})`,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lấy toàn bộ báo cáo của một hồ sơ thực tập
// ====================
const getReportsByInternshipId = async (req, res, next) => {
  try {
    const result = await internshipReportService.getReportsByInternshipId(
      req.params.internshipId,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách nhật ký thực tập thành công",
      data: result.reports,
      internship: result.internship,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
  updateReport,
  confirmStudent2,
  getMyReports,
  getReportsForLecturer,
  getAllReportsForTbm,
  getReportById,
  reviewReport,
  getReportsByInternshipId,
};

