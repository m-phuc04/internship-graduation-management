import ThesisProgress from "../models/ThesisProgress.js";
import Thesis from "../models/Thesis.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import AcademicTerm from "../models/AcademicTerm.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Student Creates Thesis Progress / Diary (Weekly)
// ====================
const createProgress = async ({
  userId,
  studentId: explicitStudentId,
  thesisId: explicitThesisId,
  progressType = "WEEKLY",
  weekNumber = null,
  weekStartDate = null,
  weekEndDate = null,
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
    thesis = await Thesis.findById(explicitThesisId).populate("studentId secondStudentId supervisorId academicTermId");
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
    }).populate("studentId secondStudentId supervisorId academicTermId");
  }

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận hợp lệ đang thực hiện", 404);
  }

  // 3. Verify Student belongs to this Thesis (SV1 or SV2)
  const isSV1 = thesis.studentId?._id?.toString() === student._id.toString();
  const isSV2 =
    thesis.secondStudentId &&
    thesis.secondStudentId._id?.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không thuộc đề tài khóa luận này", 403);
  }

  // 4. Verify Thesis Status allows progress reports
  if (["PENDING_SUPERVISOR_APPROVAL", "PENDING_TBM_APPROVAL", "REJECTED"].includes(thesis.status)) {
    throw new AppError(
      `Không thể nộp nhật ký tiến độ khi đề tài đang ở trạng thái "${thesis.status}"`,
      400,
    );
  }

  // 5. Validate Progress Type & Numbers
  let validWeek = null;
  let validMonth = null;

  if (progressType === "WEEKLY") {
    if (!weekNumber || Number(weekNumber) < 1 || Number(weekNumber) > 52) {
      throw new AppError("Số thứ tự tuần (weekNumber) là bắt buộc từ 1 đến 52", 400);
    }
    validWeek = Number(weekNumber);
  } else if (progressType === "MONTHLY") {
    if (!monthNumber || Number(monthNumber) < 1 || Number(monthNumber) > 12) {
      throw new AppError("Số thứ tự tháng (monthNumber) là bắt buộc từ 1 đến 12", 400);
    }
    validMonth = Number(monthNumber);
  }

  // 6. Validate Completion Percentage
  const numPercentage = Number(completionPercentage) || 0;
  if (numPercentage < 0 || numPercentage > 100) {
    throw new AppError("Tỷ lệ hoàn thành phải từ 0% đến 100%", 400);
  }

  // 7. Validate Title
  if (!title || !title.trim()) {
    throw new AppError("Tiêu đề nhật ký khóa luận là bắt buộc", 400);
  }

  // 8. Check Duplicate Progress
  const duplicateQuery = {
    thesisId: thesis._id,
    progressType,
  };
  if (progressType === "WEEKLY") {
    duplicateQuery.weekNumber = validWeek;
  } else {
    duplicateQuery.monthNumber = validMonth;
  }

  const existingProgress = await ThesisProgress.findOne(duplicateQuery);
  if (existingProgress) {
    throw new AppError(
      `Đã tồn tại nhật ký tiến độ ${
        progressType === "WEEKLY" ? `Tuần ${validWeek}` : `Tháng ${validMonth}`
      } cho đề tài này`,
      409,
    );
  }

  // 9. Determine Status & Student 2 workflow
  const hasStudent2 = !!thesis.secondStudentId;
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

  // 10. Create Progress Record
  const progress = await ThesisProgress.create({
    thesisId: thesis._id,
    studentId: student._id,
    secondStudentId: thesis.secondStudentId?._id || null,
    progressType,
    weekNumber: validWeek,
    weekStartDate: weekStartDate ? new Date(weekStartDate) : null,
    weekEndDate: weekEndDate ? new Date(weekEndDate) : null,
    monthNumber: validMonth,
    title: title.trim(),
    description: description ? description.trim() : null,
    completionPercentage: numPercentage,
    file: file || {},
    status: initialStatus,
    student2Status: initialStudent2Status,
    submittedAt: initialStatus === "SUBMITTED" || initialStatus === "WAITING_STUDENT_2" ? new Date() : null,
  });

  // Auto transition thesis to IN_PROGRESS if it was APPROVED or ASSIGNED_REVIEWERS
  if (["APPROVED", "ASSIGNED_REVIEWERS"].includes(thesis.status)) {
    thesis.status = "IN_PROGRESS";
    await thesis.save();
  }

  // 11. Send Notifications
  if (initialStatus === "WAITING_STUDENT_2") {
    // Notify the OTHER partner in group (not the writer)
    const isWriterSV1 = thesis.studentId?._id?.toString() === student._id.toString();
    const otherPartner = isWriterSV1 ? thesis.secondStudentId : thesis.studentId;

    if (otherPartner?.userId?._id) {
      await notificationService.createNotification({
        recipientId: otherPartner.userId._id,
        type: "THESIS_PROGRESS",
        title: "Yêu cầu xác nhận nhật ký khóa luận",
        message: `Thành viên nhóm (${student.userId?.fullName || student.studentCode}) đã gửi nhật ký khóa luận Tuần ${validWeek}: "${title.trim()}". Vui lòng kiểm tra và xác nhận.`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/student/thesis/progress",
      });
    }
  } else if (initialStatus === "SUBMITTED" && thesis.supervisorId) {
    // Notify Supervisor (only for 1 SV group upon initial submit)
    const supervisor = await Lecturer.findById(thesis.supervisorId).populate("userId");
    if (supervisor?.userId?._id) {
      await notificationService.createNotification({
        recipientId: supervisor.userId._id,
        type: "THESIS_PROGRESS",
        title: "Nhật ký tiến độ khóa luận mới",
        message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã nộp nhật ký khóa luận: "${title.trim()}".`,
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
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("thesisId");
};

// ====================
// 2. Student Updates / Edits Progress (Draft or Needs Revision)
// ====================
const updateProgress = async ({
  progressId,
  userId,
  title,
  description,
  completionPercentage,
  file,
  status = "SUBMITTED",
  weekStartDate,
  weekEndDate,
}) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const progress = await ThesisProgress.findById(progressId).populate({
    path: "thesisId",
    populate: [
      { path: "studentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "supervisorId", populate: { path: "userId", select: "fullName email phone" } },
    ],
  });

  if (!progress) {
    throw new AppError("Không tìm thấy nhật ký tiến độ", 404);
  }

  const thesis = progress.thesisId;
  const isSV1 = thesis.studentId?._id?.toString() === student._id.toString();
  const isSV2 =
    thesis.secondStudentId &&
    thesis.secondStudentId._id?.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không thuộc đề tài khóa luận này", 403);
  }

  if (!["DRAFT", "NEEDS_REVISION"].includes(progress.status)) {
    throw new AppError(
      `Không thể chỉnh sửa nhật ký đang ở trạng thái "${progress.status}"`,
      400,
    );
  }

  if (title && title.trim()) progress.title = title.trim();
  if (description !== undefined) progress.description = description ? description.trim() : null;
  if (completionPercentage !== undefined) {
    const num = Number(completionPercentage);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      progress.completionPercentage = num;
    }
  }
  if (file && typeof file === "object" && file.fileUrl) {
    progress.file = file;
  }
  if (weekStartDate) progress.weekStartDate = new Date(weekStartDate);
  if (weekEndDate) progress.weekEndDate = new Date(weekEndDate);

  const hasStudent2 = !!thesis.secondStudentId;

  if (status === "DRAFT") {
    progress.status = "DRAFT";
    progress.student2Status = hasStudent2 ? "PENDING" : "NOT_APPLICABLE";
  } else {
    if (hasStudent2) {
      progress.status = "WAITING_STUDENT_2";
      progress.student2Status = "PENDING";
      progress.submittedAt = new Date();

      // Notify the OTHER partner (not the writer)
      const isWriterSV1 = thesis.studentId?._id?.toString() === student._id.toString();
      const otherPartner = isWriterSV1 ? thesis.secondStudentId : thesis.studentId;

      if (otherPartner?.userId?._id) {
        await notificationService.createNotification({
          recipientId: otherPartner.userId._id,
          type: "THESIS_PROGRESS",
          title: "Yêu cầu xác nhận nhật ký khóa luận đã chỉnh sửa",
          message: `Thành viên nhóm (${student.userId?.fullName || student.studentCode}) đã cập nhật nhật ký Tuần ${progress.weekNumber}: "${progress.title}". Vui lòng kiểm tra và xác nhận.`,
          referenceId: progress._id,
          referenceModel: "ThesisProgress",
          link: "/student/thesis/progress",
        });
      }
    } else {
      progress.status = "SUBMITTED";
      progress.student2Status = "NOT_APPLICABLE";
      progress.submittedAt = new Date();

      // Notify Supervisor
      if (thesis.supervisorId?.userId?._id) {
        await notificationService.createNotification({
          recipientId: thesis.supervisorId.userId._id,
          type: "THESIS_PROGRESS",
          title: "Nhật ký khóa luận mới từ sinh viên",
          message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã cập nhật và nộp nhật ký: "${progress.title}".`,
          referenceId: progress._id,
          referenceModel: "ThesisProgress",
          link: "/lecturer/theses/progress",
        });
      }
    }
  }

  await progress.save();

  return await ThesisProgress.findById(progress._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("thesisId");
};

