import InternshipReport from "../models/InternshipReport.js";
import InternshipDocument from "../models/InternshipDocument.js";
import Internship from "../models/Internship.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import AcademicTerm from "../models/AcademicTerm.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";
import {
  getWeekEndDate,
  isWeekEnded,
  getInternshipTotalWeeks,
} from "../utils/internshipDateUtils.js";

// ====================
// 1. Sinh viên tạo hoặc nộp báo cáo thực tập
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
  fileCategory,
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

  // Check if academic term is CLOSED
  let termDoc = null;
  const termId = internship.academicTermId?._id || internship.academicTermId;
  if (termId) {
    termDoc = await AcademicTerm.findById(termId).lean();
  }
  if (!termDoc && internship.startDate) {
    termDoc = await AcademicTerm.findOne({
      startDate: { $lte: internship.startDate },
      endDate: { $gte: internship.startDate },
    }).lean();
  }
  if (termDoc && termDoc.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể tạo hoặc nộp nhật ký thực tập.", 400);
  }

  const isApprovedByTBM =
    (Boolean(internship.approvedAt) ||
      Boolean(internship.lecturerId) ||
      ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"].includes(internship.status)) &&
    internship.status !== "CANCELLED" &&
    internship.status !== "REJECTED" &&
    !internship.rejectedAt;

  if (!isApprovedByTBM) {
    throw new AppError(
      "Bạn chỉ có thể tạo và nộp nhật ký thực tập từng tuần sau khi hồ sơ thực tập đã được Trưởng Bộ Môn (TBM) phê duyệt.",
      403,
    );
  }

  if (!internship.lecturerId) {
    throw new AppError(
      "Hồ sơ thực tập của bạn chưa được phân công Giảng viên Giám sát. Vui lòng chờ phân công GVGS trước khi nộp nhật ký.",
      400,
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

    // 1. Kiểm tra không vượt quá tổng thời lượng thực tập
    const totalWeeks = getInternshipTotalWeeks(internship);
    if (validWeek > totalWeeks) {
      throw new AppError(
        `Tuần ${validWeek} vượt quá tổng thời gian thực tập đã đăng ký (${totalWeeks} tuần)`,
        400,
      );
    }

    // 2. Kiểm tra chu kỳ nộp nhật ký của GVGS (theo học kỳ)
    let cycle = internship.reportCycle || 1;
    if (internship.academicTermId) {
      const termDoc = await AcademicTerm.findById(
        internship.academicTermId._id || internship.academicTermId
      ).lean();
      if (termDoc?.internship?.reportCycle) {
        cycle = termDoc.internship.reportCycle;
      }
    }

    if (validWeek % cycle !== 0) {
      throw new AppError(
        `Tuần ${validWeek} không thuộc chu kỳ nộp nhật ký (${cycle} tuần/lần) do Giảng viên Giám sát thiết lập`,
        400,
      );
    }

    // 3. Khóa nhật ký khi tuần thực tập đã kết thúc
    const weekEnd = getWeekEndDate(internship.startDate, validWeek, weekEndDate);
    if (isWeekEnded(weekEnd)) {
      throw new AppError(
        `Tuần thực tập số ${validWeek} đã kết thúc. Nhật ký của tuần này đã bị khóa, không thể tạo mới hoặc nộp bổ sung.`,
        400,
      );
    }
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

  const initialStatus = status === "DRAFT" ? "DRAFT" : "SUBMITTED";

  const report = await InternshipReport.create({
    internshipId,
    studentId: student._id,
    secondStudentId: null,
    reportType,
    title: title ? title.trim() : `Nhật ký tuần ${validWeek}`,
    content: content || null,
    weekNumber: validWeek,
    weekStartDate: weekStartDate ? new Date(weekStartDate) : null,
    weekEndDate: weekEndDate ? new Date(weekEndDate) : null,
    monthNumber: validMonth,
    file: file || null,
    fileCategory: file?.category || fileCategory || (reportType === "WEEKLY" ? "Báo cáo tuần" : null),
    status: initialStatus,
    student2Status: "NOT_APPLICABLE",
    submittedAt: initialStatus === "SUBMITTED" ? new Date() : null,
  });

  // Handle Notifications
  if (initialStatus === "SUBMITTED" && internship.lecturerId?.userId?._id) {
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
// 2. Sinh viên cập nhật / chỉnh sửa báo cáo (Bản nháp hoặc Cần chỉnh sửa)
// ====================
const updateReport = async ({
  reportId,
  userId,
  title,
  content,
  file,
  fileCategory,
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

  // Check if academic term is CLOSED
  let termDoc = null;
  const termId = internship.academicTermId?._id || internship.academicTermId;
  if (termId) {
    termDoc = await AcademicTerm.findById(termId).lean();
  }
  if (!termDoc && internship.startDate) {
    termDoc = await AcademicTerm.findOne({
      startDate: { $lte: internship.startDate },
      endDate: { $gte: internship.startDate },
    }).lean();
  }
  if (termDoc && termDoc.status === "CLOSED") {
    throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể chỉnh sửa hoặc nộp nhật ký thực tập.", 400);
  }

  const isApprovedByTBM =
    (Boolean(internship.approvedAt) ||
      Boolean(internship.lecturerId) ||
      ["APPROVED", "INTERNING", "PENDING_SUPERVISOR_ACCEPTANCE", "COMPLETED"].includes(internship.status)) &&
    internship.status !== "CANCELLED" &&
    internship.status !== "REJECTED" &&
    !internship.rejectedAt;

  if (!isApprovedByTBM) {
    throw new AppError(
      "Bạn chỉ có thể tạo và nộp nhật ký thực tập từng tuần sau khi hồ sơ thực tập đã được Trưởng Bộ Môn (TBM) phê duyệt.",
      403,
    );
  }

  if (!internship.lecturerId) {
    throw new AppError(
      "Hồ sơ thực tập của bạn chưa được phân công Giảng viên Giám sát. Vui lòng chờ phân công GVGS trước khi nộp nhật ký.",
      400,
    );
  }

  // Khóa nhật ký khi tuần thực tập đã kết thúc
  if (report.reportType === "WEEKLY" && report.weekNumber) {
    const weekEnd = getWeekEndDate(internship.startDate, report.weekNumber, report.weekEndDate);
    if (isWeekEnded(weekEnd)) {
      throw new AppError(
        `Tuần thực tập số ${report.weekNumber} đã kết thúc. Nhật ký của tuần này đã bị khóa, không thể chỉnh sửa hoặc nộp lại.`,
        400,
      );
    }
  }

  if (!["DRAFT", "NEEDS_REVISION", "REJECTED"].includes(report.status)) {
    throw new AppError(
      `Không thể chỉnh sửa báo cáo khi đang ở trạng thái "${report.status}"`,
      400,
    );
  }

  if (title !== undefined) report.title = title.trim();
  if (content !== undefined) report.content = content;
  if (file !== undefined && file !== null) {
    report.file = file;
    report.fileCategory = file.category || fileCategory || report.fileCategory || null;
  } else if (fileCategory !== undefined) {
    report.fileCategory = fileCategory;
  }
  if (weekStartDate !== undefined) report.weekStartDate = weekStartDate ? new Date(weekStartDate) : null;
  if (weekEndDate !== undefined) report.weekEndDate = weekEndDate ? new Date(weekEndDate) : null;

  if (status === "DRAFT") {
    report.status = "DRAFT";
    report.student2Status = "NOT_APPLICABLE";
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
// 3. Sinh viên 2 xác nhận báo cáo (Đã loại bỏ trong luồng TTDN cá nhân)
// ====================
const confirmReportByStudent2 = async () => {
  throw new AppError("Chức năng xác nhận nhóm cho Thực tập Doanh nghiệp đã được loại bỏ", 400);
};

// ====================
// 4. Sinh viên xem danh sách báo cáo của mình
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
    if (internship.academicTermId) {
      const termDoc = await AcademicTerm.findById(
        internship.academicTermId._id || internship.academicTermId
      ).lean();
      if (termDoc?.internship?.reportCycle) {
        internship.reportCycle = termDoc.internship.reportCycle;
      }
    }

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
// 5. Giảng viên lấy danh sách báo cáo của sinh viên được phân công
// ====================
const getReportsForLecturer = async (
  userId,
  { page = 1, limit = 10, search = "", status = "", reportType = "", fileCategory = "" } = {},
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

  // GVHD can view reports belonging to assigned internships
  const query = {
    internshipId: { $in: internshipIds },
  };

  if (status && status.trim()) {
    const s = status.trim().toUpperCase();
    if (s === "SUBMITTED") {
      query.status = "SUBMITTED";
    } else if (s === "UNSUBMITTED" || s === "DRAFT") {
      query.status = { $in: ["DRAFT", "WAITING_STUDENT_2"] };
    } else if (s === "APPROVED" || s === "PROCESSED") {
      query.status = { $in: ["APPROVED", "REVIEWING"] };
    } else if (s === "REJECTED" || s === "NEEDS_REVISION") {
      query.status = { $in: ["REJECTED", "NEEDS_REVISION"] };
    } else {
      query.status = status.trim();
    }
  } else {
    query.status = {
      $in: [
        "SUBMITTED",
        "REVIEWING",
        "APPROVED",
        "REJECTED",
        "NEEDS_REVISION",
        "DRAFT",
        "WAITING_STUDENT_2",
      ],
    };
  }

  if (reportType && reportType.trim()) {
    query.reportType = reportType.trim();
  }

  const andConditions = [];

  // Lọc theo Phân loại tài liệu đính kèm (Metadata thực tế trong DB)
  if (fileCategory && fileCategory.trim()) {
    const cat = fileCategory.trim();
    if (cat === "Báo cáo thực tập") {
      andConditions.push({
        $or: [
          { reportType: "FINAL" },
          { "file.category": "Báo cáo thực tập" },
          { fileCategory: "Báo cáo thực tập" },
          { category: "Báo cáo thực tập" },
        ],
      });
    } else if (cat === "Báo cáo tuần") {
      andConditions.push({
        reportType: { $ne: "FINAL" },
        $or: [
          { "file.category": "Báo cáo tuần" },
          { fileCategory: "Báo cáo tuần" },
          { category: "Báo cáo tuần" },
          {
            reportType: "WEEKLY",
            $or: [
              { file: null },
              { "file.category": null },
              { "file.category": "Báo cáo tuần" },
              { "file.category": { $exists: false } },
              { "file.fileUrl": null },
            ],
          },
        ],
      });
    } else {
      andConditions.push({
        reportType: { $ne: "FINAL" },
        $or: [
          { "file.category": cat },
          { fileCategory: cat },
          { category: cat },
        ],
      });
    }
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

    andConditions.push({
      $or: [
        { studentId: { $in: matchingStudents.map((s) => s._id) } },
        { secondStudentId: { $in: matchingStudents.map((s) => s._id) } },
        { title: searchRegex },
      ],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
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

  const formattedReports = reports.map((rep) => {
    if (rep.reportType === "FINAL") {
      return {
        ...rep,
        fileCategory: rep.fileCategory || "Báo cáo thực tập",
        file: rep.file
          ? {
              ...rep.file,
              category: rep.file.category || "Báo cáo thực tập",
            }
          : rep.file,
      };
    }
    return rep;
  });

  return {
    lecturer,
    data: formattedReports,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// 6. TBM lấy danh sách tất cả báo cáo thực tập
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
// 7. Lấy chi tiết báo cáo theo ID kèm kiểm tra quyền truy cập
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

  if (report && report.reportType === "FINAL") {
    if (!report.fileCategory) report.fileCategory = "Báo cáo thực tập";
    if (report.file && !report.file.category) report.file.category = "Báo cáo thực tập";
  }

  return report;
};

// ====================
// 8. Giảng viên / TBM đánh giá báo cáo thực tập
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

  // Check if academic term is CLOSED
  const internship = report.internshipId;
  if (internship) {
    let termDoc = null;
    const termId = internship.academicTermId?._id || internship.academicTermId;
    if (termId) {
      termDoc = await AcademicTerm.findById(termId).lean();
    }
    if (!termDoc && internship.startDate) {
      termDoc = await AcademicTerm.findOne({
        startDate: { $lte: internship.startDate },
        endDate: { $gte: internship.startDate },
      }).lean();
    }
    if (termDoc && termDoc.status === "CLOSED") {
      throw new AppError("Học kỳ đã kết thúc (CLOSED). Không thể đánh giá báo cáo thực tập.", 400);
    }
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

  // Đồng bộ trạng thái đánh giá sang InternshipDocument tương ứng
  try {
    if (report.internshipId) {
      const targetInternshipId = report.internshipId._id || report.internshipId;
      if (report.reportType === "FINAL") {
        await InternshipDocument.updateMany(
          {
            internshipId: targetInternshipId,
            documentType: "SUBMISSION",
            category: { $regex: /báo cáo/i },
          },
          {
            $set: {
              status,
              lecturerComment: report.lecturerComment || null,
              reviewedAt: report.reviewedAt,
            },
          },
        );
      } else if (report.file?.fileUrl) {
        await InternshipDocument.updateMany(
          {
            internshipId: targetInternshipId,
            documentType: "SUBMISSION",
            fileUrl: report.file.fileUrl,
          },
          {
            $set: {
              status,
              lecturerComment: report.lecturerComment || null,
              reviewedAt: report.reviewedAt,
            },
          },
        );
      }
    }
  } catch (syncErr) {
    console.warn("[reviewReport] Sync InternshipDocument error:", syncErr.message);
  }

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

// ====================
// 9. Lấy toàn bộ báo cáo của một hồ sơ thực tập kèm kiểm tra quyền
// ====================
const getReportsByInternshipId = async (internshipId, requestingUser) => {
  const internship = await Internship.findById(internshipId)
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

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  // Permission check
  if (requestingUser) {
    if (requestingUser.role === "STUDENT") {
      const student = await Student.findOne({ userId: requestingUser.userId });
      const isSV1 = internship.studentId?._id?.toString() === student?._id?.toString();
      const isSV2 = internship.secondStudentId?._id?.toString() === student?._id?.toString();

      if (!student || (!isSV1 && !isSV2)) {
        throw new AppError("Bạn không có quyền xem nhật ký của sinh viên khác", 403);
      }
    } else if (requestingUser.role === "LECTURER") {
      const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
      const internLecturerId = internship.lecturerId?._id?.toString();

      if (!lecturer || internLecturerId !== lecturer._id.toString()) {
        throw new AppError(
          "Bạn không có quyền xem nhật ký của sinh viên do giảng viên khác hướng dẫn",
          403,
        );
      }
    } else if (!["TBM", "ADMIN"].includes(requestingUser.role)) {
      throw new AppError("Bạn không có quyền truy cập nhật ký thực tập này", 403);
    }
  }

  const query = { internshipId };
  if (requestingUser && requestingUser.role === "LECTURER") {
    query.status = {
      $in: [
        "SUBMITTED",
        "REVIEWING",
        "APPROVED",
        "REJECTED",
        "WAITING_STUDENT_2",
        "NEEDS_REVISION",
      ],
    };
  }

  const reports = await InternshipReport.find(query)
    .sort({ weekNumber: 1, createdAt: 1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .lean();

  return {
    internship,
    reports,
  };
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
  getReportsByInternshipId,
};

