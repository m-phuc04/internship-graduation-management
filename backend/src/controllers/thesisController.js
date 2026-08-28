import thesisService from "../services/thesisService.js";
import exportService from "../services/exportService.js";

// ====================
// Student Registers Thesis
// ====================
const createThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.createThesis({
      userId: req.user.userId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký đề tài khóa luận tốt nghiệp thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lookup Student by MSSV
// ====================
const lookupStudent = async (req, res, next) => {
  try {
    const { studentCode } = req.params;
    const result = await thesisService.lookupStudentByCode(
      studentCode,
      req.user?.userId,
    );

    res.status(200).json({
      success: true,
      message: "Tra cứu thông tin sinh viên thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Available Supervisors
// ====================
const getAvailableSupervisors = async (req, res, next) => {
  try {
    const supervisors = await thesisService.getAvailableSupervisors();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách giảng viên hướng dẫn khả dụng thành công",
      data: supervisors,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Current Student's Thesis
// ====================
const getMyThesis = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const result = await thesisService.getMyThesis(
      req.user.userId,
      academicTermId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy hồ sơ khóa luận của sinh viên thành công",
      data: result.thesis,
      student: result.student,
      canRegisterNew: result.canRegisterNew,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Thesis By Student ID
// ====================
const getThesisByStudent = async (req, res, next) => {
  try {
    const thesis = await thesisService.getThesisByStudent(req.params.studentId);

    res.status(200).json({
      success: true,
      message: "Lấy thông tin khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PHASE 9: TBM THESIS CONTROLLERS
// ==========================================

// ====================
// TBM: Get All Theses with Search & Filter
// ====================
const getAllThesesForTbm = async (req, res, next) => {
  try {
    const { page, limit, search, status, academicTermId } = req.query;

    const result = await thesisService.getAllThesesForTbm({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      status: status || "",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài khóa luận thành công",
      data: result.data,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Approve Thesis
// ====================
const approveThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.approveThesis(req.params.id, {
      supervisorId: req.body?.supervisorId || null,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Phê duyệt đề tài khóa luận tốt nghiệp thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Reject Thesis
// ====================
const rejectThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.rejectThesis(req.params.id, {
      reason: req.body?.reason || null,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Đã từ chối đề tài khóa luận và cho phép sinh viên đăng ký lại",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Assign Supervisor
// ====================
const assignSupervisor = async (req, res, next) => {
  try {
    const thesis = await thesisService.assignSupervisor(req.params.id, {
      supervisorId: req.body?.supervisorId,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Phân công giảng viên hướng dẫn thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Assign Reviewers (Reviewer 1 & 2)
// ====================
const assignReviewers = async (req, res, next) => {
  try {
    const thesis = await thesisService.assignReviewers(req.params.id, {
      reviewer1Id: req.body?.reviewer1Id,
      reviewer2Id: req.body?.reviewer2Id,
      reviewers: req.body?.reviewers,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Phân công giảng viên phản biện thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PHASE 11: LECTURER / REVIEWER CONTROLLERS
// ==========================================

// ====================
// Lecturer: Get All Assigned Theses (GVHD / PB1 / PB2)
// ====================
const getAssignedThesesForLecturer = async (req, res, next) => {
  try {
    const { roleType, search, academicTermId } = req.query;

    const result = await thesisService.getThesesForLecturerRole(
      req.user.userId,
      {
        roleType: roleType || "ALL",
        search: search || "",
        academicTermId: academicTermId || "",
      },
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài khóa luận phân công thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer: Grade Thesis by Role
// ====================
const gradeThesisByLecturer = async (req, res, next) => {
  try {
    const { score, comment, roleType } = req.body;

    const thesis = await thesisService.gradeThesisByLecturer(req.params.id, {
      score,
      comment,
      roleType,
      userId: req.user.userId,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Chấm điểm và lưu đánh giá đề tài khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PHASE 12: THESIS EVALUATION CONTROLLERS
// ==========================================

// ====================
// Get Theses For Evaluation (Only reviewer1Id != null AND reviewer2Id != null)
// ====================
const getThesesForEvaluation = async (req, res, next) => {
  try {
    const { search, status, academicTermId } = req.query;

    const result = await thesisService.getThesesForEvaluation({
      search: search || "",
      status: status || "ALL",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đánh giá khóa luận thành công",
      data: result.theses,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM Completes Thesis Evaluation (COMPLETED)
// ====================
const completeThesisEvaluation = async (req, res, next) => {
  try {
    const thesis = await thesisService.completeThesisEvaluation(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Hoàn tất đánh giá khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer Accepts Supervision
// ====================
const supervisorAcceptThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.supervisorAcceptThesis(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Đã chấp nhận hướng dẫn đề tài khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer Rejects Supervision
// ====================
const supervisorRejectThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.supervisorRejectThesis(
      req.params.id,
      req.user,
      { reason: req.body?.reason },
    );

    res.status(200).json({
      success: true,
      message: "Đã từ chối hướng dẫn đề tài khóa luận",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Export Theses to Excel
// ====================
const exportTheses = async (req, res, next) => {
  try {
    const { academicTermId, status, search, lecturerId } = req.query;

    const { buffer, filename } = await exportService.exportTheses({
      academicTermId: academicTermId || "",
      status: status || "",
      search: search || "",
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

export default {
  createThesis,
  lookupStudent,
  getAvailableSupervisors,
  getMyThesis,
  getThesisByStudent,
  getAllThesesForTbm,
  approveThesis,
  rejectThesis,
  assignSupervisor,
  assignReviewers,
  supervisorAcceptThesis,
  supervisorRejectThesis,
  getAssignedThesesForLecturer,
  gradeThesisByLecturer,
  getThesesForEvaluation,
  completeThesisEvaluation,
  exportTheses,
};