// ====================
// 3. Peer Student Confirms or Rejects Progress
// ====================
const confirmProgressByStudent2 = async (progressId, userId, { action, rejectionReason }) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const progress = await ThesisProgress.findById(progressId).populate({
    path: "thesisId",
    populate: [
      { path: "studentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "supervisorId", populate: { path: "userId", select: "fullName email phone" } },
    ],
  });

  if (!progress) {
    throw new AppError("Không tìm thấy nhật ký tiến độ khóa luận", 404);
  }

  const thesis = progress.thesisId;
  const isSV1 = thesis.studentId?._id?.toString() === student._id.toString();
  const isSV2 = thesis.secondStudentId && thesis.secondStudentId._id?.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không thuộc nhóm sinh viên thực hiện đề tài khóa luận này", 403);
  }

  // A student cannot confirm their own progress submission
  const isAuthor = (progress.studentId?._id || progress.studentId)?.toString() === student._id.toString();
  if (isAuthor) {
    throw new AppError("Bạn là người viết nhật ký này, chỉ thành viên còn lại trong nhóm mới có quyền kiểm tra và xác nhận", 403);
  }

  if (progress.status !== "WAITING_STUDENT_2") {
    throw new AppError(
      `Nhật ký đang ở trạng thái "${progress.status}", không thể thực hiện xác nhận`,
      400,
    );
  }

  // The partner to notify is the author of this progress record
  const authorStudent = isSV1 ? thesis.secondStudentId : thesis.studentId;

  if (action === "CONFIRM") {
    progress.student2Status = "CONFIRMED";
    progress.student2ConfirmedAt = new Date();
    progress.student2RejectedReason = null;
    progress.status = "SUBMITTED";
    progress.submittedAt = new Date();

    // 1. Notify Author
    if (authorStudent?.userId?._id) {
      await notificationService.createNotification({
        recipientId: authorStudent.userId._id,
        type: "THESIS_PROGRESS",
        title: "Thành viên nhóm đã xác nhận nhật ký khóa luận",
        message: `Thành viên nhóm (${student.userId?.fullName || student.studentCode}) đã đồng ý và xác nhận nhật ký Tuần ${progress.weekNumber}: "${progress.title}". Nhật ký đã được chuyển tới GVHD.`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/student/thesis/progress",
      });
    }

    // 2. Notify Supervisor
    if (thesis.supervisorId?.userId?._id) {
      await notificationService.createNotification({
        recipientId: thesis.supervisorId.userId._id,
        type: "THESIS_PROGRESS",
        title: "Nhật ký khóa luận mới từ nhóm sinh viên",
        message: `Nhóm sinh viên (${thesis.studentId?.userId?.fullName || ""} + ${thesis.secondStudentId?.userId?.fullName || ""}) đã nộp nhật ký Tuần ${progress.weekNumber}: "${progress.title}".`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/lecturer/theses/progress",
      });
    }
  } else if (action === "REJECT") {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new AppError("Vui lòng cung cấp lý do yêu cầu chỉnh sửa", 400);
    }

    progress.student2Status = "REJECTED";
    progress.student2RejectedReason = rejectionReason.trim();
    progress.status = "NEEDS_REVISION";

    // Notify Author
    if (authorStudent?.userId?._id) {
      await notificationService.createNotification({
        recipientId: authorStudent.userId._id,
        type: "THESIS_PROGRESS",
        title: "Thành viên nhóm yêu cầu chỉnh sửa nhật ký khóa luận",
        message: `Thành viên nhóm (${student.userId?.fullName || student.studentCode}) đã yêu cầu chỉnh sửa nhật ký Tuần ${progress.weekNumber}. Lý do: "${rejectionReason.trim()}". Vui lòng chỉnh sửa và gửi lại.`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/student/thesis/progress",
      });
    }
  } else {
    throw new AppError("Hành động không hợp lệ (CONFIRM hoặc REJECT)", 400);
  }

  await progress.save();

  return await ThesisProgress.findById(progress._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("thesisId");
};

