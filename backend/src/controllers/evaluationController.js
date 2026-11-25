import evaluationService from "../services/evaluationService.js";
import { logActivity } from "../services/logService.js";

// ====================
// Lấy thông tin đánh giá theo ID
// ====================
const getEvaluationById = async (req, res, next) => {
  try {
    const result = await evaluationService.getEvaluationById(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết phiếu đánh giá thành công",
      data: result.evaluation,
      internship: result.internship,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên lấy danh sách đánh giá của sinh viên hướng dẫn
// ====================
const getEvaluationsForLecturer = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;

    const result = await evaluationService.getEvaluationsForLecturer(
      req.user.userId,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search: search || "",
      },
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách phiếu đánh giá của sinh viên hướng dẫn thành công",
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM lấy danh sách tất cả phiếu đánh giá
// ====================
const getAllEvaluationsForTbm = async (req, res, next) => {
  try {
    const { page, limit, search, status, academicTermId } = req.query;

    const result = await evaluationService.getAllEvaluationsForTbm({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      status: status || "",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách toàn bộ phiếu đánh giá thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM xóa kết quả đánh giá
// ====================
const tbmDeleteEvaluation = async (req, res, next) => {
  try {
    const result = await evaluationService.tbmDeleteEvaluation(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên Giám sát (GVGS): Chấm điểm thực tập
// ====================
const gradeInternship = async (req, res, next) => {
  try {
    const { internshipId, score, comments, criteria } = req.body;
    const lecturerUserId = req.user.userId;

    const result = await evaluationService.gradeInternshipByLecturer({
      internshipId: internshipId || req.params.id,
      lecturerUserId,
      score,
      comments,
      criteria,
    });

    await logActivity(req, {
      action: "Đánh giá kết quả thực tập",
      module: "EVALUATION",
      description: `Giảng viên đã chấm điểm đánh giá thực tập cho hồ sơ ${internshipId || req.params.id}`,
      targetId: result?._id || req.params.id,
      targetModel: "Evaluation",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Chấm điểm thực tập doanh nghiệp thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM / Giảng viên: Công bố điểm một hồ sơ
// ====================
const publishScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;
    const result = await evaluationService.publishInternshipScore({
      internshipId: id,
      tbmUserId: userId,
      requestingUser: req.user,
    });

    await logActivity(req, {
      action: "Công bố kết quả đánh giá",
      module: "EVALUATION",
      description: `Đã công bố điểm đánh giá thực tập cho hồ sơ ${id}`,
      targetId: id,
      targetModel: "Internship",
      status: "SUCCESS",
    });
    res.status(200).json({
      success: true,
      message: "Công bố điểm thực tập thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Công bố điểm hàng loạt
// ====================
const publishScoresBulk = async (req, res, next) => {
  try {
    const { internshipIds } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    const result = await evaluationService.publishInternshipScoresBulk({
      internshipIds,
      tbmUserId: userId,
    });
    res.status(200).json({
      success: true,
      message: `Đã công bố điểm cho ${result.publishedCount} sinh viên`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Ẩn điểm đã công bố
// ====================
const hideScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    const result = await evaluationService.hideInternshipScore({
      id,
      tbmUserId: userId,
      reason,
    });
    res.status(200).json({
      success: true,
      message: "Ẩn điểm đánh giá thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Ẩn điểm hàng loạt
// ====================
const hideScoresBulk = async (req, res, next) => {
  try {
    const { internshipIds, reason } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    const result = await evaluationService.hideInternshipScoresBulk({
      internshipIds,
      tbmUserId: userId,
      reason,
    });
    res.status(200).json({
      success: true,
      message: `Đã ẩn điểm cho ${result.hiddenCount} sinh viên`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Công bố lại điểm
// ====================
const republishScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    const result = await evaluationService.republishInternshipScore({
      id,
      tbmUserId: userId,
      reason,
    });
    res.status(200).json({
      success: true,
      message: "Công bố lại điểm đánh giá thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  gradeInternship,
  publishScore,
  publishScoresBulk,
  hideScore,
  hideScoresBulk,
  republishScore,
  getEvaluationById,
  getEvaluationsForLecturer,
  getAllEvaluationsForTbm,
  tbmDeleteEvaluation,
};
