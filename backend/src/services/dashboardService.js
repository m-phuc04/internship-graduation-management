import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Company from "../models/Company.js";
import Internship from "../models/Internship.js";
import InternshipReport from "../models/InternshipReport.js";
import Evaluation from "../models/Evaluation.js";
import Thesis from "../models/Thesis.js";
import ThesisProgress from "../models/ThesisProgress.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Student Dashboard (AcademicTerm-aware)
// ====================
const getStudentDashboard = async (userId, academicTermId = null) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const termFilter = academicTermId && academicTermId !== "ALL" ? { academicTermId } : {};

  // Active Internship
  const internship = await Internship.findOne({ studentId: student._id, ...termFilter })
    .sort({ createdAt: -1 })
    .populate("companyId", "name companyName code address email phone website")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId");

  // Latest Internship Report
  let latestReport = null;
  if (internship) {
    latestReport = await InternshipReport.findOne({
      internshipId: internship._id,
    }).sort({ createdAt: -1 });
  }

  // Active Thesis
  const thesis = await Thesis.findOne({
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    ...termFilter,
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
    })
    .populate({
      path: "reviewer1Id",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "reviewer2Id",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId");

  // Latest Thesis Progress
  let latestProgress = null;
  if (thesis) {
    latestProgress = await ThesisProgress.findOne({
      thesisId: thesis._id,
    }).sort({ createdAt: -1 });
  }

  // Recent Notifications
  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const unreadNotificationsCount = await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
  });

  // Identify Pending Action Items
  const pendingActions = [];
  if (!internship) {
    pendingActions.push({
      type: "INTERNSHIP_REGISTER",
      title: "Chưa đăng ký Thực tập Doanh nghiệp",
      description: "Hãy đăng ký thông tin doanh nghiệp thực tập để bắt đầu quá trình thực tập.",
      actionLabel: "Đăng ký ngay",
      actionUrl: "/student/internship/register",
      link: "/student/internship/register",
      priority: "NORMAL",
    });
  } else if (internship.status === "REJECTED") {
    pendingActions.push({
      type: "RE_REGISTER_INTERNSHIP",
      title: "Hồ sơ thực tập bị từ chối",
      description: "Hồ sơ thực tập của bạn đã bị từ chối. Vui lòng xem lý do và đăng ký lại hồ sơ.",
      internshipId: internship._id,
      companyName: internship.companyId?.name || internship.companyId?.companyName || "Doanh nghiệp",
      status: "REJECTED",
      rejectionReason: internship.rejectionReason?.trim() || null,
      actionLabel: "Đăng ký lại",
      actionUrl: "/student/internship/register",
      link: "/student/internship/register",
      priority: "HIGH",
    });
  }

  if (!thesis) {
    pendingActions.push({
      type: "THESIS_REGISTER",
      title: "Chưa đăng ký Đề tài Khóa luận",
      description: "Hãy đăng ký đề tài KLTN (cá nhân hoặc nhóm 2 SV) và chọn GVHD.",
      actionLabel: "Đăng ký ngay",
      actionUrl: "/student/thesis/register",
      link: "/student/thesis/register",
      priority: "NORMAL",
    });
  } else if (thesis.status === "REJECTED") {
    pendingActions.push({
      type: "RE_REGISTER_THESIS",
      title: "Đề tài Khóa luận bị từ chối",
      description: "Đề tài khóa luận của bạn đã bị từ chối bởi TBM. Vui lòng xem lý do và đăng ký lại đề tài mới.",
      thesisId: thesis._id,
      thesisTitle: thesis.thesisTitle,
      status: "REJECTED",
      rejectionReason: thesis.rejectionReason?.trim() || null,
      actionLabel: "Đăng ký lại",
      actionUrl: "/student/thesis/register",
      link: "/student/thesis/register",
      priority: "HIGH",
    });
  }

  if (latestReport && latestReport.status === "REJECTED") {
    pendingActions.push({
      type: "REPORT_REVISE",
      title: "Báo cáo thực tập cần chỉnh sửa",
      description: `Báo cáo ${latestReport.reportType === "WEEKLY" ? `Tuần ${latestReport.weekNumber}` : `Tháng ${latestReport.monthNumber}`} bị GVHD từ chối. Hãy cập nhật lại.`,
      feedback: latestReport.feedback || null,
      actionLabel: "Nộp lại báo cáo",
      actionUrl: "/student/reports",
      link: "/student/reports",
      priority: "HIGH",
    });
  }

  if (latestProgress && latestProgress.status === "REJECTED") {
    pendingActions.push({
      type: "PROGRESS_REVISE",
      title: "Tiến độ KLTN cần chỉnh sửa",
      description: `Báo cáo tiến độ ${latestProgress.progressType === "WEEKLY" ? `Tuần ${latestProgress.weekNumber}` : `Tháng ${latestProgress.monthNumber}`} bị GVHD yêu cầu sửa lại.`,
      feedback: latestProgress.feedback || null,
      actionLabel: "Cập nhật tiến độ",
      actionUrl: "/student/thesis/progress",
      link: "/student/thesis/progress",
      priority: "HIGH",
    });
  }

  return {
    student,
    internship,
    thesis,
    latestReport,
    latestProgress,
    notifications,
    unreadNotificationsCount,
    pendingActions,
  };
};