const calculateWeeks = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return [];
  }

  const weeks = [];
  let currentStart = new Date(start);
  let weekNum = 1;

  while (currentStart < end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6);

    const actualEnd = currentEnd > end ? new Date(end) : currentEnd;

    weeks.push({
      weekNumber: weekNum,
      startDate: new Date(currentStart).toISOString(),
      endDate: actualEnd.toISOString(),
      label: `Tuần ${weekNum}`,
    });

    const nextStart = new Date(currentStart);
    nextStart.setDate(nextStart.getDate() + 7);
    currentStart = nextStart;
    weekNum++;
  }

  return weeks;
};

// ====================
// 4. Student Gets Own Thesis & Progress List
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
    })
    .populate("academicTermId");

  if (!thesis) {
    return {
      student,
      thesis: null,
      weeks: [],
      progressList: [],
      stats: { total: 0, approved: 0, pending: 0, waitingStudent2: 0, needsRevision: 0, totalWeeks: 0, avgPercentage: 0 },
    };
  }

  // Ensure startDate and endDate are computed:
  // - If GVHD updated explicitly -> Use thesis.startDate and thesis.endDate
  // - Otherwise default:
  //   + Start Date: Date when GVHD approved/accepted the thesis
  //   + End Date: Date configured by TBM for thesis reporting/defense in AcademicTerm
  const term = thesis.academicTermId;
  const computedStartDate =
    thesis.startDate ||
    thesis.approvedAt ||
    thesis.acceptedAt ||
    thesis.assignedAt ||
    (term?.thesis?.assignmentStart ? term.thesis.assignmentStart : null) ||
    (term?.startDate ? term.startDate : null) ||
    thesis.createdAt ||
    new Date();

  const computedEndDate =
    thesis.endDate ||
    (term?.thesis?.defenseEnd ? term.thesis.defenseEnd : null) ||
    (term?.thesis?.defenseStart ? term.thesis.defenseStart : null) ||
    (term?.endDate ? term.endDate : null) ||
    (() => {
      const d = new Date(computedStartDate);
      d.setDate(d.getDate() + 70); // 10 weeks fallback
      return d;
    })();

  const thesisObj = thesis.toObject ? thesis.toObject() : { ...thesis };
  thesisObj.startDate = computedStartDate;
  thesisObj.endDate = computedEndDate;

  const progressList = await ThesisProgress.find({ thesisId: thesis._id })
    .sort({ weekNumber: 1, submittedAt: -1, createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email" },
    });

  // Calculate weeks dynamically: Unlock strictly 1 week at a time (previous completed weeks + 1 next active week)
  const rawWeeks = calculateWeeks(thesisObj.startDate, thesisObj.endDate);
  
  let highestReportedWeek = 0;
  progressList.forEach((p) => {
    if (p.progressType === "WEEKLY" && p.weekNumber && p.weekNumber > highestReportedWeek) {
      highestReportedWeek = p.weekNumber;
    }
  });

  // Only unlock up to the single next week to be completed
  const maxUnlockedWeek = Math.max(1, highestReportedWeek + 1);

  const allWeeks = rawWeeks.map((w) => {
    const foundProgress = progressList.find(
      (p) => p.progressType === "WEEKLY" && p.weekNumber === w.weekNumber,
    );
    const isUnlocked = w.weekNumber <= maxUnlockedWeek;
    return {
      ...w,
      isUnlocked,
      progress: foundProgress || null,
    };
  });

  // Only display unlocked weeks (at most 1 unsubmitted week)
  const weeks = allWeeks.filter((w) => w.isUnlocked);

  const total = progressList.length;
  const approved = progressList.filter((p) => p.status === "APPROVED").length;
  const pending = progressList.filter((p) =>
    ["SUBMITTED", "REVIEWING"].includes(p.status),
  ).length;
  const waitingStudent2 = progressList.filter((p) => p.status === "WAITING_STUDENT_2").length;
  const needsRevision = progressList.filter((p) => p.status === "NEEDS_REVISION").length;

  const latestReport = progressList[progressList.length - 1];
  const avgPercentage = latestReport ? latestReport.completionPercentage : 0;

  return {
    student,
    thesis: thesisObj,
    weeks,
    allWeeks,
    stats: {
      total,
      approved,
      pending,
      waitingStudent2,
      needsRevision,
      totalWeeks: rawWeeks.length,
      unlockedWeeks: weeks.length,
      currentWeekNumber: weeks[weeks.length - 1]?.weekNumber || 1,
      avgPercentage,
    },
  };
};


