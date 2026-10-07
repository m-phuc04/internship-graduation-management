import Thesis from "../models/Thesis.js";
import ThesisTopic from "../models/ThesisTopic.js";
import ThesisEvaluationCriteria from "../models/ThesisEvaluationCriteria.js";
import ThesisGradingPeriod from "../models/ThesisGradingPeriod.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Permission from "../models/Permission.js";
import AcademicTerm from "../models/AcademicTerm.js";
import Council from "../models/Council.js";
import academicTermService from "./academicTermService.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

// ====================
// Active Thesis Statuses
// ====================
export const ACTIVE_THESIS_STATUSES = [
  "WAITING_FOR_STUDENT2_CONFIRMATION",
  "WAITING_FOR_SUPERVISOR_REQUEST",
  "PENDING_SUPERVISOR_APPROVAL",
  "PENDING_TBM_APPROVAL",
  "PENDING_SUPERVISOR_ACCEPTANCE",
  "APPROVED",
  "ASSIGNED_REVIEWERS",
  "IN_PROGRESS",
  "SUBMITTED",
  "GRADED",
  "COMPLETED",
];

// ====================
// Validate KLTN Registration Window & Lock Status
// ====================
export const validateThesisRegistrationWindow = (activeTerm, checkDate = new Date()) => {
  if (!activeTerm) {
    throw new AppError("Hiện tại không có học kỳ nào đang mở cổng đăng ký KLTN.", 400);
  }
  if (activeTerm.status === "CLOSED") {
    throw new AppError(`Học kỳ ${activeTerm.code || activeTerm.name} đã kết thúc/đóng. Không thể đăng ký đề tài mới.`, 400);
  }
  const thesisCfg = activeTerm.thesis || {};

  if (thesisCfg.isRegistrationLocked) {
    throw new AppError("Cổng đăng ký KLTN hiện đang bị khóa bởi Trưởng Bộ Môn.", 400);
  }

  const now = checkDate instanceof Date ? checkDate : new Date(checkDate);

  if (thesisCfg.registrationStart) {
    const start = new Date(thesisCfg.registrationStart);
    if (now < start) {
      throw new AppError("Chưa đến thời gian mở cổng đăng ký Khóa luận Tốt nghiệp cho học kỳ này.", 400);
    }
  }

  if (thesisCfg.registrationEnd) {
    let end = new Date(thesisCfg.registrationEnd);
    if (
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getSeconds() === 0 &&
      end.getMilliseconds() === 0
    ) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    if (now > end) {
      throw new AppError("Đã hết thời gian đăng ký Khóa luận Tốt nghiệp cho học kỳ này.", 400);
    }
  }
};

// ====================
// Student Registers Thesis (1 SV or 2 SV)
// ====================
const createThesis = async ({
  userId,
  studentId,
  studentCount = 1,
  secondStudentId = null,
  secondStudentCode = null,
  thesisTitle,
  supervisorId,
  description = null,
  objectives = null,
  expectedResults = null,
  academicTermId = null,
}) => {
  // 1. Identify SV1
  let student1 = null;
  if (userId) {
    student1 = await Student.findOne({ userId }).populate("userId");
  } else if (studentId) {
    student1 = await Student.findById(studentId).populate("userId");
  }

  if (!student1) {
    throw new AppError("Không tìm thấy thông tin sinh viên đăng ký", 404);
  }

  // 2. Identify Academic Term (from payload or active term)
  let activeTerm = null;
  if (academicTermId) {
    activeTerm = await AcademicTerm.findById(academicTermId);
  }
  if (!activeTerm) {
    activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());
  }

  // Validate Registration Window & Lock Status
  validateThesisRegistrationWindow(activeTerm);

  // 3. Check SV1 Active Thesis Constraint in active term
  const sv1ActiveThesis = await Thesis.findOne({
    academicTermId: activeTerm._id,
    $or: [{ studentId: student1._id }, { secondStudentId: student1._id }],
    status: { $in: ACTIVE_THESIS_STATUSES },
  });

  if (sv1ActiveThesis) {
    throw new AppError(
      `Sinh viên ${student1.userId?.fullName || student1.studentCode} đã tham gia một đề tài khóa luận đang hoạt động ("${sv1ActiveThesis.thesisTitle}") trong học kỳ ${activeTerm.code}`,
      409,
    );
  }

  // 4. Handle 2-Student Group Registration
  let student2 = null;
  const isTwoStudents = Number(studentCount) === 2;

  if (isTwoStudents) {
    if (secondStudentId) {
      student2 = await Student.findById(secondStudentId).populate("userId");
    } else if (secondStudentCode) {
      student2 = await Student.findOne({
        studentCode: secondStudentCode.trim().toUpperCase(),
      }).populate("userId");
    }

    if (!student2) {
      throw new AppError("Không tìm thấy sinh viên thứ hai với thông tin đã nhập", 404);
    }

    // Check SV2 != SV1
    if (student2._id.toString() === student1._id.toString()) {
      throw new AppError("Sinh viên 2 không được trùng với Sinh viên 1", 400);
    }

    // Check SV2 Active Thesis Constraint in active term
    const sv2ActiveThesis = await Thesis.findOne({
      academicTermId: activeTerm._id,
      $or: [{ studentId: student2._id }, { secondStudentId: student2._id }],
      status: { $in: ACTIVE_THESIS_STATUSES },
    });

    if (sv2ActiveThesis) {
      throw new AppError(
        `Sinh viên thứ hai (${student2.userId?.fullName || student2.studentCode}) đã tham gia một đề tài khóa luận khác ("${sv2ActiveThesis.thesisTitle}") trong học kỳ ${activeTerm.code}`,
        409,
      );
    }
  }

  // 5. Validate Thesis Title
  if (!thesisTitle || !thesisTitle.trim()) {
    throw new AppError("Tên đề tài khóa luận là bắt buộc", 400);
  }

  // 6. Validate Supervisor (Lecturer)
  if (!supervisorId) {
    throw new AppError("Giảng viên hướng dẫn là bắt buộc", 400);
  }

  const supervisor = await Lecturer.findById(supervisorId).populate("userId");
  if (!supervisor) {
    throw new AppError("Không tìm thấy giảng viên hướng dẫn được chọn", 404);
  }

  if (supervisor.isAvailable === false) {
    throw new AppError("Giảng viên hiện không mở đợt nhận hướng dẫn khóa luận", 400);
  }

  // Check Lecturer Max Capacity in active term
  const activeSupervisedTheses = await Thesis.find({
    academicTermId: activeTerm._id,
    supervisorId: supervisor._id,
    status: {
      $in: [
        "PENDING_SUPERVISOR_APPROVAL",
        "PENDING_TBM_APPROVAL",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "ASSIGNED_REVIEWERS",
        "IN_PROGRESS",
      ],
    },
  }).select("secondStudentId");

  let currentSupervisedStudents = 0;
  activeSupervisedTheses.forEach((t) => {
    currentSupervisedStudents += t.secondStudentId ? 2 : 1;
  });

  const newStudentsCount = isTwoStudents ? 2 : 1;
  const maxCapacity = supervisor.maxSupervisedStudents ?? supervisor.maxStudents ?? 5;

  if (currentSupervisedStudents + newStudentsCount > maxCapacity) {
    throw new AppError(
      "Giảng viên đã đạt số lượng sinh viên hướng dẫn tối đa trong học kỳ này.",
      400,
    );
  }

  // 7. Create Thesis Record (bound to activeTerm)
  const isPendingSv2 = isTwoStudents && student2;
  const initialStatus = isPendingSv2 ? "WAITING_FOR_STUDENT2_CONFIRMATION" : "PENDING_SUPERVISOR_APPROVAL";
  const student2Status = isPendingSv2 ? "PENDING" : null;

  const thesis = await Thesis.create({
    academicTermId: activeTerm._id,
    studentId: student1._id,
    secondStudentId: isTwoStudents ? student2._id : null,
    studentCount: isTwoStudents ? 2 : 1,
    student2Status,
    thesisTitle: thesisTitle.trim(),
    supervisorId: supervisor._id,
    description: description ? description.trim() : null,
    objectives: objectives ? objectives.trim() : null,
    status: initialStatus,
    submittedAt: isPendingSv2 ? null : new Date(),
    startDate: activeTerm.startDate || null,
    endDate: activeTerm.endDate || null,
  });

  // 8. Update student flags
  student1.thesisRegistered = true;
  await student1.save();

  if (student2) {
    student2.thesisRegistered = true;
    await student2.save();
  }

  const sv1Name = student1.userId?.fullName || student1.studentCode;
  const sv1Code = student1.studentCode;

  if (isPendingSv2) {
    // Send Notification to SV2 ONLY
    if (student2.userId?._id) {
      await notificationService.createNotification({
        recipientId: student2.userId._id,
        type: "THESIS",
        title: "Lời mời tham gia nhóm Khóa luận tốt nghiệp",
        message: `Sinh viên ${sv1Name} (${sv1Code}) đã mời bạn tham gia nhóm làm đề tài Khóa luận: "${thesisTitle.trim()}". Vui lòng vào hệ thống để xác nhận hoặc từ chối.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  } else {
    // Trigger Notification to Supervisor ONLY for 1-student registration
    const messageContent = `Sinh viên ${sv1Name} (${sv1Code}) vừa nộp đề tài: "${thesisTitle.trim()}". Vui lòng xem và duyệt đề tài.`;
    const supervisorRecipientId = supervisor.userId?._id || supervisor.userId;
    if (supervisorRecipientId) {
      await notificationService.createNotification({
        recipientId: supervisorRecipientId,
        type: "THESIS",
        title: "Đề tài khóa luận mới cần duyệt",
        message: messageContent,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/lecturer/theses",
      });
    }
  }

  // Return populated thesis
  return await Thesis.findById(thesis._id)
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
};

// ====================
// Student Lookup by MSSV (for Group Partner Selection)
// ====================
const lookupStudentByCode = async (studentCode, requestingUserId = null) => {
  if (!studentCode || !studentCode.trim()) {
    throw new AppError("Vui lòng cung cấp mã số sinh viên (MSSV)", 400);
  }

  const student = await Student.findOne({
    studentCode: studentCode.trim().toUpperCase(),
  }).populate("userId", "fullName email phone");

  if (!student) {
    throw new AppError(`Không tìm thấy sinh viên với MSSV "${studentCode}"`, 404);
  }

  let isSelf = false;
  if (requestingUserId && student.userId?._id.toString() === requestingUserId.toString()) {
    isSelf = true;
  }

  // Check if student is already in an active thesis
  const activeThesis = await Thesis.findOne({
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    status: { $in: ACTIVE_THESIS_STATUSES },
  }).select("thesisTitle status");

  return {
    student: {
      _id: student._id,
      studentCode: student.studentCode,
      fullName: student.userId?.fullName,
      email: student.userId?.email,
      phone: student.userId?.phone,
      className: student.className,
      faculty: student.faculty || "Khoa Công nghệ Thông tin",
      major: student.major || "Công nghệ Thông tin",
      academicYear: student.academicYear,
      gpa: student.gpa,
      creditsAccumulated: student.creditsAccumulated,
      thesisEligible: student.thesisEligible,
    },
    isSelf,
    isInActiveThesis: !!activeThesis,
    activeThesisTitle: activeThesis?.thesisTitle || null,
    activeThesisStatus: activeThesis?.status || null,
  };
};

// ====================
// Get Available Supervisors (Lecturers with Capacity)
// ====================
const getAvailableSupervisors = async () => {
  const lecturers = await Lecturer.find({ isAvailable: true, isActive: { $ne: false } })
    .populate({
      path: "userId",
      select: "fullName email phone isActive",
    })
    .sort({ lecturerCode: 1 })
    .lean();

  const activeLecturers = lecturers.filter(
    (lec) => lec.userId && lec.userId.isActive !== false && lec.isActive !== false,
  );

  const results = await Promise.all(
    activeLecturers.map(async (lec) => {
      const activeTheses = await Thesis.find({
        supervisorId: lec._id,
        status: {
          $in: [
            "PENDING_SUPERVISOR_APPROVAL",
            "PENDING_TBM_APPROVAL",
            "PENDING_SUPERVISOR_ACCEPTANCE",
            "APPROVED",
            "ASSIGNED_REVIEWERS",
            "IN_PROGRESS",
          ],
        },
      }).select("secondStudentId");

      let currentSupervisedStudents = 0;
      activeTheses.forEach((t) => {
        currentSupervisedStudents += t.secondStudentId ? 2 : 1;
      });

      const maxSupervisedStudents = lec.maxSupervisedStudents ?? lec.maxStudents ?? 5;
      const remainingQuota = Math.max(0, maxSupervisedStudents - currentSupervisedStudents);

      return {
        _id: lec._id,
        lecturerCode: lec.lecturerCode,
        fullName: lec.userId?.fullName || "Giảng viên",
        academicTitle: lec.academicTitle || "ThS.",
        specialization: lec.specialization || "Công nghệ Thông tin",
        email: lec.userId?.email,
        phone: lec.userId?.phone,
        activeCount: activeTheses.length,
        currentSupervisedStudents,
        maxSupervisedStudents,
        maxStudents: maxSupervisedStudents,
        remainingQuota,
        isAvailable: currentSupervisedStudents < maxSupervisedStudents,
        displayText: `${lec.academicTitle || "ThS."} ${lec.userId?.fullName} — ${lec.specialization || "CNTT"} (Đang nhận: ${currentSupervisedStudents}/${maxSupervisedStudents} SV)`,
      };
    }),
  );

  return results;
};

// ====================
// Get Current Student's Thesis Profile (AcademicTerm-aware)
// ====================
const getMyThesis = async (userId, academicTermId = null) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const query = {
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const thesis = await Thesis.findOne(query)
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
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "scores.councilLecturerScores.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "councilId",
      populate: {
        path: "lecturers.lecturerId",
        populate: { path: "userId", select: "fullName email phone avatar" },
      },
    })
    .populate("academicTermId");

  const canRegisterNew =
    !thesis || ["REJECTED"].includes(thesis.status);

  return {
    student,
    thesis,
    canRegisterNew,
  };
};

// ====================
// Get Thesis By Student ID
// ====================
const getThesisByStudent = async (studentId) => {
  const thesis = await Thesis.findOne({
    $or: [{ studentId }, { secondStudentId: studentId }],
  })
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
    .populate("reviewer1Id")
    .populate("reviewer2Id")
    .populate("academicTermId");

  return thesis;
};

// ====================
// Get Thesis By Thesis ID (Detail view)
// ====================
const getThesisById = async (id) => {
  const thesis = await Thesis.findById(id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone avatar" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone avatar" },
    })
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email phone avatar" },
    })
    .populate({
      path: "reviewer1Id",
      populate: { path: "userId", select: "fullName email phone avatar" },
    })
    .populate({
      path: "reviewer2Id",
      populate: { path: "userId", select: "fullName email phone avatar" },
    })
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone avatar" },
    })
    .populate("academicTermId")
    .populate("councilId");

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  return thesis;
};

// ==========================================
// PHASE 9: TBM THESIS MANAGEMENT
// ==========================================

// ====================
// 1. TBM Gets All Theses with Multi-Search & Filter (AcademicTerm-aware)
// ====================
const getAllThesesForTbm = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  academicTermId = "",
}) => {
  const query = {};

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  if (status && status !== "ALL") {
    query.status = status;
  } else {
    query.status = { $ne: "REJECTED" };
  }

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");

    // Match students by studentCode or fullName
    const matchingStudents = await Student.find({
      $or: [{ studentCode: regex }],
    }).select("_id");

    const matchingUsers = await Student.find()
      .populate({
        path: "userId",
        match: { fullName: regex },
        select: "_id",
      })
      .then((docs) => docs.filter((d) => d.userId).map((d) => d._id));

    const allStudentIds = [
      ...matchingStudents.map((s) => s._id),
      ...matchingUsers,
    ];

    // Match lecturers by code or name
    const matchingLecs = await Lecturer.find({
      $or: [{ lecturerCode: regex }],
    }).select("_id");

    const matchingLecUsers = await Lecturer.find()
      .populate({
        path: "userId",
        match: { fullName: regex },
        select: "_id",
      })
      .then((docs) => docs.filter((d) => d.userId).map((d) => d._id));

    const allLecturerIds = [
      ...matchingLecs.map((l) => l._id),
      ...matchingLecUsers,
    ];

    const searchOrConditions = [
      { thesisTitle: regex },
      { studentId: { $in: allStudentIds } },
      { secondStudentId: { $in: allStudentIds } },
      { supervisorId: { $in: allLecturerIds } },
      { reviewer1Id: { $in: allLecturerIds } },
      { reviewer2Id: { $in: allLecturerIds } },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchOrConditions }];
      delete query.$or;
    } else {
      query.$or = searchOrConditions;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const statQuery = academicTermId && academicTermId !== "ALL" ? { academicTermId } : {};

  const [theses, total, counts] = await Promise.all([
    Thesis.find(query)
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
      .populate({
        path: "reviewers.lecturerId",
        populate: { path: "userId", select: "fullName email phone" },
      })
      .populate("assignedBy", "fullName email")
      .populate("academicTermId")
      .populate("councilId")
      .lean(),

    Thesis.countDocuments(query),

    Promise.all([
      Thesis.countDocuments(statQuery),
      Thesis.countDocuments({ ...statQuery, status: "PENDING_TBM_APPROVAL" }),
      Thesis.countDocuments({ ...statQuery, status: "APPROVED" }),
      Thesis.countDocuments({ ...statQuery, status: "ASSIGNED_REVIEWERS" }),
      Thesis.countDocuments({ ...statQuery, status: "IN_PROGRESS" }),
      Thesis.countDocuments({ ...statQuery, status: "SUBMITTED" }),
      Thesis.countDocuments({ ...statQuery, status: "GRADED" }),
      Thesis.countDocuments({ ...statQuery, status: "REJECTED" }),
      Thesis.countDocuments({ ...statQuery, status: "COMPLETED" }),
    ]),
  ]);

  return {
    data: theses,
    stats: {
      total: counts[0],
      pendingCount: counts[1],
      approvedCount: counts[2],
      assignedReviewersCount: counts[3],
      inProgressCount: counts[4],
      submittedCount: counts[5],
      gradedCount: counts[6],
      rejectedCount: counts[7],
      completedCount: counts[8],
    },
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// 2. TBM Approves Thesis
// ====================
const approveThesis = async (thesisId, { supervisorId = null, tbmUserId }) => {
  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành và không thể phê duyệt lại.", 400);
  }

  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài đã bị từ chối, không thể phê duyệt.", 400);
  }

  // If TBM changes supervisor on approval
  if (supervisorId) {
    const supervisor = await Lecturer.findById(supervisorId);
    if (!supervisor) {
      throw new AppError("Không tìm thấy giảng viên hướng dẫn", 404);
    }
    thesis.supervisorId = supervisor._id;
  }

  thesis.status = "APPROVED";
  thesis.approvedAt = new Date();
  thesis.assignedBy = tbmUserId || null;
  thesis.markModified('scores');
  await thesis.save();

  const populated = await Thesis.findById(thesis._id)
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
    });

  // Notify Students
  if (populated.studentId?.userId?._id) {
    await notificationService.createNotification({
      recipientId: populated.studentId.userId._id,
      type: "THESIS",
      title: "Đề tài Khóa luận đã được phê duyệt",
      message: `Đề tài "${populated.thesisTitle}" của bạn đã được Trưởng Bộ Môn phê duyệt.`,
      referenceId: populated._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }
  if (populated.secondStudentId?.userId?._id) {
    await notificationService.createNotification({
      recipientId: populated.secondStudentId.userId._id,
      type: "THESIS",
      title: "Đề tài Khóa luận đã được phê duyệt",
      message: `Đề tài "${populated.thesisTitle}" của nhóm bạn đã được Trưởng Bộ Môn phê duyệt.`,
      referenceId: populated._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  return populated;
};

// ====================
// 3. TBM Rejects / Cancels Thesis
// ====================
const rejectThesis = async (thesisId, { reason = null, tbmUserId = null }) => {
  const thesis = await Thesis.findById(thesisId).populate("studentId secondStudentId supervisorId");
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành và không thể hủy / từ chối.", 400);
  }

  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài này đã bị hủy / từ chối trước đó.", 400);
  }

  const cancelReason = reason && reason.trim() ? reason.trim() : "Trưởng Bộ Môn đã hủy / từ chối đề tài";

  thesis.status = "REJECTED";
  thesis.rejectionReason = cancelReason;
  thesis.rejectedAt = new Date();
  thesis.assignedBy = tbmUserId || null;
  await thesis.save();

  // If thesis was created from a ThesisTopic, release the FIFO slot atomically
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId },
      {
        $inc: { currentGroups: -1 },
        $pull: {
          registeredGroups: {
            $or: [
              { thesisId: thesis._id },
              { studentId: thesis.studentId?._id || thesis.studentId },
            ],
          },
        },
      }
    );
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, currentGroups: { $lt: 0 } },
      { $set: { currentGroups: 0 } }
    );
  }

  // Reset student registration flag so students can re-register
  if (thesis.studentId) {
    await Student.findByIdAndUpdate(thesis.studentId._id || thesis.studentId, { thesisRegistered: false });
  }
  if (thesis.secondStudentId) {
    await Student.findByIdAndUpdate(thesis.secondStudentId._id || thesis.secondStudentId, { thesisRegistered: false });
  }

  // Notify SV1
  const s1 = thesis.studentId?.userId ? thesis.studentId : await Student.findById(thesis.studentId).populate("userId");
  if (s1?.userId?._id || s1?.userId) {
    await notificationService.createNotification({
      recipientId: s1.userId._id || s1.userId,
      type: "THESIS",
      title: "Đề tài Khóa luận đã bị hủy / từ chối",
      message: `Đề tài "${thesis.thesisTitle}" đã bị hủy / từ chối bởi Trưởng Bộ Môn: ${cancelReason}. Bạn có thể đăng ký lại đề tài khác.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  // Notify SV2
  if (thesis.secondStudentId) {
    const s2 = thesis.secondStudentId?.userId ? thesis.secondStudentId : await Student.findById(thesis.secondStudentId).populate("userId");
    if (s2?.userId?._id || s2?.userId) {
      await notificationService.createNotification({
        recipientId: s2.userId._id || s2.userId,
        type: "THESIS",
        title: "Đề tài Khóa luận đã bị hủy / từ chối",
        message: `Đề tài "${thesis.thesisTitle}" đã bị hủy / từ chối bởi Trưởng Bộ Môn: ${cancelReason}. Bạn có thể đăng ký lại đề tài khác.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  }

  // Notify Supervisor
  const supervisorRecipientId = thesis.supervisorId?.userId?._id || thesis.supervisorId?.userId;
  if (supervisorRecipientId) {
    await notificationService.createNotification({
      recipientId: supervisorRecipientId,
      type: "THESIS",
      title: "Đề tài Khóa luận đã bị hủy bởi Trưởng Bộ Môn",
      message: `Đề tài "${thesis.thesisTitle}" do bạn hướng dẫn đã bị hủy / từ chối bởi Trưởng Bộ Môn. Lý do: ${cancelReason}.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/lecturer/theses",
    });
  }

  return thesis;
};

// ====================
// 4. TBM Assigns / Changes Supervisor
// ====================
const assignSupervisor = async (thesisId, { supervisorId, tbmUserId }) => {
  if (!supervisorId) {
    throw new AppError("Vui lòng chọn giảng viên hướng dẫn", 400);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành và không thể thay đổi giảng viên hướng dẫn.", 400);
  }

  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài đã bị từ chối, không thể phân công giảng viên hướng dẫn.", 400);
  }

  const supervisor = await Lecturer.findById(supervisorId).populate("userId");
  if (!supervisor) {
    throw new AppError("Không tìm thấy giảng viên hướng dẫn", 404);
  }

  if (supervisor.isActive === false || supervisor.userId?.isActive === false) {
    throw new AppError("Giảng viên này đã bị vô hiệu hóa, không thể phân công", 400);
  }

  // Check Lecturer Max Capacity (Number of Students)
  const activeTheses = await Thesis.find({
    supervisorId: supervisor._id,
    _id: { $ne: thesis._id },
    status: {
      $in: [
        "PENDING_SUPERVISOR_APPROVAL",
        "PENDING_TBM_APPROVAL",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "ASSIGNED_REVIEWERS",
        "IN_PROGRESS",
      ],
    },
  }).select("secondStudentId");

  let currentSupervisedCount = 0;
  activeTheses.forEach((t) => {
    currentSupervisedCount += t.secondStudentId ? 2 : 1;
  });
  const newStudents = thesis.secondStudentId ? 2 : 1;
  const maxCapacity = supervisor.maxSupervisedStudents ?? supervisor.maxStudents ?? 5;
  if (currentSupervisedCount + newStudents > maxCapacity) {
    throw new AppError("Giảng viên đã đạt số lượng sinh viên hướng dẫn tối đa.", 400);
  }

  // Supervisor cannot be Reviewer
  if (
    (thesis.reviewer1Id && thesis.reviewer1Id.toString() === supervisor._id.toString()) ||
    (thesis.reviewer2Id && thesis.reviewer2Id.toString() === supervisor._id.toString())
  ) {
    throw new AppError("Giảng viên hướng dẫn không được trùng với Giảng viên phản biện", 400);
  }

  thesis.supervisorId = supervisor._id;
  thesis.assignedAt = new Date();
  thesis.assignedBy = tbmUserId || null;
  await thesis.save();

  // Send Notification strictly to the assigned Supervisor
  if (supervisor.userId?._id) {
    await notificationService.createNotification({
      recipientId: supervisor.userId._id,
      type: "THESIS",
      title: "Phân công hướng dẫn đề tài",
      message: `Bạn được phân công hướng dẫn đề tài: "${thesis.thesisTitle}"`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/lecturer/theses",
    });
  }

  return await Thesis.findById(thesis._id)
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
    });
};

// ====================
// 5. TBM Assigns Reviewers (Reviewer 1 & Reviewer 2 / Reviewers List)
// ====================
const assignReviewers = async (
  thesisId,
  { reviewer1Id = null, reviewer2Id = null, reviewers = null, tbmUserId },
) => {
  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành và không thể chỉnh sửa phân công phản biện.", 400);
  }

  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài đã bị từ chối / không đạt (FAIL), không thể phân công giảng viên phản biện.", 400);
  }

  const scoreHD = thesis.scores?.supervisorScore ?? thesis.scores?.student1SupervisorScore;
  if (
    scoreHD === null ||
    scoreHD === undefined ||
    isNaN(scoreHD) ||
    thesis.isCriteriaPassed === false
  ) {
    throw new AppError(
      "Sinh viên chưa hoàn tất đánh giá điều kiện và chưa có điểm GVHD hợp lệ. Không thể phân công giảng viên phản biện.",
      400,
    );
  }

  if (Number(scoreHD) < 4.0) {
    throw new AppError(
      "Đề tài có điểm GVHD dưới 4.0 (Không đạt), không thể phân công giảng viên phản biện.",
      400,
    );
  }

  const supervisorIdStr = thesis.supervisorId.toString();

  let effectiveReviewer1Id = null;
  let effectiveReviewer2Id = null;
  let effectiveReviewersList = [];

  // If reviewers array is provided from the UI, extract private and council reviewers
  if (reviewer1Id !== undefined || reviewer2Id !== undefined) {
    effectiveReviewer1Id = reviewer1Id || null;
    effectiveReviewer2Id = reviewer2Id || null;

    const map = new Map();
    if (effectiveReviewer1Id) {
      const idStr = effectiveReviewer1Id.toString();
      map.set(idStr, {
        lecturerId: effectiveReviewer1Id,
        isPrivateReviewer: true,
        isCouncilReviewer: false,
      });
    }
    if (effectiveReviewer2Id) {
      const idStr = effectiveReviewer2Id.toString();
      if (map.has(idStr)) {
        map.get(idStr).isCouncilReviewer = true;
      } else {
        map.set(idStr, {
          lecturerId: effectiveReviewer2Id,
          isPrivateReviewer: false,
          isCouncilReviewer: true,
        });
      }
    }
    effectiveReviewersList = Array.from(map.values());
  } else if (Array.isArray(reviewers)) {
    const activeAssignments = reviewers.filter(
      (r) => r.isPrivateReviewer || r.isCouncilReviewer,
    );

    const privateRev = reviewers.find((r) => r.isPrivateReviewer);
    const councilRev = reviewers.find((r) => r.isCouncilReviewer);

    effectiveReviewer1Id = privateRev ? privateRev.lecturerId : null;
    effectiveReviewer2Id = councilRev ? councilRev.lecturerId : null;

    effectiveReviewersList = activeAssignments.map((r) => ({
      lecturerId: r.lecturerId,
      isPrivateReviewer: Boolean(r.isPrivateReviewer),
      isCouncilReviewer: Boolean(r.isCouncilReviewer),
    }));
  }

  // Validate Reviewer 1 != Reviewer 2
  if (
    effectiveReviewer1Id &&
    effectiveReviewer2Id &&
    effectiveReviewer1Id.toString() === effectiveReviewer2Id.toString()
  ) {
    throw new AppError("Giảng viên phản biện 1 và Giảng viên phản biện 2 không được trùng nhau", 400);
  }

  // Validate Supervisor != Reviewers (GVHD cannot review their own supervised thesis)
  if (
    effectiveReviewer1Id &&
    effectiveReviewer1Id.toString() === supervisorIdStr
  ) {
    throw new AppError("Giảng viên hướng dẫn không được đồng thời làm Giảng viên phản biện kín", 400);
  }
  if (
    effectiveReviewer2Id &&
    effectiveReviewer2Id.toString() === supervisorIdStr
  ) {
    throw new AppError("Giảng viên hướng dẫn không được đồng thời làm Giảng viên phản biện hội đồng", 400);
  }

  for (const r of effectiveReviewersList) {
    if (r.lecturerId && r.lecturerId.toString() === supervisorIdStr) {
      throw new AppError("Giảng viên hướng dẫn không được làm Giảng viên phản biện cho đề tài của mình", 400);
    }
  }

  // Handle Reviewer 1 (PB Kín)
  if (effectiveReviewer1Id) {
    const rev1 = await Lecturer.findById(effectiveReviewer1Id).populate("userId");
    if (!rev1) throw new AppError("Không tìm thấy giảng viên phản biện kín", 404);
    if (rev1.isActive === false || rev1.userId?.isActive === false) {
      throw new AppError("Giảng viên phản biện kín đã bị vô hiệu hóa, không thể phân công", 400);
    }
    thesis.reviewer1Id = rev1._id;

    // Auto-grant GVPB_KIN permission
    if (rev1.userId?._id) {
      await Permission.findOneAndUpdate(
        { userId: rev1.userId._id, permission: "GVPB_KIN" },
        { $set: { isActive: true } },
        { upsert: true, new: true },
      );
    }
    const rev1Doc = await Lecturer.findById(rev1._id);
    if (rev1Doc) {
      if (!Array.isArray(rev1Doc.permissions)) rev1Doc.permissions = [];
      if (!rev1Doc.permissions.includes("GVPB_KIN")) {
        rev1Doc.permissions.push("GVPB_KIN");
        await rev1Doc.save();
      }
    }

    if (rev1.userId?._id) {
      await notificationService.createNotification({
        recipientId: rev1.userId._id,
        type: "THESIS",
        title: "Bạn được phân công phản biện khóa luận",
        message: `Bạn được phân công làm Giảng viên phản biện kín cho đề tài: "${thesis.thesisTitle}"`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/lecturer/theses?tab=review",
      });
    }
  } else {
    thesis.reviewer1Id = null;
  }

  // Handle Reviewer 2 (PB Hội đồng)
  if (effectiveReviewer2Id) {
    const rev2 = await Lecturer.findById(effectiveReviewer2Id).populate("userId");
    if (!rev2) throw new AppError("Không tìm thấy giảng viên phản biện hội đồng", 404);
    if (rev2.isActive === false || rev2.userId?.isActive === false) {
      throw new AppError("Giảng viên phản biện hội đồng đã bị vô hiệu hóa, không thể phân công", 400);
    }
    thesis.reviewer2Id = rev2._id;

    // Auto-grant GVPB_HOIDONG permission
    if (rev2.userId?._id) {
      await Permission.findOneAndUpdate(
        { userId: rev2.userId._id, permission: "GVPB_HOIDONG" },
        { $set: { isActive: true } },
        { upsert: true, new: true },
      );
    }
    const rev2Doc = await Lecturer.findById(rev2._id);
    if (rev2Doc) {
      if (!Array.isArray(rev2Doc.permissions)) rev2Doc.permissions = [];
      if (!rev2Doc.permissions.includes("GVPB_HOIDONG")) {
        rev2Doc.permissions.push("GVPB_HOIDONG");
        await rev2Doc.save();
      }
    }

    if (rev2.userId?._id) {
      await notificationService.createNotification({
        recipientId: rev2.userId._id,
        type: "THESIS",
        title: "Bạn được phân công phản biện khóa luận",
        message: `Bạn được phân công làm Giảng viên phản biện hội đồng cho đề tài: "${thesis.thesisTitle}"`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/lecturer/theses?tab=review",
      });
    }
  } else {
    thesis.reviewer2Id = null;
  }

  // Ensure all reviewers in effectiveReviewersList receive corresponding permissions
  for (const r of effectiveReviewersList) {
    if (r.isPrivateReviewer && r.lecturerId) {
      const lec = await Lecturer.findById(r.lecturerId).populate("userId");
      if (lec?.userId?._id) {
        await Permission.findOneAndUpdate(
          { userId: lec.userId._id, permission: "GVPB_KIN" },
          { $set: { isActive: true } },
          { upsert: true, new: true },
        );
      }
      if (lec) {
        if (!Array.isArray(lec.permissions)) lec.permissions = [];
        if (!lec.permissions.includes("GVPB_KIN")) {
          lec.permissions.push("GVPB_KIN");
          await lec.save();
        }
      }
    }

    if (r.isCouncilReviewer && r.lecturerId) {
      const lec = await Lecturer.findById(r.lecturerId).populate("userId");
      if (lec?.userId?._id) {
        await Permission.findOneAndUpdate(
          { userId: lec.userId._id, permission: "GVPB_HOIDONG" },
          { $set: { isActive: true } },
          { upsert: true, new: true },
        );
      }
      if (lec) {
        if (!Array.isArray(lec.permissions)) lec.permissions = [];
        if (!lec.permissions.includes("GVPB_HOIDONG")) {
          lec.permissions.push("GVPB_HOIDONG");
          await lec.save();
        }
      }
    }
  }

  thesis.reviewers = effectiveReviewersList;

  // State Transition: If both PB Kín and PB Hội đồng are assigned
  const hasPrivate = effectiveReviewersList.some((r) => r.isPrivateReviewer) || Boolean(thesis.reviewer1Id);
  const hasCouncil = effectiveReviewersList.some((r) => r.isCouncilReviewer) || Boolean(thesis.reviewer2Id);

  if (hasPrivate && hasCouncil) {
    if (["PENDING_TBM_APPROVAL", "APPROVED"].includes(thesis.status)) {
      thesis.status = "ASSIGNED_REVIEWERS";
    }
    thesis.assignedAt = new Date();
    thesis.assignedBy = tbmUserId || null;
  }

  await thesis.save();

  return await Thesis.findById(thesis._id)
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
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    });
};

