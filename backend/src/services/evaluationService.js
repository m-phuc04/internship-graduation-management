import mongoose from "mongoose";
import Evaluation from "../models/Evaluation.js";
import Notification from "../models/Notification.js";
import Internship from "../models/Internship.js";
import Company from "../models/Company.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import AcademicTerm from "../models/AcademicTerm.js";
import InternshipReport from "../models/InternshipReport.js";
import InternshipDocument from "../models/InternshipDocument.js";
import AppError from "../utils/AppError.js";
import notificationService from "./notificationService.js";
import { checkInternshipDiaryCompletion } from "../utils/internshipDateUtils.js";

// ====================
// Helper: Resolve Academic Term for Internship
// ====================
export const resolveAcademicTermForInternship = async (internship, explicitTermId = null) => {
  let term = null;
  if (internship?.academicTermId) {
    if (internship.academicTermId.internship !== undefined || internship.academicTermId.name) {
      term = internship.academicTermId;
    } else {
      term = await AcademicTerm.findById(internship.academicTermId).lean();
    }
  }
  if (!term && explicitTermId && explicitTermId !== "ALL") {
    term = await AcademicTerm.findById(explicitTermId).lean();
  }
  if (!term) {
    term = await AcademicTerm.findOne({ status: "ACTIVE" }).lean();
  }
  if (!term) {
    const now = new Date();
    term = await AcademicTerm.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: { $ne: "CLOSED" },
    }).lean();
  }
  if (!term) {
    term = await AcademicTerm.findOne().sort({ createdAt: -1 }).lean();
  }
  return term;
};

// ====================
// Helper: Validate TTDN Evaluation Window
// ====================
// ====================
// Helper: Validate TTDN Grading Window for Giảng viên Giám sát
// ====================
export const validateInternshipGradingWindow = (term, checkDate = new Date()) => {
  if (!term) {
    throw new AppError("Không tìm thấy thông tin học kỳ để kiểm tra thời gian chấm điểm.", 400);
  }
  if (term.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể chấm điểm thực tập.", 400);
  }
  const internshipCfg = term.internship || {};
  const startRaw = internshipCfg.gradingStart;
  const endRaw = internshipCfg.gradingEnd;

  // 1. TBM chưa cấu hình đủ ngày bắt đầu và hạn chót
  if (!startRaw || !endRaw) {
    throw new AppError("TBM chưa cấu hình thời gian chấm điểm", 400);
  }

  const extractDateStr = (raw) => {
    if (!raw) return null;
    if (typeof raw === "string") {
      const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  const startDateStr = extractDateStr(startRaw);
  const endDateStr = extractDateStr(endRaw);

  if (!startDateStr || !endDateStr) {
    throw new AppError("Cấu hình thời gian chấm điểm không hợp lệ", 400);
  }

  const start = new Date(`${startDateStr}T00:00:00+07:00`);
  const end = new Date(`${endDateStr}T23:59:59.999+07:00`);

  // 2. Cấu hình ngày không hợp lệ hoặc ngày bắt đầu sau hạn chót
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new AppError("Cấu hình thời gian chấm điểm không hợp lệ", 400);
  }

  const now = checkDate instanceof Date ? checkDate : new Date(checkDate);

  const formatDateStr = (d) =>
    new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(d);

  // 3. Chưa đến ngày bắt đầu
  if (now.getTime() < start.getTime()) {
    throw new AppError(`Chưa đến thời gian chấm điểm (Mở từ ngày ${formatDateStr(start)})`, 400);
  }

  // 4. Đã quá hạn chấm điểm
  if (now.getTime() > end.getTime()) {
    throw new AppError(`Đã hết hạn chấm điểm (Hạn chót: ${formatDateStr(end)})`, 400);
  }

  return { allowed: true };
};

export const validateInternshipEvaluationWindow = (term, checkDate = new Date()) => {
  if (!term) {
    throw new AppError("Không tìm thấy thông tin học kỳ để kiểm tra thời gian tạo link đánh giá.", 400);
  }
  if (term.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể đánh giá thực tập.", 400);
  }
  const internshipCfg = term.internship || {};
  const startRaw =
    internshipCfg.evaluationStartDate ||
    internshipCfg.evaluationStart ||
    internshipCfg.reportStart;
  const endRaw =
    internshipCfg.evaluationEndDate ||
    internshipCfg.evaluationEnd ||
    internshipCfg.reportDeadline ||
    internshipCfg.evaluationDeadline;

  const now = checkDate instanceof Date ? checkDate : new Date(checkDate);

  if (startRaw) {
    const start = new Date(startRaw);
    start.setHours(0, 0, 0, 0);
    if (now < start) {
      const formattedDate = start.toLocaleDateString("vi-VN");
      throw new AppError(`Chưa đến thời gian mở tạo link đánh giá thực tập doanh nghiệp (Mở từ ngày ${formattedDate}).`, 400);
    }
  }

  if (endRaw) {
    let end = new Date(endRaw);
    if (
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getSeconds() === 0 &&
      end.getMilliseconds() === 0
    ) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
    } else {
      end.setHours(23, 59, 59, 999);
    }

    if (now > end) {
      const formattedDate = end.toLocaleDateString("vi-VN");
      throw new AppError(`Đã hết thời gian tạo link đánh giá thực tập doanh nghiệp (Hạn chót: ${formattedDate}).`, 400);
    }
  }

  return { allowed: true };
};

