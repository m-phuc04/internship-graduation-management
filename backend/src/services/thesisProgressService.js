import ThesisProgress from "../models/ThesisProgress.js";
import Thesis from "../models/Thesis.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Student Creates Thesis Progress (Weekly / Monthly)
// ====================
const createProgress = async ({
  userId,
  studentId: explicitStudentId,
  thesisId: explicitThesisId,
  progressType,
  weekNumber = null,
  monthNumber = null,
  title,
  description,
  completionPercentage = 0,
  file = null,
  status = "SUBMITTED",
}) => {
  // 1. Identify Student
  let student = null;
  if (userId) {
    student = await Student.findOne({ userId }).populate("userId");
  } else if (explicitStudentId) {
    student = await Student.findById(explicitStudentId).populate("userId");
  }

  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  // 2. Identify Active Thesis
  let thesis = null;
  if (explicitThesisId) {
    thesis = await Thesis.findById(explicitThesisId);
  } else {
    thesis = await Thesis.findOne({
      $or: [{ studentId: student._id }, { secondStudentId: student._id }],
      status: {
        $in: [
          "APPROVED",
          "ASSIGNED_REVIEWERS",
          "IN_PROGRESS",
          "SUBMITTED",
          "GRADED",
        ],
      },
    });
  }

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận hợp lệ đang thực hiện", 404);
  }

  // 3. Verify Student belongs to this Thesis (SV1 or SV2)
  const isSV1 = thesis.studentId?.toString() === student._id.toString();
  const isSV2 =
    thesis.secondStudentId &&
    thesis.secondStudentId.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không thuộc đề tài khóa luận này", 403);
  }

  // 4. Verify Thesis Status allows progress reports
  if (["PENDING_TBM_APPROVAL", "REJECTED"].includes(thesis.status)) {
    throw new AppError(
      `Không thể nộp báo cáo tiến độ khi đề tài đang ở trạng thái "${thesis.status}"`,
      400,
    );
  }

  // 5. Validate Progress Type & Numbers
  if (!["WEEKLY", "MONTHLY"].includes(progressType)) {
    throw new AppError("Loại tiến độ phải là 'WEEKLY' hoặc 'MONTHLY'", 400);
  }

  if (progressType === "WEEKLY") {
    if (!weekNumber || Number(weekNumber) < 1 || Number(weekNumber) > 52) {
      throw new AppError("Số thứ tự tuần (weekNumber) là bắt buộc từ 1 đến 52", 400);
    }
  }

  if (progressType === "MONTHLY") {
    if (!monthNumber || Number(monthNumber) < 1 || Number(monthNumber) > 12) {
      throw new AppError("Số thứ tự tháng (monthNumber) là bắt buộc từ 1 đến 12", 400);
    }
  }

  // 6. Validate Completion Percentage
  const numPercentage = Number(completionPercentage);
  if (isNaN(numPercentage) || numPercentage < 0 || numPercentage > 100) {
    throw new AppError("Tỷ lệ hoàn thành phải từ 0% đến 100%", 400);
  }

  // 7. Validate Title & Description
  if (!title || !title.trim()) {
    throw new AppError("Tiêu đề báo cáo tiến độ là bắt buộc", 400);
  }
  if (!description || !description.trim()) {
    throw new AppError("Nội dung báo cáo tiến độ là bắt buộc", 400);
  }

  // 8. Check Duplicate Progress
  const duplicateQuery = {
    thesisId: thesis._id,
    progressType,
  };
  if (progressType === "WEEKLY") {
    duplicateQuery.weekNumber = Number(weekNumber);
  } else {
    duplicateQuery.monthNumber = Number(monthNumber);
  }

  const existingProgress = await ThesisProgress.findOne(duplicateQuery);
  if (existingProgress) {
    throw new AppError(
      `Đã tồn tại báo cáo tiến độ ${
        progressType === "WEEKLY" ? `Tuần ${weekNumber}` : `Tháng ${monthNumber}`
      } cho đề tài này`,
      409,
    );
  }

  // 9. Create Progress Record
  const initialStatus = status === "DRAFT" ? "DRAFT" : "SUBMITTED";
  const progress = await ThesisProgress.create({
    thesisId: thesis._id,
    studentId: student._id,
    progressType,
    weekNumber: progressType === "WEEKLY" ? Number(weekNumber) : null,
    monthNumber: progressType === "MONTHLY" ? Number(monthNumber) : null,
    title: title.trim(),
    description: description.trim(),
    completionPercentage: numPercentage,
    file: file || {},
    status: initialStatus,
    submittedAt: initialStatus === "SUBMITTED" ? new Date() : null,
  });

  // Auto transition thesis to IN_PROGRESS if it was APPROVED or ASSIGNED_REVIEWERS
  if (["APPROVED", "ASSIGNED_REVIEWERS"].includes(thesis.status)) {
    thesis.status = "IN_PROGRESS";
    await thesis.save();
  }

  // Notify Supervisor
  if (initialStatus === "SUBMITTED" && thesis.supervisorId) {
    const supervisor = await Lecturer.findById(thesis.supervisorId).populate("userId");
    if (supervisor?.userId?._id) {
      await notificationService.createNotification({
        recipientId: supervisor.userId._id,
        type: "THESIS_PROGRESS",
        title: "Báo cáo tiến độ khóa luận mới",
        message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã nộp báo cáo tiến độ: "${title.trim()}".`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/lecturer/theses/progress",
      });
    }
  }

  return await ThesisProgress.findById(progress._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("thesisId");
};

// ====================
// 2. Student Gets Own Thesis & Progress List
// ====================
const getMyThesisProgress = async (userId) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findOne({
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email phone" },
    });

  if (!thesis) {
    return {
      student,
      thesis: null,
      progressList: [],
      stats: { total: 0, approved: 0, pending: 0, avgPercentage: 0 },
    };
  }

  const progressList = await ThesisProgress.find({ thesisId: thesis._id })
    .sort({ submittedAt: -1, createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    });

  const total = progressList.length;
  const approved = progressList.filter((p) => p.status === "APPROVED").length;
  const pending = progressList.filter((p) =>
    ["SUBMITTED", "REVIEWING"].includes(p.status),
  ).length;

  const latestReport = progressList[0];
  const avgPercentage = latestReport ? latestReport.completionPercentage : 0;

  return {
    student,
    thesis,
    progressList,
    stats: {
      total,
      approved,
      pending,
      avgPercentage,
    },
  };
};

// ====================
// 3. Student Submits a Draft Progress
// ====================
const submitDraftProgress = async (progressId, userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const progress = await ThesisProgress.findById(progressId).populate("thesisId");
  if (!progress) {
    throw new AppError("Không tìm thấy báo cáo tiến độ", 404);
  }

  const thesis = progress.thesisId;
  const isSV1 = thesis.studentId?.toString() === student._id.toString();
  const isSV2 =
    thesis.secondStudentId &&
    thesis.secondStudentId.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không có quyền nộp báo cáo tiến độ này", 403);
  }

  if (progress.status !== "DRAFT") {
    throw new AppError(`Báo cáo đang ở trạng thái "${progress.status}", không thể nộp lại`, 400);
  }

  progress.status = "SUBMITTED";
  progress.submittedAt = new Date();
  await progress.save();

  return progress;
};

// ====================
// 4. Lecturer: Get Supervised Theses & Progress Reports
// ====================
const getSupervisedThesesProgress = async (userId) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const theses = await Thesis.find({ supervisorId: lecturer._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .lean();

  const results = await Promise.all(
    theses.map(async (t) => {
      const progressReports = await ThesisProgress.find({ thesisId: t._id })
        .sort({ submittedAt: -1, createdAt: -1 })
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "fullName email" },
        })
        .lean();

      return {
        ...t,
        progressReports,
        stats: {
          total: progressReports.length,
          pending: progressReports.filter((p) =>
            ["SUBMITTED", "REVIEWING"].includes(p.status),
          ).length,
          approved: progressReports.filter((p) => p.status === "APPROVED").length,
          rejected: progressReports.filter((p) => p.status === "REJECTED").length,
          latestCompletion: progressReports[0]?.completionPercentage || 0,
        },
      };
    }),
  );

  return {
    lecturer,
    theses: results,
  };
};

// ====================
// 5. Lecturer Reviews / Grades / Approves / Rejects Progress
// ====================
const reviewProgress = async (
  progressId,
  {
    lecturerScore = null,
    lecturerComment = null,
    status,
    userId,
    userRole,
  },
) => {
  const progress = await ThesisProgress.findById(progressId).populate("thesisId");
  if (!progress) {
    throw new AppError("Không tìm thấy báo cáo tiến độ", 404);
  }

  const thesis = progress.thesisId;
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài tương ứng với báo cáo tiến độ", 404);
  }

  // Check Lecturer Access (must be supervisor, TBM, or ADMIN)
  if (userRole !== "TBM" && userRole !== "ADMIN") {
    const lecturer = await Lecturer.findOne({ userId });
    if (!lecturer || thesis.supervisorId.toString() !== lecturer._id.toString()) {
      throw new AppError(
        "Bạn không có quyền đánh giá tiến độ của đề tài do giảng viên khác hướng dẫn",
        403,
      );
    }
  }

  // Validate Review Status
  if (!["REVIEWING", "APPROVED", "REJECTED"].includes(status)) {
    throw new AppError("Trạng thái đánh giá phải là REVIEWING, APPROVED hoặc REJECTED", 400);
  }

  // Reject MUST have comment
  if (status === "REJECTED" && (!lecturerComment || !lecturerComment.trim())) {
    throw new AppError("Vui lòng cung cấp nhận xét/lý do khi từ chối tiến độ", 400);
  }

  // Validate Score if provided
  if (lecturerScore !== null && lecturerScore !== undefined && lecturerScore !== "") {
    const numScore = Number(lecturerScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      throw new AppError("Điểm tiến độ phải từ 0 đến 10", 400);
    }
    progress.lecturerScore = numScore;
  }

  progress.status = status;
  progress.lecturerComment = lecturerComment ? lecturerComment.trim() : null;
  progress.reviewedAt = new Date();
  await progress.save();

  // Notify Student
  if (progress.studentId) {
    const student = await Student.findById(progress.studentId).populate("userId");
    if (student?.userId?._id) {
      await notificationService.createNotification({
        recipientId: student.userId._id,
        type: "THESIS_PROGRESS",
        title: status === "APPROVED" ? "Báo cáo tiến độ đã được phê duyệt" : status === "REJECTED" ? "Báo cáo tiến độ bị từ chối" : "Báo cáo tiến độ đang được đánh giá",
        message: status === "APPROVED"
          ? `Báo cáo tiến độ "${progress.title}" đã được Giảng viên phê duyệt với điểm số: ${progress.lecturerScore !== null ? progress.lecturerScore : "Đạt"}.`
          : status === "REJECTED"
          ? `Báo cáo tiến độ "${progress.title}" đã bị Giảng viên từ chối: ${progress.lecturerComment || "Chưa đạt yêu cầu"}.`
          : `Báo cáo tiến độ "${progress.title}" đang được Giảng viên xem xét.`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/student/theses/progress",
      });
    }
  }

  return await ThesisProgress.findById(progress._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate("thesisId");
};

// ====================
// 6. Get Progress By Thesis ID (Detail lookup)
// ====================
const getProgressByThesis = async (thesisId) => {
  const progress = await ThesisProgress.find({ thesisId })
    .populate("thesisId")
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .sort({ submittedAt: -1, createdAt: -1 });

  return progress;
};

export default {
  createProgress,
  getMyThesisProgress,
  submitDraftProgress,
  getSupervisedThesesProgress,
  reviewProgress,
  getProgressByThesis,
};