// ====================
// 5. Student Submits a Draft Progress
// ====================
const submitDraftProgress = async (progressId, userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const progress = await ThesisProgress.findById(progressId).populate({
    path: "thesisId",
    populate: [
      { path: "studentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } },
      { path: "supervisorId", populate: { path: "userId", select: "fullName email phone" } },
    ],
  });

  if (!progress) {
    throw new AppError("Không tìm thấy nhật ký tiến độ", 404);
  }

  const thesis = progress.thesisId;
  const isSV1 = thesis.studentId?._id?.toString() === student._id.toString();
  const isSV2 =
    thesis.secondStudentId &&
    thesis.secondStudentId._id?.toString() === student._id.toString();

  if (!isSV1 && !isSV2) {
    throw new AppError("Bạn không có quyền nộp nhật ký tiến độ này", 403);
  }

  if (progress.status !== "DRAFT") {
    throw new AppError(`Nhật ký đang ở trạng thái "${progress.status}", không thể nộp lại`, 400);
  }

  const hasStudent2 = !!thesis.secondStudentId;
  if (hasStudent2) {
    progress.status = "WAITING_STUDENT_2";
    progress.student2Status = "PENDING";
    progress.submittedAt = new Date();

    // Notify SV2
    if (thesis.secondStudentId?.userId?._id) {
      await notificationService.createNotification({
        recipientId: thesis.secondStudentId.userId._id,
        type: "THESIS_PROGRESS",
        title: "Yêu cầu xác nhận nhật ký khóa luận",
        message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã gửi nhật ký Tuần ${progress.weekNumber}. Vui lòng kiểm tra và xác nhận.`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/student/thesis/progress",
      });
    }
  } else {
    progress.status = "SUBMITTED";
    progress.student2Status = "NOT_APPLICABLE";
    progress.submittedAt = new Date();

    // Notify Supervisor
    if (thesis.supervisorId?.userId?._id) {
      await notificationService.createNotification({
        recipientId: thesis.supervisorId.userId._id,
        type: "THESIS_PROGRESS",
        title: "Nhật ký khóa luận mới từ sinh viên",
        message: `Sinh viên ${student.userId?.fullName || student.studentCode} đã nộp nhật ký Tuần ${progress.weekNumber}: "${progress.title}".`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/lecturer/theses/progress",
      });
    }
  }

  await progress.save();
  return progress;
};

// ====================
// 6. Lecturer: Get Supervised Theses & Progress Reports (Only Confirmed / Submitted)
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
    .populate("academicTermId")
    .lean();

  const results = await Promise.all(
    theses.map(async (t) => {
      // Supervisor can ONLY see reports that are SUBMITTED, REVIEWING, APPROVED, or REJECTED
      const progressReports = await ThesisProgress.find({
        thesisId: t._id,
        status: { $in: ["SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"] },
      })
        .sort({ weekNumber: 1, submittedAt: -1, createdAt: -1 })
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "fullName email" },
        })
        .populate({
          path: "secondStudentId",
          populate: { path: "userId", select: "fullName email" },
        })
        .lean();

      // Ensure start & end dates automatically derived:
      // Start: GVHD approval date / accepted date
      // End: TBM academic term defense / reporting date
      const term = t.academicTermId;
      const startDate =
        t.startDate ||
        t.approvedAt ||
        t.acceptedAt ||
        t.assignedAt ||
        (term?.thesis?.assignmentStart ? term.thesis.assignmentStart : null) ||
        (term?.startDate ? term.startDate : null) ||
        t.createdAt ||
        new Date();

      const endDate =
        t.endDate ||
        (term?.thesis?.defenseEnd ? term.thesis.defenseEnd : null) ||
        (term?.thesis?.defenseStart ? term.thesis.defenseStart : null) ||
        (term?.endDate ? term.endDate : null) ||
        (() => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + 70);
          return d;
        })();

      return {
        ...t,
        startDate,
        endDate,
        progressReports,
        stats: {
          total: progressReports.length,
          pending: progressReports.filter((p) =>
            ["SUBMITTED", "REVIEWING"].includes(p.status),
          ).length,
          approved: progressReports.filter((p) => p.status === "APPROVED").length,
          rejected: progressReports.filter((p) => p.status === "REJECTED").length,
          latestCompletion: progressReports[progressReports.length - 1]?.completionPercentage || 0,
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
// 7. Lecturer Reviews / Grades / Approves / Rejects Progress
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
    throw new AppError("Không tìm thấy nhật ký tiến độ khóa luận", 404);
  }

  const thesis = progress.thesisId;
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài tương ứng với nhật ký này", 404);
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
    throw new AppError("Vui lòng cung cấp nhận xét/lý do khi yêu cầu chỉnh sửa nhật ký", 400);
  }

  // Validate Score if provided
  if (lecturerScore !== null && lecturerScore !== undefined && lecturerScore !== "") {
    const numScore = Number(lecturerScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      throw new AppError("Điểm đánh giá phải từ 0 đến 10", 400);
    }
    progress.lecturerScore = numScore;
  }

  progress.status = status;
  progress.lecturerComment = lecturerComment ? lecturerComment.trim() : null;
  progress.reviewedAt = new Date();
  await progress.save();

  // Notify Students (SV1 and SV2)
  const studentsToNotify = [progress.studentId, progress.secondStudentId].filter(Boolean);
  for (const sId of studentsToNotify) {
    const s = await Student.findById(sId).populate("userId");
    if (s?.userId?._id) {
      await notificationService.createNotification({
        recipientId: s.userId._id,
        type: "THESIS_PROGRESS",
        title: status === "APPROVED" ? "Nhật ký khóa luận đã được phê duyệt" : status === "REJECTED" ? "Nhật ký khóa luận cần chỉnh sửa" : "Nhật ký khóa luận đang được đánh giá",
        message: status === "APPROVED"
          ? `Nhật ký Tuần ${progress.weekNumber} ("${progress.title}") đã được GVHD phê duyệt: ${progress.lecturerScore !== null ? `${progress.lecturerScore}/10` : "Đạt"}.`
          : status === "REJECTED"
          ? `Nhật ký Tuần ${progress.weekNumber} ("${progress.title}") bị GVHD từ chối: ${progress.lecturerComment || "Chưa đạt yêu cầu"}.`
          : `Nhật ký Tuần ${progress.weekNumber} ("${progress.title}") đang được GVHD xem xét.`,
        referenceId: progress._id,
        referenceModel: "ThesisProgress",
        link: "/student/thesis/progress",
      });
    }
  }

  return await ThesisProgress.findById(progress._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate("thesisId");
};

// ====================
// 8. Get Progress By Thesis ID (Detail lookup)
// ====================
const getProgressByThesis = async (thesisId, requestingUser) => {
  const query = { thesisId };
  if (requestingUser?.role === "LECTURER") {
    query.status = { $in: ["SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"] };
  }

  const progress = await ThesisProgress.find(query)
    .populate("thesisId")
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .sort({ weekNumber: 1, submittedAt: -1, createdAt: -1 });

  return progress;
};

// ====================
// 9. Update Thesis Timeline (Start & End Date)
// ====================
const updateThesisTimeline = async (thesisId, { startDate, endDate }) => {
  if (!startDate || !endDate) {
    throw new AppError("Ngày bắt đầu và ngày kết thúc là bắt buộc", 400);
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    throw new AppError("Ngày kết thúc phải sau ngày bắt đầu", 400);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  thesis.startDate = start;
  thesis.endDate = end;
  await thesis.save();

  return thesis;
};

export default {
  createProgress,
  updateProgress,
  confirmProgressByStudent2,
  getMyThesisProgress,
  submitDraftProgress,
  getSupervisedThesesProgress,
  reviewProgress,
  getProgressByThesis,
  updateThesisTimeline,
};