// ====================
// Helper: Compute TTDN Evaluation Result (PASS / FAIL / IN_PROGRESS / NOT_OPEN)
// ====================
export const computeInternshipEvaluationResult = (internship, evaluation, term, checkDate = new Date()) => {
  const now = checkDate instanceof Date ? checkDate : new Date(checkDate);
  const internshipCfg = term?.internship || {};
  const startRaw =
    internshipCfg.evaluationStartDate ||
    internshipCfg.evaluationStart ||
    internshipCfg.reportStart;
  const endRaw =
    internshipCfg.evaluationEndDate ||
    internshipCfg.evaluationEnd ||
    internshipCfg.reportDeadline;

  let startDate = null;
  if (startRaw) {
    startDate = new Date(startRaw);
    startDate.setHours(0, 0, 0, 0);
  }

  let endDate = null;
  if (endRaw) {
    endDate = new Date(endRaw);
    if (
      endDate.getHours() === 0 &&
      endDate.getMinutes() === 0 &&
      endDate.getSeconds() === 0 &&
      endDate.getMilliseconds() === 0
    ) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }
  }

  // Check if student has valid evaluation score
  const hasValidScore = Boolean(
    evaluation &&
    evaluation.score !== null &&
    evaluation.score !== undefined &&
    !isNaN(evaluation.score) &&
    (evaluation.status === "SUBMITTED" || evaluation.status === "CONFIRMED" || internship?.status === "COMPLETED")
  );

  const isExpired = Boolean(endDate && now > endDate);
  const isNotOpen = Boolean(startDate && now < startDate);

  let result = "IN_PROGRESS";
  let isPass = false;
  let isFail = false;

  if (hasValidScore) {
    // RULE: Has valid score -> ALWAYS PASS (even after deadline, result is preserved)
    result = "PASS";
    isPass = true;
  } else if (isExpired) {
    // RULE: Expired and no valid score -> FAIL
    result = "FAIL";
    isFail = true;
  } else if (isNotOpen) {
    result = "NOT_OPEN";
  } else {
    result = "IN_PROGRESS";
  }

  return {
    result,
    isPass,
    isFail,
    hasValidScore,
    isExpired,
    isNotOpen,
    startDate,
    endDate,
  };
};

// ====================
// Get Evaluation By ID with RBAC
// ====================
const getEvaluationById = async (evaluationId, requestingUser) => {
  const evaluation = await Evaluation.findById(evaluationId);
  if (!evaluation) {
    throw new AppError("Không tìm thấy phiếu đánh giá", 404);
  }

  const internship = await Internship.findById(evaluation.targetId)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    });

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập tương ứng", 404);
  }

  // Access Control
  if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
    if (
      !lecturer ||
      !internship.lecturerId ||
      internship.lecturerId._id.toString() !== lecturer._id.toString()
    ) {
      throw new AppError(
        "Bạn không có quyền xem đánh giá của sinh viên do giảng viên khác hướng dẫn",
        403,
      );
    }
  } else if (requestingUser.role === "STUDENT") {
    const student = await Student.findOne({ userId: requestingUser.userId });
    if (!student || internship.studentId._id.toString() !== student._id.toString()) {
      throw new AppError("Bạn không có quyền xem đánh giá của sinh viên khác", 403);
    }
  }

  return {
    evaluation,
    internship,
  };
};

