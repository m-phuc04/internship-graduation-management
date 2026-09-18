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
  reportType = "WEEKLY",
  title,
  content,
  weekNumber,
  weekStartDate,
  weekEndDate,
  monthNumber,
  file,
  status = "SUBMITTED",
}) => {
  const student = await Student.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const internship = await Internship.findById(internshipId).populate([
    { path: "studentId", populate: { path: "userId", select: "fullName email phone" } },
    { path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } },
    { path: "lecturerId", populate: { path: "userId", select: "fullName email phone" } },
    { path: "companyId", select: "name code" },
  ]);

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  const isSV1 = internship.studentId?._id?.toString() === student._id.toString();
  const isSV2 =
    internship.secondStudentId &&
    internship.secondStudentId._id?.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Hồ sơ thực tập không thuộc về tài khoản này", 403);
  }

  if (
    !["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"].includes(
      internship.status,
    )
  ) {
    throw new AppError(
      `Chưa thể nộp nhật ký khi hồ sơ thực tập đang ở trạng thái ${internship.status}. Hồ sơ phải được duyệt (APPROVED/INTERNING).`,
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

  const hasStudent2 = !!internship.secondStudentId;
  let initialStatus = "SUBMITTED";
  let initialStudent2Status = "NOT_APPLICABLE";

  if (status === "DRAFT") {
    initialStatus = "DRAFT";
    initialStudent2Status = hasStudent2 ? "PENDING" : "NOT_APPLICABLE";
  } else {
    // Submitting
    if (hasStudent2) {
      initialStatus = "WAITING_STUDENT_2";
      initialStudent2Status = "PENDING";
    } else {
      initialStatus = "SUBMITTED";
      initialStudent2Status = "NOT_APPLICABLE";
    }
  }

  const report = await InternshipReport.create({
    internshipId,
    studentId: student._id,
    secondStudentId: internship.secondStudentId?._id || null,
    reportType,
    title: title ? title.trim() : `Nhật ký tuần ${validWeek}`,
    content: content || null,
    weekNumber: validWeek,
    weekStartDate: weekStartDate ? new Date(weekStartDate) : null,
    weekEndDate: weekEndDate ? new Date(weekEndDate) : null,
    monthNumber: validMonth,
    file: file || null,
    status: initialStatus,
    student2Status: initialStudent2Status,
    submittedAt: initialStatus === "SUBMITTED" || initialStatus === "WAITING_STUDENT_2" ? new Date() : null,
  });

  // Handle Notifications
  if (initialStatus === "WAITING_STUDENT_2" && internship.secondStudentId?.userId?._id) {
    // Notify SV2
    await notificationService.createNotification({
      recipientId: internship.secondStudentId.userId._id,
      type: "INTERNSHIP_REPORT",
      title: "Yêu cầu xác nhận nhật ký thực tập",
      message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã gửi nhật ký ${reportType === "WEEKLY" ? `Tuần ${validWeek}` : title}. Vui lòng kiểm tra và xác nhận.`,
      referenceId: report._id,
      referenceModel: "InternshipReport",
      link: "/student/reports",
    });
  } else if (initialStatus === "SUBMITTED" && internship.lecturerId?.userId?._id) {
    // Notify Lecturer (only for 1 SV group upon initial submit)
    await notificationService.createNotification({
      recipientId: internship.lecturerId.userId._id,
      type: "INTERNSHIP_REPORT",
      title: "Nhật ký thực tập mới từ sinh viên",
      message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã nộp nhật ký: "${report.title}".`,
      referenceId: report._id,
      referenceModel: "InternshipReport",
      link: "/lecturer/reports",
    });
  }

  return await InternshipReport.findById(report._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: { path: "companyId", select: "name code" },
    });
};