// ====================
// 6. Lecturer Approves / Accepts Supervision of Thesis
// ====================
const supervisorAcceptThesis = async (thesisId, requestingUser) => {
  if (!["LECTURER", "TBM", "ADMIN"].includes(requestingUser.role)) {
    throw new AppError("Bạn không có quyền duyệt / chấp nhận đề tài", 403);
  }

  const lecturer = await Lecturer.findOne({ userId: requestingUser.userId || requestingUser._id }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const thesis = await Thesis.findById(thesisId).populate("studentId secondStudentId supervisorId");
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.supervisorId._id.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không phải là giảng viên được phân công cho đề tài này", 403);
  }

  if (!["PENDING_SUPERVISOR_APPROVAL", "PENDING_SUPERVISOR_ACCEPTANCE"].includes(thesis.status)) {
    throw new AppError(`Không thể duyệt đề tài đang ở trạng thái ${thesis.status}`, 409);
  }

  const term = thesis.academicTermId ? await AcademicTerm.findById(thesis.academicTermId) : null;
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ của khóa luận này đã kết thúc (CLOSED). Giảng viên chỉ được xem lại dữ liệu, không thể phê duyệt đề tài.", 400);
  }

  thesis.status = "APPROVED";
  thesis.approvedAt = new Date();
  thesis.acceptedAt = new Date();
  await thesis.save();

  // If thesis was created from a ThesisTopic, update registeredGroups entry
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
      { $set: { "registeredGroups.$.status": "APPROVED" } }
    );
  }

  // Notify Students
  const s1 = await Student.findById(thesis.studentId._id || thesis.studentId).populate("userId");
  if (s1?.userId?._id) {
    await notificationService.createNotification({
      recipientId: s1.userId._id,
      type: "THESIS",
      title: "Giảng viên đã duyệt đề tài khóa luận của bạn",
      message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã duyệt đề tài khóa luận "${thesis.thesisTitle}".`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  if (thesis.secondStudentId) {
    const s2 = await Student.findById(thesis.secondStudentId._id || thesis.secondStudentId).populate("userId");
    if (s2?.userId?._id) {
      await notificationService.createNotification({
        recipientId: s2.userId._id,
        type: "THESIS",
        title: "Giảng viên đã duyệt đề tài khóa luận của bạn",
        message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã duyệt đề tài khóa luận "${thesis.thesisTitle}".`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId", select: "fullName email phone" } })
    .populate({ path: "secondStudentId", populate: { path: "userId", select: "fullName email phone" } })
    .populate({ path: "supervisorId", populate: { path: "userId", select: "fullName email phone" } });
};

// ====================
// 7. Lecturer Rejects Supervision of Thesis
// ====================
const supervisorRejectThesis = async (thesisId, requestingUser, { reason } = {}) => {
  if (!reason || !reason.trim()) {
    throw new AppError("Vui lòng cung cấp lý do từ chối hướng dẫn", 400);
  }

  if (!["LECTURER", "TBM", "ADMIN"].includes(requestingUser.role)) {
    throw new AppError("Bạn không có quyền từ chối hướng dẫn", 403);
  }

  const lecturer = await Lecturer.findOne({ userId: requestingUser.userId || requestingUser._id }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const thesis = await Thesis.findById(thesisId).populate("studentId secondStudentId supervisorId");
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.supervisorId._id.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không phải là giảng viên được phân công cho đề tài này", 403);
  }

  if (!["PENDING_SUPERVISOR_APPROVAL", "PENDING_SUPERVISOR_ACCEPTANCE"].includes(thesis.status)) {
    throw new AppError(`Không thể từ chối đề tài đang ở trạng thái ${thesis.status}`, 409);
  }

  const term = thesis.academicTermId ? await AcademicTerm.findById(thesis.academicTermId) : null;
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ của khóa luận này đã kết thúc (CLOSED). Giảng viên chỉ được xem lại dữ liệu, không thể từ chối đề tài.", 400);
  }

  thesis.status = "REJECTED";
  thesis.rejectionReason = reason.trim();
  thesis.rejectedAt = new Date();
  await thesis.save();

  // If thesis was created from a ThesisTopic, release the FIFO slot
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId },
      {
        $inc: { currentGroups: -1 },
        $pull: { registeredGroups: { thesisId: thesis._id } },
      }
    );
  }

  // Reset student registration flag so they can register again
  await Student.findByIdAndUpdate(thesis.studentId._id || thesis.studentId, { thesisRegistered: false });
  if (thesis.secondStudentId) {
    await Student.findByIdAndUpdate(thesis.secondStudentId._id || thesis.secondStudentId, { thesisRegistered: false });
  }

  // Notify Students
  const s1 = await Student.findById(thesis.studentId._id || thesis.studentId).populate("userId");
  if (s1?.userId?._id) {
    await notificationService.createNotification({
      recipientId: s1.userId._id,
      type: "THESIS",
      title: "Đề tài khóa luận đã bị từ chối",
      message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối hướng dẫn đề tài "${thesis.thesisTitle}". Lý do: ${reason.trim()}`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  if (thesis.secondStudentId) {
    const s2 = await Student.findById(thesis.secondStudentId._id || thesis.secondStudentId).populate("userId");
    if (s2?.userId?._id) {
      await notificationService.createNotification({
        recipientId: s2.userId._id,
        type: "THESIS",
        title: "Đề tài khóa luận đã bị từ chối",
        message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối hướng dẫn đề tài "${thesis.thesisTitle}". Lý do: ${reason.trim()}`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  }

  // Notify TBM
  await notificationService.createNotificationForRole("TBM", {
    type: "THESIS",
    title: "Giảng viên đã từ chối đề tài khóa luận",
    message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối đề tài "${thesis.thesisTitle}" của sinh viên ${s1?.userId?.fullName || "SV"}. Lý do: ${reason.trim()}`,
    referenceId: thesis._id,
    referenceModel: "Thesis",
    link: "/tbm/theses",
  });

  return thesis;
};

// ====================
// 7b. Supervisor (GVHD) Cancels Thesis
// ====================
const supervisorCancelThesis = async (thesisId, requestingUser, { reason = null } = {}) => {
  if (!["LECTURER", "TBM", "ADMIN"].includes(requestingUser.role)) {
    throw new AppError("Bạn không có quyền hủy đề tài", 403);
  }

  const thesis = await Thesis.findById(thesisId)
    .populate("studentId")
    .populate("secondStudentId")
    .populate("supervisorId");

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  const term = thesis.academicTermId ? await AcademicTerm.findById(thesis.academicTermId) : null;
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ của khóa luận này đã kết thúc (CLOSED). Giảng viên chỉ được xem lại dữ liệu, không thể hủy đề tài.", 400);
  }

  // Check supervisor ownership if role is LECTURER
  if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId || requestingUser._id });
    if (!lecturer || !thesis.supervisorId || thesis.supervisorId._id.toString() !== lecturer._id.toString()) {
      throw new AppError("Bạn không phải là giảng viên hướng dẫn của đề tài này", 403);
    }
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Đề tài đã hoàn thành, không thể hủy.", 400);
  }

  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài này đã bị hủy / từ chối trước đó.", 400);
  }

  const hasVal = (v) => v !== null && v !== undefined && v !== '';
  const sc = thesis.scores;
  const isGraded =
    sc &&
    (hasVal(sc.student1SupervisorScore) ||
      hasVal(sc.student2SupervisorScore) ||
      hasVal(sc.supervisorScore) ||
      hasVal(sc.student1Reviewer1Score) ||
      hasVal(sc.student2Reviewer1Score) ||
      hasVal(sc.reviewer1Score) ||
      hasVal(sc.student1Reviewer2Score) ||
      hasVal(sc.student2Reviewer2Score) ||
      hasVal(sc.reviewer2Score) ||
      hasVal(sc.finalScore) ||
      hasVal(sc.student1FinalScore) ||
      hasVal(sc.student2FinalScore) ||
      (Array.isArray(sc.councilLecturerScores) &&
        sc.councilLecturerScores.some(
          (c) => hasVal(c.score) || hasVal(c.student1Score) || hasVal(c.student2Score)
        )));

  if (isGraded) {
    throw new AppError("Không thể hủy đề tài do đề tài đã có điểm đánh giá.", 400);
  }

  const cancelReason = reason && reason.trim() ? reason.trim() : "Giảng viên hướng dẫn đã hủy đề tài";

  thesis.status = "REJECTED";
  thesis.rejectionReason = cancelReason;
  thesis.rejectedAt = new Date();
  await thesis.save();

  // 1. Release Topic FIFO slot if registered from Topic bank
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId },
      {
        $inc: { currentGroups: -1 },
        $pull: {
          registeredGroups: {
            $or: [
              { thesisId: thesis._id },
              { studentId: thesis.studentId?._id || thesis.studentId },
            ],
          },
        },
      }
    );
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, currentGroups: { $lt: 0 } },
      { $set: { currentGroups: 0 } }
    );
  }

  // 2. Release Student 1
  if (thesis.studentId) {
    await Student.findByIdAndUpdate(thesis.studentId._id || thesis.studentId, { thesisRegistered: false });
  }

  // 3. Release Student 2
  if (thesis.secondStudentId) {
    await Student.findByIdAndUpdate(thesis.secondStudentId._id || thesis.secondStudentId, { thesisRegistered: false });
  }

  // 4. Send notifications
  const s1 = thesis.studentId?.userId ? thesis.studentId : await Student.findById(thesis.studentId).populate("userId");
  if (s1?.userId?._id || s1?.userId) {
    await notificationService.createNotification({
      recipientId: s1.userId._id || s1.userId,
      type: "THESIS",
      title: "Đề tài Khóa luận đã bị hủy bởi GVHD",
      message: `Giảng viên hướng dẫn đã hủy đề tài "${thesis.thesisTitle}". Lý do: ${cancelReason}. Bạn hiện có thể đăng ký đề tài mới.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  if (thesis.secondStudentId) {
    const s2 = thesis.secondStudentId?.userId ? thesis.secondStudentId : await Student.findById(thesis.secondStudentId).populate("userId");
    if (s2?.userId?._id || s2?.userId) {
      await notificationService.createNotification({
        recipientId: s2.userId._id || s2.userId,
        type: "THESIS",
        title: "Đề tài Khóa luận đã bị hủy bởi GVHD",
        message: `Giảng viên hướng dẫn đã hủy đề tài "${thesis.thesisTitle}". Lý do: ${cancelReason}. Bạn hiện có thể đăng ký đề tài mới.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  }

  // Notify TBM
  await notificationService.createNotificationForRole("TBM", {
    type: "THESIS",
    title: "GVHD đã hủy đề tài Khóa luận",
    message: `Đề tài "${thesis.thesisTitle}" đã bị hủy bởi GVHD. Lý do: ${cancelReason}`,
    referenceId: thesis._id,
    referenceModel: "Thesis",
    link: "/tbm/theses",
  });

  return thesis;
};

// ==========================================
// PHASE 11: LECTURER / REVIEWER WORKFLOW & RBAC
// ==========================================

// ====================
// 1. Get Assigned Theses for Lecturer (GVHD / PB1 / PB2) (AcademicTerm-aware)
// ====================
const getThesesForLecturerRole = async (
  userId,
  { roleType = "ALL", search = "", academicTermId = "" } = {},
) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  // Base Query: Theses where lecturer is Supervisor OR Reviewer 1 (PB Kín) OR Reviewer 2 (PB Hội đồng)
  const baseQuery = {
    status: {
      $nin: ["WAITING_FOR_STUDENT2_CONFIRMATION", "WAITING_FOR_SUPERVISOR_REQUEST", "REJECTED"],
    },
  };

  if (academicTermId && academicTermId !== "ALL") {
    baseQuery.academicTermId = academicTermId;
  }

  if (roleType === "SUPERVISOR") {
    baseQuery.supervisorId = lecturer._id;
  } else if (
    roleType === "REVIEWER_1" ||
    roleType === "REVIEWER1" ||
    roleType === "GVPB_KIN"
  ) {
    baseQuery.$or = [
      { reviewer1Id: lecturer._id },
      {
        reviewers: {
          $elemMatch: { lecturerId: lecturer._id, isPrivateReviewer: true },
        },
      },
    ];
  } else if (
    roleType === "REVIEWER_2" ||
    roleType === "REVIEWER2" ||
    roleType === "GVPB_HOIDONG"
  ) {
    baseQuery.$or = [
      { reviewer2Id: lecturer._id },
      {
        reviewers: {
          $elemMatch: { lecturerId: lecturer._id, isCouncilReviewer: true },
        },
      },
    ];
  } else {
    // ALL
    baseQuery.$or = [
      { supervisorId: lecturer._id },
      { reviewer1Id: lecturer._id },
      { reviewer2Id: lecturer._id },
      { "reviewers.lecturerId": lecturer._id },
    ];
  }

  // Search Filter
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");

    const matchingStudents = await Student.find({
      $or: [{ studentCode: regex }],
    }).select("_id");

    const matchingUsers = await Student.find()
      .populate({
        path: "userId",
        match: { fullName: regex },
        select: "_id",
      })
      .then((docs) => docs.filter((d) => d.userId).map((d) => d._id));

    const allStudentIds = [
      ...matchingStudents.map((s) => s._id),
      ...matchingUsers,
    ];

    const searchOrConditions = [
      { thesisTitle: regex },
      { studentId: { $in: allStudentIds } },
      { secondStudentId: { $in: allStudentIds } },
    ];

    if (baseQuery.$and) {
      baseQuery.$and.push({ $or: searchOrConditions });
    } else {
      baseQuery.$and = [{ $or: searchOrConditions }];
    }
  }

  const allAssigned = await Thesis.find(baseQuery)
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
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId")
    .populate("councilId")
    .lean();

  const idStr = lecturer._id.toString();

  // Annotate user's roles on each thesis
  const results = allAssigned.map((t) => {
    const isSupervisor =
      (t.supervisorId?._id?.toString() || t.supervisorId?.toString()) === idStr;

    const isPrivateRevInArray = Array.isArray(t.reviewers) && t.reviewers.some(
      (r) => ((r.lecturerId?._id?.toString() || r.lecturerId?.toString()) === idStr) && r.isPrivateReviewer
    );
    const isCouncilRevInArray = Array.isArray(t.reviewers) && t.reviewers.some(
      (r) => ((r.lecturerId?._id?.toString() || r.lecturerId?.toString()) === idStr) && r.isCouncilReviewer
    );

    const isReviewer1 =
      (t.reviewer1Id?._id?.toString() || t.reviewer1Id?.toString()) === idStr ||
      isPrivateRevInArray;

    const isReviewer2 =
      (t.reviewer2Id?._id?.toString() || t.reviewer2Id?.toString()) === idStr ||
      isCouncilRevInArray;

    const roles = [];
    if (isSupervisor) roles.push("GVHD");
    if (isReviewer1) roles.push("GVPB_KIN");
    if (isReviewer2) roles.push("GVPB_HOIDONG");

    const isPBKAssigned = Boolean(
      t.reviewer1Id ||
      t.reviewer2Id ||
      (Array.isArray(t.reviewers) && t.reviewers.length > 0) ||
      t.status === "ASSIGNED_REVIEWERS" ||
      t.status === "DEFENSE" ||
      t.status === "COMPLETED"
    );
    const isCompletedOrRejected = ["COMPLETED", "REJECTED"].includes(t.status);
    const hasSupervisorGraded = Boolean(
      t.scores?.supervisorScore != null || t.scores?.student1SupervisorScore != null
    );
    const hasReviewer1Graded = Boolean(
      t.scores?.reviewer1Score != null || t.scores?.student1Reviewer1Score != null
    );
    const hasReviewer2Graded = Boolean(
      t.scores?.reviewer2Score != null || t.scores?.student1Reviewer2Score != null
    );
    const hasBothReviewersGraded = hasReviewer1Graded && hasReviewer2Graded;

    return {
      ...t,
      userRoles: roles,
      isSupervisor,
      isReviewer1,
      isReviewer2,
      isPBKAssigned,
      hasSupervisorGraded,
      hasBothReviewersGraded,
      canGradeSupervisor: isSupervisor && !isCompletedOrRejected && !isPBKAssigned,
      canGradeReviewer1: isReviewer1 && !isCompletedOrRejected && isPBKAssigned && hasSupervisorGraded,
      canGradeReviewer2: isReviewer2 && !isCompletedOrRejected && isPBKAssigned && hasSupervisorGraded,
      canGradeCouncil: !isCompletedOrRejected && hasBothReviewersGraded,
    };
  });

  // Also fetch all active theses so council/room assignments can locate any thesis
  const allThesesQuery = {
    status: {
      $nin: [
        "CANCELLED",
        "REJECTED",
        "WAITING_FOR_STUDENT2_CONFIRMATION",
        "WAITING_FOR_SUPERVISOR_REQUEST",
      ],
    },
  };
  if (academicTermId && academicTermId !== "ALL") {
    allThesesQuery.academicTermId = academicTermId;
  }
  const allTermTheses = await Thesis.find(allThesesQuery)
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
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId")
    .populate("councilId")
    .lean();

  const allThesesAnnotated = allTermTheses.map((t) => {
    const isSupervisor =
      (t.supervisorId?._id?.toString() || t.supervisorId?.toString()) === idStr;

    const isPrivateRevInArray = Array.isArray(t.reviewers) && t.reviewers.some(
      (r) => ((r.lecturerId?._id?.toString() || r.lecturerId?.toString()) === idStr) && r.isPrivateReviewer
    );
    const isCouncilRevInArray = Array.isArray(t.reviewers) && t.reviewers.some(
      (r) => ((r.lecturerId?._id?.toString() || r.lecturerId?.toString()) === idStr) && r.isCouncilReviewer
    );

    const isReviewer1 =
      (t.reviewer1Id?._id?.toString() || t.reviewer1Id?.toString()) === idStr ||
      isPrivateRevInArray;

    const isReviewer2 =
      (t.reviewer2Id?._id?.toString() || t.reviewer2Id?.toString()) === idStr ||
      isCouncilRevInArray;

    const roles = [];
    if (isSupervisor) roles.push("GVHD");
    if (isReviewer1) roles.push("GVPB_KIN");
    if (isReviewer2) roles.push("GVPB_HOIDONG");

    const isPBKAssigned = Boolean(
      t.reviewer1Id ||
      t.reviewer2Id ||
      (Array.isArray(t.reviewers) && t.reviewers.length > 0) ||
      t.status === "ASSIGNED_REVIEWERS" ||
      t.status === "DEFENSE" ||
      t.status === "COMPLETED"
    );
    const isCompletedOrRejected = ["COMPLETED", "REJECTED"].includes(t.status);
    const hasSupervisorGraded = Boolean(
      t.scores?.supervisorScore != null || t.scores?.student1SupervisorScore != null
    );
    const hasReviewer1Graded = Boolean(
      t.scores?.reviewer1Score != null || t.scores?.student1Reviewer1Score != null
    );
    const hasReviewer2Graded = Boolean(
      t.scores?.reviewer2Score != null || t.scores?.student1Reviewer2Score != null
    );
    const hasBothReviewersGraded = hasReviewer1Graded && hasReviewer2Graded;

    return {
      ...t,
      userRoles: roles,
      isSupervisor,
      isReviewer1,
      isReviewer2,
      isPBKAssigned,
      hasSupervisorGraded,
      hasBothReviewersGraded,
      canGradeSupervisor: isSupervisor && !isCompletedOrRejected && !isPBKAssigned,
      canGradeReviewer1: isReviewer1 && !isCompletedOrRejected && isPBKAssigned && hasSupervisorGraded,
      canGradeReviewer2: isReviewer2 && !isCompletedOrRejected && isPBKAssigned && hasSupervisorGraded,
      canGradeCouncil: !isCompletedOrRejected && hasBothReviewersGraded,
    };
  });

  const supervisedTheses = results.filter((t) => t.isSupervisor);
  const reviewer1Theses = results.filter((t) => t.isReviewer1);
  const reviewer2Theses = results.filter((t) => t.isReviewer2);

  return {
    lecturer: {
      _id: lecturer._id,
      fullName: lecturer.userId?.fullName,
      email: lecturer.userId?.email,
      lecturerCode: lecturer.lecturerCode,
    },
    theses: results,
    allTheses: allThesesAnnotated,
    supervisedTheses,
    reviewer1Theses,
    reviewer2Theses,
    stats: {
      supervisedCount: supervisedTheses.length,
      reviewer1Count: reviewer1Theses.length,
      reviewer2Count: reviewer2Theses.length,
      totalAssigned: results.length,
    },
    totalCount: results.length,
  };
};

// ====================
// 2. Grade Thesis by Lecturer
// ====================
const gradeThesisByLecturer = async (
  thesisId,
  arg2,
  arg3 = {},
) => {
  let requestingUserId;
  let payload;
  if (typeof arg2 === "object" && arg2 !== null) {
    payload = arg2;
    requestingUserId = arg2.userId || arg2.requestingUserId;
  } else {
    requestingUserId = arg2;
    payload = arg3;
  }

  const { role, roleType, score, student1Score, student2Score, comment } = payload;
  const activeRole = role || roleType || "SUPERVISOR";

  let lecturer = await Lecturer.findOne({ userId: requestingUserId }).populate(
    "userId",
  );
  if (!lecturer) {
    lecturer = await Lecturer.findById(requestingUserId).populate("userId");
  }
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  // 0. RULE: Permanent Lock if Term is CLOSED
  const term = thesis.academicTermId ? await AcademicTerm.findById(thesis.academicTermId) : null;
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ của khóa luận này đã kết thúc (CLOSED). Giảng viên chỉ được xem lại điểm lịch sử, không thể chỉnh sửa điểm.", 400);
  }

  // 1. RULE: Permanent Lock if Thesis is COMPLETED or REJECTED
  if (thesis.status === "COMPLETED") {
    throw new AppError(
      "Khóa luận đã hoàn thành và không thể chỉnh sửa điểm hay nhận xét.",
      400,
    );
  }
  if (thesis.status === "REJECTED") {
    throw new AppError(
      "Đề tài đã bị từ chối / không đạt (FAIL). Không thể nhập hoặc chỉnh sửa điểm.",
      400,
    );
  }

  const s1 =
    student1Score !== undefined && student1Score !== null && student1Score !== ""
      ? Number(student1Score)
      : score !== undefined && score !== null && score !== ""
      ? Number(score)
      : null;
  const s2 =
    student2Score !== undefined && student2Score !== null && student2Score !== ""
      ? Number(student2Score)
      : null;

  if (s1 !== null && (isNaN(s1) || s1 < 0 || s1 > 10)) {
    throw new AppError("Điểm sinh viên 1 phải từ 0 đến 10", 400);
  }
  if (s2 !== null && (isNaN(s2) || s2 < 0 || s2 > 10)) {
    throw new AppError("Điểm sinh viên 2 phải từ 0 đến 10", 400);
  }

  const effectiveScore =
    s1 !== null && s2 !== null
      ? Number(((s1 + s2) / 2).toFixed(2))
      : s1 !== null
      ? s1
      : s2 !== null
      ? s2
      : null;

  if (effectiveScore === null) {
    throw new AppError("Vui lòng nhập điểm đánh giá hợp lệ (0 - 10)", 400);
  }

  const lecIdStr = lecturer._id.toString();

  if (!thesis.scores) {
    thesis.scores = {};
  }

  // Check Grading Period for Thesis (Enforced for all roles: GVHD, GVPB1, GVPB2, Council)
  const now = new Date();
  if (thesis.academicTermId) {
    const allPeriods = await ThesisGradingPeriod.find({
      academicTermId: thesis.academicTermId,
    });

    if (allPeriods.length === 0) {
      throw new AppError("Chưa tạo thời gian nhập điểm KLTN. Chưa thể chấm điểm.", 400);
    }

    const activePeriod = allPeriods.find(
      (p) => now >= new Date(p.startDate) && now <= new Date(p.endDate),
    );
    if (!activePeriod) {
      const hasUpcoming = allPeriods.some((p) => now < new Date(p.startDate));
      if (hasUpcoming) {
        throw new AppError("Đợt nhập điểm KLTN chưa bắt đầu.", 400);
      }
      throw new AppError("Đã hết thời gian nhập điểm KLTN. Không thể nhập hoặc chỉnh sửa điểm.", 400);
    }
  }

  const isPBKAssigned = Boolean(
    thesis.reviewer1Id ||
    thesis.reviewer2Id ||
    (Array.isArray(thesis.reviewers) && thesis.reviewers.length > 0) ||
    thesis.status === "ASSIGNED_REVIEWERS" ||
    thesis.status === "DEFENSE"
  );
  const hasSupervisorGraded = Boolean(
    thesis.scores?.supervisorScore != null || thesis.scores?.student1SupervisorScore != null
  );
  const hasReviewer1Graded = Boolean(
    thesis.scores?.reviewer1Score != null || thesis.scores?.student1Reviewer1Score != null
  );
  const hasReviewer2Graded = Boolean(
    thesis.scores?.reviewer2Score != null || thesis.scores?.student1Reviewer2Score != null
  );
  const hasBothReviewersGraded = hasReviewer1Graded && hasReviewer2Graded;

  if (activeRole === "SUPERVISOR" || activeRole === "GVHD") {
    if (isPBKAssigned) {
      throw new AppError(
        "Đề tài đã được phân công phản biện khóa luận (PBK). Giảng viên hướng dẫn không thể chỉnh sửa điểm.",
        400,
      );
    }
    const isSup = thesis.supervisorId?.toString() === lecIdStr;
    if (!isSup) {
      throw new AppError(
        "Bạn không phải là giảng viên hướng dẫn của đề tài này",
        403,
      );
    }
    if (thesis.scores?.isSupervisorScoreLocked) {
      throw new AppError("Điểm hướng dẫn của đề tài này đang bị khóa. Vui lòng mở khóa để chỉnh sửa.", 400);
    }

    // Check Criteria Checklist
    let activeCriteria = await ThesisEvaluationCriteria.find({
      isActive: true,
      $or: [
        ...(thesis.academicTermId ? [{ academicTermId: thesis.academicTermId }] : []),
        { academicTermId: null },
      ],
    }).sort({ order: 1 });

    if (activeCriteria.length === 0) {
      await seedDefaultCriteria(thesis.academicTermId);
      activeCriteria = await ThesisEvaluationCriteria.find({
        isActive: true,
        $or: [
          ...(thesis.academicTermId ? [{ academicTermId: thesis.academicTermId }] : []),
          { academicTermId: null },
        ],
      }).sort({ order: 1 });
    }

    const requiredCriteria = activeCriteria.filter((c) => c.isRequired !== false);
    const incomingEvaluations = payload.criteriaEvaluations || [];
    const incomingCheckedIds = Array.isArray(payload.checkedCriteriaIds)
      ? payload.checkedCriteriaIds.map((id) => id.toString())
      : incomingEvaluations
          .filter((e) => e.isPassed)
          .map((e) => (e.criteriaId?._id || e.criteriaId)?.toString());

    // Check if all required criteria are checked
    const allRequiredPassed = requiredCriteria.every((rc) =>
      incomingCheckedIds.includes(rc._id.toString()),
    );

    if (!allRequiredPassed && requiredCriteria.length > 0) {
      throw new AppError(
        "Chưa đủ điều kiện nhập điểm. Vui lòng hoàn thành tất cả tiêu chí đánh giá.",
        400,
      );
    }

    // Save criteria evaluations
    thesis.criteriaEvaluations = activeCriteria.map((c) => ({
      criteriaId: c._id,
      criteriaName: c.name,
      isPassed: incomingCheckedIds.includes(c._id.toString()),
      evaluatedAt: new Date(),
    }));
    thesis.isCriteriaPassed = true;

    if (s1 !== null) thesis.scores.student1SupervisorScore = s1;
    if (s2 !== null) thesis.scores.student2SupervisorScore = s2;

    const finalS1 = thesis.scores.student1SupervisorScore ?? null;
    const finalS2 = thesis.scores.student2SupervisorScore ?? null;
    if (finalS1 !== null && finalS2 !== null) {
      thesis.scores.supervisorScore = Number(((finalS1 + finalS2) / 2).toFixed(2));
    } else {
      thesis.scores.supervisorScore = finalS1 ?? finalS2 ?? effectiveScore;
    }
    if (comment !== undefined) thesis.supervisorComment = comment ? comment.trim() : null;
  } else if (
    activeRole === "REVIEWER_1" ||
    activeRole === "REVIEWER1" ||
    activeRole === "GVPB_KIN"
  ) {
    if (!hasSupervisorGraded) {
      throw new AppError(
        "Giảng viên hướng dẫn chưa hoàn thành chấm điểm. Chưa thể thực hiện chấm điểm phản biện.",
        400,
      );
    }
    const isRev1Legacy = thesis.reviewer1Id?.toString() === lecIdStr;
    const isRev1Array = Array.isArray(thesis.reviewers) && thesis.reviewers.some(
      (r) => ((r.lecturerId?.toString() || r.lecturerId?._id?.toString()) === lecIdStr) && r.isPrivateReviewer
    );
    if (!isRev1Legacy && !isRev1Array) {
      throw new AppError(
        "Bạn không được phân công chấm Phản biện Kín (GVPB_KIN) cho đề tài này",
        403,
      );
    }
    if (thesis.scores?.isReviewer1ScoreLocked) {
      throw new AppError("Điểm phản biện kín của đề tài này đang bị khóa. Vui lòng mở khóa để chỉnh sửa.", 400);
    }
    if (s1 !== null) thesis.scores.student1Reviewer1Score = s1;
    if (s2 !== null) thesis.scores.student2Reviewer1Score = s2;

    const finalS1 = thesis.scores.student1Reviewer1Score ?? null;
    const finalS2 = thesis.scores.student2Reviewer1Score ?? null;
    if (finalS1 !== null && finalS2 !== null) {
      thesis.scores.reviewer1Score = Number(((finalS1 + finalS2) / 2).toFixed(2));
    } else {
      thesis.scores.reviewer1Score = finalS1 ?? finalS2 ?? effectiveScore;
    }
    if (comment !== undefined) thesis.reviewer1Comment = comment ? comment.trim() : null;
  } else if (
    activeRole === "REVIEWER_2" ||
    activeRole === "REVIEWER2" ||
    activeRole === "GVPB_2" ||
    activeRole === "GVPB2"
  ) {
    if (!hasSupervisorGraded) {
      throw new AppError(
        "Giảng viên hướng dẫn chưa hoàn thành chấm điểm. Chưa thể thực hiện chấm điểm phản biện.",
        400,
      );
    }
    if (thesis.scores?.isReviewer2ScoreLocked) {
      throw new AppError("Điểm phản biện 2 của đề tài này đang bị khóa. Vui lòng mở khóa để chỉnh sửa.", 400);
    }

    if (!thesis.reviewer2Id) {
      thesis.reviewer2Id = lecturer._id;
    }

    if (s1 !== null) thesis.scores.student1Reviewer2Score = s1;
    if (s2 !== null) thesis.scores.student2Reviewer2Score = s2;

    const finalS1 = thesis.scores.student1Reviewer2Score ?? null;
    const finalS2 = thesis.scores.student2Reviewer2Score ?? null;
    if (finalS1 !== null && finalS2 !== null) {
      thesis.scores.reviewer2Score = Number(((finalS1 + finalS2) / 2).toFixed(2));
    } else {
      thesis.scores.reviewer2Score = finalS1 ?? finalS2 ?? effectiveScore;
    }

    if (comment !== undefined) thesis.reviewer2Comment = comment ? comment.trim() : null;
  } else if (
    activeRole === "COUNCIL" ||
    activeRole === "COUNCIL_MEMBER" ||
    activeRole === "GV_HOIDONG" ||
    activeRole === "HOIDONG" ||
    activeRole === "GVPB_HOIDONG"
  ) {
    if (!hasBothReviewersGraded) {
      throw new AppError(
        "Chưa thể chấm điểm hội đồng do các giảng viên phản biện chưa hoàn tất chấm điểm.",
        400,
      );
    }
    // Store this lecturer's individual council score
    if (!Array.isArray(thesis.scores.councilLecturerScores)) {
      thesis.scores.councilLecturerScores = [];
    }
    const existingIdx = thesis.scores.councilLecturerScores.findIndex(
      (entry) => (entry.lecturerId?.toString() || entry.lecturerId?._id?.toString()) === lecIdStr
    );
    const lecturerScoreData = {
      lecturerId: lecturer._id,
      lecturerName: lecturer.userId?.fullName || lecturer.fullName || "Giảng viên Hội đồng",
      student1Score: s1,
      student2Score: s2,
      score: effectiveScore,
      comment: comment !== undefined ? (comment ? comment.trim() : null) : null,
      gradedAt: new Date(),
    };

    if (existingIdx >= 0) {
      thesis.scores.councilLecturerScores[existingIdx] = lecturerScoreData;
    } else {
      thesis.scores.councilLecturerScores.push(lecturerScoreData);
    }

    // Auto-compute average council score from councilLecturerScores ONLY when at least 2 council lecturers have graded
    const validScores = thesis.scores.councilLecturerScores.filter(
      (entry) => entry && entry.score !== null && entry.score !== undefined
    );
    if (validScores.length >= 2) {
      const sum = validScores.reduce((acc, curr) => acc + Number(curr.score), 0);
      thesis.scores.councilScore = Number((sum / validScores.length).toFixed(2));
    } else {
      thesis.scores.councilScore = null;
    }

    const s1List = thesis.scores.councilLecturerScores
      .map((e) => e.student1Score)
      .filter((v) => v !== null && v !== undefined);
    if (s1List.length >= 2) {
      thesis.scores.student1CouncilScore = Number(
        (s1List.reduce((acc, curr) => acc + Number(curr), 0) / s1List.length).toFixed(2)
      );
    } else {
      thesis.scores.student1CouncilScore = null;
    }

    const s2List = thesis.scores.councilLecturerScores
      .map((e) => e.student2Score)
      .filter((v) => v !== null && v !== undefined);
    if (s2List.length >= 2) {
      thesis.scores.student2CouncilScore = Number(
        (s2List.reduce((acc, curr) => acc + Number(curr), 0) / s2List.length).toFixed(2)
      );
    } else {
      thesis.scores.student2CouncilScore = null;
    }
  } else {
    throw new AppError("Vai trò đánh giá không hợp lệ", 400);
  }

  // Auto-calculate combined reviewer score (Nếu phân công 2 GVPB thì trung bình cộng khi cả 2 chấm xong; nếu phân công 1 GVPB thì lấy điểm của 1 GVPB đó luôn)
  const isAssignedPB1 = Boolean(
    thesis.reviewer1Id ||
    (Array.isArray(thesis.reviewers) && thesis.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
  );
  const isAssignedPB2 = Boolean(
    thesis.reviewer2Id ||
    (Array.isArray(thesis.reviewers) && thesis.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
  );

  const hasPB1 = thesis.scores.reviewer1Score !== null && thesis.scores.reviewer1Score !== undefined;
  const hasPB2 = thesis.scores.reviewer2Score !== null && thesis.scores.reviewer2Score !== undefined;

  if (isAssignedPB1 && isAssignedPB2) {
    if (hasPB1 && hasPB2) {
      thesis.scores.reviewerScore = Number(((thesis.scores.reviewer1Score + thesis.scores.reviewer2Score) / 2).toFixed(2));
    } else {
      thesis.scores.reviewerScore = null;
    }
  } else if (isAssignedPB1) {
    if (hasPB1) {
      thesis.scores.reviewerScore = thesis.scores.reviewer1Score;
    } else {
      thesis.scores.reviewerScore = null;
    }
  } else if (isAssignedPB2) {
    if (hasPB2) {
      thesis.scores.reviewerScore = thesis.scores.reviewer2Score;
    } else {
      thesis.scores.reviewerScore = null;
    }
  } else {
    thesis.scores.reviewerScore = null;
  }

  // Student 1 combined reviewer score
  const s1_pb1 = thesis.scores.student1Reviewer1Score;
  const s1_pb2 = thesis.scores.student1Reviewer2Score;
  let s1_rev = null;
  if (isAssignedPB1 && isAssignedPB2) {
    if (s1_pb1 != null && s1_pb2 != null) {
      s1_rev = Number(((s1_pb1 + s1_pb2) / 2).toFixed(2));
    }
  } else if (isAssignedPB1) {
    if (s1_pb1 != null) s1_rev = s1_pb1;
  } else if (isAssignedPB2) {
    if (s1_pb2 != null) s1_rev = s1_pb2;
  }
  thesis.scores.student1ReviewerScore = s1_rev;

  // Student 2 combined reviewer score
  const s2_pb1 = thesis.scores.student2Reviewer1Score;
  const s2_pb2 = thesis.scores.student2Reviewer2Score;
  let s2_rev = null;
  if (isAssignedPB1 && isAssignedPB2) {
    if (s2_pb1 != null && s2_pb2 != null) {
      s2_rev = Number(((s2_pb1 + s2_pb2) / 2).toFixed(2));
    }
  } else if (isAssignedPB1) {
    if (s2_pb1 != null) s2_rev = s2_pb1;
  } else if (isAssignedPB2) {
    if (s2_pb2 != null) s2_rev = s2_pb2;
  }
  thesis.scores.student2ReviewerScore = s2_rev;

  // Auto-calculate final score: GVHD (50%) + PB Kín (30%) + Hội đồng (20%)
  const hasSup = thesis.scores.supervisorScore !== null && thesis.scores.supervisorScore !== undefined;
  const hasRev = thesis.scores.reviewerScore !== null && thesis.scores.reviewerScore !== undefined;
  const hasCoun = thesis.scores.councilScore !== null && thesis.scores.councilScore !== undefined;

  if (hasSup && hasRev && hasCoun) {
    const final =
      thesis.scores.supervisorScore * 0.5 +
      thesis.scores.reviewerScore * 0.3 +
      thesis.scores.councilScore * 0.2;

    thesis.scores.finalScore = Number(final.toFixed(2));
    thesis.status = "GRADED";
  } else {
    thesis.scores.finalScore = null;
    thesis.scores.student1FinalScore = null;
    thesis.scores.student2FinalScore = null;
  }

  // Calculate individual final scores if available
  const s1_sup = thesis.scores.student1SupervisorScore;
  const s2_sup = thesis.scores.student2SupervisorScore;
  const s1_coun = thesis.scores.student1CouncilScore ?? (hasCoun ? thesis.scores.councilScore : null);
  const s2_coun = thesis.scores.student2CouncilScore ?? (hasCoun ? thesis.scores.councilScore : null);

  if (s1_sup != null && s1_rev != null && s1_coun != null) {
    thesis.scores.student1FinalScore = Number(
      (
        s1_sup * 0.5 +
        s1_rev * 0.3 +
        s1_coun * 0.2
      ).toFixed(2),
    );
  }
  if (s2_sup != null && s2_rev != null && s2_coun != null) {
    thesis.scores.student2FinalScore = Number(
      (
        s2_sup * 0.5 +
        s2_rev * 0.3 +
        s2_coun * 0.2
      ).toFixed(2),
    );
  }

  thesis.markModified("scores");
  await thesis.save();

  return await Thesis.findById(thesis._id)
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
};

// ====================
// GVHD Evaluates Criteria Directly
// ====================
const evaluateCriteriaBySupervisor = async (
  thesisId,
  arg2,
  arg3 = {},
) => {
  let requestingUserId;
  let payload;
  if (typeof arg2 === "object" && arg2 !== null) {
    payload = arg2;
    requestingUserId = arg2.userId || arg2.requestingUserId;
  } else {
    requestingUserId = arg2;
    payload = arg3;
  }

  const lecturer = await Lecturer.findOne({ userId: requestingUserId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  const term = thesis.academicTermId ? await AcademicTerm.findById(thesis.academicTermId) : null;
  if (term && term.status === "CLOSED") {
    throw new AppError("Học kỳ của khóa luận này đã kết thúc (CLOSED). Giảng viên chỉ được xem lại dữ liệu lịch sử, không thể chỉnh sửa đánh giá tiêu chí.", 400);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành và không thể chỉnh sửa đánh giá tiêu chí.", 400);
  }
  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài đã bị từ chối / không đạt (FAIL).", 400);
  }

  const isSup = thesis.supervisorId?.toString() === lecturer._id.toString();
  if (!isSup) {
    throw new AppError("Bạn không phải là giảng viên hướng dẫn của đề tài này", 403);
  }

  const isPBKAssigned = Boolean(
    thesis.reviewer1Id ||
    thesis.reviewer2Id ||
    (Array.isArray(thesis.reviewers) && thesis.reviewers.length > 0) ||
    thesis.status === "ASSIGNED_REVIEWERS" ||
    thesis.status === "DEFENSE"
  );
  if (isPBKAssigned) {
    throw new AppError("Đề tài đã được phân công phản biện khóa luận (PBK). Không thể chỉnh sửa đánh giá tiêu chí.", 400);
  }

  let activeCriteria = await ThesisEvaluationCriteria.find({
    isActive: true,
    $or: [
      ...(thesis.academicTermId ? [{ academicTermId: thesis.academicTermId }] : []),
      { academicTermId: null },
    ],
  }).sort({ order: 1 });

  if (activeCriteria.length === 0) {
    await seedDefaultCriteria(thesis.academicTermId);
    activeCriteria = await ThesisEvaluationCriteria.find({
      isActive: true,
      $or: [
        ...(thesis.academicTermId ? [{ academicTermId: thesis.academicTermId }] : []),
        { academicTermId: null },
      ],
    }).sort({ order: 1 });
  }

  const requiredCriteria = activeCriteria.filter((c) => c.isRequired !== false);
  const incomingCheckedIds = Array.isArray(payload.checkedCriteriaIds)
    ? payload.checkedCriteriaIds.map((id) => id.toString())
    : (payload.criteriaEvaluations || [])
        .filter((e) => e.isPassed)
        .map((e) => (e.criteriaId?._id || e.criteriaId)?.toString());

  const allRequiredPassed =
    requiredCriteria.length === 0 ||
    requiredCriteria.every((rc) => incomingCheckedIds.includes(rc._id.toString()));

  thesis.criteriaEvaluations = activeCriteria.map((c) => ({
    criteriaId: c._id,
    criteriaName: c.name,
    isPassed: incomingCheckedIds.includes(c._id.toString()),
    evaluatedAt: new Date(),
  }));
  thesis.isCriteriaPassed = allRequiredPassed;

  await thesis.save();

  return await Thesis.findById(thesis._id)
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
};

// ====================
// Toggle Score Lock for Single Thesis
// ====================
const toggleThesisScoreLock = async (thesisId, { roleType = "SUPERVISOR", isLocked, userId }) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành (COMPLETED), không thể thay đổi trạng thái khóa.", 400);
  }

  if (!thesis.scores) {
    thesis.scores = {};
  }

  const lecIdStr = lecturer._id.toString();
  const normalizedRole = roleType?.toUpperCase() || "SUPERVISOR";

  if (normalizedRole === "SUPERVISOR" || normalizedRole === "GVHD") {
    if (thesis.supervisorId?.toString() !== lecIdStr) {
      throw new AppError("Bạn không phải là giảng viên hướng dẫn của đề tài này", 403);
    }
    thesis.scores.isSupervisorScoreLocked = Boolean(isLocked);
  } else if (normalizedRole === "REVIEWER_1" || normalizedRole === "REVIEWER1" || normalizedRole === "GVPB_KIN") {
    const isRev1 = thesis.reviewer1Id?.toString() === lecIdStr ||
      (Array.isArray(thesis.reviewers) && thesis.reviewers.some(r => (r.lecturerId?.toString() || r.lecturerId?._id?.toString()) === lecIdStr && r.isPrivateReviewer));
    if (!isRev1) {
      throw new AppError("Bạn không được phân công phản biện 1 cho đề tài này", 403);
    }
    thesis.scores.isReviewer1ScoreLocked = Boolean(isLocked);
  } else if (normalizedRole === "REVIEWER_2" || normalizedRole === "REVIEWER2" || normalizedRole === "GVPB_HOIDONG") {
    const isRev2 = thesis.reviewer2Id?.toString() === lecIdStr ||
      (Array.isArray(thesis.reviewers) && thesis.reviewers.some(r => (r.lecturerId?.toString() || r.lecturerId?._id?.toString()) === lecIdStr && r.isCouncilReviewer));
    if (!isRev2) {
      throw new AppError("Bạn không được phân công phản biện hội đồng cho đề tài này", 403);
    }
    thesis.scores.isReviewer2ScoreLocked = Boolean(isLocked);
  }

  await thesis.save();
  return thesis;
};

// ====================
// Toggle All Scores Lock for Assigned Theses
// ====================
const toggleAllThesisScoresLock = async ({ academicTermId, roleType = "SUPERVISOR", isLocked, userId }) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const lecId = lecturer._id;
  const normalizedRole = roleType?.toUpperCase() || "SUPERVISOR";

  const query = { status: { $ne: "COMPLETED" } };
  if (academicTermId) query.academicTermId = academicTermId;

  let updateField = "";
  if (normalizedRole === "SUPERVISOR" || normalizedRole === "GVHD") {
    query.supervisorId = lecId;
    updateField = "scores.isSupervisorScoreLocked";
  } else if (normalizedRole === "REVIEWER_1" || normalizedRole === "REVIEWER1" || normalizedRole === "GVPB_KIN") {
    query.$or = [{ reviewer1Id: lecId }, { "reviewers.lecturerId": lecId, "reviewers.isPrivateReviewer": true }];
    updateField = "scores.isReviewer1ScoreLocked";
  } else if (normalizedRole === "REVIEWER_2" || normalizedRole === "REVIEWER2" || normalizedRole === "GVPB_HOIDONG") {
    query.$or = [{ reviewer2Id: lecId }, { "reviewers.lecturerId": lecId, "reviewers.isCouncilReviewer": true }];
    updateField = "scores.isReviewer2ScoreLocked";
  }

  if (updateField) {
    await Thesis.updateMany(query, { $set: { [updateField]: Boolean(isLocked) } });
  } else {
    await Thesis.updateMany({ ...query, supervisorId: lecId }, { $set: { "scores.isSupervisorScoreLocked": Boolean(isLocked) } });
    await Thesis.updateMany({ ...query, reviewer1Id: lecId }, { $set: { "scores.isReviewer1ScoreLocked": Boolean(isLocked) } });
    await Thesis.updateMany({ ...query, reviewer2Id: lecId }, { $set: { "scores.isReviewer2ScoreLocked": Boolean(isLocked) } });
  }

  return { success: true, isLocked: Boolean(isLocked) };
};

// ==========================================
// PHASE 12: THESIS EVALUATION & FINAL SCORE
// ==========================================

// ====================
// 1. Get Theses For Evaluation (AcademicTerm-aware)
// ====================
const getThesesForEvaluation = async ({ search = "", status = "ALL", academicTermId = "" } = {}) => {
  // All active theses with supervisor assigned, excluding REJECTED
  const baseQuery = {
    supervisorId: { $ne: null },
    status: { $ne: "REJECTED" },
  };

  if (academicTermId && academicTermId !== "ALL") {
    baseQuery.academicTermId = academicTermId;
  }

  if (status && status !== "ALL") {
    baseQuery.status = status;
  }

  // Multi-field search
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");

    // Match students
    const matchingStudents = await Student.find({
      $or: [{ studentCode: regex }],
    }).select("_id");

    const matchingUsers = await Student.find()
      .populate({
        path: "userId",
        match: { fullName: regex },
        select: "_id",
      })
      .then((docs) => docs.filter((d) => d.userId).map((d) => d._id));

    const allStudentIds = [
      ...matchingStudents.map((s) => s._id),
      ...matchingUsers,
    ];

    // Match lecturers (supervisor or reviewer)
    const matchingLecturers = await Lecturer.find()
      .populate({
        path: "userId",
        match: { fullName: regex },
        select: "_id",
      })
      .then((docs) => docs.filter((d) => d.userId).map((d) => d._id));

    if (!baseQuery.$and) {
      baseQuery.$and = [];
    }
    baseQuery.$and.push({
      $or: [
        { thesisTitle: regex },
        { studentId: { $in: allStudentIds } },
        { secondStudentId: { $in: allStudentIds } },
        { supervisorId: { $in: matchingLecturers } },
        { reviewer1Id: { $in: matchingLecturers } },
        { reviewer2Id: { $in: matchingLecturers } },
        { "reviewers.lecturerId": { $in: matchingLecturers } },
      ],
    });
  }

  const theses = await Thesis.find(baseQuery)
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
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .lean();

  const allEligibleQuery = {
    supervisorId: { $ne: null },
    status: { $ne: "REJECTED" },
  };
  if (academicTermId && academicTermId !== "ALL") {
    allEligibleQuery.academicTermId = academicTermId;
  }
  const allEligible = await Thesis.find(allEligibleQuery).lean();

  const totalEligible = allEligible.length;
  const gradedCount = allEligible.filter((t) => t.status === "GRADED").length;
  const completedCount = allEligible.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const pendingGradeCount = allEligible.filter((t) => {
    const s = t.scores;
    const scoreHD = s?.supervisorScore ?? s?.student1SupervisorScore;
    if (scoreHD === null || scoreHD === undefined) return true;
    const isAssignedPB1 = Boolean(
      t.reviewer1Id ||
      (Array.isArray(t.reviewers) && t.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
    );
    const isAssignedPB2 = Boolean(
      t.reviewer2Id ||
      (Array.isArray(t.reviewers) && t.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
    );
    const s1 = s?.reviewer1Score ?? s?.student1Reviewer1Score;
    const s2 = s?.reviewer2Score ?? s?.student1Reviewer2Score;
    const hasPB1 = s1 !== null && s1 !== undefined;
    const hasPB2 = s2 !== null && s2 !== undefined;

    if (isAssignedPB1 && isAssignedPB2) {
      if (!hasPB1 || !hasPB2) return true;
    } else if (isAssignedPB1) {
      if (!hasPB1) return true;
    } else if (isAssignedPB2) {
      if (!hasPB2) return true;
    } else {
      return true;
    }
    return false;
  }).length;

  return {
    theses,
    stats: {
      totalEligible,
      gradedCount,
      completedCount,
      pendingGradeCount,
    },
  };
};

// ====================
// 2. TBM Completes Thesis Evaluation
// ====================
const completeThesisEvaluation = async (thesisId, tbmUserId) => {
  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "REJECTED") {
    throw new AppError("Đề tài đã bị từ chối, không thể hoàn tất đánh giá.", 400);
  }

  const isAssignedPB1 = Boolean(
    thesis.reviewer1Id ||
    (Array.isArray(thesis.reviewers) && thesis.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
  );
  const isAssignedPB2 = Boolean(
    thesis.reviewer2Id ||
    (Array.isArray(thesis.reviewers) && thesis.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
  );
  const hasPB1 = thesis.scores?.reviewer1Score !== null && thesis.scores?.reviewer1Score !== undefined;
  const hasPB2 = thesis.scores?.reviewer2Score !== null && thesis.scores?.reviewer2Score !== undefined;

  let isPBDone = false;
  if (isAssignedPB1 && isAssignedPB2) {
    isPBDone = hasPB1 && hasPB2;
  } else if (isAssignedPB1) {
    isPBDone = hasPB1;
  } else if (isAssignedPB2) {
    isPBDone = hasPB2;
  }

  if (
    !thesis.scores ||
    thesis.scores.supervisorScore === null ||
    !isPBDone ||
    thesis.scores.finalScore === null
  ) {
    throw new AppError(
      "Đề tài chưa được chấm đầy đủ điểm (GVHD, GVPB, Hội đồng) để hoàn tất",
      400,
    );
  }

  thesis.status = "COMPLETED";
  await thesis.save();

  return await Thesis.findById(thesis._id)
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
    });
};

// ==========================================
// 8. KLTN Topic Management (GV -> TBM -> SV FIFO)
// ==========================================

/**
 * Giảng viên tạo danh sách nhiều đề tài KLTN cùng lúc (hỗ trợ array hoặc string ngăn cách dòng/dấu phẩy)
 */
const batchCreateTopicsByLecturer = async ({
  userId,
  topics = [],
  topicListRaw = "",
  defaultMaxGroups = 1,
  defaultDescription = "",
  academicTermId = null,
}) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên tương ứng với tài khoản này", 404);
  }

  // Resolve active term
  if (!academicTermId) {
    throw new AppError("Vui lòng chọn học kỳ áp dụng cho danh sách đề tài", 400);
  }

  const validTerm = await AcademicTerm.findById(academicTermId);
  if (!validTerm) {
    throw new AppError("Học kỳ được chọn không tồn tại trong hệ thống", 404);
  }
  if (validTerm.status === "CLOSED") {
    throw new AppError("Học kỳ này đã kết thúc (CLOSED). Giảng viên chỉ được xem lại dữ liệu, không thể tạo hoặc đề xuất thêm đề tài mới.", 400);
  }
  const termId = validTerm._id;

  const topicDocs = [];

  // 1. Process array of topic objects if provided
  if (Array.isArray(topics) && topics.length > 0) {
    for (const item of topics) {
      const title = (typeof item === "string" ? item : item.title || "").trim();
      if (!title) continue;

      const desc = (typeof item === "object" ? item.description : "") || defaultDescription || null;

      topicDocs.push({
        title,
        supervisorId: lecturer._id,
        academicTermId: termId,
        maxGroups: 1,
        currentGroups: 0,
        description: desc,
        status: "PENDING",
      });
    }
  }

  // 2. Process raw string input (split by newlines or commas)
  if (topicListRaw && typeof topicListRaw === "string" && topicListRaw.trim()) {
    // If text contains newlines, split by line; otherwise split by comma
    const rawLines = topicListRaw.includes("\n")
      ? topicListRaw.split(/\r?\n/)
      : topicListRaw.split(/[,;\n]/);

    for (const line of rawLines) {
      const title = line.trim().replace(/^[-*•\d.)\s]+/, "").trim();
      if (!title || title.length < 3) continue;

      topicDocs.push({
        title,
        supervisorId: lecturer._id,
        academicTermId: termId,
        maxGroups: 1,
        currentGroups: 0,
        description: defaultDescription || null,
        status: "PENDING",
      });
    }
  }

  if (topicDocs.length === 0) {
    throw new AppError("Vui lòng nhập ít nhất một tên đề tài hợp lệ", 400);
  }

  const createdTopics = await ThesisTopic.insertMany(topicDocs);

  // Notify TBM
  try {
    const tbms = await User.find({ role: "TBM", isActive: true });
    for (const tbm of tbms) {
      await notificationService.createNotification({
        recipientId: tbm._id,
        type: "THESIS",
        title: "Đề xuất đề tài KLTN mới",
        message: `Giảng viên ${lecturer.userId?.fullName || lecturer.lecturerCode} vừa gửi ${createdTopics.length} đề tài KLTN chờ duyệt.`,
        link: "/tbm/theses",
      });
    }
  } catch (err) {
    console.warn("Failed to notify TBM on topic creation:", err.message);
  }

  return createdTopics;
};

/**
 * Giảng viên xem danh sách đề tài do mình tạo
 */
const getMyCreatedTopics = async ({ userId, academicTermId = null, status = null }) => {
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const query = { supervisorId: lecturer._id };
  if (academicTermId) query.academicTermId = academicTermId;
  if (status && status !== "ALL") query.status = status;

  return await ThesisTopic.find(query)
    .populate("academicTermId", "code name")
    .populate({
      path: "registeredGroups.studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "registeredGroups.secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("registeredGroups.thesisId", "status scores finalScore")
    .sort({ createdAt: -1 });
};

/**
 * TBM xem danh sách tất cả đề tài do các GV gửi lên
 */
const getTopicsForTbm = async ({ status = null, academicTermId = null, search = "", supervisorId = null }) => {
  const query = {};
  if (status && status !== "ALL") query.status = status;
  if (academicTermId) query.academicTermId = academicTermId;
  if (supervisorId) query.supervisorId = supervisorId;

  if (search && search.trim()) {
    const rawSearch = search.trim();
    const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = { $regex: escapedSearch, $options: "i" };

    // 1. Tìm Users (fullName, email, username)
    const matchingUsers = await User.find({
      $or: [
        { fullName: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ],
    }).select("_id");
    const userIds = matchingUsers.map((u) => u._id);

    // 2. Tìm Giảng viên (lecturerCode, academicTitle, specialization, hoặc userId match)
    const matchingLecturers = await Lecturer.find({
      $or: [
        { lecturerCode: searchRegex },
        { academicTitle: searchRegex },
        { department: searchRegex },
        { specialization: searchRegex },
        { userId: { $in: userIds } },
      ],
    }).select("_id");
    const lecturerIds = matchingLecturers.map((l) => l._id);

    // 3. Tìm Sinh viên (studentCode, className hoặc userId match)
    const matchingStudents = await Student.find({
      $or: [
        { studentCode: searchRegex },
        { className: searchRegex },
        { userId: { $in: userIds } },
      ],
    }).select("_id");
    const studentIds = matchingStudents.map((s) => s._id);

    // Kết hợp tìm kiếm đa trường
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { supervisorId: { $in: lecturerIds } },
      { "registeredGroups.studentCode": searchRegex },
      { "registeredGroups.secondStudentCode": searchRegex },
      { "registeredGroups.studentId": { $in: studentIds } },
      { "registeredGroups.secondStudentId": { $in: studentIds } },
    ];
  }

  return await ThesisTopic.find(query)
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId", "code name")
    .populate({
      path: "registeredGroups.studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "registeredGroups.secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .sort({ createdAt: -1 });
};

/**
 * TBM phê duyệt đề tài
 */
const approveTopicByTbm = async (topicId, tbmUserId) => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  topic.status = "APPROVED";
  topic.approvedAt = new Date();
  topic.approvedBy = tbmUserId || null;
  topic.rejectionReason = null;
  topic.rejectedAt = null;
  await topic.save();

  // Notify supervisor
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: tbmUserId || null,
        type: "THESIS",
        title: "Đề tài KLTN đã được duyệt",
        message: `Đề tài "${topic.title}" của bạn đã được Trưởng Bộ Môn phê duyệt và mở cho sinh viên đăng ký.`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on topic approval:", err.message);
  }

  return topic;
};

/**
 * TBM từ chối đề tài
 */
const rejectTopicByTbm = async (topicId, tbmUserId, reason = "") => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  topic.status = "REJECTED";
  topic.rejectedAt = new Date();
  topic.approvedBy = tbmUserId || null;
  topic.rejectionReason = reason?.trim() || "Chưa đạt yêu cầu chuyên môn";
  await topic.save();

  // Notify supervisor
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: tbmUserId || null,
        type: "THESIS",
        title: "Đề tài KLTN bị từ chối",
        message: `Đề tài "${topic.title}" chưa được phê duyệt: ${topic.rejectionReason}`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on topic rejection:", err.message);
  }

  return topic;
};

/**
 * Cập nhật thông tin đề tài trực tiếp (TBM hoặc ADMIN)
 */
const updateTopic = async (topicId, userId, updateData = {}) => {
  const topic = await ThesisTopic.findById(topicId);
  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  if (updateData.title && updateData.title.trim()) {
    topic.title = updateData.title.trim();
  }
  if (updateData.description !== undefined) {
    topic.description = updateData.description ? updateData.description.trim() : null;
  }
  if (updateData.status && ["PENDING", "APPROVED", "REJECTED"].includes(updateData.status)) {
    topic.status = updateData.status;
  }

  await topic.save();

  // Đồng bộ tiêu đề sang Thesis nếu đã có nhóm sinh viên đăng ký
  if (updateData.title && topic.registeredGroups && topic.registeredGroups.length > 0) {
    const thesisIds = topic.registeredGroups.map((g) => g.thesisId).filter(Boolean);
    if (thesisIds.length > 0) {
      await Thesis.updateMany({ _id: { $in: thesisIds } }, { thesisTitle: topic.title });
    }
  }

  return topic;
};

/**
 * Giảng viên gửi yêu cầu chỉnh sửa đề tài đến TBM
 */
const requestEditTopicByLecturer = async (topicId, userId, { title, description }) => {
  if (!title || !title.trim()) {
    throw new AppError("Tên đề tài không được để trống", 400);
  }

  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  const topic = await ThesisTopic.findById(topicId);

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  // Check ownership (if lecturer role)
  if (lecturer && topic.supervisorId?.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không có quyền chỉnh sửa đề tài này", 403);
  }

  topic.editRequest = {
    newTitle: title.trim(),
    newDescription: description !== undefined ? (description ? description.trim() : null) : topic.description,
    requestedAt: new Date(),
    status: "PENDING",
    rejectReason: null,
    reviewedAt: null,
    reviewedBy: null,
  };

  await topic.save();

  // Gửi thông báo đến tất cả TBM
  try {
    const tbms = await User.find({ role: "TBM", isActive: true });
    const lecName = lecturer?.userId?.fullName || lecturer?.lecturerCode || "Giảng viên";
    for (const tbm of tbms) {
      await notificationService.createNotification({
        recipientId: tbm._id,
        senderId: userId || null,
        type: "THESIS",
        title: "Yêu cầu chỉnh sửa đề tài KLTN",
        message: `Giảng viên ${lecName} đã gửi yêu cầu chỉnh sửa đề tài "${topic.title}". Vui lòng xem xét và duyệt.`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/tbm/theses?tab=proposed",
      });
    }
  } catch (err) {
    console.warn("Notification error on topic edit request:", err.message);
  }

  return topic;
};

/**
 * Giảng viên gửi yêu cầu xóa đề tài đến TBM
 */
const requestDeleteTopicByLecturer = async (topicId, userId, { reason = "" } = {}) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  const topic = await ThesisTopic.findById(topicId);

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  if (lecturer && topic.supervisorId?.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không có quyền xóa đề tài này", 403);
  }

  topic.deleteRequest = {
    reason: reason?.trim() || "Giảng viên yêu cầu xóa đề tài",
    requestedAt: new Date(),
    status: "PENDING",
    rejectReason: null,
    reviewedAt: null,
    reviewedBy: null,
  };

  await topic.save();

  // Gửi thông báo đến tất cả TBM
  try {
    const tbms = await User.find({ role: "TBM", isActive: true });
    const lecName = lecturer?.userId?.fullName || lecturer?.lecturerCode || "Giảng viên";
    for (const tbm of tbms) {
      await notificationService.createNotification({
        recipientId: tbm._id,
        senderId: userId || null,
        type: "THESIS",
        title: "Yêu cầu xóa đề tài KLTN",
        message: `Giảng viên ${lecName} đã gửi yêu cầu xóa đề tài "${topic.title}". Vui lòng xem xét và duyệt.`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/tbm/theses?tab=proposed",
      });
    }
  } catch (err) {
    console.warn("Notification error on topic delete request:", err.message);
  }

  return topic;
};

/**
 * TBM phê duyệt yêu cầu chỉnh sửa đề tài
 */
const approveEditTopicByTbm = async (topicId, tbmUserId) => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  if (!topic.editRequest || topic.editRequest.status !== "PENDING") {
    throw new AppError("Đề tài không có yêu cầu chỉnh sửa đang chờ duyệt", 400);
  }

  const oldTitle = topic.title;
  const newTitle = topic.editRequest.newTitle;
  const newDesc = topic.editRequest.newDescription;

  topic.title = newTitle;
  if (newDesc !== undefined) {
    topic.description = newDesc;
  }

  topic.editRequest.status = "APPROVED";
  topic.editRequest.reviewedAt = new Date();
  topic.editRequest.reviewedBy = tbmUserId || null;

  await topic.save();

  // Đồng bộ tiêu đề sang Thesis nếu đã có nhóm sinh viên đăng ký và thông báo cho sinh viên
  if (topic.registeredGroups && topic.registeredGroups.length > 0) {
    const thesisIds = topic.registeredGroups.map((g) => g.thesisId).filter(Boolean);
    if (thesisIds.length > 0) {
      await Thesis.updateMany({ _id: { $in: thesisIds } }, { thesisTitle: topic.title });

      try {
        const theses = await Thesis.find({ _id: { $in: thesisIds } })
          .populate({ path: "studentId", populate: { path: "userId" } })
          .populate({ path: "secondStudentId", populate: { path: "userId" } });

        for (const th of theses) {
          const s1UserId = th.studentId?.userId?._id || th.studentId?.userId;
          if (s1UserId) {
            await notificationService.createNotification({
              recipientId: s1UserId,
              senderId: tbmUserId || null,
              type: "THESIS",
              title: "Đề tài khóa luận đã được cập nhật",
              message: `Đề tài khóa luận "${oldTitle}" của bạn đã được đổi tên thành "${newTitle}".`,
              referenceId: th._id,
              referenceModel: "Thesis",
              link: "/student/thesis",
            });
          }
          const s2UserId = th.secondStudentId?.userId?._id || th.secondStudentId?.userId;
          if (s2UserId) {
            await notificationService.createNotification({
              recipientId: s2UserId,
              senderId: tbmUserId || null,
              type: "THESIS",
              title: "Đề tài khóa luận đã được cập nhật",
              message: `Đề tài khóa luận "${oldTitle}" của bạn đã được đổi tên thành "${newTitle}".`,
              referenceId: th._id,
              referenceModel: "Thesis",
              link: "/student/thesis",
            });
          }
        }
      } catch (stErr) {
        console.warn("Notification error to students on topic edit:", stErr.message);
      }
    }
  }

  // Gửi thông báo đến GVHD
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: tbmUserId || null,
        type: "THESIS",
        title: "Yêu cầu chỉnh sửa đề tài đã được duyệt",
        message: `Yêu cầu đổi tên đề tài từ "${oldTitle}" thành "${newTitle}" của bạn đã được Trưởng Bộ Môn phê duyệt.`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on approve topic edit:", err.message);
  }

  return topic;
};

/**
 * TBM từ chối yêu cầu chỉnh sửa đề tài
 */
const rejectEditTopicByTbm = async (topicId, tbmUserId, reason = "") => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  if (!topic.editRequest || topic.editRequest.status !== "PENDING") {
    throw new AppError("Đề tài không có yêu cầu chỉnh sửa đang chờ duyệt", 400);
  }

  topic.editRequest.status = "REJECTED";
  topic.editRequest.rejectReason = reason?.trim() || "Chưa đạt yêu cầu";
  topic.editRequest.reviewedAt = new Date();
  topic.editRequest.reviewedBy = tbmUserId || null;

  await topic.save();

  // Gửi thông báo đến GVHD
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: tbmUserId || null,
        type: "THESIS",
        title: "Yêu cầu chỉnh sửa đề tài bị từ chối",
        message: `Yêu cầu chỉnh sửa đề tài "${topic.title}" của bạn đã bị từ chối: ${topic.editRequest.rejectReason}`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on reject topic edit:", err.message);
  }

  return topic;
};

/**
 * TBM phê duyệt yêu cầu xóa đề tài
 */
const approveDeleteTopicByTbm = async (topicId, tbmUserId) => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  if (!topic.deleteRequest || topic.deleteRequest.status !== "PENDING") {
    throw new AppError("Đề tài không có yêu cầu xóa đang chờ duyệt", 400);
  }

  const topicTitle = topic.title;

  // Gửi thông báo đến GVHD trước khi xóa
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: tbmUserId || null,
        type: "THESIS",
        title: "Yêu cầu xóa đề tài đã được duyệt",
        message: `Yêu cầu xóa đề tài "${topicTitle}" của bạn đã được Trưởng Bộ Môn phê duyệt. Đề tài đã được xóa khỏi hệ thống.`,
        referenceId: null,
        referenceModel: null,
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on approve topic delete:", err.message);
  }

  // Xóa các Thesis tạo từ topic này (nếu có), giải phóng trạng thái đăng ký của sinh viên và gửi thông báo
  if (topic.registeredGroups && topic.registeredGroups.length > 0) {
    const thesisIds = topic.registeredGroups.map((g) => g.thesisId).filter(Boolean);
    if (thesisIds.length > 0) {
      try {
        const theses = await Thesis.find({ _id: { $in: thesisIds } })
          .populate({ path: "studentId", populate: { path: "userId" } })
          .populate({ path: "secondStudentId", populate: { path: "userId" } });

        for (const th of theses) {
          // Reset trạng thái đăng ký của SV1
          if (th.studentId?._id) {
            await Student.findByIdAndUpdate(th.studentId._id, { thesisRegistered: false });
          }
          const s1UserId = th.studentId?.userId?._id || th.studentId?.userId;
          if (s1UserId) {
            await notificationService.createNotification({
              recipientId: s1UserId,
              senderId: tbmUserId || null,
              type: "THESIS",
              title: "Đề tài khóa luận đã bị xóa",
              message: `Đề tài "${topicTitle}" mà bạn đã đăng ký đã được xóa bởi Trưởng Bộ Môn. Vui lòng chọn và đăng ký đề tài khác.`,
              referenceId: null,
              referenceModel: null,
              link: "/student/thesis/register",
            });
          }

          // Reset trạng thái đăng ký của SV2 (nếu có)
          if (th.secondStudentId?._id) {
            await Student.findByIdAndUpdate(th.secondStudentId._id, { thesisRegistered: false });
          }
          const s2UserId = th.secondStudentId?.userId?._id || th.secondStudentId?.userId;
          if (s2UserId) {
            await notificationService.createNotification({
              recipientId: s2UserId,
              senderId: tbmUserId || null,
              type: "THESIS",
              title: "Đề tài khóa luận đã bị xóa",
              message: `Đề tài "${topicTitle}" mà bạn đã đăng ký đã được xóa bởi Trưởng Bộ Môn. Vui lòng chọn và đăng ký đề tài khác.`,
              referenceId: null,
              referenceModel: null,
              link: "/student/thesis/register",
            });
          }

          await Thesis.findByIdAndDelete(th._id);
        }
      } catch (stErr) {
        console.warn("Error handling students on topic delete approval:", stErr.message);
      }
    }
  }

  await ThesisTopic.findByIdAndDelete(topicId);

  return { success: true, message: `Đã phê duyệt xóa đề tài "${topicTitle}" thành công` };
};

/**
 * TBM từ chối yêu cầu xóa đề tài
 */
const rejectDeleteTopicByTbm = async (topicId, tbmUserId, reason = "") => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  if (!topic.deleteRequest || topic.deleteRequest.status !== "PENDING") {
    throw new AppError("Đề tài không có yêu cầu xóa đang chờ duyệt", 400);
  }

  topic.deleteRequest.status = "REJECTED";
  topic.deleteRequest.rejectReason = reason?.trim() || "Không đồng ý xóa đề tài";
  topic.deleteRequest.reviewedAt = new Date();
  topic.deleteRequest.reviewedBy = tbmUserId || null;

  await topic.save();

  // Gửi thông báo đến GVHD
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: tbmUserId || null,
        type: "THESIS",
        title: "Yêu cầu xóa đề tài bị từ chối",
        message: `Yêu cầu xóa đề tài "${topic.title}" của bạn đã bị từ chối: ${topic.deleteRequest.rejectReason}`,
        referenceId: topic._id,
        referenceModel: "ThesisTopic",
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on reject topic delete:", err.message);
  }

  return topic;
};

/**
 * Xóa đề tài trực tiếp (TBM hoặc GVHD) - Tự động gửi thông báo cho GVHD và SV
 */
const deleteTopic = async (topicId, userId) => {
  const topic = await ThesisTopic.findById(topicId).populate({
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email" },
  });

  if (!topic) {
    throw new AppError("Không tìm thấy đề tài yêu cầu", 404);
  }

  const topicTitle = topic.title;

  // Gửi thông báo cho Giảng viên hướng dẫn của đề tài
  try {
    let recipientUserId = topic.supervisorId?.userId?._id || topic.supervisorId?.userId;
    if (!recipientUserId && topic.supervisorId) {
      const lec = await Lecturer.findById(topic.supervisorId).select("userId");
      recipientUserId = lec?.userId;
    }

    if (recipientUserId) {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        senderId: userId || null,
        type: "THESIS",
        title: "Đề tài KLTN đã bị xóa",
        message: `Đề tài "${topicTitle}" của bạn đã bị xóa khỏi hệ thống.`,
        referenceId: null,
        referenceModel: null,
        link: "/lecturer/theses?tab=topics",
      });
    }
  } catch (err) {
    console.warn("Notification error on topic deletion:", err.message);
  }

  // Xóa các Thesis tạo từ topic này (nếu có), giải phóng sinh viên và gửi thông báo
  if (topic.registeredGroups && topic.registeredGroups.length > 0) {
    const thesisIds = topic.registeredGroups.map((g) => g.thesisId).filter(Boolean);
    if (thesisIds.length > 0) {
      try {
        const theses = await Thesis.find({ _id: { $in: thesisIds } })
          .populate({ path: "studentId", populate: { path: "userId" } })
          .populate({ path: "secondStudentId", populate: { path: "userId" } });

        for (const th of theses) {
          if (th.studentId?._id) {
            await Student.findByIdAndUpdate(th.studentId._id, { thesisRegistered: false });
          }
          const s1UserId = th.studentId?.userId?._id || th.studentId?.userId;
          if (s1UserId) {
            await notificationService.createNotification({
              recipientId: s1UserId,
              senderId: userId || null,
              type: "THESIS",
              title: "Đề tài khóa luận đã bị xóa",
              message: `Đề tài "${topicTitle}" mà bạn đã đăng ký đã bị xóa. Vui lòng chọn và đăng ký đề tài khác.`,
              referenceId: null,
              referenceModel: null,
              link: "/student/thesis/register",
            });
          }

          if (th.secondStudentId?._id) {
            await Student.findByIdAndUpdate(th.secondStudentId._id, { thesisRegistered: false });
          }
          const s2UserId = th.secondStudentId?.userId?._id || th.secondStudentId?.userId;
          if (s2UserId) {
            await notificationService.createNotification({
              recipientId: s2UserId,
              senderId: userId || null,
              type: "THESIS",
              title: "Đề tài khóa luận đã bị xóa",
              message: `Đề tài "${topicTitle}" mà bạn đã đăng ký đã bị xóa. Vui lòng chọn và đăng ký đề tài khác.`,
              referenceId: null,
              referenceModel: null,
              link: "/student/thesis/register",
            });
          }

          await Thesis.findByIdAndDelete(th._id);
        }
      } catch (stErr) {
        console.warn("Error handling students on direct topic delete:", stErr.message);
      }
    }
  }

  await ThesisTopic.findByIdAndDelete(topicId);

  return { success: true, message: `Đề tài "${topicTitle}" đã bị xóa thành công` };
};

/**
 * Sinh viên xem danh sách đề tài APPROVED
 */
const getApprovedTopicsForStudent = async ({ academicTermId = null, search = "", userId = null }) => {
  let student = null;
  if (userId) {
    student = await Student.findOne({ userId });
  }

  // 1. Identify active/open academic term for registration
  let targetTerm = null;
  if (academicTermId) {
    targetTerm = await AcademicTerm.findById(academicTermId).lean();
  }
  if (!targetTerm) {
    try {
      targetTerm = await academicTermService.getCurrentAcademicTerm(new Date());
    } catch (e) {
      // ignore
    }
  }

  // If no term is found
  if (!targetTerm) {
    return [];
  }

  // Student can ONLY see topics when registration is actually OPEN for that term
  if (student) {
    if (targetTerm.status === "CLOSED") {
      return [];
    }

    const now = new Date();
    const isLocked = Boolean(targetTerm.thesis?.isRegistrationLocked);
    let isExpired = false;
    let isUpcoming = false;

    if (targetTerm.thesis?.registrationStart) {
      const start = new Date(targetTerm.thesis.registrationStart);
      if (now < start) isUpcoming = true;
    }
    if (targetTerm.thesis?.registrationEnd) {
      let end = new Date(targetTerm.thesis.registrationEnd);
      if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
      }
      if (now > end) isExpired = true;
    }

    if (isLocked || isExpired || isUpcoming) {
      return [];
    }
  }

  // Strictly filter by this specific academic term:
  const query = {
    status: "APPROVED",
    academicTermId: targetTerm._id,
  };
  const andConditions = [];

  if (search && search.trim()) {
    const q = search.trim();

    // Find matched users (Lecturers)
    const matchedUsers = await User.find({
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).select("_id");
    const userIds = matchedUsers.map((u) => u._id);

    // Find matched lecturers
    const matchedLecturers = await Lecturer.find({
      $or: [
        { userId: { $in: userIds } },
        { lecturerCode: { $regex: q, $options: "i" } },
        { academicTitle: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
        { specialization: { $regex: q, $options: "i" } },
      ],
    }).select("_id");
    const matchedSupervisorIds = matchedLecturers.map((l) => l._id);

    andConditions.push({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { supervisorId: { $in: matchedSupervisorIds } },
      ],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  const topics = await ThesisTopic.find(query)
    .populate({
      path: "supervisorId",
      select: "lecturerCode academicTitle department specialization userId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId", "code name academicYear")
    .sort({ createdAt: -1 });

  return topics.map((t) => {
    const isFull = t.currentGroups >= t.maxGroups;
    const isRegisteredByMe = student
      ? t.registeredGroups?.some(
          (g) =>
            g.studentId?.toString() === student._id.toString() ||
            g.secondStudentId?.toString() === student._id.toString()
        )
      : false;

    return {
      _id: t._id,
      title: t.title,
      description: t.description,
      maxGroups: t.maxGroups,
      currentGroups: t.currentGroups,
      isFull,
      availableSlots: Math.max(0, t.maxGroups - t.currentGroups),
      status: isFull ? "FULL" : "AVAILABLE",
      supervisorId: t.supervisorId,
      supervisor: {
        _id: t.supervisorId?._id,
        fullName: t.supervisorId?.userId?.fullName || "Chưa cập nhật",
        lecturerCode: t.supervisorId?.lecturerCode || "",
        academicTitle: t.supervisorId?.academicTitle || "",
        email: t.supervisorId?.userId?.email || "",
      },
      academicTerm: t.academicTermId,
      isRegisteredByMe,
      createdAt: t.createdAt,
    };
  });
};

/**
 * Sinh viên chọn đề tài (FIFO Database Atomic Registration)
 */
const registerTopicByStudent = async ({
  userId,
  topicId,
  studentCount = 1,
  secondStudentCode = null,
  secondStudentId = null,
}) => {
  // 1. Identify SV1
  const student1 = await Student.findOne({ userId }).populate("userId");
  if (!student1) {
    throw new AppError("Không tìm thấy thông tin sinh viên đăng ký", 404);
  }

  // 2. Identify Topic and its Academic Term
  const topicToRegister = await ThesisTopic.findById(topicId);
  if (!topicToRegister) {
    throw new AppError("Đề tài không tồn tại trong hệ thống", 404);
  }
  if (topicToRegister.status !== "APPROVED") {
    throw new AppError("Đề tài này chưa được Trưởng Bộ Môn phê duyệt để đăng ký", 400);
  }
  if (!topicToRegister.academicTermId) {
    throw new AppError("Đề tài chưa được gán học kỳ áp dụng hợp lệ", 400);
  }

  const topicTerm = await AcademicTerm.findById(topicToRegister.academicTermId);
  if (!topicTerm) {
    throw new AppError("Không tìm thấy học kỳ tương ứng với đề tài này", 404);
  }

  // 3. Validate Registration Window & Lock Status for this specific term
  validateThesisRegistrationWindow(topicTerm);

  // 4. Check SV1 has NO active thesis in this term
  const sv1ActiveThesis = await Thesis.findOne({
    academicTermId: topicTerm._id,
    $or: [{ studentId: student1._id }, { secondStudentId: student1._id }],
    status: { $in: ACTIVE_THESIS_STATUSES },
  });

  if (sv1ActiveThesis) {
    throw new AppError(
      `Sinh viên ${student1.userId?.fullName || student1.studentCode} đã đăng ký đề tài khóa luận ("${sv1ActiveThesis.thesisTitle}") trong học kỳ này`,
      409
    );
  }

  // Also check in ThesisTopic registeredGroups
  const sv1TopicReg = await ThesisTopic.findOne({
    academicTermId: topicTerm._id,
    $or: [
      { "registeredGroups.studentId": student1._id },
      { "registeredGroups.secondStudentId": student1._id },
    ],
  });

  if (sv1TopicReg) {
    throw new AppError(
      `Sinh viên ${student1.userId?.fullName || student1.studentCode} đã đăng ký đề tài "${sv1TopicReg.title}" trong học kỳ này`,
      409
    );
  }

  // 5. Handle 2-Student Group Registration
  let student2 = null;
  const isTwoStudents = Number(studentCount) === 2;

  if (isTwoStudents) {
    if (secondStudentId) {
      student2 = await Student.findById(secondStudentId).populate("userId");
    } else if (secondStudentCode && secondStudentCode.trim()) {
      student2 = await Student.findOne({
        studentCode: secondStudentCode.trim().toUpperCase(),
      }).populate("userId");
    }

    if (!student2) {
      throw new AppError("Vui lòng chọn hoặc nhập MSSV hợp lệ của sinh viên thứ hai", 400);
    }

    if (student2._id.toString() === student1._id.toString()) {
      throw new AppError("Sinh viên thứ hai không được trùng với sinh viên thứ nhất", 400);
    }

    // Check SV2 has NO active thesis in this term
    const sv2ActiveThesis = await Thesis.findOne({
      academicTermId: topicTerm._id,
      $or: [{ studentId: student2._id }, { secondStudentId: student2._id }],
      status: { $in: ACTIVE_THESIS_STATUSES },
    });

    if (sv2ActiveThesis) {
      throw new AppError(
        `Sinh viên thứ hai (${student2.userId?.fullName || student2.studentCode}) đã tham gia đề tài "${sv2ActiveThesis.thesisTitle}" trong học kỳ này`,
        409
      );
    }

    const sv2TopicReg = await ThesisTopic.findOne({
      academicTermId: topicTerm._id,
      $or: [
        { "registeredGroups.studentId": student2._id },
        { "registeredGroups.secondStudentId": student2._id },
      ],
    });

    if (sv2TopicReg) {
      throw new AppError(
        `Sinh viên thứ hai (${student2.userId?.fullName || student2.studentCode}) đã đăng ký đề tài "${sv2TopicReg.title}" trong học kỳ này`,
        409
      );
    }
  }

  // 5. ATOMIC FIFO REGISTRATION IN MONGODB
  // Condition: status == APPROVED && currentGroups < maxGroups && student not already in registeredGroups
  const registrationTimestamp = new Date();

  const updatedTopic = await ThesisTopic.findOneAndUpdate(
    {
      _id: topicId,
      status: "APPROVED",
      $expr: { $lt: ["$currentGroups", "$maxGroups"] },
      "registeredGroups.studentId": { $ne: student1._id },
      "registeredGroups.secondStudentId": { $ne: student1._id },
    },
    {
      $inc: { currentGroups: 1 },
      $push: {
        registeredGroups: {
          groupOrder: 0, // updated right below
          studentId: student1._id,
          studentCode: student1.studentCode,
          secondStudentId: student2 ? student2._id : null,
          secondStudentCode: student2 ? student2.studentCode : null,
          registeredAt: registrationTimestamp,
          status: "REGISTERED",
        },
      },
    },
    { returnDocument: "after" }
  );

  if (!updatedTopic) {
    // Determine exact cause for precise Vietnamese error message
    const existing = await ThesisTopic.findById(topicId);
    if (!existing) {
      throw new AppError("Đề tài không tồn tại trong hệ thống", 404);
    }
    if (existing.status !== "APPROVED") {
      throw new AppError("Đề tài này chưa được Trưởng Bộ Môn phê duyệt để đăng ký", 400);
    }
    if (existing.currentGroups >= existing.maxGroups) {
      throw new AppError("Đề tài đã đủ số lượng nhóm đăng ký (FIFO). Vui lòng chọn đề tài khác.", 409);
    }
    throw new AppError("Bạn hoặc thành viên nhóm đã đăng ký đề tài này rồi", 400);
  }

  // 6. Set groupOrder and create synchronized Thesis record
  const groupOrder = updatedTopic.registeredGroups.length;
  const isPendingSv2 = isTwoStudents && student2;
  const initialStatus = isPendingSv2 ? "WAITING_FOR_STUDENT2_CONFIRMATION" : "PENDING_SUPERVISOR_APPROVAL";
  const student2Status = isPendingSv2 ? "PENDING" : null;

  const thesis = await Thesis.create({
    academicTermId: updatedTopic.academicTermId || topicTerm._id,
    studentId: student1._id,
    secondStudentId: student2 ? student2._id : null,
    studentCount: student2 ? 2 : 1,
    student2Status,
    thesisTitle: updatedTopic.title,
    supervisorId: updatedTopic.supervisorId,
    topicId: updatedTopic._id,
    status: initialStatus,
    description: updatedTopic.description,
    submittedAt: isPendingSv2 ? null : new Date(),
    startDate: topicTerm.startDate || null,
    endDate: topicTerm.endDate || null,
  });

  // Link thesisId & groupOrder in topic's registeredGroups entry
  await ThesisTopic.updateOne(
    { _id: updatedTopic._id, "registeredGroups.studentId": student1._id },
    {
      $set: {
        "registeredGroups.$.groupOrder": groupOrder,
        "registeredGroups.$.thesisId": thesis._id,
      },
    }
  );

  // Update student registration status
  await Student.findByIdAndUpdate(student1._id, { thesisRegistered: true });
  if (student2) {
    await Student.findByIdAndUpdate(student2._id, { thesisRegistered: true });
  }

  const sv1Name = student1.userId?.fullName || student1.studentCode;
  const sv1Code = student1.studentCode;

  if (isPendingSv2) {
    // Send notification to SV2 ONLY
    try {
      if (student2.userId?._id) {
        await notificationService.createNotification({
          recipientId: student2.userId._id,
          type: "THESIS",
          title: "Lời mời tham gia nhóm Khóa luận tốt nghiệp",
          message: `Sinh viên ${sv1Name} (${sv1Code}) đã mời bạn tham gia nhóm làm đề tài Khóa luận: "${updatedTopic.title}". Vui lòng vào hệ thống để xác nhận hoặc từ chối.`,
          referenceId: thesis._id,
          referenceModel: "Thesis",
          link: "/student/thesis",
        });
      }
    } catch (err) {
      console.warn("Notification error:", err.message);
    }
  } else {
    // 1 Student: Send notification to supervisor immediately
    try {
      const supervisor = await Lecturer.findById(updatedTopic.supervisorId).populate("userId");
      if (supervisor?.userId?._id) {
        await notificationService.createNotification({
          recipientId: supervisor.userId._id,
          type: "THESIS",
          title: "Sinh viên đăng ký đề tài KLTN - Cần duyệt",
          message: `Sinh viên ${sv1Name} (${sv1Code}) vừa đăng ký đề tài "${updatedTopic.title}". Vui lòng vào duyệt đề tài.`,
          referenceId: thesis._id,
          referenceModel: "Thesis",
          link: "/lecturer/theses",
        });
      }
    } catch (err) {
      console.warn("Notification error:", err.message);
    }
  }

  return {
    topic: updatedTopic,
    thesis,
    groupOrder,
    registeredAt: registrationTimestamp,
  };
};

/**
 * Tìm kiếm sinh viên có trong database để ghép nhóm
 */
const searchStudentsForGroup = async (query, requestingUserId = null) => {
  if (!query || !query.trim()) return [];

  const requestingStudent = requestingUserId
    ? await Student.findOne({ userId: requestingUserId })
    : null;
  const regex = new RegExp(query.trim(), "i");

  // Search by code
  const studentsByCode = await Student.find({
    ...(requestingStudent ? { _id: { $ne: requestingStudent._id } } : {}),
    studentCode: regex,
  })
    .populate("userId", "fullName email phone")
    .limit(10)
    .lean();

  // Search by name from User
  const users = await User.find({
    fullName: regex,
    role: "STUDENT",
    ...(requestingUserId ? { _id: { $ne: requestingUserId } } : {}),
  })
    .select("_id")
    .limit(10);

  const studentsByName = await Student.find({
    userId: { $in: users.map((u) => u._id) },
    ...(requestingStudent ? { _id: { $ne: requestingStudent._id } } : {}),
  })
    .populate("userId", "fullName email phone")
    .limit(10)
    .lean();

  // Merge & deduplicate
  const map = new Map();
  [...studentsByCode, ...studentsByName].forEach((s) => {
    if (s && s._id && s.userId) {
      map.set(s._id.toString(), s);
    }
  });
  const allMatches = Array.from(map.values()).slice(0, 10);

  // Check active thesis for each student
  const activeTheses = await Thesis.find({
    $or: [
      { studentId: { $in: allMatches.map((s) => s._id) } },
      { secondStudentId: { $in: allMatches.map((s) => s._id) } },
    ],
    status: { $in: ACTIVE_THESIS_STATUSES },
  }).select("studentId secondStudentId thesisTitle");

  return allMatches.map((s) => {
    const active = activeTheses.find(
      (t) =>
        t.studentId?.toString() === s._id.toString() ||
        t.secondStudentId?.toString() === s._id.toString()
    );
    return {
      _id: s._id,
      studentCode: s.studentCode,
      fullName: s.userId?.fullName || "—",
      email: s.userId?.email || "—",
      phone: s.userId?.phone || "—",
      className: s.className || "—",
      major: s.major || (s.className?.startsWith("DHCNTT") ? "Công nghệ Thông tin" : s.className?.startsWith("DHKTPM") ? "Kỹ thuật Phần mềm" : s.className?.startsWith("DHKHDL") ? "Khoa học Dữ liệu" : "Công nghệ Thông tin"),
      dateOfBirth: s.dateOfBirth || null,
      gender: s.gender || null,
      gpa: s.gpa || null,
      isInActiveThesis: Boolean(active),
      activeThesisTitle: active?.thesisTitle || null,
    };
  });
};

// ====================
// Thesis Evaluation Criteria Management
// ====================
const DEFAULT_CRITERIA = [
  {
    name: "Đã nộp code",
    description: "Sinh viên đã nộp source code theo yêu cầu của GVHD",
    isRequired: true,
    isActive: true,
    order: 1,
  },
  {
    name: "Đủ báo cáo",
    description: "Sinh viên nộp đầy đủ báo cáo định kỳ theo quy định",
    isRequired: true,
    isActive: true,
    order: 2,
  },
  {
    name: "Đi báo cáo đầy đủ",
    description: "Sinh viên tham gia đầy đủ các buổi gặp và báo cáo tiến độ với GVHD",
    isRequired: true,
    isActive: true,
    order: 3,
  },
  {
    name: "Hoàn thành các yêu cầu của GVHD",
    description: "Sinh viên hoàn thành các nội dung và yêu cầu chuyên môn được GVHD giao",
    isRequired: true,
    isActive: true,
    order: 4,
  },
];

const seedDefaultCriteria = async (academicTermId = null) => {
  const count = await ThesisEvaluationCriteria.countDocuments();
  if (count === 0) {
    const docs = DEFAULT_CRITERIA.map((c) => ({
      ...c,
      academicTermId: academicTermId || null,
    }));
    await ThesisEvaluationCriteria.insertMany(docs);
  }
};

const getThesisEvaluationCriteria = async ({ academicTermId = null, includeInactive = false } = {}) => {
  await seedDefaultCriteria(academicTermId);

  const query = {};
  if (!includeInactive) {
    query.isActive = true;
  }
  if (academicTermId && academicTermId !== "ALL") {
    query.$or = [{ academicTermId }, { academicTermId: null }];
  }

  const criteria = await ThesisEvaluationCriteria.find(query)
    .sort({ order: 1, createdAt: 1 })
    .populate("createdBy", "fullName email");

  return criteria;
};

const createThesisEvaluationCriteria = async ({
  name,
  description = null,
  isRequired = true,
  isActive = true,
  order = 0,
  academicTermId = null,
  userId,
}) => {
  if (!name || !name.trim()) {
    throw new AppError("Tên tiêu chí không được để trống", 400);
  }

  const criteria = await ThesisEvaluationCriteria.create({
    name: name.trim(),
    description: description ? description.trim() : null,
    isRequired: Boolean(isRequired),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    order: Number(order) || 0,
    academicTermId: academicTermId || null,
    createdBy: userId || null,
  });

  return criteria;
};

const updateThesisEvaluationCriteria = async (id, data) => {
  const criteria = await ThesisEvaluationCriteria.findById(id);
  if (!criteria) {
    throw new AppError("Không tìm thấy tiêu chí đánh giá", 404);
  }

  if (data.name !== undefined) criteria.name = data.name.trim();
  if (data.description !== undefined) criteria.description = data.description ? data.description.trim() : null;
  if (data.isRequired !== undefined) criteria.isRequired = Boolean(data.isRequired);
  if (data.isActive !== undefined) criteria.isActive = Boolean(data.isActive);
  if (data.order !== undefined) criteria.order = Number(data.order);
  if (data.academicTermId !== undefined) criteria.academicTermId = data.academicTermId || null;

  await criteria.save();
  return criteria;
};

const deleteThesisEvaluationCriteria = async (id) => {
  const criteria = await ThesisEvaluationCriteria.findById(id);
  if (!criteria) {
    throw new AppError("Không tìm thấy tiêu chí đánh giá", 404);
  }

  // Check if this criteria is referenced in any evaluated Thesis
  const isUsed = await Thesis.exists({
    "criteriaEvaluations.criteriaId": criteria._id,
  });

  if (isUsed) {
    // Soft delete to maintain historical evaluation records
    criteria.isActive = false;
    await criteria.save();
    return { message: "Tiêu chí đã được sử dụng trong đánh giá nên đã được chuyển sang trạng thái Ẩn (Inactive)", criteria };
  }

  await ThesisEvaluationCriteria.findByIdAndDelete(id);
  return { message: "Xóa tiêu chí đánh giá thành công", id };
};

// ====================
// Thesis Grading Periods Management
// ====================
const getThesisGradingPeriods = async ({ academicTermId = null } = {}) => {
  const query = {};
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const periods = await ThesisGradingPeriod.find(query)
    .sort({ startDate: -1 })
    .populate("academicTermId", "name code academicYear")
    .populate("createdBy", "fullName email");

  const now = new Date();
  const withStatus = periods.map((p) => {
    const obj = p.toObject();
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (now < start) {
      obj.computedStatus = "UPCOMING";
    } else if (now > end) {
      obj.computedStatus = "EXPIRED";
    } else {
      obj.computedStatus = "ACTIVE";
    }
    return obj;
  });

  return withStatus;
};

const createThesisGradingPeriod = async ({
  name,
  academicTermId,
  startDate,
  endDate,
  notificationScope = "LECTURER_ONLY",
  description = null,
  userId,
}) => {
  if (!name || !name.trim()) throw new AppError("Tên đợt nhập điểm là bắt buộc", 400);
  if (!academicTermId) throw new AppError("Vui lòng chọn học kỳ áp dụng", 400);
  if (!startDate || !endDate) throw new AppError("Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc", 400);

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("Thời gian bắt đầu hoặc kết thúc không hợp lệ", 400);
  }
  if (end <= start) {
    throw new AppError("Thời gian kết thúc phải sau thời gian bắt đầu", 400);
  }

  const period = await ThesisGradingPeriod.create({
    name: name.trim(),
    academicTermId,
    startDate: start,
    endDate: end,
    notificationScope: notificationScope === "PUBLIC" ? "PUBLIC" : "LECTURER_ONLY",
    description: description ? description.trim() : null,
    createdBy: userId || null,
  });

  // Handle Notifications
  try {
    const term = await AcademicTerm.findById(academicTermId);
    const termName = term ? `${term.name} (${term.code})` : "";
    const formattedStart = start.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    const formattedEnd = end.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

    const notifTitle = `Thông báo mở đợt nhập điểm KLTN: ${period.name}`;
    const notifMessage = `${description ? `${description.trim()}\n` : ""}Thời gian mở nhập điểm: ${formattedStart} đến ${formattedEnd} (Học kỳ: ${termName}).`;

    if (period.notificationScope === "PUBLIC") {
      await notificationService.createNotificationForRole(["LECTURER", "TBM", "STUDENT"], {
        senderId: userId,
        type: "THESIS",
        title: notifTitle,
        message: notifMessage,
        referenceId: period._id,
        referenceModel: "Schedule",
        priority: "HIGH",
      });
    } else {
      // Send strictly to supervisors of theses in this academic term
      const theses = await Thesis.find({
        academicTermId,
        supervisorId: { $ne: null },
      }).select("supervisorId");

      const supervisorIds = [...new Set(theses.map((t) => t.supervisorId.toString()))];
      const lecturers = await Lecturer.find({ _id: { $in: supervisorIds } }).select("userId");

      for (const lec of lecturers) {
        if (lec.userId) {
          await notificationService.createNotification({
            recipientId: lec.userId,
            senderId: userId,
            type: "THESIS",
            title: notifTitle,
            message: notifMessage,
            referenceId: period._id,
            referenceModel: "Schedule",
            priority: "HIGH",
          });
        }
      }
    }
  } catch (err) {
    console.error("Error broadcasting grading period notification:", err.message);
  }

  return period;
};

const updateThesisGradingPeriod = async (id, data, userId) => {
  const period = await ThesisGradingPeriod.findById(id);
  if (!period) throw new AppError("Không tìm thấy đợt nhập điểm", 404);

  if (data.name !== undefined) period.name = data.name.trim();
  if (data.startDate !== undefined) period.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) period.endDate = new Date(data.endDate);
  if (data.notificationScope !== undefined) period.notificationScope = data.notificationScope;
  if (data.description !== undefined) period.description = data.description ? data.description.trim() : null;

  if (period.endDate <= period.startDate) {
    throw new AppError("Thời gian kết thúc phải sau thời gian bắt đầu", 400);
  }

  await period.save();
  return period;
};

const deleteThesisGradingPeriod = async (id) => {
  const period = await ThesisGradingPeriod.findByIdAndDelete(id);
  if (!period) throw new AppError("Không tìm thấy đợt nhập điểm", 404);
  return { message: "Xóa đợt nhập điểm thành công", id };
};

const processExpiredGradingPeriods = async (academicTermId) => {
  const now = new Date();
  const query = {
    endDate: { $lt: now },
  };
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const expiredPeriods = await ThesisGradingPeriod.find(query);
  if (expiredPeriods.length === 0) {
    return { processedThesesCount: 0, failedTheses: [] };
  }

  const termIds = expiredPeriods.map((p) => p.academicTermId);
  const incompleteTheses = await Thesis.find({
    academicTermId: { $in: termIds },
    status: { $in: ["APPROVED", "ASSIGNED_REVIEWERS", "IN_PROGRESS", "SUBMITTED"] },
    $or: [
      { "scores.supervisorScore": null },
      { "scores.supervisorScore": { $exists: false } },
      { isCriteriaPassed: false },
    ],
  }).populate({ path: "studentId", populate: { path: "userId", select: "fullName email" } });

  const failedTheses = [];
  for (const t of incompleteTheses) {
    t.status = "REJECTED";
    t.rejectionReason = "Không hoàn thành đánh giá điều kiện hoặc không có điểm GVHD đúng thời hạn quy định (FAIL KLTN)";
    t.rejectedAt = new Date();
    await t.save();
    failedTheses.push({
      _id: t._id,
      thesisTitle: t.thesisTitle,
      studentName: t.studentId?.userId?.fullName || "Sinh viên",
    });
  }

  return {
    processedThesesCount: failedTheses.length,
    failedTheses,
  };
};

// ====================
// Publish Scores (TBM)
// ====================
const publishScores = async ({ academicTermId, selectedScores }) => {
  const query = {};
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const update = {
    $set: {
      "publishedScores.supervisorScore": Boolean(selectedScores?.supervisorScore),
      "publishedScores.reviewer1Score": Boolean(selectedScores?.reviewer1Score),
      "publishedScores.reviewerScore": Boolean(selectedScores?.reviewer1Score || selectedScores?.reviewerScore),
      "publishedScores.reviewer2Score": Boolean(selectedScores?.reviewer2Score),
      "publishedScores.councilScore": Boolean(selectedScores?.councilScore),
      "publishedScores.finalScore": Boolean(selectedScores?.finalScore),
    },
  };

  const result = await Thesis.updateMany(query, update);
  return {
    success: true,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    selectedScores,
  };
};

// ====================
// Student 2: Respond to Group Invitation (ACCEPT / REJECT)
// ====================
const respondStudent2Invitation = async (thesisId, userId, action) => {
  if (!["ACCEPT", "REJECT"].includes(action)) {
    throw new AppError("Hành động không hợp lệ (ACCEPT hoặc REJECT)", 400);
  }

  const student2 = await Student.findOne({ userId }).populate("userId");
  if (!student2) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (
    !thesis.secondStudentId ||
    thesis.secondStudentId._id.toString() !== student2._id.toString()
  ) {
    throw new AppError("Bạn không có lời mời tham gia đề tài này", 403);
  }

  if (thesis.status !== "WAITING_FOR_STUDENT2_CONFIRMATION") {
    throw new AppError("Lời mời tham gia đề tài này đã được xử lý hoặc không còn hiệu lực", 400);
  }

  const sv1 = thesis.studentId;
  const sv1Name = sv1.userId?.fullName || sv1.studentCode;
  const sv2Name = student2.userId?.fullName || student2.studentCode;
  const sv2Code = student2.studentCode;

  if (action === "ACCEPT") {
    const activeTermDoc = thesis.academicTermId
      ? await AcademicTerm.findById(thesis.academicTermId)
      : await academicTermService.getCurrentAcademicTerm(new Date());
    validateThesisRegistrationWindow(activeTermDoc);

    thesis.student2Status = "ACCEPTED";
    thesis.status = "WAITING_FOR_SUPERVISOR_REQUEST";
    await thesis.save();

    student2.thesisRegistered = true;
    await student2.save();

    // Notify SV1
    if (sv1.userId?._id) {
      await notificationService.createNotification({
        recipientId: sv1.userId._id,
        type: "THESIS",
        title: "Sinh viên 2 đã đồng ý tham gia nhóm",
        message: `Sinh viên ${sv2Name} (${sv2Code}) đã đồng ý tham gia nhóm đề tài "${thesis.thesisTitle}". Bạn có thể gửi yêu cầu đến Giảng viên hướng dẫn.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  } else {
    // REJECT
    thesis.student2Status = "REJECTED";
    thesis.secondStudentId = null;
    thesis.studentCount = 1;
    thesis.status = "WAITING_FOR_SUPERVISOR_REQUEST";
    await thesis.save();

    // Release SV2
    student2.thesisRegistered = false;
    await student2.save();

    // If thesis was created from Topic, update registeredGroups
    if (thesis.topicId) {
      await ThesisTopic.updateOne(
        { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
        {
          $set: {
            "registeredGroups.$.secondStudentId": null,
            "registeredGroups.$.secondStudentCode": null,
          },
        }
      );
    }

    // Notify SV1
    if (sv1.userId?._id) {
      await notificationService.createNotification({
        recipientId: sv1.userId._id,
        type: "THESIS",
        title: "Sinh viên 2 đã từ chối tham gia nhóm",
        message: `Sinh viên ${sv2Name} (${sv2Code}) đã từ chối tham gia nhóm đề tài "${thesis.thesisTitle}". Bạn có thể gửi yêu cầu GVHD với tư cách cá nhân hoặc mời sinh viên khác.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });
};

// ====================
// Student 1: Send Request to Supervisor (GVHD)
// ====================
const sendSupervisorRequest = async (thesisId, userId) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  // Only SV1 (leader) can send request to supervisor
  if (thesis.studentId._id.toString() !== student._id.toString()) {
    throw new AppError("Chỉ có trưởng nhóm (SV1) mới có quyền gửi yêu cầu đến Giảng viên hướng dẫn", 403);
  }

  if (thesis.status !== "WAITING_FOR_SUPERVISOR_REQUEST") {
    throw new AppError(`Không thể gửi yêu cầu khi đề tài ở trạng thái ${thesis.status}`, 400);
  }

  // Validate Registration Window
  const activeTermDoc = thesis.academicTermId
    ? await AcademicTerm.findById(thesis.academicTermId)
    : await academicTermService.getCurrentAcademicTerm(new Date());
  validateThesisRegistrationWindow(activeTermDoc);

  // If group has 2 students, SV2 MUST be ACCEPTED
  if (thesis.studentCount === 2) {
    if (!thesis.secondStudentId || thesis.student2Status !== "ACCEPTED") {
      throw new AppError("Không thể gửi yêu cầu đến GVHD khi Sinh viên thứ hai chưa xác nhận đồng ý tham gia", 400);
    }
  }

  // Check Lecturer Capacity
  const activeTerm = activeTermDoc._id;
  const supervisor = await Lecturer.findById(thesis.supervisorId._id || thesis.supervisorId).populate("userId");
  if (!supervisor) {
    throw new AppError("Không tìm thấy giảng viên hướng dẫn", 404);
  }

  const activeSupervisedTheses = await Thesis.find({
    academicTermId: activeTerm,
    supervisorId: supervisor._id,
    _id: { $ne: thesis._id },
    status: {
      $in: [
        "PENDING_SUPERVISOR_APPROVAL",
        "PENDING_TBM_APPROVAL",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "ASSIGNED_REVIEWERS",
        "IN_PROGRESS",
      ],
    },
  }).select("secondStudentId");

  let currentSupervisedStudents = 0;
  activeSupervisedTheses.forEach((t) => {
    currentSupervisedStudents += t.secondStudentId ? 2 : 1;
  });

  const studentsCount = thesis.secondStudentId ? 2 : 1;
  const maxCapacity = supervisor.maxSupervisedStudents ?? supervisor.maxStudents ?? 5;

  if (currentSupervisedStudents + studentsCount > maxCapacity) {
    throw new AppError(
      "Giảng viên đã đạt số lượng sinh viên hướng dẫn tối đa trong học kỳ này.",
      400
    );
  }

  thesis.status = "PENDING_SUPERVISOR_APPROVAL";
  thesis.submittedAt = new Date();
  await thesis.save();

  // Send Notification to Supervisor
  const sv1Name = thesis.studentId.userId?.fullName || thesis.studentId.studentCode;
  const sv1Code = thesis.studentId.studentCode;
  let messageContent = `Sinh viên ${sv1Name} (${sv1Code}) vừa nộp đề tài: "${thesis.thesisTitle}". Vui lòng xem và duyệt đề tài.`;

  if (thesis.secondStudentId) {
    const sv2Name = thesis.secondStudentId.userId?.fullName || thesis.secondStudentId.studentCode;
    const sv2Code = thesis.secondStudentId.studentCode;
    messageContent = `Sinh viên ${sv1Name} (${sv1Code}) và ${sv2Name} (${sv2Code}) vừa nộp đề tài: "${thesis.thesisTitle}". Vui lòng xem và duyệt đề tài.`;
  }

  const supervisorRecipientId = supervisor.userId?._id || supervisor.userId;
  if (supervisorRecipientId) {
    await notificationService.createNotification({
      recipientId: supervisorRecipientId,
      type: "THESIS",
      title: "Đề tài khóa luận mới cần duyệt",
      message: messageContent,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/lecturer/theses",
    });
  }

  // Also notify SV2 if 2 SV
  if (thesis.secondStudentId?.userId?._id) {
    await notificationService.createNotification({
      recipientId: thesis.secondStudentId.userId._id,
      type: "THESIS",
      title: "Đề tài đã gửi đến Giảng viên hướng dẫn",
      message: `Trưởng nhóm đã gửi đề tài "${thesis.thesisTitle}" đến Giảng viên hướng dẫn để duyệt.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });
};

// ====================
// Student 1: Invite or Change Student 2
// ====================
const inviteStudent2 = async (thesisId, userId, { secondStudentId, secondStudentCode }) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId).populate("studentId");
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.studentId._id.toString() !== student._id.toString()) {
    throw new AppError("Chỉ có trưởng nhóm mới có quyền mời thành viên", 403);
  }

  if (!["WAITING_FOR_SUPERVISOR_REQUEST", "WAITING_FOR_STUDENT2_CONFIRMATION"].includes(thesis.status)) {
    throw new AppError("Không thể mời thành viên khi đề tài đã gửi GVHD hoặc đang được xét duyệt", 400);
  }

  // Validate Registration Window
  const activeTermDoc = thesis.academicTermId
    ? await AcademicTerm.findById(thesis.academicTermId)
    : await academicTermService.getCurrentAcademicTerm(new Date());
  validateThesisRegistrationWindow(activeTermDoc);

  let student2 = null;
  if (secondStudentId) {
    student2 = await Student.findById(secondStudentId).populate("userId");
  } else if (secondStudentCode) {
    student2 = await Student.findOne({
      studentCode: secondStudentCode.trim().toUpperCase(),
    }).populate("userId");
  }

  if (!student2) {
    throw new AppError("Không tìm thấy sinh viên thứ hai", 404);
  }

  if (student2._id.toString() === student._id.toString()) {
    throw new AppError("Sinh viên thứ hai không được trùng với bạn", 400);
  }

  const activeTerm = activeTermDoc._id;

  // Check SV2 Active Thesis
  const sv2ActiveThesis = await Thesis.findOne({
    academicTermId: activeTerm,
    _id: { $ne: thesis._id },
    $or: [{ studentId: student2._id }, { secondStudentId: student2._id }],
    status: { $in: ACTIVE_THESIS_STATUSES },
  });

  if (sv2ActiveThesis) {
    throw new AppError(
      `Sinh viên ${student2.userId?.fullName || student2.studentCode} đã tham gia đề tài khác trong học kỳ này`,
      409
    );
  }

  thesis.secondStudentId = student2._id;
  thesis.studentCount = 2;
  thesis.student2Status = "PENDING";
  thesis.status = "WAITING_FOR_STUDENT2_CONFIRMATION";
  await thesis.save();

  student2.thesisRegistered = true;
  await student2.save();

  // If thesis was created from Topic, update registeredGroups
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
      {
        $set: {
          "registeredGroups.$.secondStudentId": student2._id,
          "registeredGroups.$.secondStudentCode": student2.studentCode,
        },
      }
    );
  }

  // Send notification to SV2
  const sv1Name = student.userId?.fullName || student.studentCode;
  const sv1Code = student.studentCode;
  if (student2.userId?._id) {
    await notificationService.createNotification({
      recipientId: student2.userId._id,
      type: "THESIS",
      title: "Lời mời tham gia nhóm Khóa luận tốt nghiệp",
      message: `Sinh viên ${sv1Name} (${sv1Code}) đã mời bạn tham gia nhóm làm đề tài Khóa luận: "${thesis.thesisTitle}". Vui lòng xác nhận hoặc từ chối.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });
};

// ====================
// Student 1: Cancel Pending Student 2 Invite
// ====================
const cancelStudent2Invite = async (thesisId, userId) => {
  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId).populate("studentId secondStudentId");
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.studentId._id.toString() !== student._id.toString()) {
    throw new AppError("Chỉ có trưởng nhóm mới có quyền hủy lời mời", 403);
  }

  if (thesis.status !== "WAITING_FOR_STUDENT2_CONFIRMATION") {
    throw new AppError("Không thể hủy lời mời ở trạng thái này", 400);
  }

  const prevStudent2 = thesis.secondStudentId;
  thesis.secondStudentId = null;
  thesis.studentCount = 1;
  thesis.student2Status = null;
  thesis.status = "WAITING_FOR_SUPERVISOR_REQUEST";
  await thesis.save();

  if (prevStudent2) {
    const s2Doc = await Student.findById(prevStudent2._id || prevStudent2);
    if (s2Doc) {
      s2Doc.thesisRegistered = false;
      await s2Doc.save();
    }

    if (prevStudent2.userId?._id || prevStudent2.userId) {
      const uId = prevStudent2.userId._id || prevStudent2.userId;
      await notificationService.createNotification({
        recipientId: uId,
        type: "THESIS",
        title: "Lời mời tham gia nhóm đã bị hủy",
        message: `Lời mời tham gia nhóm đề tài "${thesis.thesisTitle}" đã được hủy bởi trưởng nhóm.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/student/thesis",
      });
    }
  }

  // If thesis was created from Topic, update registeredGroups
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
      {
        $set: {
          "registeredGroups.$.secondStudentId": null,
          "registeredGroups.$.secondStudentCode": null,
        },
      }
    );
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });
};

