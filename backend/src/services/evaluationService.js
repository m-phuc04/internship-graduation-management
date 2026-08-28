import crypto from "crypto";
import Evaluation from "../models/Evaluation.js";
import CompanyEvaluationRequest from "../models/CompanyEvaluationRequest.js";
import Notification from "../models/Notification.js";
import Internship from "../models/Internship.js";
import Company from "../models/Company.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import notificationService from "./notificationService.js";

// ====================
// Company Gets Internships with Evaluation Status
// ====================
const getCompanyInternships = async (
  userId,
  { page = 1, limit = 10, search = "", status = "" } = {},
) => {
  const company = await Company.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });
  if (!company) {
    throw new AppError("Không tìm thấy thông tin doanh nghiệp", 404);
  }

  const query = {
    companyId: company._id,
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  };

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const matchingUsers = await User.find({ fullName: searchRegex }).select("_id");
    const matchingStudents = await Student.find({
      $or: [
        { studentCode: searchRegex },
        { userId: { $in: matchingUsers.map((u) => u._id) } },
      ],
    }).select("_id");

    query.$or = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { position: searchRegex },
    ];
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
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .lean();

  // Attach evaluation status to each internship
  const internshipIds = internships.map((i) => i._id);
  const evaluations = await Evaluation.find({
    evaluationType: "INTERNSHIP",
    targetId: { $in: internshipIds },
  }).lean();

  const evalMap = new Map();
  evaluations.forEach((ev) => {
    evalMap.set(ev.targetId.toString(), ev);
  });

  let enrichedData = internships.map((intern) => {
    const ev = evalMap.get(intern._id.toString());
    return {
      ...intern,
      evaluation: ev || null,
      evaluationStatus: ev ? ev.status : "UNASSESSED", // UNASSESSED / DRAFT / SUBMITTED
    };
  });

  if (status && status.trim()) {
    if (status === "UNASSESSED") {
      enrichedData = enrichedData.filter((i) => !i.evaluation);
    } else {
      enrichedData = enrichedData.filter((i) => i.evaluation?.status === status);
    }
  }

  return {
    company,
    data: enrichedData,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// Company Creates or Updates Evaluation
// ====================
const createOrUpdateEvaluation = async (userId, userRole, data) => {
  if (userRole !== "COMPANY") {
    throw new AppError("Chỉ có tài khoản Doanh nghiệp mới có quyền tạo phiếu đánh giá", 403);
  }

  const company = await Company.findOne({ userId });
  if (!company) {
    throw new AppError("Không tìm thấy thông tin doanh nghiệp", 404);
  }

  const {
    internshipId,
    score,
    comments,
    evaluatorInfo,
    companyInfo,
    workFields,
    workFieldOther,
    requirements,
    teamworkEvaluation,
    teamworkOther,
    status = "SUBMITTED",
  } = data;

  if (!internshipId) {
    throw new AppError("Hồ sơ thực tập (internshipId) là bắt buộc", 400);
  }

  const internship = await Internship.findById(internshipId);
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  // CRITICAL RBAC: Company A CANNOT evaluate student of Company B
  if (internship.companyId.toString() !== company._id.toString()) {
    throw new AppError(
      "Doanh nghiệp không có quyền đánh giá sinh viên thực tập tại doanh nghiệp khác",
      403,
    );
  }

  // LOCK: Permanent lock if internship is COMPLETED
  if (internship.status === "COMPLETED") {
    throw new AppError(
      "Phiếu đánh giá thực tập đã ở trạng thái HOÀN THÀNH (COMPLETED) và bị khóa, không thể chỉnh sửa",
      400,
    );
  }

  if (
    score !== undefined &&
    score !== null &&
    (Number(score) < 0 || Number(score) > 10)
  ) {
    throw new AppError("Điểm đánh giá phải từ 0 đến 10", 400);
  }

  const finalStatus = ["DRAFT", "SUBMITTED"].includes(status) ? status : "SUBMITTED";

  let evaluation = await Evaluation.findOne({
    evaluationType: "INTERNSHIP",
    targetId: internship._id,
  });

  if (evaluation) {
    evaluation.score = score !== undefined ? Number(score) : evaluation.score;
    evaluation.comments = comments !== undefined ? comments : evaluation.comments;
    if (evaluatorInfo) {
      evaluation.evaluatorInfo = {
        name: evaluatorInfo.name || evaluation.evaluatorInfo?.name || null,
        position: evaluatorInfo.position || evaluation.evaluatorInfo?.position || null,
        email: evaluatorInfo.email || evaluation.evaluatorInfo?.email || null,
        phone: evaluatorInfo.phone || evaluation.evaluatorInfo?.phone || null,
      };
    }
    evaluation.companyInfo = companyInfo || evaluation.companyInfo;
    evaluation.workFields = workFields || evaluation.workFields;
    evaluation.workFieldOther = workFieldOther !== undefined ? workFieldOther : evaluation.workFieldOther;
    evaluation.requirements = requirements || evaluation.requirements;
    evaluation.teamworkEvaluation = teamworkEvaluation || evaluation.teamworkEvaluation;
    evaluation.teamworkOther = teamworkOther !== undefined ? teamworkOther : evaluation.teamworkOther;
    evaluation.status = finalStatus;
    if (finalStatus === "SUBMITTED") {
      evaluation.submittedAt = new Date();
    }
    await evaluation.save();
  } else {
    evaluation = await Evaluation.create({
      evaluationType: "INTERNSHIP",
      targetId: internship._id,
      evaluatorId: userId,
      evaluatorRole: "COMPANY",
      evaluatorInfo: {
        name: evaluatorInfo?.name || company.contactPerson || "Người đánh giá doanh nghiệp",
        position: evaluatorInfo?.position || "Cán bộ quản lý thực tập",
        email: evaluatorInfo?.email || company.email || null,
        phone: evaluatorInfo?.phone || company.phone || null,
      },
      score: score !== undefined && score !== null ? Number(score) : 0,
      comments: comments || null,
      companyInfo: companyInfo || {
        businessField: company.name,
        companySize: "Vừa và nhỏ",
      },
      workFields: workFields || [],
      workFieldOther: workFieldOther || null,
      requirements: requirements || {},
      teamworkEvaluation: teamworkEvaluation || "Tốt",
      teamworkOther: teamworkOther || null,
      status: finalStatus,
      submittedAt: finalStatus === "SUBMITTED" ? new Date() : null,
    });
  }

  return evaluation;
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
  if (requestingUser.role === "COMPANY") {
    const company = await Company.findOne({ userId: requestingUser.userId });
    if (!company || internship.companyId._id.toString() !== company._id.toString()) {
      throw new AppError("Bạn không có quyền xem đánh giá của doanh nghiệp khác", 403);
    }
  } else if (requestingUser.role === "LECTURER") {
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
    .lean();

  const internshipIds = internships.map((i) => i._id);
  const evaluations = await Evaluation.find({
    evaluationType: "INTERNSHIP",
    targetId: { $in: internshipIds },
  }).lean();

  const evalMap = new Map();
  evaluations.forEach((ev) => {
    evalMap.set(ev.targetId.toString(), ev);
  });

  let enriched = internships.map((intern) => {
    const ev = evalMap.get(intern._id.toString());
    return {
      ...intern,
      evaluation: ev || null,
      evaluationStatus: ev ? ev.status : "UNASSESSED",
    };
  });

  if (status && status.trim()) {
    if (status === "UNASSESSED") {
      enriched = enriched.filter((i) => !i.evaluation);
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
// 5. Student: Create or Retrieve Evaluation Link
// ==========================================
const createStudentEvaluationLink = async (userId, academicTermId = null) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const query = {
    studentId: student._id,
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  // Active internship of this student (sorted by most recent)
  const internship = await Internship.findOne(query)
    .sort({ createdAt: -1 })
    .populate("companyId");

  if (!internship) {
    throw new AppError("Bạn chưa có đợt thực tập hợp lệ nào được duyệt.", 400);
  }

  // Check if evaluation request already exists
  let existingRequest = await CompanyEvaluationRequest.findOne({
    studentId: student._id,
    internshipId: internship._id,
  });

  if (existingRequest) {
    if (existingRequest.allowRecreate && existingRequest.recreateStatus === "APPROVED") {
      // Re-create permission granted by TBM: remove old request and allow creating 1 fresh link
      await CompanyEvaluationRequest.findByIdAndDelete(existingRequest._id);
    } else if (existingRequest.status === "SUBMITTED") {
      throw new AppError("Doanh nghiệp đã hoàn thành đánh giá cho đợt thực tập này. Nếu cần tạo lại link, vui lòng gửi yêu cầu tới Trưởng Bộ Môn.", 400);
    } else if (existingRequest.status === "PENDING") {
      return {
        message: "Bạn đã tạo link đánh giá cho đợt thực tập này.",
        request: existingRequest,
        token: existingRequest.token,
        isExisting: true,
      };
    } else {
      throw new AppError(
        "Bạn đã sử dụng quyền tạo link đánh giá cho đợt thực tập này. Nếu cần tạo lại link, vui lòng gửi yêu cầu tới Trưởng Bộ Môn.",
        403,
      );
    }
  }

  // Generate secure random token (48 chars hex)
  const token = crypto.randomBytes(24).toString("hex");

  const newRequest = await CompanyEvaluationRequest.create({
    token,
    studentId: student._id,
    internshipId: internship._id,
    companyId: internship.companyId._id,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return {
    message: "Tạo link đánh giá thực tập thành công!",
    request: newRequest,
    token: newRequest.token,
    isExisting: false,
  };
};

// ==========================================
// 6. Student: Get My Evaluation Request & Result
// ==========================================
const getStudentEvaluationRequest = async (userId, academicTermId = null) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const query = {
    studentId: student._id,
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const internship = await Internship.findOne(query)
    .sort({ createdAt: -1 })
    .populate("companyId", "companyName address email phone website contactPerson")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    });

  if (!internship) {
    return { hasInternship: false };
  }

  const request = await CompanyEvaluationRequest.findOne({
    studentId: student._id,
    internshipId: internship._id,
  });

  let evaluation = null;
  if (internship) {
    evaluation = await Evaluation.findOne({
      evaluationType: "INTERNSHIP",
      targetId: internship._id,
    });
  }

  return {
    hasInternship: true,
    internship,
    request,
    evaluation,
  };
};

// ==========================================
// 7. Public: Get Evaluation Form Metadata by Token (No Login)
// ==========================================
const getPublicEvaluationByToken = async (token) => {
  if (!token || !token.trim()) {
    throw new AppError("Token đánh giá không hợp lệ.", 400);
  }

  const request = await CompanyEvaluationRequest.findOne({ token: token.trim() })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: {
        path: "lecturerId",
        populate: { path: "userId", select: "fullName email phone" },
      },
    })
    .populate("companyId", "name companyName address email phone website contactPerson");

  if (!request) {
    throw new AppError("Không tìm thấy phiếu đánh giá hoặc liên kết không hợp lệ.", 404);
  }

  if (request.status === "CANCELLED") {
    throw new AppError("Liên kết đánh giá này đã bị hủy.", 400);
  }

  if (request.expiresAt && request.expiresAt < new Date()) {
    if (request.status !== "EXPIRED") {
      request.status = "EXPIRED";
      await request.save();
    }
    throw new AppError("Liên kết đánh giá này đã hết hạn.", 400);
  }

  if (request.status === "SUBMITTED") {
    const evaluation = await Evaluation.findOne({
      evaluationType: "INTERNSHIP",
      $or: [
        { evaluationRequestId: request._id },
        { targetId: request.internshipId?._id || request.internshipId },
      ],
    });

    return {
      status: "SUBMITTED",
      submittedAt: request.submittedAt,
      message: "Phiếu đánh giá này đã được gửi.",
      student: {
        ...request.studentId?.toObject?.(),
        fullName: request.studentId?.userId?.fullName || request.studentId?.fullName,
        studentCode: request.studentId?.studentCode,
        className: request.studentId?.className,
        email: request.studentId?.userId?.email,
        phone: request.studentId?.userId?.phone,
      },
      company: {
        ...request.companyId?.toObject?.(),
        companyName: request.companyId?.companyName || request.companyId?.name,
      },
      internship: request.internshipId,
      evaluation: evaluation || null,
    };
  }

  return {
    status: "PENDING",
    request: {
      _id: request._id,
      token: request.token,
      expiresAt: request.expiresAt,
    },
    student: {
      fullName: request.studentId?.userId?.fullName,
      studentCode: request.studentId?.studentCode,
      className: request.studentId?.className,
      email: request.studentId?.userId?.email,
      phone: request.studentId?.userId?.phone,
    },
    company: {
      companyName: request.companyId?.companyName || request.companyId?.name,
      address: request.companyId?.address,
      contactPerson: request.companyId?.contactPerson,
      phone: request.companyId?.phone,
    },
    internship: {
      _id: request.internshipId?._id,
      position: request.internshipId?.position,
      startDate: request.internshipId?.startDate,
      endDate: request.internshipId?.endDate,
      mentorName: request.internshipId?.mentorName,
      mentorPosition: request.internshipId?.mentorPosition,
      mentorEmail: request.internshipId?.mentorEmail,
      mentorPhone: request.internshipId?.mentorPhone,
    },
    supervisor: {
      fullName: request.internshipId?.lecturerId?.userId?.fullName || "Chưa phân công",
      email: request.internshipId?.lecturerId?.userId?.email || "—",
      phone: request.internshipId?.lecturerId?.userId?.phone || "—",
    },
  };
};

// ==========================================
// 8. Public: Submit Evaluation Form (No Login)
// ==========================================
const submitPublicEvaluation = async (token, payload) => {
  if (!token || !token.trim()) {
    throw new AppError("Token đánh giá không hợp lệ.", 400);
  }

  const request = await CompanyEvaluationRequest.findOne({ token: token.trim() })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: {
        path: "lecturerId",
        populate: { path: "userId", select: "fullName email phone" },
      },
    })
    .populate("companyId");

  if (!request) {
    throw new AppError("Không tìm thấy phiếu đánh giá.", 404);
  }

  if (request.status === "SUBMITTED") {
    throw new AppError("Phiếu đánh giá này đã được gửi trước đó.", 400);
  }

  if (request.status === "CANCELLED") {
    throw new AppError("Liên kết đánh giá này đã bị hủy.", 400);
  }

  if (request.status === "SUBMITTED" || request.internshipId?.status === "COMPLETED") {
    throw new AppError(
      "Phiếu đánh giá này đã được gửi hoặc kỳ thực tập đã hoàn thành và bị khóa, không thể gửi lại.",
      400,
    );
  }

  if (request.expiresAt && request.expiresAt < new Date()) {
    throw new AppError("Liên kết đánh giá này đã hết hạn.", 400);
  }

  const {
    evaluatorInfo = {},
    workFields = [],
    workFieldOther = null,
    requirements = {},
    teamworkEvaluation = "Tốt",
    teamworkOther = null,
    score = 10,
    comments = "",
  } = payload;

  if (Number(score) < 0 || Number(score) > 10) {
    throw new AppError("Điểm đánh giá phải từ 0 đến 10.", 400);
  }

  // Create Evaluation
  const evaluation = await Evaluation.create({
    evaluationType: "INTERNSHIP",
    targetId: request.internshipId._id,
    evaluationRequestId: request._id,
    evaluatorRole: "COMPANY",
    evaluatorInfo: {
      name: evaluatorInfo.name || request.companyId?.contactPerson || "Người đánh giá doanh nghiệp",
      position: evaluatorInfo.position || "Cán bộ quản lý thực tập",
      email: evaluatorInfo.email || request.companyId?.email || null,
      phone: evaluatorInfo.phone || request.companyId?.phone || null,
    },
    workFields,
    workFieldOther,
    requirements: {
      endUserRequirements: requirements.endUserRequirements || null,
      leaderRequirements: requirements.leaderRequirements || null,
      peo1: requirements.peo1 || null,
      peo2: requirements.peo2 || null,
      peo3: requirements.peo3 || null,
    },
    teamworkEvaluation,
    teamworkOther,
    score: Number(score),
    comments: comments || null,
    status: "SUBMITTED",
    submittedAt: new Date(),
  });

  // Update request status
  request.status = "SUBMITTED";
  request.submittedAt = new Date();
  await request.save();

  // Create notifications
  try {
    const studentUser = request.studentId?.userId;
    const lecturerUser = request.internshipId?.lecturerId?.userId;
    const compName = request.companyId?.companyName || "Doanh nghiệp";

    // 1. Notify Lecturer (GVHD)
    if (lecturerUser?._id) {
      await Notification.create({
        recipientId: lecturerUser._id,
        title: "Đánh giá Thực tập Doanh nghiệp",
        message: `Doanh nghiệp ${compName} đã hoàn thành đánh giá thực tập của sinh viên ${studentUser?.fullName} (${request.studentId?.studentCode}).`,
        type: "INTERNSHIP",
        referenceId: evaluation._id,
      });
    }

    // 2. Notify Student
    if (studentUser?._id) {
      await Notification.create({
        recipientId: studentUser._id,
        title: "Doanh nghiệp đã gửi đánh giá",
        message: `Doanh nghiệp ${compName} đã gửi phiếu đánh giá thực tập cho bạn.`,
        type: "INTERNSHIP",
        referenceId: evaluation._id,
      });
    }
  } catch (notiErr) {
    console.error("Lỗi khi gửi thông báo đánh giá:", notiErr.message);
  }

  return {
    message: "Gửi phiếu đánh giá thực tập thành công!",
    evaluation,
  };
};

// ==========================================
// 9. TBM: Reset / Allow Recreating Evaluation Request
// ==========================================
const tbmResetEvaluationRequest = async (requestId) => {
  const request = await CompanyEvaluationRequest.findById(requestId).populate({
    path: "studentId",
    populate: { path: "userId", select: "fullName" },
  });

  if (!request) {
    throw new AppError("Không tìm thấy yêu cầu đánh giá.", 404);
  }

  // Delete the old request record so student can create a clean new request without compound unique index conflict
  await CompanyEvaluationRequest.findByIdAndDelete(requestId);

  // Notify student
  if (request.studentId?.userId?._id) {
    await Notification.create({
      recipientId: request.studentId.userId._id,
      title: "Cấp quyền tạo lại link đánh giá",
      message: "Trưởng Bộ Môn đã cấp quyền cho phép bạn tạo lại link đánh giá thực tập mới.",
      type: "INTERNSHIP",
    });
  }

  return {
    message: "Đã cho phép sinh viên tạo lại link đánh giá.",
  };
};

// ==========================================
// 10. TBM: Get All Evaluation Requests with Status
// ==========================================
const tbmGetAllEvaluationRequests = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
} = {}) => {
  const query = {};

  if (status && status.trim()) {
    query.status = status.trim();
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

    const matchingCompanies = await Company.find({ companyName: searchRegex }).select("_id");

    query.$or = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { companyId: { $in: matchingCompanies.map((c) => c._id) } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await CompanyEvaluationRequest.countDocuments(query);

  const requests = await CompanyEvaluationRequest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId", "companyName address email phone contactPerson")
    .populate({
      path: "internshipId",
      populate: {
        path: "lecturerId",
        populate: { path: "userId", select: "fullName email phone" },
      },
    })
    .lean();

  return {
    data: requests,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ==========================================
// 11. Student: Request Re-creation of Evaluation Link
// ==========================================
const studentRequestRecreateLink = async (userId, { reason } = {}) => {
  if (!reason || !reason.trim()) {
    throw new AppError("Vui lòng nhập lý do yêu cầu tạo lại link đánh giá.", 400);
  }

  const student = await Student.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email",
  });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên.", 404);
  }

  const internship = await Internship.findOne({
    studentId: student._id,
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  }).sort({ createdAt: -1 });

  if (!internship) {
    throw new AppError("Không tìm thấy đợt thực tập hợp lệ của bạn.", 404);
  }

  if (internship.status === "COMPLETED") {
    throw new AppError("Đợt thực tập đã hoàn tất, không thể yêu cầu tạo lại link đánh giá.", 400);
  }

  let request = await CompanyEvaluationRequest.findOne({
    studentId: student._id,
    internshipId: internship._id,
  });

  if (!request) {
    const token = crypto.randomBytes(24).toString("hex");
    request = await CompanyEvaluationRequest.create({
      token,
      studentId: student._id,
      internshipId: internship._id,
      companyId: internship.companyId,
      status: "SUBMITTED",
      recreateStatus: "PENDING",
      recreateReason: reason.trim(),
      recreateRequestedAt: new Date(),
    });
  } else {
    request.recreateStatus = "PENDING";
    request.recreateReason = reason.trim();
    request.recreateRequestedAt = new Date();
    await request.save();
  }

  // Send notification to TBM
  const studentName = student.userId?.fullName || "Sinh viên";
  const studentCode = student.studentCode || "";
  await notificationService.createNotificationForRole("TBM", {
    title: "Yêu cầu tạo lại link đánh giá",
    message: `Sinh viên ${studentName} (${studentCode}) đã yêu cầu tạo lại link đánh giá thực tập doanh nghiệp. Lý do: ${reason.trim()}.`,
    type: "EVALUATION",
    link: "/tbm/evaluations",
  });

  return {
    message: "Gửi yêu cầu tạo lại link đánh giá thành công. Vui lòng chờ Trưởng Bộ Môn xét duyệt.",
    request,
  };
};

// ==========================================
// 12. TBM: Get Re-creation Requests
// ==========================================
const tbmGetRecreateRequests = async ({ search = "", status = "" } = {}) => {
  const query = {
    recreateStatus: { $in: ["PENDING", "APPROVED", "REJECTED"] },
  };

  if (status && status.trim() && status !== "ALL") {
    query.recreateStatus = status.trim().toUpperCase();
  }

  const requests = await CompanyEvaluationRequest.find(query)
    .sort({ recreateRequestedAt: -1, updatedAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId", "name companyName address email phone contactPerson")
    .populate({
      path: "internshipId",
      populate: {
        path: "lecturerId",
        populate: { path: "userId", select: "fullName email phone" },
      },
    })
    .lean();

  const result = await Promise.all(
    requests.map(async (req) => {
      let evaluation = null;
      if (req.internshipId?._id || req.internshipId) {
        evaluation = await Evaluation.findOne({
          evaluationType: "INTERNSHIP",
          targetId: req.internshipId?._id || req.internshipId,
        }).select("score comments submittedAt status");
      }
      return {
        _id: req._id,
        internshipId: req.internshipId?._id || req.internshipId,
        studentId: req.studentId?._id,
        studentCode: req.studentId?.studentCode || "—",
        studentName: req.studentId?.userId?.fullName || req.studentId?.fullName || "Sinh viên",
        className: req.studentId?.className || "—",
        companyName: req.companyId?.companyName || req.companyId?.name || "Doanh nghiệp",
        position: req.internshipId?.position || "Thực tập sinh",
        score: evaluation?.score ?? null,
        evaluationDate: evaluation?.submittedAt || req.submittedAt || req.createdAt,
        reason: req.recreateReason || "—",
        rejectReason: req.recreateRejectReason || "",
        status: req.recreateStatus,
        createdAt: req.recreateRequestedAt || req.updatedAt || req.createdAt,
      };
    })
  );

  let filtered = result;
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.studentName?.toLowerCase().includes(q) ||
        r.studentCode?.toLowerCase().includes(q) ||
        r.companyName?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
    );
  }

  return {
    data: filtered,
    total: filtered.length,
  };
};

// ==========================================
// 13. TBM: Approve Re-creation Request
// ==========================================
const tbmApproveRecreateRequest = async (requestId) => {
  const request = await CompanyEvaluationRequest.findById(requestId).populate({
    path: "studentId",
    populate: { path: "userId", select: "fullName _id" },
  });

  if (!request) {
    throw new AppError("Không tìm thấy yêu cầu tạo lại link.", 404);
  }

  request.recreateStatus = "APPROVED";
  request.allowRecreate = true;
  request.recreateApprovedAt = new Date();
  await request.save();

  // Send notification to student
  if (request.studentId?.userId?._id) {
    await notificationService.createNotification({
      recipientId: request.studentId.userId._id,
      title: "Duyệt yêu cầu tạo lại link đánh giá",
      message: "Trưởng Bộ Môn đã phê duyệt yêu cầu tạo lại link đánh giá của bạn. Bạn có thể tạo link đánh giá mới ngay bây giờ.",
      type: "EVALUATION",
      link: "/student/internship",
    });
  }

  return {
    message: "Đã phê duyệt yêu cầu tạo lại link đánh giá thành công.",
    request,
  };
};

// ==========================================
// 14. TBM: Reject Re-creation Request
// ==========================================
const tbmRejectRecreateRequest = async (requestId, { rejectReason } = {}) => {
  const request = await CompanyEvaluationRequest.findById(requestId).populate({
    path: "studentId",
    populate: { path: "userId", select: "fullName _id" },
  });

  if (!request) {
    throw new AppError("Không tìm thấy yêu cầu tạo lại link.", 404);
  }

  request.recreateStatus = "REJECTED";
  request.recreateRejectReason = (rejectReason || "").trim() || "Trưởng Bộ Môn không chấp thuận yêu cầu.";
  request.recreateRejectedAt = new Date();
  await request.save();

  // Send notification to student
  if (request.studentId?.userId?._id) {
    await notificationService.createNotification({
      recipientId: request.studentId.userId._id,
      title: "Từ chối yêu cầu tạo lại link đánh giá",
      message: `Trưởng Bộ Môn đã từ chối yêu cầu tạo lại link đánh giá. Lý do: ${request.recreateRejectReason}`,
      type: "EVALUATION",
      link: "/student/internship",
    });
  }

  return {
    message: "Đã từ chối yêu cầu tạo lại link đánh giá.",
    request,
  };
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

