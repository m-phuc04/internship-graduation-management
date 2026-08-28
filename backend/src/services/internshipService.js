import Internship from "../models/Internship.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Evaluation from "../models/Evaluation.js";
import AcademicTerm from "../models/AcademicTerm.js";
import academicTermService from "./academicTermService.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

// ====================
// Active Internship Statuses
// ====================
const ACTIVE_STATUSES = ["PENDING", "PENDING_SUPERVISOR_ACCEPTANCE", "APPROVED", "INTERNING"];

// ====================
// Student Registers Internship
// ====================
const createInternship = async ({
  userId,
  studentId,
  companyId,
  newCompany,
  position,
  startDate,
  endDate,
  registrationNote,
  mentorName,
  mentorPosition,
  mentorEmail,
  mentorPhone,
  lecturerId,
}) => {
  // 1. Identify Student
  let student;
  if (userId) {
    student = await Student.findOne({ userId }).populate({
      path: "userId",
      select: "fullName email phone",
    });
  } else if (studentId) {
    student = await Student.findById(studentId).populate({
      path: "userId",
      select: "fullName email phone",
    });
  }

  if (!student) {
    throw new AppError("Không tìm thấy thông tin hồ sơ sinh viên", 404);
  }

  // 2. Identify Current Academic Term automatically (by Date or ACTIVE status)
  const activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());

  // Validate Registration Window (if configured)
  const now = new Date();
  if (activeTerm.internship?.registrationStart && now < new Date(activeTerm.internship.registrationStart)) {
    throw new AppError("Chưa đến thời gian mở cổng đăng ký Thực tập Doanh nghiệp cho học kỳ này.", 400);
  }
  if (activeTerm.internship?.registrationEnd && now > new Date(activeTerm.internship.registrationEnd)) {
    throw new AppError("Đã hết thời gian đăng ký Thực tập Doanh nghiệp cho học kỳ này.", 400);
  }

  // 3. Check 1 MSSV = 1 Active Internship Rule within active term
  const activeInternship = await Internship.findOne({
    studentId: student._id,
    academicTermId: activeTerm._id,
    status: { $in: ACTIVE_STATUSES },
  });

  if (activeInternship) {
    throw new AppError(
      `Sinh viên đang có một hồ sơ thực tập ở trạng thái hoạt động (${activeInternship.status}) trong học kỳ ${activeTerm.code}. Không thể đăng ký thêm hồ sơ mới.`,
      409,
    );
  }

  // 4. Validate Position & Dates
  if (!position || !position.trim()) {
    throw new AppError("Vị trí thực tập là bắt buộc", 400);
  }

  if (!startDate || !endDate) {
    throw new AppError("Ngày bắt đầu và ngày kết thúc thực tập là bắt buộc", 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("Thời gian thực tập không hợp lệ", 400);
  }

  if (start >= end) {
    throw new AppError("Ngày bắt đầu phải trước ngày kết thúc thực tập", 400);
  }

  // 5. Handle Company (Existing selection OR New company creation)
  let targetCompanyId = companyId;

  if (companyId) {
    const existingCompany = await Company.findById(companyId);
    if (!existingCompany) {
      throw new AppError("Không tìm thấy doanh nghiệp được chọn", 404);
    }
    if (existingCompany.status !== "ACTIVE") {
      throw new AppError("Doanh nghiệp được chọn hiện đang tạm ngưng tiếp nhận thực tập", 400);
    }
  } else if (newCompany && newCompany.name && newCompany.address) {
    const createdCompany = await Company.create({
      name: newCompany.name.trim(),
      code: newCompany.code ? newCompany.code.trim().toUpperCase() : undefined,
      address: newCompany.address.trim(),
      email: newCompany.email ? newCompany.email.trim().toLowerCase() : null,
      phone: newCompany.phone ? newCompany.phone.trim() : null,
      website: newCompany.website ? newCompany.website.trim() : null,
      contactPerson: newCompany.contactPerson ? newCompany.contactPerson.trim() : (mentorName || null),
      contactEmail: newCompany.contactEmail ? newCompany.contactEmail.trim().toLowerCase() : (mentorEmail || null),
      description: newCompany.description ? newCompany.description.trim() : null,
      status: "ACTIVE",
    });
    targetCompanyId = createdCompany._id;
  } else {
    throw new AppError("Vui lòng chọn doanh nghiệp có sẵn hoặc nhập đầy đủ thông tin doanh nghiệp mới", 400);
  }

  // 6. Optional Lecturer Check (if provided)
  if (lecturerId) {
    const lecturer = await Lecturer.findById(lecturerId);
    if (!lecturer) {
      throw new AppError("Không tìm thấy giảng viên được chỉ định", 404);
    }
  }

  // 7. Create Internship (Status = PENDING, bound to activeTerm)
  const internship = await Internship.create({
    academicTermId: activeTerm._id,
    studentId: student._id,
    companyId: targetCompanyId,
    lecturerId: lecturerId || null,
    position: position.trim(),
    startDate: start,
    endDate: end,
    mentorName: mentorName ? mentorName.trim() : null,
    mentorPosition: mentorPosition ? mentorPosition.trim() : null,
    mentorEmail: mentorEmail ? mentorEmail.trim().toLowerCase() : null,
    mentorPhone: mentorPhone ? mentorPhone.trim() : null,
    registrationNote: registrationNote ? registrationNote.trim() : null,
    status: "PENDING",
  });

  // 8. Update Student Flag
  student.internshipRegistered = true;
  await student.save();

  // Notify TBM
  const comp = await Company.findById(targetCompanyId);
  await notificationService.createNotificationForRole("TBM", {
    type: "INTERNSHIP",
    title: "Hồ sơ thực tập mới cần duyệt",
    message: `Sinh viên ${student.userId?.fullName || student.studentCode} (${student.studentCode}) đã đăng ký thực tập tại: "${comp?.name || "Doanh nghiệp"}".`,
    referenceId: internship._id,
    referenceModel: "Internship",
    link: "/tbm/internships",
  });

  // 9. Return populated document
  return await Internship.findById(internship._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate("academicTermId");
};

// ====================
// TBM: Get All Internships (Search, Filter, Pagination, AcademicTerm)
// ====================
const getAllInternships = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  academicTermId = "",
}) => {
  const query = {};

  // AcademicTerm Filter
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  // Status Filter
  if (status && status !== "ALL") {
    query.status = status;
  }

  // Search Filter across Student, Company, Position
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

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchCondition }];
      delete query.$or;
    } else {
      query.$or = searchCondition;
    }
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
    .populate({
      path: "approvedBy",
      select: "fullName email",
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

  const enrichedInternships = internships.map((intern) => {
    const ev = evalMap.get(intern._id.toString()) || null;
    return {
      ...intern,
      evaluation: ev,
    };
  });

  return {
    data: enrichedInternships,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// TBM: Get Available Lecturers with Workload Count
// ====================
const getAvailableLecturers = async () => {
  const lecturers = await Lecturer.find({ isAvailable: true })
    .populate({
      path: "userId",
      select: "fullName email phone",
    })
    .sort({ academicTitle: 1 })
    .lean();

  const results = await Promise.all(
    lecturers.map(async (lec) => {
      const activeStudentsCount = await Internship.countDocuments({
        lecturerId: lec._id,
        status: { $in: ["APPROVED", "INTERNING"] },
      });

      const remainingQuota = Math.max(0, lec.maxStudents - activeStudentsCount);
      const canAssign = remainingQuota > 0;

      return {
        _id: lec._id,
        lecturerCode: lec.lecturerCode,
        fullName: lec.userId?.fullName || "Chưa cập nhật",
        email: lec.userId?.email || "—",
        phone: lec.userId?.phone || "—",
        academicTitle: lec.academicTitle || "",
        maxStudents: lec.maxStudents,
        activeStudentsCount,
        remainingQuota,
        canAssign,
      };
    }),
  );

  return results;
};

// ====================
// TBM: Assign Lecturer to Internship
// ====================
const assignLecturer = async (internshipId, lecturerId, tbmUserId = null) => {
  const internship = await Internship.findById(internshipId);
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (internship.status === "COMPLETED") {
    throw new AppError(
      "Hồ sơ thực tập đã hoàn thành (COMPLETED) và bị khóa, không thể phân công lại giảng viên",
      400,
    );
  }

  const lecturer = await Lecturer.findById(lecturerId).populate({
    path: "userId",
    select: "fullName email",
  });

  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên được chỉ định", 404);
  }

  if (!lecturer.isAvailable) {
    throw new AppError("Giảng viên hiện đang ở trạng thái tạm ngưng nhận sinh viên", 400);
  }

  // Workload validation
  const currentActiveCount = await Internship.countDocuments({
    lecturerId: lecturer._id,
    _id: { $ne: internship._id },
    status: { $in: ["PENDING_SUPERVISOR_ACCEPTANCE", "APPROVED", "INTERNING"] },
  });

  if (currentActiveCount >= lecturer.maxStudents) {
    throw new AppError(
      `Giảng viên ${lecturer.userId?.fullName} đã đạt tối đa giới hạn chỉ tiêu hướng dẫn (${lecturer.maxStudents} SV)`,
      400,
    );
  }

  internship.lecturerId = lecturerId;
  internship.status = "PENDING_SUPERVISOR_ACCEPTANCE";
  internship.assignedAt = new Date();
  internship.assignedBy = tbmUserId || null;
  await internship.save();

  // Send Notification strictly to assigned Lecturer
  if (lecturer.userId?._id) {
    const comp = await Company.findById(internship.companyId);
    await notificationService.createNotification({
      recipientId: lecturer.userId._id,
      type: "INTERNSHIP",
      title: "Sinh viên thực tập mới được phân công",
      message: `Bạn được phân công hướng dẫn sinh viên thực tập tại: "${comp?.name || "Doanh nghiệp"}"`,
      referenceId: internship._id,
      referenceModel: "Internship",
      link: "/lecturer/internships",
    });
  }

  return await Internship.findById(internship._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "approvedBy",
      select: "fullName email",
    });
};

// ====================
// TBM: Approve Internship
// ====================
const approveInternship = async (internshipId, approvedBy, lecturerId) => {
  const internship = await Internship.findById(internshipId);

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (internship.status !== "PENDING") {
    throw new AppError(`Không thể duyệt hồ sơ đang ở trạng thái ${internship.status}`, 409);
  }

  // If lecturerId provided during approval, validate and assign
  if (lecturerId) {
    const lecturer = await Lecturer.findById(lecturerId).populate({
      path: "userId",
      select: "fullName email",
    });
    if (!lecturer) {
      throw new AppError("Không tìm thấy giảng viên được chọn", 404);
    }
    if (!lecturer.isAvailable) {
      throw new AppError("Giảng viên hiện đang tạm ngưng nhận sinh viên", 400);
    }

    const currentCount = await Internship.countDocuments({
      lecturerId: lecturer._id,
      _id: { $ne: internship._id },
      status: { $in: ["PENDING_SUPERVISOR_ACCEPTANCE", "APPROVED", "INTERNING"] },
    });

    if (currentCount >= lecturer.maxStudents) {
      throw new AppError(
        `Giảng viên ${lecturer.userId?.fullName} đã đạt tối đa chỉ tiêu tiếp nhận (${lecturer.maxStudents} SV)`,
        400,
      );
    }

    internship.lecturerId = lecturerId;
    internship.status = "INTERNING";
    internship.assignedAt = new Date();
    internship.acceptedAt = new Date();
    internship.assignedBy = approvedBy || null;

    if (lecturer.userId?._id) {
      const comp = await Company.findById(internship.companyId);
      await notificationService.createNotification({
        recipientId: lecturer.userId._id,
        type: "INTERNSHIP",
        title: "Phân công hướng dẫn thực tập",
        message: `Bạn được phân công hướng dẫn sinh viên thực tập tại: "${comp?.name || "Doanh nghiệp"}"`,
        referenceId: internship._id,
        referenceModel: "Internship",
        link: "/lecturer/internships",
      });
    }
  } else {
    internship.status = "APPROVED";
  }

  internship.approvedAt = new Date();
  internship.approvedBy = approvedBy;
  await internship.save();

  // Notify Student
  const student = await Student.findById(internship.studentId).populate("userId");
  const comp = await Company.findById(internship.companyId);
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Hồ sơ thực tập đã được phê duyệt",
      message: `Hồ sơ thực tập của bạn tại "${comp?.name || "Doanh nghiệp"}" đã được Trưởng Bộ Môn phê duyệt.`,
      referenceId: internship._id,
      referenceModel: "Internship",
      link: "/student/internship",
    });
  }

  return await Internship.findById(internship._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "approvedBy",
      select: "fullName email",
    });
};