// ====================
// Student 2: Cancel Group Participation (before supervisor approval)
// ====================
const cancelGroupParticipationByStudent2 = async (thesisId, userId) => {
  const student2 = await Student.findOne({ userId }).populate("userId");
  if (!student2) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (
    !thesis.secondStudentId ||
    thesis.secondStudentId._id.toString() !== student2._id.toString()
  ) {
    throw new AppError("Bạn không phải là thành viên thứ hai của đề tài này", 403);
  }

  // Check if supervisor already approved
  const NON_CANCELLABLE_STATUSES = [
    "APPROVED",
    "ASSIGNED_REVIEWERS",
    "IN_PROGRESS",
    "SUBMITTED",
    "GRADED",
    "COMPLETED",
  ];
  if (NON_CANCELLABLE_STATUSES.includes(thesis.status)) {
    throw new AppError(
      "Không thể hủy tham gia nhóm khi đề tài đã được Giảng viên hướng dẫn duyệt chính thức.",
      400
    );
  }

  const sv1 = thesis.studentId;
  const sv1Name = sv1.userId?.fullName || sv1.studentCode;
  const sv2Name = student2.userId?.fullName || student2.studentCode;
  const sv2Code = student2.studentCode;
  const prevStatus = thesis.status;

  // Release SV2
  student2.thesisRegistered = false;
  await student2.save();

  // Update Thesis
  thesis.secondStudentId = null;
  thesis.student2Status = null;
  thesis.studentCount = 1;
  // Revert to WAITING_FOR_SUPERVISOR_REQUEST because group composition changed
  thesis.status = "WAITING_FOR_SUPERVISOR_REQUEST";
  thesis.submittedAt = null;
  await thesis.save();

  // If thesis was created from Topic, update registeredGroups
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
      {
        $set: {
          "registeredGroups.$.secondStudentId": null,
          "registeredGroups.$.secondStudentCode": null,
        },
      }
    );
  }

  // Notify SV1
  if (sv1.userId?._id) {
    await notificationService.createNotification({
      recipientId: sv1.userId._id,
      type: "THESIS",
      title: "Thành viên đã hủy tham gia nhóm",
      message: `Sinh viên ${sv2Name} (${sv2Code}) đã hủy tham gia nhóm đề tài "${thesis.thesisTitle}". Đề tài đã chuyển về trạng thái cá nhân (1 thành viên). Bạn có thể mời thành viên khác hoặc gửi yêu cầu đến GVHD.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
      link: "/student/thesis",
    });
  }

  // If request was pending supervisor approval, notify supervisor
  if (["PENDING_SUPERVISOR_APPROVAL", "PENDING_SUPERVISOR_ACCEPTANCE"].includes(prevStatus)) {
    const supervisorRecipientId = thesis.supervisorId?.userId?._id || thesis.supervisorId?.userId;
    if (supervisorRecipientId) {
      await notificationService.createNotification({
        recipientId: supervisorRecipientId,
        type: "THESIS",
        title: "Thay đổi thành viên nhóm đề tài",
        message: `Sinh viên ${sv2Name} (${sv2Code}) đã hủy tham gia nhóm đề tài "${thesis.thesisTitle}". Đề tài đã được rút lại để trưởng nhóm xử lý.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/lecturer/theses",
      });
    }
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });
};

