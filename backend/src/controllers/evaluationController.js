import evaluationService from "../services/evaluationService.js";

// ====================
// Company Gets Internships with Evaluation Data
// ====================
const getCompanyInternships = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;

    const result = await evaluationService.getCompanyInternships(
      req.user.userId,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search: search || "",
        status: status || "",
      },
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách sinh viên thực tập thành công",
      data: result.data,
      company: result.company,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Company Creates or Updates Evaluation
// ====================
const createOrUpdateEvaluation = async (req, res, next) => {
  try {
    const evaluation = await evaluationService.createOrUpdateEvaluation(
      req.user.userId,
      req.user.role,
      req.body,
    );

    res.status(200).json({
      success: true,
      message:
        evaluation.status === "DRAFT"
          ? "Lưu bản nháp phiếu đánh giá thành công"
          : "Gửi phiếu đánh giá sinh viên thực tập thành công",
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Evaluation By ID
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
// Lecturer Gets Evaluations of Supervised Students
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
// TBM Gets All Evaluations
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
// Student Creates or Retrieves Evaluation Link
// ====================
const createStudentEvaluationLink = async (req, res, next) => {
  try {
    const academicTermId = req.body?.academicTermId || req.query?.academicTermId;
    const result = await evaluationService.createStudentEvaluationLink(req.user.userId, academicTermId);

    res.status(result.isExisting ? 200 : 201).json({
      success: true,
      message: result.message,
      data: result.request,
      token: result.token,
      isExisting: result.isExisting,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Gets My Evaluation Request & Result
// ====================
const getStudentEvaluationRequest = async (req, res, next) => {
  try {
    const academicTermId = req.query?.academicTermId || req.body?.academicTermId;
    const result = await evaluationService.getStudentEvaluationRequest(req.user.userId, academicTermId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Public Gets Evaluation Form by Token (No Login)
// ====================
const getPublicEvaluationByToken = async (req, res, next) => {
  try {
    const result = await evaluationService.getPublicEvaluationByToken(req.params.token);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Public Submits Evaluation Form (No Login)
// ====================
const submitPublicEvaluation = async (req, res, next) => {
  try {
    const result = await evaluationService.submitPublicEvaluation(
      req.params.token,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.evaluation,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM Resets / Allows Recreating Evaluation Request
// ====================
const tbmResetEvaluationRequest = async (req, res, next) => {
  try {
    const result = await evaluationService.tbmResetEvaluationRequest(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM Gets All Evaluation Requests with Status
// ====================
const tbmGetAllEvaluationRequests = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;

    const result = await evaluationService.tbmGetAllEvaluationRequests({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      status: status || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu đánh giá thực tập thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Requests Recreating Evaluation Link
// ====================
const studentRequestRecreateLink = async (req, res, next) => {
  try {
    const result = await evaluationService.studentRequestRecreateLink(
      req.user.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.request,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM Gets All Recreate Link Requests
// ====================
const tbmGetRecreateRequests = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const result = await evaluationService.tbmGetRecreateRequests({
      search: search || "",
      status: status || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu tạo lại link thành công",
      data: result.data,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM Approves Recreate Link Request
// ====================
const tbmApproveRecreateRequest = async (req, res, next) => {
  try {
    const result = await evaluationService.tbmApproveRecreateRequest(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.request,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM Rejects Recreate Link Request
// ====================
const tbmRejectRecreateRequest = async (req, res, next) => {
  try {
    const result = await evaluationService.tbmRejectRecreateRequest(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.request,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCompanyInternships,
  createOrUpdateEvaluation,
  getEvaluationById,
  getEvaluationsForLecturer,
  getAllEvaluationsForTbm,
  createStudentEvaluationLink,
  getStudentEvaluationRequest,
  getPublicEvaluationByToken,
  submitPublicEvaluation,
  tbmResetEvaluationRequest,
  tbmGetAllEvaluationRequests,
  studentRequestRecreateLink,
  tbmGetRecreateRequests,
  tbmApproveRecreateRequest,
  tbmRejectRecreateRequest,
};