// ====================
// Student Updates / Edits Report (Draft or Needs Revision)
// ====================
const updateReport = async ({
  reportId,
  userId,
  title,
  content,
  file,
  status = "SUBMITTED",
  weekStartDate,
  weekEndDate,
}) => {
  const student = await Student.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const report = await InternshipReport.findById(reportId).populate({
    path: "internshipId",
    populate: [
      { path: "studentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "lecturerId", populate: { path: "userId", select: "fullName email phone" } },
    ],
  });

  if (!report) {
    throw new AppError("Không tìm thấy báo cáo nhật ký thực tập", 404);
  }

  const internship = report.internshipId;
  const isSV1 = internship.studentId?._id?.toString() === student._id.toString();
  const isSV2 =
    internship.secondStudentId &&
    internship.secondStudentId._id?.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không thuộc hồ sơ thực tập này", 403);
  }

  if (!["DRAFT", "NEEDS_REVISION"].includes(report.status)) {
    throw new AppError(
      `Không thể chỉnh sửa báo cáo khi đang ở trạng thái "${report.status}"`,
      400,
    );
  }

  if (title !== undefined) report.title = title.trim();
  if (content !== undefined) report.content = content;
  if (file !== undefined && file !== null) report.file = file;
  if (weekStartDate) report.weekStartDate = new Date(weekStartDate);
  if (weekEndDate) report.weekEndDate = new Date(weekEndDate);

  const hasStudent2 = !!internship.secondStudentId;

  if (status === "DRAFT") {
    report.status = "DRAFT";
    report.student2Status = hasStudent2 ? "PENDING" : "NOT_APPLICABLE";
  } else {
    // Resubmitting
    if (hasStudent2) {
      report.status = "WAITING_STUDENT_2";
      report.student2Status = "PENDING";
      report.student2RejectedReason = null;
      report.submittedAt = new Date();

      // Notify SV2
      if (internship.secondStudentId?.userId?._id) {
        await notificationService.createNotification({
          recipientId: internship.secondStudentId.userId._id,
          type: "INTERNSHIP_REPORT",
          title: "Nhật ký thực tập đã được cập nhật",
          message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã cập nhật lại nhật ký ${report.reportType === "WEEKLY" ? `Tuần ${report.weekNumber}` : report.title}. Vui lòng kiểm tra và xác nhận lại.`,
          referenceId: report._id,
          referenceModel: "InternshipReport",
          link: "/student/reports",
        });
      }
    } else {
      report.status = "SUBMITTED";
      report.student2Status = "NOT_APPLICABLE";
      report.submittedAt = new Date();

      // Notify Lecturer
      if (internship.lecturerId?.userId?._id) {
        await notificationService.createNotification({
          recipientId: internship.lecturerId.userId._id,
          type: "INTERNSHIP_REPORT",
          title: "Nhật ký thực tập mới từ sinh viên",
          message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã cập nhật và nộp nhật ký: "${report.title}".`,
          referenceId: report._id,
          referenceModel: "InternshipReport",
          link: "/lecturer/reports",
        });
      }
    }
  }

  await report.save();

  return await InternshipReport.findById(report._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: { path: "companyId", select: "name code" },
    });
};