// ====================
// Student 1: Cancel Group Registration / Thesis (before supervisor approval)
// ====================
const cancelGroupRegistrationByStudent1 = async (thesisId, userId) => {
  const student1 = await Student.findOne({ userId }).populate("userId");
  if (!student1) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.studentId._id.toString() !== student1._id.toString()) {
    throw new AppError("Chỉ có trưởng nhóm (SV1) mới có quyền hủy đăng ký nhóm", 403);
  }

  const NON_CANCELLABLE_STATUSES = [
    "APPROVED",
    "ASSIGNED_REVIEWERS",
    "IN_PROGRESS",
    "SUBMITTED",
    "GRADED",
    "COMPLETED",
  ];
  if (NON_CANCELLABLE_STATUSES.includes(thesis.status)) {
    throw new AppError(
      "Không thể hủy nhóm khi đề tài đã được Giảng viên hướng dẫn duyệt chính thức.",
      400
    );
  }

  const sv1Name = student1.userId?.fullName || student1.studentCode;
  const sv1Code = student1.studentCode;
  const prevStudent2 = thesis.secondStudentId;
  const prevStatus = thesis.status;
  const thesisTitle = thesis.thesisTitle;

  // Release SV1
  student1.thesisRegistered = false;
  await student1.save();

  // Release SV2 if exists
  if (prevStudent2) {
    const s2Doc = await Student.findById(prevStudent2._id || prevStudent2).populate("userId");
    if (s2Doc) {
      s2Doc.thesisRegistered = false;
      await s2Doc.save();
    }

    const s2UserId = prevStudent2.userId?._id || prevStudent2.userId;
    if (s2UserId) {
      await notificationService.createNotification({
        recipientId: s2UserId,
        type: "THESIS",
        title: "Đề tài nhóm đã được hủy",
        message: `Trưởng nhóm ${sv1Name} (${sv1Code}) đã hủy đăng ký đề tài nhóm "${thesisTitle}". Bạn hiện có thể đăng ký đề tài mới hoặc tham gia nhóm khác.`,
        referenceId: null,
        referenceModel: "Thesis",
        link: "/student/thesis/register",
      });
    }
  }

  // If thesis was created from Topic, release the Topic FIFO slot
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
      {
        $inc: { currentGroups: -1 },
        $pull: { registeredGroups: { thesisId: thesis._id } },
      }
    );
  }

  // If request was pending supervisor approval, notify supervisor
  if (["PENDING_SUPERVISOR_APPROVAL", "PENDING_SUPERVISOR_ACCEPTANCE"].includes(prevStatus)) {
    const supervisorRecipientId = thesis.supervisorId?.userId?._id || thesis.supervisorId?.userId;
    if (supervisorRecipientId) {
      await notificationService.createNotification({
        recipientId: supervisorRecipientId,
        type: "THESIS",
        title: "Yêu cầu đăng ký đề tài đã bị hủy bởi sinh viên",
        message: `Trưởng nhóm ${sv1Name} (${sv1Code}) đã hủy yêu cầu đăng ký đề tài "${thesisTitle}".`,
        referenceId: null,
        referenceModel: "Thesis",
        link: "/lecturer/theses",
      });
    }
  }

  // Delete the unapproved thesis document
  await Thesis.findByIdAndDelete(thesis._id);

  return { success: true, message: "Đã hủy đăng ký nhóm đề tài thành công" };
};