// ====================
// TBM: Reject Internship
// ====================
const rejectInternship = async (internshipId, rejectedBy, rejectionReason) => {
  const internship = await Internship.findById(internshipId);

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (internship.status !== "PENDING") {
    throw new AppError(`Không thể từ chối hồ sơ đang ở trạng thái ${internship.status}`, 409);
  }

  internship.status = "REJECTED";
  internship.rejectionReason = rejectionReason ? rejectionReason.trim() : null;
  internship.rejectedAt = new Date();
  internship.approvedAt = null;
  internship.approvedBy = rejectedBy;
  await internship.save();

  // Reset Student flag to allow new registration if rejected
  const student = await Student.findById(internship.studentId).populate("userId");
  if (student) {
    student.internshipRegistered = false;
    await student.save();
  }

  // Notify Student
  const comp = await Company.findById(internship.companyId);
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Hồ sơ thực tập đã bị từ chối",
      message: `Hồ sơ thực tập của bạn tại "${comp?.name || "Doanh nghiệp"}" đã bị từ chối: ${rejectionReason ? rejectionReason.trim() : "Chưa đạt yêu cầu"}. Bạn có thể đăng ký lại.`,
      referenceId: internship._id,
      referenceModel: "Internship",
      link: "/student/internship",
    });
  }

  return await Internship.findById(internship._id)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "approvedBy",
      select: "fullName email",
    });
};

