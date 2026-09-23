import Thesis from "../models/Thesis.js";
import ThesisTopic from "../models/ThesisTopic.js";
import ThesisEvaluationCriteria from "../models/ThesisEvaluationCriteria.js";
import ThesisGradingPeriod from "../models/ThesisGradingPeriod.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Permission from "../models/Permission.js";
import AcademicTerm from "../models/AcademicTerm.js";
import academicTermService from "./academicTermService.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

// ====================
// Active Thesis Statuses
// ====================
export const ACTIVE_THESIS_STATUSES = [
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

  // 2. Identify Current Academic Term automatically (by Date or ACTIVE status)
  const activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());

  // Validate Registration Window (if configured)
  const now = new Date();
  if (activeTerm.thesis?.registrationStart && now < new Date(activeTerm.thesis.registrationStart)) {
    throw new AppError("Chưa đến thời gian mở cổng đăng ký Khóa luận Tốt nghiệp cho học kỳ này.", 400);
  }
  if (activeTerm.thesis?.registrationEnd && now > new Date(activeTerm.thesis.registrationEnd)) {
    throw new AppError("Đã hết thời gian đăng ký Khóa luận Tốt nghiệp cho học kỳ này.", 400);
  }

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
  const thesis = await Thesis.create({
    academicTermId: activeTerm._id,
    studentId: student1._id,
    secondStudentId: isTwoStudents ? student2._id : null,
    studentCount: isTwoStudents ? 2 : 1,
    thesisTitle: thesisTitle.trim(),
    supervisorId: supervisor._id,
    description: description ? description.trim() : null,
    objectives: objectives ? objectives.trim() : null,
    status: "PENDING_SUPERVISOR_APPROVAL",
    submittedAt: new Date(),
  });

  // 8. Update student flags
  student1.thesisRegistered = true;
  await student1.save();

  if (student2) {
    student2.thesisRegistered = true;
    await student2.save();
  }

  // Trigger Notification to Supervisor ONLY
  const sv1Name = student1.userId?.fullName || student1.studentCode;
  const sv1Code = student1.studentCode;
  let messageContent = `Sinh viên ${sv1Name} (${sv1Code}) vừa nộp đề tài: "${thesisTitle.trim()}". Vui lòng xem và duyệt đề tài.`;

  if (student2) {
    const sv2Name = student2.userId?.fullName || student2.studentCode;
    const sv2Code = student2.studentCode;
    messageContent = `Sinh viên ${sv1Name} (${sv1Code}) và ${sv2Name} (${sv2Code}) vừa nộp đề tài: "${thesisTitle.trim()}". Vui lòng xem và duyệt đề tài.`;
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
// 3. TBM Rejects Thesis
// ====================
const rejectThesis = async (thesisId, { reason = null, tbmUserId }) => {
  const thesis = await Thesis.findById(thesisId).populate("studentId secondStudentId");
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.status === "COMPLETED") {
    throw new AppError("Khóa luận đã hoàn thành và không thể từ chối.", 400);
  }

  thesis.status = "REJECTED";
  thesis.assignedBy = tbmUserId || null;
  await thesis.save();

  // Reset student registration flag so students can re-register
  await Student.findByIdAndUpdate(thesis.studentId._id || thesis.studentId, { thesisRegistered: false });
  if (thesis.secondStudentId) {
    await Student.findByIdAndUpdate(thesis.secondStudentId._id || thesis.secondStudentId, { thesisRegistered: false });
  }

  // Notify Students
  const s1 = await Student.findById(thesis.studentId._id || thesis.studentId);
  if (s1 && s1.userId) {
    await notificationService.createNotification({
      recipientId: s1.userId,
      type: "THESIS",
      title: "Đề tài Khóa luận đã bị từ chối",
      message: `Đề tài "${thesis.thesisTitle}" đã bị từ chối: ${reason || "Chưa đạt yêu cầu"}. Bạn có thể đăng ký lại đề tài khác.`,
      referenceId: thesis._id,
      referenceModel: "Thesis",
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

  if (
    thesis.scores?.supervisorScore === null ||
    thesis.scores?.supervisorScore === undefined ||
    thesis.isCriteriaPassed === false
  ) {
    throw new AppError(
      "Sinh viên chưa hoàn tất đánh giá điều kiện và chưa có điểm GVHD hợp lệ. Không thể phân công giảng viên phản biện.",
      400,
    );
  }

  const supervisorIdStr = thesis.supervisorId.toString();

  // If reviewers array is provided from the UI, extract private and council reviewers
  let effectiveReviewer1Id = reviewer1Id;
  let effectiveReviewer2Id = reviewer2Id;
  let effectiveReviewersList = [];

  if (Array.isArray(reviewers)) {
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
  } else {
    // Build reviewers array from reviewer1Id & reviewer2Id
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
        link: "/lecturer/theses",
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
        link: "/lecturer/theses",
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

  const lecturer = await Lecturer.findOne({ userId: requestingUser.userId }).populate("userId");
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

  const lecturer = await Lecturer.findOne({ userId: requestingUser.userId }).populate("userId");
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
  const baseQuery = {};

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

    return {
      ...t,
      userRoles: roles,
      isSupervisor,
      isReviewer1,
      isReviewer2,
      canGradeSupervisor: isSupervisor && !["COMPLETED", "REJECTED"].includes(t.status),
      canGradeReviewer1: isReviewer1 && !["COMPLETED", "REJECTED"].includes(t.status),
      canGradeReviewer2: isReviewer2 && !["COMPLETED", "REJECTED"].includes(t.status),
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
    allTheses: results,
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

  const lecturer = await Lecturer.findOne({ userId: requestingUserId }).populate(
    "userId",
  );
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
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

  if (activeRole === "SUPERVISOR" || activeRole === "GVHD") {
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

    // Check Grading Period for Thesis
    const now = new Date();
    if (thesis.academicTermId) {
      const allPeriods = await ThesisGradingPeriod.find({
        academicTermId: thesis.academicTermId,
      });

      if (allPeriods.length > 0) {
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
    activeRole === "GVPB_HOIDONG"
  ) {
    const isRev2Legacy = thesis.reviewer2Id?.toString() === lecIdStr;
    const isRev2Array = Array.isArray(thesis.reviewers) && thesis.reviewers.some(
      (r) => ((r.lecturerId?.toString() || r.lecturerId?._id?.toString()) === lecIdStr) && r.isCouncilReviewer
    );
    if (!isRev2Legacy && !isRev2Array) {
      throw new AppError(
        "Bạn không được phân công chấm Phản biện Hội đồng (GVPB_HOIDONG) cho đề tài này",
        403,
      );
    }
    if (thesis.scores?.isReviewer2ScoreLocked) {
      throw new AppError("Điểm phản biện hội đồng của đề tài này đang bị khóa. Vui lòng mở khóa để chỉnh sửa.", 400);
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
  } else {
    throw new AppError("Vai trò đánh giá không hợp lệ", 400);
  }

  // Auto-calculate final score if all 3 scores are present
  if (
    thesis.scores.supervisorScore !== null &&
    thesis.scores.supervisorScore !== undefined &&
    thesis.scores.reviewer1Score !== null &&
    thesis.scores.reviewer1Score !== undefined &&
    thesis.scores.reviewer2Score !== null &&
    thesis.scores.reviewer2Score !== undefined
  ) {
    const final =
      thesis.scores.supervisorScore * 0.4 +
      thesis.scores.reviewer1Score * 0.3 +
      thesis.scores.reviewer2Score * 0.3;

    thesis.scores.finalScore = Number(final.toFixed(2));
    thesis.status = "GRADED";
  }

  // Calculate individual final scores if available
  if (
    thesis.scores.student1SupervisorScore != null &&
    thesis.scores.student1Reviewer1Score != null &&
    thesis.scores.student1Reviewer2Score != null
  ) {
    thesis.scores.student1FinalScore = Number(
      (
        thesis.scores.student1SupervisorScore * 0.4 +
        thesis.scores.student1Reviewer1Score * 0.3 +
        thesis.scores.student1Reviewer2Score * 0.3
      ).toFixed(2),
    );
  }
  if (
    thesis.scores.student2SupervisorScore != null &&
    thesis.scores.student2Reviewer1Score != null &&
    thesis.scores.student2Reviewer2Score != null
  ) {
    thesis.scores.student2FinalScore = Number(
      (
        thesis.scores.student2SupervisorScore * 0.4 +
        thesis.scores.student2Reviewer1Score * 0.3 +
        thesis.scores.student2Reviewer2Score * 0.3
      ).toFixed(2),
    );
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
  // CRITICAL INVARIANT: Theses with BOTH PB KÍN and PB HỘI ĐỒNG assigned, excluding REJECTED
  const baseQuery = {
    $and: [
      {
        $or: [
          { "reviewers.isPrivateReviewer": true },
          { reviewer1Id: { $ne: null } },
        ],
      },
      {
        $or: [
          { "reviewers.isCouncilReviewer": true },
          { reviewer2Id: { $ne: null } },
        ],
      },
    ],
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

  const allEligible = await Thesis.find({
    $and: [
      {
        $or: [
          { "reviewers.isPrivateReviewer": true },
          { reviewer1Id: { $ne: null } },
        ],
      },
      {
        $or: [
          { "reviewers.isCouncilReviewer": true },
          { reviewer2Id: { $ne: null } },
        ],
      },
      ...(academicTermId && academicTermId !== "ALL" ? [{ academicTermId }] : []),
    ],
    status: { $ne: "REJECTED" },
  }).lean();

  const totalEligible = allEligible.length;
  const gradedCount = allEligible.filter((t) => t.status === "GRADED").length;
  const completedCount = allEligible.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const pendingGradeCount = allEligible.filter((t) => {
    const s = t.scores;
    return (
      !s ||
      s.supervisorScore === null ||
      s.reviewer1Score === null ||
      s.reviewer2Score === null
    );
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

  if (
    !thesis.scores ||
    thesis.scores.supervisorScore === null ||
    thesis.scores.reviewer1Score === null ||
    thesis.scores.reviewer2Score === null ||
    thesis.scores.finalScore === null
  ) {
    throw new AppError(
      "Đề tài chưa được chấm đầy đủ cả 3 cột điểm (GVHD, PB1, PB2) để hoàn tất",
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
  let termId = academicTermId;
  if (!termId) {
    const activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());
    termId = activeTerm?._id || null;
  }

  const topicDocs = [];

  // 1. Process array of topic objects if provided
  if (Array.isArray(topics) && topics.length > 0) {
    for (const item of topics) {
      const title = (typeof item === "string" ? item : item.title || "").trim();
      if (!title) continue;

      const maxGroups = Math.max(1, Number(item.maxGroups || defaultMaxGroups || 1));
      const desc = (typeof item === "object" ? item.description : "") || defaultDescription || null;

      topicDocs.push({
        title,
        supervisorId: lecturer._id,
        academicTermId: termId,
        maxGroups,
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
        maxGroups: Math.max(1, Number(defaultMaxGroups || 1)),
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
    query.title = { $regex: search.trim(), $options: "i" };
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
 * Sinh viên xem danh sách đề tài APPROVED
 */
const getApprovedTopicsForStudent = async ({ academicTermId = null, search = "", userId = null }) => {
  let student = null;
  if (userId) {
    student = await Student.findOne({ userId });
  }

  // Identify active academic term if not provided
  let termId = academicTermId;
  if (!termId) {
    try {
      const activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());
      termId = activeTerm?._id || null;
    } catch (e) {
      // ignore
    }
  }

  const query = { status: "APPROVED" };
  const andConditions = [];

  if (termId) {
    andConditions.push({
      $or: [
        { academicTermId: termId },
        { academicTermId: null },
        { academicTermId: { $exists: false } },
      ],
    });
  }

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
    .populate("academicTermId", "code name")
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

  // 2. Identify Current Academic Term
  const activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());

  // 3. Check SV1 has NO active thesis in active term
  const sv1ActiveThesis = await Thesis.findOne({
    academicTermId: activeTerm._id,
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
    academicTermId: activeTerm._id,
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

  // 4. Handle 2-Student Group Registration
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

    // Check SV2 has NO active thesis
    const sv2ActiveThesis = await Thesis.findOne({
      academicTermId: activeTerm._id,
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
      academicTermId: activeTerm._id,
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

  const thesis = await Thesis.create({
    academicTermId: updatedTopic.academicTermId || activeTerm._id,
    studentId: student1._id,
    secondStudentId: student2 ? student2._id : null,
    studentCount: student2 ? 2 : 1,
    thesisTitle: updatedTopic.title,
    supervisorId: updatedTopic.supervisorId,
    topicId: updatedTopic._id,
    status: "PENDING_SUPERVISOR_APPROVAL", // Chuyển sang chờ GVHD xác nhận
    description: updatedTopic.description,
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

  // Send notification to supervisor
  try {
    const supervisor = await Lecturer.findById(updatedTopic.supervisorId).populate("userId");
    if (supervisor?.userId?._id) {
      await notificationService.createNotification({
        userId: supervisor.userId._id,
        type: "THESIS",
        title: "Sinh viên đăng ký đề tài KLTN - Cần xác nhận",
        message: `Sinh viên ${student1.userId?.fullName || student1.studentCode}${
          student2 ? ` và ${student2.userId?.fullName || student2.studentCode}` : ""
        } vừa đăng ký đề tài "${updatedTopic.title}" (Nhóm ${groupOrder}/${updatedTopic.maxGroups}). Vui lòng vào xác nhận hoặc từ chối.`,
        referenceId: thesis._id,
      });
    }
  } catch (err) {
    console.warn("Notification error:", err.message);
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

export default {
  createThesis,
  lookupStudentByCode,
  searchStudentsForGroup,
  getAvailableSupervisors,
  getMyThesis,
  getThesisByStudent,
  getAllThesesForTbm,
  approveThesis,
  rejectThesis,
  assignSupervisor,
  assignReviewers,
  supervisorAcceptThesis,
  supervisorRejectThesis,
  getThesesForLecturerRole,
  gradeThesisByLecturer,
  toggleThesisScoreLock,
  toggleAllThesisScoresLock,
  getThesesForEvaluation,
  completeThesisEvaluation,
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
  getApprovedTopicsForStudent,
  registerTopicByStudent,
};