// ====================
// Student 1: Remove Student 2 from Group (before supervisor approval)
// ====================
const removeStudent2ByStudent1 = async (thesisId, userId) => {
  const student1 = await Student.findOne({ userId }).populate("userId");
  if (!student1) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const thesis = await Thesis.findById(thesisId)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });

  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.studentId._id.toString() !== student1._id.toString()) {
    throw new AppError("Chỉ có trưởng nhóm mới có quyền xóa thành viên", 403);
  }

  const NON_CANCELLABLE_STATUSES = [
    "APPROVED",
    "ASSIGNED_REVIEWERS",
    "IN_PROGRESS",
    "SUBMITTED",
    "GRADED",
    "COMPLETED",
  ];
  if (NON_CANCELLABLE_STATUSES.includes(thesis.status)) {
    throw new AppError(
      "Không thể thay đổi thành viên khi đề tài đã được Giảng viên hướng dẫn duyệt chính thức.",
      400
    );
  }

  if (!thesis.secondStudentId) {
    throw new AppError("Đề tài hiện không có thành viên thứ hai", 400);
  }

  const prevStudent2 = thesis.secondStudentId;
  const prevStatus = thesis.status;
  const sv1Name = student1.userId?.fullName || student1.studentCode;
  const sv1Code = student1.studentCode;

  // Release SV2
  const s2Doc = await Student.findById(prevStudent2._id || prevStudent2).populate("userId");
  if (s2Doc) {
    s2Doc.thesisRegistered = false;
    await s2Doc.save();
  }

  // Update thesis
  thesis.secondStudentId = null;
  thesis.student2Status = null;
  thesis.studentCount = 1;
  thesis.status = "WAITING_FOR_SUPERVISOR_REQUEST";
  thesis.submittedAt = null;
  await thesis.save();

  // If thesis was created from Topic, update registeredGroups
  if (thesis.topicId) {
    await ThesisTopic.updateOne(
      { _id: thesis.topicId, "registeredGroups.thesisId": thesis._id },
      {
        $set: {
          "registeredGroups.$.secondStudentId": null,
          "registeredGroups.$.secondStudentCode": null,
        },
      }
    );
  }

  // Notify SV2
  const s2UserId = prevStudent2.userId?._id || prevStudent2.userId;
  if (s2UserId) {
    await notificationService.createNotification({
      recipientId: s2UserId,
      type: "THESIS",
      title: "Bạn đã được rút khỏi nhóm đề tài",
      message: `Trưởng nhóm ${sv1Name} (${sv1Code}) đã rút bạn khỏi nhóm đề tài "${thesis.thesisTitle}". Bạn hiện có thể đăng ký đề tài mới hoặc tham gia nhóm khác.`,
      referenceId: null,
      referenceModel: "Thesis",
      link: "/student/thesis/register",
    });
  }

  // If request was pending supervisor approval, notify supervisor
  if (["PENDING_SUPERVISOR_APPROVAL", "PENDING_SUPERVISOR_ACCEPTANCE"].includes(prevStatus)) {
    const supervisorRecipientId = thesis.supervisorId?.userId?._id || thesis.supervisorId?.userId;
    if (supervisorRecipientId) {
      await notificationService.createNotification({
        recipientId: supervisorRecipientId,
        type: "THESIS",
        title: "Thay đổi thành viên nhóm đề tài",
        message: `Trưởng nhóm ${sv1Name} (${sv1Code}) đã rút thành viên khỏi nhóm đề tài "${thesis.thesisTitle}". Đề tài đã được chuyển về trạng thái chờ xử lý lại.`,
        referenceId: thesis._id,
        referenceModel: "Thesis",
        link: "/lecturer/theses",
      });
    }
  }

  return await Thesis.findById(thesis._id)
    .populate({ path: "studentId", populate: { path: "userId" } })
    .populate({ path: "secondStudentId", populate: { path: "userId" } })
    .populate({ path: "supervisorId", populate: { path: "userId" } });
};