// ====================
// Lecturer Accepts Internship Supervision
// ====================
const supervisorAcceptInternship = async (internshipId, requestingUser) => {
  if (requestingUser.role !== "LECTURER") {
    throw new AppError("Chỉ có Giảng viên mới có quyền chấp nhận hướng dẫn", 403);
  }

  const lecturer = await Lecturer.findOne({ userId: requestingUser.userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const internship = await Internship.findById(internshipId).populate("studentId companyId");
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (!internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không phải là giảng viên được phân công cho hồ sơ này", 403);
  }

  if (internship.status !== "PENDING_SUPERVISOR_ACCEPTANCE") {
    throw new AppError(`Không thể chấp nhận hồ sơ đang ở trạng thái ${internship.status}`, 409);
  }

  internship.status = "INTERNING";
  internship.acceptedAt = new Date();
  await internship.save();

  // Notify Student
  const student = await Student.findById(internship.studentId._id || internship.studentId).populate("userId");
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Giảng viên đã chấp nhận hướng dẫn thực tập",
      message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã chấp nhận hướng dẫn hồ sơ thực tập của bạn.`,
      referenceId: internship._id,
      referenceModel: "Internship",
      link: "/student/internship",
    });
  }

  return await Internship.findById(internship._id)
    .populate({ path: "studentId", populate: { path: "userId", select: "fullName email phone" } })
    .populate("companyId")
    .populate({ path: "lecturerId", populate: { path: "userId", select: "fullName email phone" } });
};

// ====================
// Lecturer Rejects Internship Supervision
// ====================
const supervisorRejectInternship = async (internshipId, requestingUser, { reason } = {}) => {
  if (!reason || !reason.trim()) {
    throw new AppError("Vui lòng cung cấp lý do từ chối hướng dẫn", 400);
  }

  if (requestingUser.role !== "LECTURER") {
    throw new AppError("Chỉ có Giảng viên mới có quyền từ chối hướng dẫn", 403);
  }

  const lecturer = await Lecturer.findOne({ userId: requestingUser.userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const internship = await Internship.findById(internshipId).populate("studentId companyId");
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (!internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không phải là giảng viên được phân công cho hồ sơ này", 403);
  }

  if (internship.status !== "PENDING_SUPERVISOR_ACCEPTANCE") {
    throw new AppError(`Không thể từ chối hồ sơ đang ở trạng thái ${internship.status}`, 409);
  }

  internship.status = "REJECTED";
  internship.rejectionReason = reason.trim();
  internship.rejectedAt = new Date();
  await internship.save();

  // Reset student registration flag
  await Student.findByIdAndUpdate(internship.studentId._id || internship.studentId, {
    internshipRegistered: false,
  });

  const student = await Student.findById(internship.studentId._id || internship.studentId).populate("userId");

  // Notify Student
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Giảng viên đã từ chối hướng dẫn thực tập",
      message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối hướng dẫn hồ sơ thực tập. Lý do: ${reason.trim()}`,
      referenceId: internship._id,
      referenceModel: "Internship",
      link: "/student/internship",
    });
  }

  // Notify TBM
  await notificationService.createNotificationForRole("TBM", {
    type: "INTERNSHIP",
    title: "Giảng viên đã từ chối hướng dẫn thực tập",
    message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối hướng dẫn hồ sơ thực tập của sinh viên ${student?.userId?.fullName || "SV"}. Lý do: ${reason.trim()}`,
    referenceId: internship._id,
    referenceModel: "Internship",
    link: "/tbm/internships",
  });

  return internship;
};

// ====================
// Lecturer / TBM Completes Internship Evaluation
// ====================
const completeInternship = async (internshipId, requestingUser) => {
  const internship = await Internship.findById(internshipId);
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
    if (!lecturer || !internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
      throw new AppError("Bạn không phải là giảng viên hướng dẫn của hồ sơ này", 403);
    }
  }

  const evaluation = await Evaluation.findOne({
    evaluationType: "INTERNSHIP",
    targetId: internship._id,
  });

  if (!evaluation || evaluation.score === null || evaluation.score === undefined) {
    throw new AppError("Sinh viên chưa có điểm đánh giá từ doanh nghiệp. Không thể hoàn thành thực tập.", 400);
  }

  internship.status = "COMPLETED";
  internship.completedAt = new Date();
  await internship.save();

  evaluation.status = "CONFIRMED";
  evaluation.confirmedAt = new Date();
  await evaluation.save();

  // Notify Student
  const student = await Student.findById(internship.studentId).populate("userId");
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Kỳ thực tập đã hoàn thành",
      message: `Giảng viên hướng dẫn đã xác nhận hoàn thành kỳ thực tập của bạn. Điểm đánh giá: ${evaluation.score}/10.`,
      referenceId: internship._id,
      referenceModel: "Internship",
      link: "/student/internship",
    });
  }

  return await Internship.findById(internship._id)
    .populate({ path: "studentId", populate: { path: "userId", select: "fullName email phone" } })
    .populate("companyId")
    .populate({ path: "lecturerId", populate: { path: "userId", select: "fullName email phone" } });
};

// ====================
// Get Logged-in Student's Internship Profile (AcademicTerm-aware)
// ====================
const getMyInternship = async (userId, academicTermId = null) => {
  const student = await Student.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });

  if (!student) {
    throw new AppError("Không tìm thấy thông tin hồ sơ sinh viên", 404);
  }

  const query = { studentId: student._id };
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const internship = await Internship.findOne(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "approvedBy",
      select: "fullName email",
    })
    .populate("academicTermId")
    .lean();

  const hasActiveInternship =
    internship && ACTIVE_STATUSES.includes(internship.status);

  return {
    student,
    internship: internship || null,
    hasActiveInternship: Boolean(hasActiveInternship),
    canRegisterNew: !hasActiveInternship,
  };
};

// ====================
// Lecturer: Get Supervised Internships (AcademicTerm-aware)
// ====================
const getSupervisedInternships = async ({
  userId,
  page = 1,
  limit = 10,
  search = "",
  academicTermId = "",
}) => {
  const lecturer = await Lecturer.findOne({ userId }).populate({
    path: "userId",
    select: "fullName email phone",
  });

  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin hồ sơ giảng viên của tài khoản này", 404);
  }

  const query = { lecturerId: lecturer._id };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  // Search by MSSV, student name, company name
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

    query.$and = [{ lecturerId: lecturer._id }, { $or: searchCondition }];
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
      path: "approvedBy",
      select: "fullName email",
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

  const enrichedInternships = internships.map((item) => ({
    ...item,
    evaluation: evalMap.get(item._id.toString()) || null,
  }));

  const activeQuery = {
    lecturerId: lecturer._id,
    status: { $in: ["APPROVED", "INTERNING"] },
  };
  if (academicTermId && academicTermId !== "ALL") {
    activeQuery.academicTermId = academicTermId;
  }

  const activeCount = await Internship.countDocuments(activeQuery);

  return {
    lecturer,
    data: enrichedInternships,
    stats: {
      totalAssigned: total,
      activeCount,
      maxStudents: lecturer.maxStudents,
      remainingQuota: Math.max(0, lecturer.maxStudents - activeCount),
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
// Get Internship By ID with Role Check
// ====================
const getInternshipById = async (internshipId, requestingUser) => {
  const internship = await Internship.findById(internshipId)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "approvedBy",
      select: "fullName email",
    });

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  // Access Control: If requester is STUDENT, they can ONLY view their own internship
  if (requestingUser && requestingUser.role === "STUDENT") {
    const student = await Student.findOne({ userId: requestingUser.userId });
    if (!student || internship.studentId._id.toString() !== student._id.toString()) {
      throw new AppError("Bạn không có quyền xem hồ sơ thực tập của sinh viên khác", 403);
    }
  }

  // Access Control: If requester is LECTURER, they can ONLY view internships assigned to them
  if (requestingUser && requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
    if (
      !lecturer ||
      !internship.lecturerId ||
      internship.lecturerId._id.toString() !== lecturer._id.toString()
    ) {
      throw new AppError(
        "Bạn không có quyền xem hồ sơ sinh viên do giảng viên khác hướng dẫn",
        403,
      );
    }
  }

  const evalDoc = await Evaluation.findOne({
    targetId: internship.studentId._id,
  }).lean();

  const internshipObj = internship.toObject ? internship.toObject() : internship;
  internshipObj.evaluation = evalDoc || null;

  return internshipObj;
};

// ====================
// Document A: Get Supervision Confirmation Data (Read-Only)
// ====================
const getSupervisionConfirmationDocument = async ({
  userId,
  userRole,
  lecturerId = null,
  companyId = null,
}) => {
  let targetLecturerId = lecturerId;

  if (userRole === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId });
    if (!lecturer) {
      throw new AppError("Không tìm thấy thông tin giảng viên", 404);
    }
    targetLecturerId = lecturer._id;
  } else if (!targetLecturerId && (userRole === "TBM" || userRole === "ADMIN")) {
    const firstLec = await Lecturer.findOne();
    targetLecturerId = firstLec?._id;
  }

  if (!targetLecturerId) {
    throw new AppError("Giảng viên hướng dẫn là bắt buộc", 400);
  }

  const lecturer = await Lecturer.findById(targetLecturerId).populate({
    path: "userId",
    select: "fullName email phone",
  });

  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên yêu cầu", 404);
  }

  const query = {
    lecturerId: lecturer._id,
    status: { $in: ["APPROVED", "INTERNING", "COMPLETED"] },
  };

  if (companyId) {
    query.companyId = companyId;
  }

  const internships = await Internship.find(query)
    .sort({ startDate: 1, createdAt: 1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .lean();

  const company =
    internships[0]?.companyId || (await Company.findOne({ status: "ACTIVE" }));

  let earliestStart = internships[0]?.startDate || new Date();
  let latestEnd =
    internships[0]?.endDate || new Date(Date.now() + 90 * 24 * 3600 * 1000);

  internships.forEach((i) => {
    if (i.startDate && new Date(i.startDate) < new Date(earliestStart)) {
      earliestStart = i.startDate;
    }
    if (i.endDate && new Date(i.endDate) > new Date(latestEnd)) {
      latestEnd = i.endDate;
    }
  });

  const diffMs = new Date(latestEnd) - new Date(earliestStart);
  const totalWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 3600 * 1000)));

  const students = internships.map((i, index) => ({
    stt: index + 1,
    studentCode: i.studentId?.studentCode || "—",
    fullName: i.studentId?.userId?.fullName || "—",
    className: i.studentId?.className || "—",
    faculty: "Khoa Công nghệ Thông tin",
    major: "Công nghệ Thông tin",
    position: i.position,
    startDate: i.startDate,
    endDate: i.endDate,
  }));

  return {
    lecturer: {
      fullName: lecturer.userId?.fullName,
      academicTitle: lecturer.academicTitle || "ThS.",
      lecturerCode: lecturer.lecturerCode,
      faculty: "Khoa Công nghệ Thông tin",
      university: "Trường Đại học Công nghiệp TP. Hồ Chí Minh (IUH)",
      email: lecturer.userId?.email,
      phone: lecturer.userId?.phone,
    },
    company: company
      ? {
          name: company.name,
          address: company.address,
          email: company.email,
          phone: company.phone,
          contactPerson: company.contactPerson,
        }
      : null,
    startDate: earliestStart,
    endDate: latestEnd,
    totalWeeks,
    totalStudents: students.length,
    students,
  };
};

// ====================
// Get Active Companies for Registration Dropdown
// ====================
const getActiveCompanies = async () => {
  return await Company.find({ status: "ACTIVE" })
    .select("name code address email phone website contactPerson contactEmail")
    .sort({ name: 1 })
    .lean();
};

export default {
  createInternship,
  getAllInternships,
  getAvailableLecturers,
  assignLecturer,
  approveInternship,
  rejectInternship,
  supervisorAcceptInternship,
  supervisorRejectInternship,
  getMyInternship,
  getSupervisedInternships,
  getSupervisionConfirmationDocument,
  getInternshipById,
  getActiveCompanies,
  completeInternship,
};