// ====================
// Lecturer Gets Evaluations of Supervised Students
// ====================
const getEvaluationsForLecturer = async (
  userId,
  { page = 1, limit = 10, search = "" } = {},
) => {
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const internships = await Internship.find({
    lecturerId: lecturer._id,
  }).select("_id");

  const internshipIds = internships.map((i) => i._id);

  const evaluations = await Evaluation.find({
    evaluationType: "INTERNSHIP",
    targetId: { $in: internshipIds },
  })
    .populate({
      path: "targetId",
      model: "Internship",
      populate: [
        {
          path: "studentId",
          populate: { path: "userId", select: "fullName email phone" },
        },
        { path: "companyId", select: "name code address phone" },
      ],
    })
    .lean();

  return {
    data: evaluations,
  };
};

// ====================
// TBM Gets All Evaluations (AcademicTerm-aware)
// ====================
const getAllEvaluationsForTbm = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  academicTermId = "",
} = {}) => {
  const query = {
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const matchingUsers = await User.find({ fullName: searchRegex }).select("_id");
    const matchingStudents = await Student.find({
      $or: [
        { studentCode: searchRegex },
        { userId: { $in: matchingUsers.map((u) => u._id) } },
      ],
    }).select("_id");

    const matchingCompanies = await Company.find({ name: searchRegex }).select("_id");

    const searchCondition = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { companyId: { $in: matchingCompanies.map((c) => c._id) } },
      { position: searchRegex },
    ];

    query.$and = [{ status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] } }, { $or: searchCondition }];
    delete query.status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Internship.countDocuments(query);

  const internships = await Internship.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId")
    .populate("publishHistory.performedBy", "fullName email")
    .lean();

  const internshipIds = internships.map((i) => i._id);
  const evaluations = await Evaluation.find({
    evaluationType: "INTERNSHIP",
    targetId: { $in: internshipIds },
  })
    .populate("publishHistory.performedBy", "fullName email")
    .sort({ createdAt: -1 })
    .lean();

  const evalMap = new Map();
  evaluations.forEach((ev) => {
    if (!evalMap.has(ev.targetId.toString())) {
      evalMap.set(ev.targetId.toString(), ev);
    }
  });

  let enriched = internships.map((intern) => {
    const ev = evalMap.get(intern._id.toString());
    const evalResult = computeInternshipEvaluationResult(intern, ev, intern.academicTermId);

    // Determine 3-state score publish status (PUBLISHED, HIDDEN, UNPUBLISHED)
    const isHidden = intern.scorePublishStatus === "HIDDEN" || ev?.scorePublishStatus === "HIDDEN";
    const isPublished = !isHidden && Boolean(
      intern.scorePublishStatus === "PUBLISHED" ||
      ev?.scorePublishStatus === "PUBLISHED" ||
      intern.isScorePublished ||
      ev?.isScorePublished
    );
    const scorePublishStatus = isHidden ? "HIDDEN" : isPublished ? "PUBLISHED" : "UNPUBLISHED";

    const publishHistory = (intern.publishHistory && intern.publishHistory.length > 0)
      ? intern.publishHistory
      : (ev?.publishHistory || []);

    return {
      ...intern,
      evaluation: ev || null,
      evaluationStatus: ev ? ev.status : "UNASSESSED",
      isScorePublished: isPublished,
      scorePublishStatus,
      publishHistory,
      scorePublishedAt: intern.scorePublishedAt || ev?.publishedAt || null,
      evaluationResult: evalResult.result,
      isPass: evalResult.isPass,
      isFail: evalResult.isFail,
      hasValidScore: evalResult.hasValidScore,
      isExpired: evalResult.isExpired,
      isNotOpen: evalResult.isNotOpen,
      evaluationStartDate: evalResult.startDate,
      evaluationEndDate: evalResult.endDate,
    };
  });

  if (status && status.trim()) {
    if (status === "UNASSESSED") {
      enriched = enriched.filter((i) => !i.evaluation);
    } else if (status === "PUBLISHED") {
      enriched = enriched.filter((i) => i.scorePublishStatus === "PUBLISHED");
    } else if (status === "HIDDEN") {
      enriched = enriched.filter((i) => i.scorePublishStatus === "HIDDEN");
    } else if (status === "UNPUBLISHED") {
      enriched = enriched.filter((i) => i.scorePublishStatus === "UNPUBLISHED");
    } else {
      enriched = enriched.filter((i) => i.evaluation?.status === status);
    }
  }

  return {
    data: enriched,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ==========================================
// TBM: Delete Evaluation Result
// ==========================================
const tbmDeleteEvaluation = async (targetIdOrEvalId) => {
  if (!targetIdOrEvalId) {
    throw new AppError("ID kết quả đánh giá hoặc hồ sơ thực tập là bắt buộc", 400);
  }

  // Find evaluation either by its _id or by targetId (internshipId)
  let evaluation = null;
  if (mongoose.Types.ObjectId.isValid(targetIdOrEvalId)) {
    evaluation = await Evaluation.findOne({
      $or: [
        { _id: targetIdOrEvalId },
        { targetId: targetIdOrEvalId, evaluationType: "INTERNSHIP" },
      ],
    }).sort({ createdAt: -1 });
  }

  if (!evaluation) {
    throw new AppError("Không tìm thấy kết quả đánh giá để xóa.", 404);
  }

  const internshipId = evaluation.targetId;

  // Check if internship is already completed/locked or term is CLOSED
  const internship = await Internship.findById(internshipId);
  if (internship) {
    const term = await resolveAcademicTermForInternship(internship);
    if (term && term.status === "CLOSED") {
      throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể xóa kết quả đánh giá.", 400);
    }
  }

  if (internship && internship.status === "COMPLETED") {
    throw new AppError(
      "Phiếu đánh giá đã ở trạng thái hoàn thành và bị khóa, không thể xóa.",
      400,
    );
  }

  // Delete the specific evaluation
  await Evaluation.findByIdAndDelete(evaluation._id);

  // If internship had evaluation ref pointing to this evaluation, clear it
  if (internship) {
    if (String(internship.evaluation) === String(evaluation._id)) {
      internship.evaluation = null;
      await internship.save();
    }
  }

  return {
    message: "Đã xóa kết quả đánh giá của sinh viên thành công.",
    deletedEvaluationId: evaluation._id,
    internshipId,
  };
};

// ==========================================
// Lecturer (Giảng viên Giám sát): Grade Internship
// ==========================================
const gradeInternshipByLecturer = async ({
  internshipId,
  lecturerUserId,
  score,
  comments,
  criteria,
}) => {
  if (!internshipId) {
    throw new AppError("Mã hồ sơ thực tập là bắt buộc", 400);
  }

  const numericScore = Number(score);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
    throw new AppError("Điểm đánh giá phải là số từ 0 đến 10", 400);
  }

  const lecturer = await Lecturer.findOne({ userId: lecturerUserId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const internship = await Internship.findById(internshipId)
    .populate("studentId")
    .populate("companyId");

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  const term = await resolveAcademicTermForInternship(internship);
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể chấm điểm thực tập.", 400);
  }

  // Ensure this lecturer is assigned as GVGS for this internship
  if (!internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không phải là Giảng viên Giám sát được phân công cho hồ sơ này", 403);
  }

  // ==========================================
  // Điều kiện chấm điểm TTDN: Bắt buộc đáp ứng đầy đủ cả 3 điều kiện:
  // 1. Sinh viên đã đạt trạng thái PASS PRETEST
  // 2. Sinh viên đã nộp file báo cáo thực tập hợp lệ
  // 3. Sinh viên đã hoàn thành đầy đủ nhật ký thực tập theo chu kỳ nộp được áp dụng
  // ==========================================

  // Điều kiện 1: PASS PRETEST
  if (!internship.pretest?.isPassed) {
    throw new AppError("Chưa đủ điều kiện chấm điểm: Sinh viên chưa được GVGS xác nhận PASS PRETEST.", 400);
  }

  // Điều kiện 2: Nộp file báo cáo thực tập hợp lệ
  if (!internship.reportFile || !internship.reportFile.fileUrl) {
    const doc = await InternshipDocument.findOne({
      internshipId: internship._id,
      documentType: "SUBMISSION",
      category: { $regex: /báo cáo/i },
    }).sort({ createdAt: -1 });

    if (doc?.fileUrl) {
      internship.reportFile = {
        originalName: doc.title || doc.fileName,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize || 0,
        fileType: doc.fileType || null,
        uploadedAt: doc.createdAt || new Date(),
      };
      await internship.save();
    } else {
      throw new AppError("Chưa đủ điều kiện chấm điểm: Sinh viên chưa nộp file báo cáo thực tập.", 400);
    }
  }

  // Điều kiện 3: Hoàn thành đầy đủ nhật ký thực tập theo chu kỳ nộp
  const commonReportCycle = [1, 2, 3].includes(Number(internship.reportCycle))
    ? Number(internship.reportCycle)
    : [1, 2, 3].includes(Number(term?.internship?.reportCycle))
    ? Number(term.internship.reportCycle)
    : 1;

  const weeklyReports = await InternshipReport.find({
    internshipId: internship._id,
    reportType: "WEEKLY",
  }).lean();

  const internshipWithCycle = {
    ...(internship.toObject ? internship.toObject() : internship),
    reportCycle: commonReportCycle,
  };

  const diaryStatus = checkInternshipDiaryCompletion(internshipWithCycle, weeklyReports);
  if (!diaryStatus.isCompleted) {
    const missingText = diaryStatus.missingWeeks?.length > 0
      ? ` (Còn thiếu tuần: ${diaryStatus.missingWeeks.join(", ")})`
      : "";
    throw new AppError(`Chưa đủ điều kiện chấm điểm: Sinh viên chưa hoàn thành đầy đủ nhật ký thực tập theo chu kỳ nộp${missingText}.`, 400);
  }

  // Validate Grading Window for current academic term
  validateInternshipGradingWindow(term, new Date());

  // Find or create Evaluation record
  let evaluation = await Evaluation.findOne({
    evaluationType: "INTERNSHIP",
    targetId: internship._id,
  });

  // Prompt 2 - Requirement 5.3: Tuân thủ trạng thái khóa nếu điểm đã được công bố
  if (evaluation && (evaluation.isScorePublished || internship.isScorePublished)) {
    throw new AppError("Kết quả đánh giá thực tập đã được công bố, không thể chỉnh sửa điểm.", 400);
  }

  const evaluatorInfo = {
    name: lecturer.userId.fullName,
    position: lecturer.academicTitle || "Giảng viên Giám sát",
    email: lecturer.userId.email,
    phone: lecturer.userId.phone,
  };

  const formattedCriteria = Array.isArray(criteria) && criteria.length > 0
    ? criteria
    : [
        { name: "Ý thức kỷ luật & thái độ làm việc tại DN", score: Number((numericScore * 0.25).toFixed(2)) },
        { name: "Kỹ năng chuyên môn & kết quả công việc", score: Number((numericScore * 0.45).toFixed(2)) },
        { name: "Báo cáo thực tập & nhật ký công việc", score: Number((numericScore * 0.3).toFixed(2)) },
      ];

  const isUpdate = Boolean(evaluation);

  if (evaluation) {
    // Prompt 2 - Requirement 5.4: Lưu vết lịch sử chỉnh sửa điểm
    if (!Array.isArray(evaluation.editHistory)) {
      evaluation.editHistory = [];
    }
    evaluation.editHistory.push({
      editedBy: lecturer.userId._id,
      editedAt: new Date(),
      previousScore: evaluation.score,
      newScore: numericScore,
      previousComments: evaluation.comments || null,
      newComments: comments ? comments.trim() : null,
      action: "UPDATE",
    });

    evaluation.score = numericScore;
    evaluation.comments = comments ? comments.trim() : null;
    evaluation.criteria = formattedCriteria;
    evaluation.evaluatorId = lecturer.userId._id;
    evaluation.evaluatorRole = "LECTURER";
    evaluation.evaluatorInfo = evaluatorInfo;
    await evaluation.save();
  } else {
    evaluation = await Evaluation.create({
      evaluationType: "INTERNSHIP",
      targetId: internship._id,
      evaluatorId: lecturer.userId._id,
      evaluatorRole: "LECTURER",
      evaluatorInfo,
      score: numericScore,
      comments: comments ? comments.trim() : null,
      criteria: formattedCriteria,
      editHistory: [
        {
          editedBy: lecturer.userId._id,
          editedAt: new Date(),
          previousScore: 0,
          newScore: numericScore,
          previousComments: null,
          newComments: comments ? comments.trim() : null,
          action: "CREATE",
        },
      ],
    });
  }

  // Update internship status to COMPLETED and link evaluation
  internship.status = "COMPLETED";
  internship.evaluation = evaluation._id;
  await internship.save();

  // Scores remain unpublished until officially published
  evaluation.isScorePublished = false;
  await evaluation.save();

  internship.isScorePublished = false;
  await internship.save();

  // Yêu cầu nghiệp vụ: Không gửi thông báo cho sinh viên khi GVGS nhập hoặc cập nhật điểm.
  // Chỉ gửi thông báo khi thao tác Công bố điểm được thực hiện chính thức.

  return {
    evaluation,
    internship,
    isUpdate,
  };
};


// ==========================================
// TBM / Lecturer: Publish Single Internship Score
// ==========================================
const publishInternshipScore = async ({ internshipId, tbmUserId, requestingUser }) => {
  if (!internshipId) {
    throw new AppError("Mã hồ sơ thực tập là bắt buộc", 400);
  }

  const internship = await Internship.findById(internshipId)
    .populate("studentId")
    .populate("companyId");

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  const term = await resolveAcademicTermForInternship(internship);
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể công bố điểm.", 400);
  }

  // Access control: If requesting user is LECTURER, must be assigned supervisor
  if (requestingUser && requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({
      userId: requestingUser.userId || requestingUser._id || requestingUser.id,
    });
    if (!lecturer || !internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
      throw new AppError("Bạn không phải là Giảng viên Giám sát của hồ sơ thực tập này", 403);
    }
  }

  const evaluation = await Evaluation.findOne({
    evaluationType: "INTERNSHIP",
    targetId: internship._id,
  });

  if (!evaluation || evaluation.score === null || evaluation.score === undefined || isNaN(evaluation.score)) {
    throw new AppError("Hồ sơ này chưa có điểm đánh giá từ Giảng viên Giám sát, không thể công bố điểm.", 400);
  }

  const now = new Date();
  const wasAlreadyPublished = Boolean(
    evaluation.scorePublishStatus === "PUBLISHED" ||
    (!evaluation.scorePublishStatus && evaluation.isScorePublished) ||
    (Array.isArray(evaluation.publishHistory) && evaluation.publishHistory.some((h) => h.action === "PUBLISH"))
  );
  const action = wasAlreadyPublished ? "REPUBLISH" : "PUBLISH";

  evaluation.isScorePublished = true;
  evaluation.scorePublishStatus = "PUBLISHED";
  evaluation.publishedAt = now;
  evaluation.publishedBy = tbmUserId;
  if (!Array.isArray(evaluation.publishHistory)) evaluation.publishHistory = [];
  evaluation.publishHistory.push({
    action,
    performedBy: tbmUserId,
    performedAt: now,
  });
  await evaluation.save();

  internship.isScorePublished = true;
  internship.scorePublishStatus = "PUBLISHED";
  internship.scorePublishedAt = now;
  internship.scorePublishedBy = tbmUserId;
  if (!Array.isArray(internship.publishHistory)) internship.publishHistory = [];
  internship.publishHistory.push({
    action,
    performedBy: tbmUserId,
    performedAt: now,
  });
  await internship.save();

  // Send Notification to Student ONLY when officially published and not a duplicate
  if (!wasAlreadyPublished) {
    const student = await Student.findById(internship.studentId._id || internship.studentId).populate("userId");
    if (student?.userId?._id) {
      await notificationService.createNotification({
        recipientId: student.userId._id,
        type: "INTERNSHIP",
        title: "Công bố điểm Thực tập Doanh nghiệp",
        message: "Điểm đánh giá Thực tập Doanh nghiệp của bạn đã được công bố chính thức. Bạn có thể truy cập hệ thống để xem kết quả đánh giá chi tiết.",
        referenceId: internship._id,
        referenceModel: "Internship",
        link: "/student/internship?view=evaluation",
      });
    }
  }

  return {
    internship,
    evaluation,
  };
};

