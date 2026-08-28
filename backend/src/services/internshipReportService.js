import InternshipReport from "../models/InternshipReport.js";
import Internship from "../models/Internship.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

// ====================
// Student Creates or Submits Report
// ====================
const createReport = async ({
  userId,
  internshipId,
  reportType,
  title,
  content,
  weekNumber,
  monthNumber,
  file,
  status = "SUBMITTED",
}) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const internship = await Internship.findById(internshipId);
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (internship.studentId.toString() !== student._id.toString()) {
    throw new AppError("Hồ sơ thực tập không thuộc về tài khoản này", 403);
  }

  if (!["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE"].includes(internship.status)) {
    throw new AppError(
      `Chưa thể nộp báo cáo khi hồ sơ thực tập đang ở trạng thái ${internship.status}. Hồ sơ phải được duyệt (APPROVED/INTERNING).`,
      409,
    );
  }

  // Type-specific validations
  let validWeek = null;
  let validMonth = null;

  if (reportType === "WEEKLY") {
    if (!weekNumber || Number(weekNumber) < 1 || Number(weekNumber) > 52) {
      throw new AppError("Báo cáo tuần (WEEKLY) bắt buộc phải có số tuần (từ 1 đến 52)", 400);
    }
    validWeek = Number(weekNumber);
  } else if (reportType === "MONTHLY") {
    if (!monthNumber || Number(monthNumber) < 1 || Number(monthNumber) > 12) {
      throw new AppError("Báo cáo tháng (MONTHLY) bắt buộc phải có số tháng (từ 1 đến 12)", 400);
    }
    validMonth = Number(monthNumber);
  } else if (reportType === "FINAL") {
    validWeek = null;
    validMonth = null;
  } else {
    throw new AppError("Loại báo cáo không hợp lệ (WEEKLY, MONTHLY, FINAL)", 400);
  }

  // Duplicate Check
  const duplicateQuery = {
    internshipId,
    reportType,
  };
  if (reportType === "WEEKLY") duplicateQuery.weekNumber = validWeek;
  if (reportType === "MONTHLY") duplicateQuery.monthNumber = validMonth;

  const existingReport = await InternshipReport.findOne(duplicateQuery);
  if (existingReport) {
    const typeLabel =
      reportType === "WEEKLY"
        ? `tuần ${validWeek}`
        : reportType === "MONTHLY"
        ? `tháng ${validMonth}`
        : "tổng kết (Final)";
    throw new AppError(`Báo cáo ${typeLabel} đã tồn tại cho đợt thực tập này`, 409);
  }

  const initialStatus = ["DRAFT", "SUBMITTED"].includes(status) ? status : "SUBMITTED";

  const report = await InternshipReport.create({
    internshipId,
    studentId: student._id,
    reportType,
    title,
    content: content || null,
    weekNumber: validWeek,
    monthNumber: validMonth,
    file: file || null,
    status: initialStatus,
    submittedAt: initialStatus === "SUBMITTED" ? new Date() : null,
  });

  // Notify Lecturer
  if (initialStatus === "SUBMITTED" && internship.lecturerId) {
    const lecturer = await Lecturer.findById(internship.lecturerId).populate("userId");
    if (lecturer?.userId?._id) {
      await notificationService.createNotification({
        recipientId: lecturer.userId._id,
        type: "INTERNSHIP_REPORT",
        title: "Báo cáo thực tập mới từ sinh viên",
        message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã nộp báo cáo: "${title}".`,
        referenceId: report._id,
        referenceModel: "InternshipReport",
        link: "/lecturer/reports",
      });
    }
  }

  return await InternshipReport.findById(report._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: { path: "companyId", select: "name code" },
    });
};

// ====================
// Student Gets All Their Own Reports
// ====================
const getReportsForStudent = async (userId) => {
  const student = await Student.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const internship = await Internship.findOne({
    studentId: student._id,
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  })
    .sort({ createdAt: -1 })
    .populate("companyId");

  const reports = await InternshipReport.find({
    studentId: student._id,
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "internshipId",
      populate: [
        { path: "companyId", select: "name code address" },
        {
          path: "lecturerId",
          populate: { path: "userId", select: "fullName email phone" },
        },
      ],
    })
    .lean();

  return {
    student,
    internship: internship || null,
    reports,
  };
};

// ====================
// Lecturer Gets Reports for Assigned Students
// ====================
const getReportsForLecturer = async (
  userId,
  { page = 1, limit = 10, search = "", status = "", reportType = "" } = {},
) => {
  const lecturer = await Lecturer.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  // Find all internships supervised by this lecturer
  const supervisedInternships = await Internship.find({
    lecturerId: lecturer._id,
  }).select("_id studentId companyId");

  const internshipIds = supervisedInternships.map((i) => i._id);

  const query = { internshipId: { $in: internshipIds } };

  if (status && status.trim()) {
    query.status = status.trim();
  }

  if (reportType && reportType.trim()) {
    query.reportType = reportType.trim();
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

    query.$or = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { title: searchRegex },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await InternshipReport.countDocuments(query);

  const reports = await InternshipReport.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: { path: "companyId", select: "name code" },
    })
    .lean();

  return {
    lecturer,
    data: reports,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// TBM Gets All Reports
// ====================
const getAllReportsForTbm = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  reportType = "",
} = {}) => {
  const query = {};

  if (status && status.trim()) {
    query.status = status.trim();
  }

  if (reportType && reportType.trim()) {
    query.reportType = reportType.trim();
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

    query.$or = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { title: searchRegex },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await InternshipReport.countDocuments(query);

  const reports = await InternshipReport.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: [
        { path: "companyId", select: "name code" },
        {
          path: "lecturerId",
          populate: { path: "userId", select: "fullName email" },
        },
      ],
    })
    .lean();

  return {
    data: reports,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// Get Report By ID with Role Access Verification
// ====================
const getReportById = async (reportId, requestingUser) => {
  const report = await InternshipReport.findById(reportId)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: [
        { path: "companyId", select: "name code address email phone" },
        {
          path: "lecturerId",
          populate: { path: "userId", select: "fullName email phone" },
        },
      ],
    });

  if (!report) {
    throw new AppError("Không tìm thấy báo cáo thực tập", 404);
  }

  // Access check
  if (requestingUser && requestingUser.role === "STUDENT") {
    const student = await Student.findOne({ userId: requestingUser.userId });
    if (!student || report.studentId._id.toString() !== student._id.toString()) {
      throw new AppError("Bạn không có quyền xem báo cáo của sinh viên khác", 403);
    }
  } else if (requestingUser && requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
    const internLecturerId = report.internshipId?.lecturerId?._id?.toString();
    if (!lecturer || internLecturerId !== lecturer._id.toString()) {
      throw new AppError(
        "Bạn không có quyền xem báo cáo của sinh viên do giảng viên khác hướng dẫn",
        403,
      );
    }
  }

  return report;
};

// ====================
// Lecturer / TBM Review Internship Report
// ====================
const reviewReport = async (
  reportId,
  requestingUser,
  { lecturerScore, lecturerComment, status },
) => {
  const report = await InternshipReport.findById(reportId).populate("internshipId");
  if (!report) {
    throw new AppError("Không tìm thấy báo cáo thực tập", 404);
  }

  if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
    const internLecturerId = report.internshipId?.lecturerId?.toString();
    if (!lecturer || internLecturerId !== lecturer._id.toString()) {
      throw new AppError(
        "Bạn không có quyền chấm điểm báo cáo của sinh viên do giảng viên khác hướng dẫn",
        403,
      );
    }
  }

  if (!["APPROVED", "REJECTED", "REVIEWING"].includes(status)) {
    throw new AppError("Trạng thái đánh giá không hợp lệ (APPROVED, REJECTED, REVIEWING)", 400);
  }

  if (
    lecturerScore !== undefined &&
    lecturerScore !== null &&
    (Number(lecturerScore) < 0 || Number(lecturerScore) > 10)
  ) {
    throw new AppError("Điểm đánh giá phải nằm trong khoảng từ 0 đến 10", 400);
  }

  report.status = status;
  if (lecturerScore !== undefined && lecturerScore !== null) {
    report.lecturerScore = Number(lecturerScore);
  }
  if (lecturerComment !== undefined) {
    report.lecturerComment = lecturerComment ? lecturerComment.trim() : null;
  }
  report.reviewedAt = new Date();

  await report.save();

  return await InternshipReport.findById(report._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: [
        { path: "companyId", select: "name code" },
        {
          path: "lecturerId",
          populate: { path: "userId", select: "fullName email" },
        },
      ],
    });
};

export default {
  createReport,
  getReportsForStudent,
  getReportsForLecturer,
  getAllReportsForTbm,
  getReportById,
  reviewReport,
};
