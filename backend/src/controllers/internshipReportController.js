import internshipReportService from "../services/internshipReportService.js";

// ====================
// Student Creates or Submits Report
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
        uploadedAt: new Date(),
      };
    } else if (req.body.file && typeof req.body.file === "object") {
      fileMeta = req.body.file;
    }

    const report = await internshipReportService.createReport({
      userId: req.user.userId,
      ...req.body,
      file: fileMeta,
    });

    res.status(201).json({
      success: true,
      message:
        report.status === "DRAFT"
          ? "Lưu bản nháp nhật ký thành công"
          : report.status === "WAITING_STUDENT_2"
          ? "Đã gửi nhật ký, đang chờ Sinh viên 2 xác nhận"
          : "Nộp nhật ký thực tập thành công",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Updates Report (Draft or Needs Revision)
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
        uploadedAt: new Date(),
      };
    } else if (req.body.file && typeof req.body.file === "object") {
      fileMeta = req.body.file;
    }

    const report = await internshipReportService.updateReport({
      reportId: req.params.id,
      userId: req.user.userId,
      ...req.body,
      file: fileMeta,
    });

    res.status(200).json({
      success: true,
      message:
        report.status === "DRAFT"
          ? "Lưu bản nháp thành công"
          : report.status === "WAITING_STUDENT_2"
          ? "Đã cập nhật nhật ký, đang chờ Sinh viên 2 xác nhận"
          : "Cập nhật và nộp nhật ký thực tập thành công",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student 2 Confirms or Rejects Report
// ====================
const confirmStudent2 = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    const report = await internshipReportService.confirmReportByStudent2(
      req.params.id,
      req.user.userId,
      { action, rejectionReason },
    );

    res.status(200).json({
      success: true,
      message:
        action === "CONFIRM"
          ? "Đã xác nhận nhật ký thực tập và chuyển tới Giảng viên hướng dẫn"
          : "Đã yêu cầu Sinh viên 1 chỉnh sửa lại nhật ký",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Gets All Their Own Reports
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
// Lecturer Gets Supervised Students' Reports
// ====================
const getReportsForLecturer = async (req, res, next) => {
  try {
    const { page, limit, search, status, reportType } = req.query;

    const result = await internshipReportService.getReportsForLecturer(
      req.user.userId,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search: search || "",
        status: status || "",
        reportType: reportType || "",
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
// TBM Gets All Reports
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
// Get Report By ID
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
// Lecturer / TBM Review Report
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

export default {
  createReport,
  updateReport,
  confirmStudent2,
  getMyReports,
  getReportsForLecturer,
  getAllReportsForTbm,
  getReportById,
  reviewReport,
};