// ==========================================
// TBM: Publish Bulk Internship Scores
// ==========================================
const publishInternshipScoresBulk = async ({ internshipIds, tbmUserId }) => {
  if (!Array.isArray(internshipIds) || internshipIds.length === 0) {
    throw new AppError("Vui lòng chọn ít nhất một hồ sơ thực tập để công bố điểm", 400);
  }

  const now = new Date();
  let publishedCount = 0;
  let skippedCount = 0;

  for (const id of internshipIds) {
    try {
      const internship = await Internship.findById(id).populate("studentId");
      if (!internship) {
        skippedCount++;
        continue;
      }

      const term = await resolveAcademicTermForInternship(internship);
      if (term && term.status === "CLOSED") {
        skippedCount++;
        continue;
      }

      const evaluation = await Evaluation.findOne({
        evaluationType: "INTERNSHIP",
        targetId: internship._id,
      });

      if (!evaluation || evaluation.score === null || evaluation.score === undefined || isNaN(evaluation.score)) {
        skippedCount++;
        continue;
      }

      const wasAlreadyPublished = Boolean(
        evaluation.scorePublishStatus === "PUBLISHED" ||
        (!evaluation.scorePublishStatus && evaluation.isScorePublished) ||
        (Array.isArray(evaluation.publishHistory) && evaluation.publishHistory.some((h) => h.action === "PUBLISH"))
      );
      const action = wasAlreadyPublished ? "REPUBLISH" : "PUBLISH";

      evaluation.isScorePublished = true;
      evaluation.scorePublishStatus = "PUBLISHED";
      evaluation.publishedAt = now;
      evaluation.publishedBy = tbmUserId;
      if (!Array.isArray(evaluation.publishHistory)) evaluation.publishHistory = [];
      evaluation.publishHistory.push({
        action,
        performedBy: tbmUserId,
        performedAt: now,
      });
      await evaluation.save();

      internship.isScorePublished = true;
      internship.scorePublishStatus = "PUBLISHED";
      internship.scorePublishedAt = now;
      internship.scorePublishedBy = tbmUserId;
      if (!Array.isArray(internship.publishHistory)) internship.publishHistory = [];
      internship.publishHistory.push({
        action,
        performedBy: tbmUserId,
        performedAt: now,
      });
      await internship.save();

      // Notify Student ONLY when not already published (prevent duplicate notifications)
      if (!wasAlreadyPublished) {
        const student = await Student.findById(internship.studentId._id || internship.studentId).populate("userId");
        if (student?.userId?._id) {
          await notificationService.createNotification({
            recipientId: student.userId._id,
            type: "INTERNSHIP",
            title: "Công bố điểm Thực tập Doanh nghiệp",
            message: "Điểm đánh giá Thực tập Doanh nghiệp của bạn đã được công bố chính thức. Bạn có thể truy cập hệ thống để xem kết quả đánh giá chi tiết.",
            referenceId: internship._id,
            referenceModel: "Internship",
            link: "/student/internship?view=evaluation",
          });
        }
      }

      publishedCount++;
    } catch {
      skippedCount++;
    }
  }

  return {
    publishedCount,
    skippedCount,
    totalRequested: internshipIds.length,
  };
};