export default {
  createThesis,
  lookupStudentByCode,
  searchStudentsForGroup,
  getAvailableSupervisors,
  getMyThesis,
  getThesisByStudent,
  getThesisById,
  getAllThesesForTbm,
  approveThesis,
  rejectThesis,
  assignSupervisor,
  assignReviewers,
  supervisorAcceptThesis,
  supervisorRejectThesis,
  supervisorCancelThesis,
  validateThesisRegistrationWindow,
  getThesesForLecturerRole,
  gradeThesisByLecturer,
  evaluateCriteriaBySupervisor,
  toggleThesisScoreLock,
  toggleAllThesisScoresLock,
  getThesesForEvaluation,
  completeThesisEvaluation,
  publishScores,
  // Invitation & Submission Flow
  respondStudent2Invitation,
  sendSupervisorRequest,
  inviteStudent2,
  cancelStudent2Invite,
  cancelGroupParticipationByStudent2,
  cancelGroupRegistrationByStudent1,
  removeStudent2ByStudent1,
  // Criteria & Grading Period Management
  getThesisEvaluationCriteria,
  createThesisEvaluationCriteria,
  updateThesisEvaluationCriteria,
  deleteThesisEvaluationCriteria,
  getThesisGradingPeriods,
  createThesisGradingPeriod,
  updateThesisGradingPeriod,
  deleteThesisGradingPeriod,
  processExpiredGradingPeriods,
  // KLTN Topic Management
  batchCreateTopicsByLecturer,
  getMyCreatedTopics,
  getTopicsForTbm,
  approveTopicByTbm,
  rejectTopicByTbm,
  updateTopic,
  deleteTopic,
  requestEditTopicByLecturer,
  requestDeleteTopicByLecturer,
  approveEditTopicByTbm,
  rejectEditTopicByTbm,
  approveDeleteTopicByTbm,
  rejectDeleteTopicByTbm,
  getApprovedTopicsForStudent,
  registerTopicByStudent,
};