// ====================
// 2. TBM Dashboard (AcademicTerm-aware)
// ====================
const getTbmDashboard = async (academicTermId = null) => {
  const termFilter = academicTermId && academicTermId !== "ALL" ? { academicTermId } : {};

  const [
    totalStudents,
    totalLecturers,
    totalCompanies,
    pendingInternships,
    approvedInternships,
    interningCount,
    completedInternships,
    pendingTheses,
    approvedTheses,
    inProgressTheses,
    gradedTheses,
    completedTheses,
    recentInternships,
    recentTheses,
  ] = await Promise.all([
    Student.countDocuments(),
    Lecturer.countDocuments(),
    Company.countDocuments(),
    Internship.countDocuments({ status: "PENDING", ...termFilter }),
    Internship.countDocuments({ status: "APPROVED", ...termFilter }),
    Internship.countDocuments({ status: "INTERNING", ...termFilter }),
    Internship.countDocuments({ status: "COMPLETED", ...termFilter }),
    Thesis.countDocuments({ status: "PENDING_TBM_APPROVAL", ...termFilter }),
    Thesis.countDocuments({ status: "APPROVED", ...termFilter }),
    Thesis.countDocuments({
      status: { $in: ["ASSIGNED_REVIEWERS", "IN_PROGRESS", "SUBMITTED"] },
      ...termFilter,
    }),
    Thesis.countDocuments({ status: "GRADED", ...termFilter }),
    Thesis.countDocuments({ status: "COMPLETED", ...termFilter }),
    Internship.find(termFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email" },
      })
      .populate("companyId", "companyName")
      .populate("academicTermId")
      .lean(),
    Thesis.find(termFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email" },
      })
      .populate({
        path: "supervisorId",
        populate: { path: "userId", select: "fullName email" },
      })
      .populate("academicTermId")
      .lean(),
  ]);

  return {
    stats: {
      totalStudents,
      totalLecturers,
      totalCompanies,
      pendingInternships,
      approvedInternships,
      interningCount,
      completedInternships,
      pendingTheses,
      approvedTheses,
      inProgressTheses,
      gradedTheses,
      completedTheses,
    },
    recentInternships,
    recentTheses,
  };
};