// ==========================================
// TBM: Hide Published Internship Score
// ==========================================
const hideInternshipScore = async ({ id, tbmUserId, reason = "" }) => {
  const internship = await Internship.findById(id).populate("studentId");
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  const term = await resolveAcademicTermForInternship(internship);
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể ẩn điểm.", 400);
  }

  const evaluation = await Evaluation.findOne({
    evaluationType: "INTERNSHIP",
    targetId: internship._id,
  });

  if (!evaluation) {
    throw new AppError("Hồ sơ này chưa có phiếu đánh giá", 400);
  }

  const isCurrentlyPublished = Boolean(
    internship.scorePublishStatus === "PUBLISHED" ||
    (!internship.scorePublishStatus && (internship.isScorePublished || evaluation.isScorePublished))
  );

  if (!isCurrentlyPublished) {
    throw new AppError("Chỉ có thể ẩn điểm của những sinh viên đã được công bố điểm.", 400);
  }

  const now = new Date();
  const cleanReason = reason ? String(reason).trim() : null;

  evaluation.isScorePublished = false;
  evaluation.scorePublishStatus = "HIDDEN";
  if (!Array.isArray(evaluation.publishHistory)) evaluation.publishHistory = [];
  evaluation.publishHistory.push({
    action: "HIDE",
    performedBy: tbmUserId,
    performedAt: now,
    reason: cleanReason,
  });
  await evaluation.save();

  internship.isScorePublished = false;
  internship.scorePublishStatus = "HIDDEN";
  if (!Array.isArray(internship.publishHistory)) internship.publishHistory = [];
  internship.publishHistory.push({
    action: "HIDE",
    performedBy: tbmUserId,
    performedAt: now,
    reason: cleanReason,
  });
  await internship.save();

  return {
    internship,
    evaluation,
    message: "Đã ẩn điểm đánh giá thành công",
  };
};