// ====================
// Student 2 Confirms or Rejects Report
// ====================
const confirmReportByStudent2 = async (reportId, userId, { action, rejectionReason }) => {
  const student = await Student.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const report = await InternshipReport.findById(reportId).populate({
    path: "internshipId",
    populate: [
      { path: "studentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "lecturerId", populate: { path: "userId", select: "fullName email phone" } },
    ],
  });

  if (!report) {
    throw new AppError("Không tìm thấy nhật ký thực tập", 404);
  }

  const internship = report.internshipId;
  if (
    !internship.secondStudentId ||
    internship.secondStudentId._id?.toString() !== student._id.toString()
  ) {
    throw new AppError("Bạn không phải là Sinh viên 2 trong đợt thực tập này", 403);
  }

  if (report.status !== "WAITING_STUDENT_2") {
    throw new AppError(
      `Báo cáo đang ở trạng thái "${report.status}", không thể thực hiện xác nhận`,
      400,
    );
  }

  if (action === "CONFIRM") {
    report.student2Status = "CONFIRMED";
    report.student2ConfirmedAt = new Date();
    report.student2RejectedReason = null;
    report.status = "SUBMITTED";
    report.submittedAt = new Date();

    // 1. Notify SV1
    if (internship.studentId?.userId?._id) {
      await notificationService.createNotification({
        recipientId: internship.studentId.userId._id,
        type: "INTERNSHIP_REPORT",
        title: "Sinh viên 2 đã xác nhận nhật ký",
        message: `Sinh viên 2 (${student.userId?.fullName || student.studentCode}) đã đồng ý và xác nhận nhật ký ${report.reportType === "WEEKLY" ? `Tuần ${report.weekNumber}` : report.title}. Nhật ký đã được chuyển tới Giảng viên hướng dẫn.`,
        referenceId: report._id,
        referenceModel: "InternshipReport",
        link: "/student/reports",
      });
    }

    // 2. Notify Lecturer
    if (internship.lecturerId?.userId?._id) {
      await notificationService.createNotification({
        recipientId: internship.lecturerId.userId._id,
        type: "INTERNSHIP_REPORT",
        title: "Nhật ký thực tập mới từ nhóm sinh viên",
        message: `Nhóm sinh viên (${internship.studentId?.userId?.fullName || ""} + ${student.userId?.fullName || ""}) đã nộp nhật ký: "${report.title}".`,
        referenceId: report._id,
        referenceModel: "InternshipReport",
        link: "/lecturer/reports",
      });
    }
  } else if (action === "REJECT") {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new AppError("Vui lòng cung cấp lý do yêu cầu chỉnh sửa", 400);
    }

    report.student2Status = "REJECTED";
    report.student2RejectedReason = rejectionReason.trim();
    report.status = "NEEDS_REVISION";

    // Notify SV1
    if (internship.studentId?.userId?._id) {
      await notificationService.createNotification({
        recipientId: internship.studentId.userId._id,
        type: "INTERNSHIP_REPORT",
        title: "Sinh viên 2 yêu cầu chỉnh sửa nhật ký",
        message: `Sinh viên 2 (${student.userId?.fullName || student.studentCode}) đã từ chối xác nhận nhật ký ${report.reportType === "WEEKLY" ? `Tuần ${report.weekNumber}` : report.title}. Lý do: "${rejectionReason.trim()}". Vui lòng chỉnh sửa và gửi lại.`,
        referenceId: report._id,
        referenceModel: "InternshipReport",
        link: "/student/reports",
      });
    }
  } else {
    throw new AppError("Hành động không hợp lệ (CONFIRM hoặc REJECT)", 400);
  }

  await report.save();

  return await InternshipReport.findById(report._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: { path: "companyId", select: "name code" },
    });
};

// ====================
// Student Gets All Reports for their Internship
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
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    status: { $in: ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"] },
  })
    .sort({ createdAt: -1 })
    .populate("companyId")
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    });

  let reports = [];
  if (internship) {
    reports = await InternshipReport.find({
      internshipId: internship._id,
    })
      .sort({ weekNumber: 1, createdAt: -1 })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email phone" },
      })
      .populate({
        path: "secondStudentId",
        populate: { path: "userId", select: "fullName email phone" },
      })
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
  }

  return {
    student,
    internship: internship || null,
    reports,
  };
};