// ====================
// 3. Lecturer Dashboard (AcademicTerm-aware)
// ====================
const getLecturerDashboard = async (userId, academicTermId = null) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const termFilter = academicTermId && academicTermId !== "ALL" ? { academicTermId } : {};

  const [
    supervisedInternships,
    supervisedTheses,
    reviewer1Theses,
    reviewer2Theses,
  ] = await Promise.all([
    Internship.find({ lecturerId: lecturer._id, ...termFilter })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email phone" },
      })
      .populate("companyId", "companyName")
      .populate("academicTermId")
      .lean(),
    Thesis.find({ supervisorId: lecturer._id, ...termFilter })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email phone" },
      })
      .populate({
        path: "secondStudentId",
        populate: { path: "userId", select: "fullName email phone" },
      })
      .populate("academicTermId")
      .lean(),
    Thesis.find({
      $or: [
        { reviewer1Id: lecturer._id },
        { "reviewers.lecturerId": lecturer._id, "reviewers.isPrivateReviewer": true },
      ],
      ...termFilter,
    })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email" },
      })
      .populate("academicTermId")
      .lean(),
    Thesis.find({
      $or: [
        { reviewer2Id: lecturer._id },
        { "reviewers.lecturerId": lecturer._id, "reviewers.isCouncilReviewer": true },
      ],
      ...termFilter,
    })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email" },
      })
      .populate("academicTermId")
      .lean(),
  ]);

  // Find Pending Reports to Review
  const internshipIds = supervisedInternships.map((i) => i._id);
  const pendingInternshipReports = await InternshipReport.find({
    internshipId: { $in: internshipIds },
    status: { $in: ["SUBMITTED", "REVIEWING"] },
  })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .sort({ createdAt: -1 })
    .lean();

  // Find Pending Thesis Progress to Review
  const thesisIds = supervisedTheses.map((t) => t._id);
  const pendingThesisProgress = await ThesisProgress.find({
    thesisId: { $in: thesisIds },
    status: { $in: ["SUBMITTED", "REVIEWING"] },
  })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate("thesisId", "thesisTitle")
    .sort({ createdAt: -1 })
    .lean();

  return {
    lecturer,
    stats: {
      internshipStudentsCount: supervisedInternships.length,
      thesisStudentsCount: supervisedTheses.length,
      reviewer1Count: reviewer1Theses.length,
      reviewer2Count: reviewer2Theses.length,
      pendingInternshipReportsCount: pendingInternshipReports.length,
      pendingThesisProgressCount: pendingThesisProgress.length,
    },
    supervisedInternships: supervisedInternships.slice(0, 5),
    supervisedTheses: supervisedTheses.slice(0, 5),
    pendingInternshipReports: pendingInternshipReports.slice(0, 5),
    pendingThesisProgress: pendingThesisProgress.slice(0, 5),
  };
};

// ====================
// 4. Company Dashboard
// ====================
const getCompanyDashboard = async (userId) => {
  const company = await Company.findOne({ userId }).populate("userId");
  if (!company) {
    throw new AppError("Không tìm thấy thông tin doanh nghiệp", 404);
  }

  const [internships, evaluations] = await Promise.all([
    Internship.find({ companyId: company._id })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email phone" },
      })
      .lean(),
    Evaluation.find({ companyId: company._id }).lean(),
  ]);

  const interningStudents = internships.filter((i) =>
    ["APPROVED", "INTERNING"].includes(i.status),
  );

  const evaluatedInternshipIds = new Set(
    evaluations.map((e) => e.internshipId.toString()),
  );

  const pendingEvaluations = interningStudents.filter(
    (i) => !evaluatedInternshipIds.has(i._id.toString()),
  );

  return {
    company,
    stats: {
      totalInterns: internships.length,
      interningStudentsCount: interningStudents.length,
      pendingEvaluationsCount: pendingEvaluations.length,
      completedEvaluationsCount: evaluations.length,
    },
    interningStudents: interningStudents.slice(0, 5),
    pendingEvaluations: pendingEvaluations.slice(0, 5),
    recentEvaluations: evaluations.slice(0, 5),
  };
};

export default {
  getStudentDashboard,
  getTbmDashboard,
  getLecturerDashboard,
  getCompanyDashboard,
};