// ==========================================
// TBM: Hide Bulk Internship Scores
// ==========================================
const hideInternshipScoresBulk = async ({ internshipIds, tbmUserId, reason = "" }) => {
  if (!Array.isArray(internshipIds) || internshipIds.length === 0) {
    throw new AppError("Vui lòng chọn ít nhất một hồ sơ thực tập để ẩn điểm", 400);
  }

  const now = new Date();
  const cleanReason = reason ? String(reason).trim() : null;
  let hiddenCount = 0;
  let skippedCount = 0;

  for (const id of internshipIds) {
    try {
      const internship = await Internship.findById(id);
      if (!internship) {
        skippedCount++;
        continue;
      }
      const term = await resolveAcademicTermForInternship(internship);
      if (term && term.status === "CLOSED") {
        skippedCount++;
        continue;
      }
      const evaluation = await Evaluation.findOne({
        evaluationType: "INTERNSHIP",
        targetId: internship._id,
      });
      if (!evaluation) {
        skippedCount++;
        continue;
      }

      const isCurrentlyPublished = Boolean(
        internship.scorePublishStatus === "PUBLISHED" ||
        (!internship.scorePublishStatus && (internship.isScorePublished || evaluation.isScorePublished))
      );

      if (!isCurrentlyPublished) {
        skippedCount++;
        continue;
      }

      evaluation.isScorePublished = false;
      evaluation.scorePublishStatus = "HIDDEN";
      if (!Array.isArray(evaluation.publishHistory)) evaluation.publishHistory = [];
      evaluation.publishHistory.push({
        action: "HIDE",
        performedBy: tbmUserId,
        performedAt: now,
        reason: cleanReason,
      });
      await evaluation.save();

      internship.isScorePublished = false;
      internship.scorePublishStatus = "HIDDEN";
      if (!Array.isArray(internship.publishHistory)) internship.publishHistory = [];
      internship.publishHistory.push({
        action: "HIDE",
        performedBy: tbmUserId,
        performedAt: now,
        reason: cleanReason,
      });
      await internship.save();

      hiddenCount++;
    } catch {
      skippedCount++;
    }
  }

  return {
    hiddenCount,
    skippedCount,
    totalRequested: internshipIds.length,
  };
};