// ====================
// Lecturer Gets Reports for Assigned Students (Only Confirmed / Submitted)
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
  }).select("_id studentId secondStudentId companyId");

  const internshipIds = supervisedInternships.map((i) => i._id);

  // GVHD can ONLY see reports that are SUBMITTED, REVIEWING, APPROVED, or REJECTED
  const query = {
    internshipId: { $in: internshipIds },
    status: { $in: ["SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"] },
  };

  if (status && status.trim()) {
    if (["SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"].includes(status.trim())) {
      query.status = status.trim();
    }
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
      { secondStudentId: { $in: matchingStudents.map((s) => s._id) } },
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
      path: "secondStudentId",
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
      { secondStudentId: { $in: matchingStudents.map((s) => s._id) } },
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
      path: "secondStudentId",
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
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "internshipId",
      populate: [
        { path: "companyId", select: "name code address email phone" },
        {
          path: "studentId",
          populate: { path: "userId", select: "fullName email phone" },
        },
        {
          path: "secondStudentId",
          populate: { path: "userId", select: "fullName email phone" },
        },
        {
          path: "lecturerId",
          populate: { path: "userId", select: "fullName email phone" },
        },
      ],
    });

  if (!report) {
    throw new AppError("Không tìm thấy nhật ký thực tập", 404);
  }

  // Access check
  if (requestingUser && requestingUser.role === "STUDENT") {
    const student = await Student.findOne({ userId: requestingUser.userId });
    const isSV1 = report.studentId?._id?.toString() === student?._id?.toString();
    const isSV2 = report.secondStudentId?._id?.toString() === student?._id?.toString();

    if (!student || (!isSV1 && !isSV2)) {
      throw new AppError("Bạn không có quyền xem nhật ký của nhóm sinh viên khác", 403);
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

    // GVHD cannot view report if not yet confirmed / submitted
    if (["DRAFT", "WAITING_STUDENT_2", "NEEDS_REVISION"].includes(report.status)) {
      throw new AppError(
        "Nhật ký tuần này chưa được hoàn tất quy trình xác nhận sinh viên và gửi cho Giảng viên",
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
    lecturerScore !== "" &&
    (Number(lecturerScore) < 0 || Number(lecturerScore) > 10)
  ) {
    throw new AppError("Điểm đánh giá phải nằm trong khoảng từ 0 đến 10", 400);
  }

  report.status = status;
  if (lecturerScore !== undefined && lecturerScore !== null && lecturerScore !== "") {
    report.lecturerScore = Number(lecturerScore);
  }
  if (lecturerComment !== undefined) {
    report.lecturerComment = lecturerComment ? lecturerComment.trim() : null;
  }
  report.reviewedAt = new Date();

  await report.save();

  // Notify Student 1 & Student 2
  const notifyStudents = async () => {
    const studentsToNotify = [report.studentId, report.secondStudentId].filter(Boolean);
    for (const sId of studentsToNotify) {
      const s = await Student.findById(sId).populate("userId");
      if (s?.userId?._id) {
        await notificationService.createNotification({
          recipientId: s.userId._id,
          type: "INTERNSHIP_REPORT",
          title: status === "APPROVED" ? "Nhật ký thực tập đã được duyệt" : status === "REJECTED" ? "Nhật ký thực tập cần chỉnh sửa" : "Nhật ký thực tập đang được đánh giá",
          message: status === "APPROVED"
            ? `Nhật ký "${report.title}" đã được Giảng viên đánh giá: ${report.lecturerScore !== null ? `${report.lecturerScore}/10` : "Đạt"}.`
            : status === "REJECTED"
            ? `Nhật ký "${report.title}" bị Giảng viên từ chối: ${report.lecturerComment || "Chưa đạt yêu cầu"}.`
            : `Nhật ký "${report.title}" đang được Giảng viên xem xét.`,
          referenceId: report._id,
          referenceModel: "InternshipReport",
          link: "/student/reports",
        });
      }
    }
  };
  notifyStudents().catch(() => {});

  return await InternshipReport.findById(report._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
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
  updateReport,
  confirmReportByStudent2,
  getReportsForStudent,
  getReportsForLecturer,
  getAllReportsForTbm,
  getReportById,
  reviewReport,
};