// ==========================================
// TBM: Republish Single Internship Score
// ==========================================
const republishInternshipScore = async ({ id, tbmUserId, reason = "" }) => {
  const internship = await Internship.findById(id).populate("studentId");
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  const term = await resolveAcademicTermForInternship(internship);
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể công bố lại điểm.", 400);
  }

  const evaluation = await Evaluation.findOne({
    evaluationType: "INTERNSHIP",
    targetId: internship._id,
  });

  if (!evaluation || evaluation.score === null || evaluation.score === undefined || isNaN(evaluation.score)) {
    throw new AppError("Hồ sơ này chưa có điểm đánh giá, không thể công bố.", 400);
  }

  const now = new Date();
  const cleanReason = reason ? String(reason).trim() : null;

  evaluation.isScorePublished = true;
  evaluation.scorePublishStatus = "PUBLISHED";
  evaluation.publishedAt = now;
  evaluation.publishedBy = tbmUserId;
  if (!Array.isArray(evaluation.publishHistory)) evaluation.publishHistory = [];
  evaluation.publishHistory.push({
    action: "REPUBLISH",
    performedBy: tbmUserId,
    performedAt: now,
    reason: cleanReason,
  });
  await evaluation.save();

  internship.isScorePublished = true;
  internship.scorePublishStatus = "PUBLISHED";
  internship.scorePublishedAt = now;
  internship.scorePublishedBy = tbmUserId;
  if (!Array.isArray(internship.publishHistory)) internship.publishHistory = [];
  internship.publishHistory.push({
    action: "REPUBLISH",
    performedBy: tbmUserId,
    performedAt: now,
    reason: cleanReason,
  });
  await internship.save();

  // "Không gửi thông báo công bố điểm mới khi chỉ thực hiện thao tác hiện lại điểm"
  return {
    internship,
    evaluation,
    message: "Đã công bố lại điểm đánh giá thành công",
  };
};

export default {
  gradeInternshipByLecturer,
  publishInternshipScore,
  publishInternshipScoresBulk,
  hideInternshipScore,
  hideInternshipScoresBulk,
  republishInternshipScore,
  getEvaluationById,
  getEvaluationsForLecturer,
  getAllEvaluationsForTbm,
  tbmDeleteEvaluation,
};

