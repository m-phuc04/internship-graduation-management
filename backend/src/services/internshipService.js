import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Internship from "../models/Internship.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Evaluation from "../models/Evaluation.js";
import AcademicTerm from "../models/AcademicTerm.js";
import InternshipReport from "../models/InternshipReport.js";
import InternshipDocument from "../models/InternshipDocument.js";
import Log from "../models/Log.js";
import academicTermService from "./academicTermService.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";
import {
  calculateInternshipWeeks,
  checkInternshipDiaryCompletion,
} from "../utils/internshipDateUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to remove physical file safely
const unlinkFileSafe = (fileUrl) => {
  if (!fileUrl) return;
  try {
    const diskPath = path.join(
      __dirname,
      "../../public",
      fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`,
    );
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.warn("Could not remove file from disk:", err.message);
  }
};

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
  academicTermId,
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

  // 2. Validate Position, Dates & Duration (Ràng buộc thời gian thực tập chỉ được phép 10 tuần hoặc 12 tuần)
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

  const calculatedWeeks = calculateInternshipWeeks(start, end);
  if (calculatedWeeks !== 10 && calculatedWeeks !== 12) {
    throw new AppError(
      `Thời gian thực tập chỉ được phép là 10 tuần hoặc 12 tuần (Thời lượng hiện tại: ${calculatedWeeks ? `${calculatedWeeks} tuần` : "không hợp lệ"}). Vui lòng điều chỉnh lại ngày bắt đầu và kết thúc.`,
      400,
    );
  }

  // 3. Identify Current Academic Term automatically (by explicit term ID, Date, or ACTIVE status)
  let activeTerm = null;
  if (academicTermId) {
    activeTerm = await AcademicTerm.findById(academicTermId).lean();
  }
  if (!activeTerm) {
    activeTerm = await academicTermService.getCurrentAcademicTerm(new Date());
  }

  // Validate Registration Window (if configured)
  const now = new Date();
  if (activeTerm.internship?.registrationStart) {
    const regStart = new Date(activeTerm.internship.registrationStart);
    if (now < regStart) {
      throw new AppError("Chưa đến thời gian mở cổng đăng ký Thực tập Doanh nghiệp cho học kỳ này.", 400);
    }
  }
  if (activeTerm.internship?.registrationEnd) {
    const regEnd = new Date(activeTerm.internship.registrationEnd);
    if (regEnd.getUTCHours() === 0 && regEnd.getUTCMinutes() === 0 && regEnd.getUTCSeconds() === 0) {
      regEnd.setUTCHours(23, 59, 59, 999);
    }
    if (now > regEnd) {
      throw new AppError("Đã hết thời gian đăng ký Thực tập Doanh nghiệp cho học kỳ này.", 400);
    }
  }

  // 4. Check 1 MSSV = 1 Active Internship Rule within active term
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
    let companyDoc = null;
    if (newCompany.code && newCompany.code.trim()) {
      companyDoc = await Company.findOne({
        code: newCompany.code.trim().toUpperCase(),
      });
    }
    if (!companyDoc && newCompany.name && newCompany.name.trim()) {
      companyDoc = await Company.findOne({
        name: { $regex: new RegExp("^" + newCompany.name.trim() + "$", "i") },
      });
    }

    if (companyDoc) {
      companyDoc.name = newCompany.name.trim();
      companyDoc.address = newCompany.address.trim();
      if (newCompany.code) companyDoc.code = newCompany.code.trim().toUpperCase();
      if (newCompany.email) companyDoc.email = newCompany.email.trim().toLowerCase();
      if (newCompany.phone) companyDoc.phone = newCompany.phone.trim();
      if (newCompany.website) companyDoc.website = newCompany.website.trim();
      if (newCompany.contactPerson || mentorName) {
        companyDoc.contactPerson = newCompany.contactPerson?.trim() || mentorName || null;
      }
      if (newCompany.contactEmail || mentorEmail) {
        companyDoc.contactEmail = newCompany.contactEmail?.trim().toLowerCase() || mentorEmail || null;
      }
      companyDoc.status = "ACTIVE";
      await companyDoc.save();
      targetCompanyId = companyDoc._id;
    } else {
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
    }
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
    durationInWeeks: calculatedWeeks,
    reportCycle: activeTerm.internship?.reportCycle || 1,
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
      const canAssign = lec.isAvailable !== false;

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

  internship.lecturerId = lecturerId;
  internship.status = "PENDING_SUPERVISOR_ACCEPTANCE";
  internship.assignedAt = new Date();
  internship.assignedBy = tbmUserId || null;
  if (!internship.approvedAt) {
    internship.approvedAt = new Date();
    internship.approvedBy = tbmUserId || null;
  }
  await internship.save();

  // Send Notification strictly to assigned Lecturer
  if (lecturer.userId?._id) {
    const comp = await Company.findById(internship.companyId);
    await notificationService.createNotification({
      recipientId: lecturer.userId._id,
      type: "INTERNSHIP",
      title: "Sinh viên thực tập mới được phân công",
      message: `Bạn được phân công giám sát sinh viên thực tập tại: "${comp?.name || "Doanh nghiệp"}"`,
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
        title: "Phân công giám sát thực tập",
        message: `Bạn được phân công giám sát sinh viên thực tập tại: "${comp?.name || "Doanh nghiệp"}"`,
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

  // Get student and company details before deleting the internship
  const student = await Student.findById(internship.studentId).populate("userId");
  const comp = await Company.findById(internship.companyId);

  // Reset Student flag to allow new registration from scratch
  if (student) {
    student.internshipRegistered = false;
    await student.save();
  }

  // Notify Student - inform reason and prompt re-registration
  const reasonText = rejectionReason && rejectionReason.trim() ? `: ${rejectionReason.trim()}` : "";
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Hồ sơ thực tập đã bị từ chối",
      message: `Hồ sơ đăng ký thực tập của bạn tại "${comp?.name || "Doanh nghiệp"}" đã bị từ chối${reasonText}. Vui lòng tiến hành đăng ký lại từ đầu.`,
      referenceId: null,
      referenceModel: null,
      link: "/student/internship/register",
    });
  }

  const compId = internship.companyId;

  // Completely delete the internship record - do not store any rejection history or reason in Database
  await Internship.findByIdAndDelete(internshipId);

  // If the company has no other active internships, delete it to keep database completely clean
  if (compId) {
    const otherCount = await Internship.countDocuments({ companyId: compId });
    if (otherCount === 0) {
      await Company.findByIdAndDelete(compId);
    }
  }

  return {
    deleted: true,
    internshipId,
    studentId: student?._id,
    message: "Đã từ chối đơn đăng ký và thông báo cho sinh viên",
  };
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
      message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã tiếp nhận giám sát hồ sơ thực tập của bạn.`,
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

  // Reset student registration flag
  await Student.findByIdAndUpdate(internship.studentId._id || internship.studentId, {
    internshipRegistered: false,
  });

  const student = await Student.findById(internship.studentId._id || internship.studentId).populate("userId");
  const comp = await Company.findById(internship.companyId);

  // Notify Student
  if (student?.userId?._id) {
    await notificationService.createNotification({
      recipientId: student.userId._id,
      type: "INTERNSHIP",
      title: "Giảng viên đã từ chối hướng dẫn thực tập",
      message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối tiếp nhận giám sát hồ sơ thực tập. Lý do: ${reason.trim()}. Vui lòng đăng ký lại hồ sơ.`,
      referenceId: null,
      referenceModel: null,
      link: "/student/internship/register",
    });
  }

  // Notify TBM
  await notificationService.createNotificationForRole("TBM", {
    type: "INTERNSHIP",
    title: "Giảng viên đã từ chối hướng dẫn thực tập",
    message: `Giảng viên ${lecturer.userId?.fullName || "GVHD"} đã từ chối tiếp nhận giám sát hồ sơ thực tập của sinh viên ${student?.userId?.fullName || "SV"}. Lý do: ${reason.trim()}`,
    referenceId: null,
    referenceModel: null,
    link: "/tbm/internships",
  });

  // Delete internship record from database
  await Internship.findByIdAndDelete(internshipId);

  return {
    deleted: true,
    internshipId,
    message: "Đã từ chối tiếp nhận hồ sơ thực tập",
  };
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
      throw new AppError("Bạn không phải là Giảng viên Giám sát của hồ sơ này", 403);
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
      message: `Giảng viên Giám sát đã xác nhận hoàn thành kỳ thực tập của bạn. Điểm đánh giá: ${evaluation.score}/10.`,
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

  const query = {
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
  };
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

  if (internship && internship.academicTermId) {
    const termDoc = await AcademicTerm.findById(
      internship.academicTermId._id || internship.academicTermId
    ).lean();
    if (termDoc?.internship?.reportCycle) {
      internship.reportCycle = termDoc.internship.reportCycle;
    }
  }

  let diaryStatus = null;
  if (internship) {
    const reports = await InternshipReport.find({ internshipId: internship._id }).lean();
    diaryStatus = checkInternshipDiaryCompletion(internship, reports);
  }

  return {
    student,
    internship: internship || null,
    hasActiveInternship: Boolean(hasActiveInternship),
    canRegisterNew: !hasActiveInternship,
    diaryStatus,
  };
};

// ====================
// Lecturer: Get Supervised Internships (AcademicTerm-aware)
// ====================
const getSupervisedInternships = async (
  userIdOrOptions,
  options = {},
) => {
  let userId, page, limit, search, academicTermId;
  if (typeof userIdOrOptions === "object" && userIdOrOptions !== null && !userIdOrOptions._bsontype) {
    ({
      userId,
      page = 1,
      limit = 10,
      search = "",
      academicTermId = "",
    } = userIdOrOptions);
  } else {
    userId = userIdOrOptions;
    ({
      page = 1,
      limit = 10,
      search = "",
      academicTermId = "",
    } = options);
  }

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

  // Fetch all reports to automatically verify diary completion (Requirement 2 & 4)
  const allReports = await InternshipReport.find({
    internshipId: { $in: internshipIds },
  }).lean();

  const reportMap = new Map();
  allReports.forEach((rep) => {
    const key = rep.internshipId.toString();
    if (!reportMap.has(key)) reportMap.set(key, []);
    reportMap.get(key).push(rep);
  });

  let currentAcademicTerm = null;
  if (academicTermId && academicTermId !== "ALL") {
    currentAcademicTerm = await AcademicTerm.findById(academicTermId).lean();
  } else {
    currentAcademicTerm = await AcademicTerm.findOne({ status: "ACTIVE" }).lean();
  }
  const commonReportCycle = currentAcademicTerm?.internship?.reportCycle || 1;

  // Lấy danh sách tài liệu Báo cáo thực tập từ InternshipDocument để đồng bộ trạng thái nộp
  const studentIds = internships
    .map((i) => i.studentId?._id || i.studentId)
    .filter(Boolean);

  const reportDocs = await InternshipDocument.find({
    documentType: "SUBMISSION",
    $or: [
      { internshipId: { $in: internshipIds } },
      { studentId: { $in: studentIds } },
    ],
    category: { $regex: /báo cáo/i },
  })
    .sort({ createdAt: -1 })
    .lean();

  const docMap = new Map();
  reportDocs.forEach((d) => {
    if (d.internshipId) {
      const key = d.internshipId.toString();
      if (!docMap.has(key)) docMap.set(key, d);
    }
    if (d.studentId) {
      const sKey = d.studentId.toString();
      if (!docMap.has(sKey)) docMap.set(sKey, d);
    }
  });

  const enrichedInternships = internships.map((item) => {
    const reports = reportMap.get(item._id.toString()) || [];
    const itemWithCycle = { ...item, reportCycle: commonReportCycle };
    const diaryStatus = checkInternshipDiaryCompletion(itemWithCycle, reports);
    const pretestPassed = Boolean(item.pretest?.isPassed);

    // Chuẩn hóa và fallback file báo cáo nếu chưa có trong internship.reportFile
    let reportFile = item.reportFile;
    const fallbackDoc =
      docMap.get(item._id.toString()) ||
      (item.studentId?._id ? docMap.get(item.studentId._id.toString()) : null);

    if ((!reportFile || !reportFile.fileUrl) && fallbackDoc?.fileUrl) {
      reportFile = {
        originalName: fallbackDoc.title || fallbackDoc.fileName,
        fileName: fallbackDoc.fileName,
        fileUrl: fallbackDoc.fileUrl,
        fileSize: fallbackDoc.fileSize || 0,
        fileType: fallbackDoc.fileType || null,
        uploadedAt: fallbackDoc.createdAt || new Date(),
      };
    }

    const reportFileSubmitted = Boolean(reportFile?.fileUrl);

    // Điều kiện chấm điểm TTDN: Bắt buộc đáp ứng đầy đủ cả 3 điều kiện:
    // 1. PASS PRETEST
    // 2. Đã nộp file báo cáo thực tập hợp lệ
    // 3. Đã hoàn thành đầy đủ nhật ký thực tập theo chu kỳ nộp
    const gradingBlockReasons = [];
    if (!pretestPassed) {
      gradingBlockReasons.push("Chưa PASS PRETEST");
    }
    if (!reportFileSubmitted) {
      gradingBlockReasons.push("Chưa nộp file báo cáo thực tập");
    }
    if (!diaryStatus.isCompleted) {
      gradingBlockReasons.push(
        diaryStatus.missingWeeks?.length > 0
          ? `Chưa hoàn thành đủ nhật ký thực tập (Còn thiếu tuần: ${diaryStatus.missingWeeks.join(", ")})`
          : "Chưa hoàn thành đủ nhật ký thực tập theo chu kỳ"
      );
    }

    const canGrade = gradingBlockReasons.length === 0;

    return {
      ...item,
      reportFile,
      evaluation: evalMap.get(item._id.toString()) || null,
      diaryStatus,
      pretestPassed,
      reportFileSubmitted,
      canGrade,
      gradingBlockReasons,
    };
  });

  const activeQuery = {
    lecturerId: lecturer._id,
    status: { $in: ["PENDING_SUPERVISOR_ACCEPTANCE", "APPROVED", "INTERNING", "COMPLETED"] },
  };
  if (academicTermId && academicTermId !== "ALL") {
    activeQuery.academicTermId = academicTermId;
  }

  const activeCount = await Internship.countDocuments(activeQuery);

  return {
    lecturer,
    reportCycle: commonReportCycle,
    academicTerm: currentAcademicTerm,
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
  academicTermId = null,
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
    throw new AppError("Giảng viên Giám sát là bắt buộc", 400);
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

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

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
// Lecturer / TBM Updates Report Cycle for Academic Term (Common for all TTDN students)
// ====================
const updateAcademicTermReportCycle = async (termId, requestingUser, reportCycle) => {
  const cycle = Number(reportCycle);
  if (![1, 2, 3].includes(cycle)) {
    throw new AppError("Chu kỳ nộp nhật ký chỉ được phép là 1, 2 hoặc 3 tuần/lần", 400);
  }

  // Access control: LECTURER, TBM, ADMIN
  if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({
      userId: requestingUser.userId || requestingUser._id || requestingUser.id,
    });
    if (!lecturer) {
      throw new AppError("Bạn không có quyền thiết lập chu kỳ nộp nhật ký", 403);
    }
  } else if (!["TBM", "ADMIN"].includes(requestingUser.role)) {
    throw new AppError("Bạn không có quyền thiết lập chu kỳ nộp nhật ký", 403);
  }

  let term = null;
  if (termId && termId !== "ALL") {
    term = await AcademicTerm.findById(termId);
  }
  if (!term) {
    term = await AcademicTerm.findOne({ status: "ACTIVE" });
  }
  if (!term) {
    throw new AppError("Không tìm thấy học kỳ hợp lệ để thiết lập chu kỳ nộp nhật ký", 404);
  }

  if (!term.internship) {
    term.internship = {};
  }
  term.internship.reportCycle = cycle;
  await term.save();

  // Unified update to all internship records of this term
  await Internship.updateMany(
    { academicTermId: term._id },
    { $set: { reportCycle: cycle } }
  );

  return {
    academicTermId: term._id,
    termName: term.name,
    reportCycle: cycle,
  };
};

// ====================
// Lecturer / TBM Updates Report Cycle (Syncs with Academic Term)
// ====================
const updateReportCycle = async (internshipId, requestingUser, reportCycle) => {
  const cycle = Number(reportCycle);
  if (![1, 2, 3].includes(cycle)) {
    throw new AppError("Chu kỳ nộp nhật ký chỉ được phép là 1, 2 hoặc 3 tuần/lần", 400);
  }

  const internship = await Internship.findById(internshipId);
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  // Access control
  if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({
      userId: requestingUser.userId || requestingUser._id || requestingUser.id,
    });
    if (!lecturer) {
      throw new AppError("Bạn không có quyền thiết lập chu kỳ nộp nhật ký", 403);
    }
  } else if (!["TBM", "ADMIN"].includes(requestingUser.role)) {
    throw new AppError("Bạn không có quyền thiết lập chu kỳ nộp nhật ký", 403);
  }

  const termId = internship.academicTermId?._id || internship.academicTermId;
  const termResult = await updateAcademicTermReportCycle(termId, requestingUser, cycle);

  internship.reportCycle = cycle;
  if (!internship.academicTermId && termResult?.academicTermId) {
    internship.academicTermId = termResult.academicTermId;
  }
  await internship.save();

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
    .populate("academicTermId");
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

// ====================
// Student Uploads Internship Report File (Prompt 2 - Requirement 1)
// ====================
const uploadReportFile = async ({ internshipId = null, userId, file }) => {
  if (!file) {
    throw new AppError("Vui lòng chọn file báo cáo thực tập để tải lên", 400);
  }

  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  let internship;
  if (internshipId) {
    internship = await Internship.findById(internshipId);
  } else {
    internship = await Internship.findOne({
      studentId: student._id,
      status: { $ne: "CANCELLED" },
    }).sort({ createdAt: -1 });
  }

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập của bạn", 404);
  }

  // Security check: cannot upload for another student
  const isOwner =
    internship.studentId.toString() === student._id.toString() ||
    (internship.secondStudentId &&
      internship.secondStudentId.toString() === student._id.toString());
  if (!isOwner) {
    throw new AppError("Bạn không có quyền nộp file báo cáo cho hồ sơ thực tập này", 403);
  }

  // Quy tắc nộp báo cáo: Không cho phép tải thêm khi file cũ vẫn còn tồn tại.
  // Nếu muốn thay thế báo cáo, sinh viên phải thực hiện gỡ file cũ trước rồi mới được tải file mới.
  if (internship.reportFile && internship.reportFile.fileUrl) {
    if (file.filename) {
      unlinkFileSafe(`/uploads/internship-reports/${file.filename}`);
    }
    throw new AppError(
      "Hồ sơ thực tập đã có file báo cáo đang có hiệu lực. Vui lòng gỡ file cũ trước khi nộp file mới.",
      400,
    );
  }

  const fileUrl = `/uploads/internship-reports/${file.filename}`;

  internship.reportFile = {
    originalName: file.originalname,
    fileName: file.filename,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    uploadedAt: new Date(),
  };

  await internship.save();

  // Keep InternshipReport FINAL in sync
  let finalReport = await InternshipReport.findOne({
    internshipId: internship._id,
    reportType: "FINAL",
  });
  if (finalReport) {
    finalReport.file = {
      originalName: file.originalname,
      fileName: file.filename,
      fileUrl,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
    finalReport.status = "SUBMITTED";
    finalReport.submittedAt = new Date();
    await finalReport.save();
  } else {
    await InternshipReport.create({
      internshipId: internship._id,
      studentId: student._id,
      reportType: "FINAL",
      title: "Báo cáo thực tập doanh nghiệp (Bản chính thức)",
      content: "File báo cáo tổng kết thực tập doanh nghiệp đã nộp bởi sinh viên",
      file: {
        originalName: file.originalname,
        fileName: file.filename,
        fileUrl,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      },
      status: "SUBMITTED",
      submittedAt: new Date(),
    });
  }

  // Đồng bộ sang InternshipDocument để tab Tài liệu sinh viên hiển thị đầy đủ
  try {
    let doc = await InternshipDocument.findOne({
      internshipId: internship._id,
      documentType: "SUBMISSION",
      category: { $regex: /báo cáo/i },
    });
    if (!doc) {
      await InternshipDocument.create({
        academicTermId: internship.academicTermId || null,
        supervisorId: internship.lecturerId || null,
        internshipId: internship._id,
        studentId: student._id,
        documentType: "SUBMISSION",
        scope: "SPECIFIC",
        title: file.originalname,
        fileName: file.filename,
        fileUrl,
        fileSize: file.size,
        fileType: file.mimetype,
        category: "Báo cáo thực tập",
        description: "File báo cáo thực tập tải lên từ trang Thông tin thực tập",
        status: "SUBMITTED",
        uploadedBy: userId,
      });
    } else {
      doc.fileName = file.filename;
      doc.title = file.originalname;
      doc.fileUrl = fileUrl;
      doc.fileSize = file.size;
      doc.fileType = file.mimetype;
      doc.uploadedBy = userId;
      doc.supervisorId = internship.lecturerId || doc.supervisorId;
      doc.academicTermId = internship.academicTermId || doc.academicTermId;
      doc.status = "SUBMITTED";
      await doc.save();
    }

    // Gửi thông báo đến Giảng viên giám sát
    if (internship.lecturerId) {
      const supervisor = await Lecturer.findById(internship.lecturerId).populate("userId", "fullName");
      if (supervisor?.userId?._id) {
        const studentUser = await User.findById(userId).select("fullName");
        const studentName = studentUser?.fullName || "Sinh viên";
        const studentCode = student.studentCode ? ` (${student.studentCode})` : "";
        const notifTitle = `Sinh viên ${studentName} đã nộp 1 tài liệu`;
        const notifMessage = `Sinh viên ${studentName}${studentCode} đã nộp file tài liệu thực tập: "${file.originalname}".`;
        const targetDocId = doc?._id || internship._id;
        const targetLink = `/lecturer/internship-documents?tab=submissions&studentId=${student._id}&internshipId=${internship._id}&docId=${targetDocId}&search=${student.studentCode || ""}`;

        await notificationService.createNotification({
          recipientId: supervisor.userId._id,
          senderId: userId,
          type: "INTERNSHIP",
          title: notifTitle,
          message: notifMessage,
          referenceId: targetDocId,
          referenceModel: "InternshipDocument",
          link: targetLink,
          metadata: {
            studentId: student._id,
            studentCode: student.studentCode,
            studentName,
            internshipId: internship._id,
            fileId: targetDocId,
            docId: targetDocId,
            fileName: file.originalname,
            submittedAt: new Date(),
          },
        });
      }
    }
  } catch (syncDocErr) {
    console.warn("[uploadReportFile] Failed to sync InternshipDocument / notify:", syncDocErr.message);
  }

  return internship;
};

// ====================
// Student & Lecturer (GVGS) Deletes / Removes Internship Report File
// ====================
const deleteReportFile = async ({ internshipId = null, userId, reason = "" }) => {
  // 1. Xác thực người dùng thực hiện
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Không tìm thấy thông tin người dùng", 404);
  }

  // 2. Tìm hồ sơ thực tập tương ứng
  let internship;
  let student = null;
  if (internshipId) {
    internship = await Internship.findById(internshipId)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email studentCode" },
      })
      .populate("academicTermId");
  } else if (user.role === "STUDENT") {
    student = await Student.findOne({ userId });
    if (!student) {
      throw new AppError("Không tìm thấy thông tin sinh viên", 404);
    }
    internship = await Internship.findOne({
      studentId: student._id,
      status: { $ne: "CANCELLED" },
    })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "fullName email studentCode" },
      })
      .populate("academicTermId")
      .sort({ createdAt: -1 });
  }

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  // 3. Phân quyền chặt chẽ giữa Sinh viên và GVGS:
  let actorRole = user.role;
  let actorName = user.fullName || "Người dùng";
  let finalReason = typeof reason === "string" ? reason.trim() : "";

  if (actorRole === "STUDENT") {
    if (!student) {
      student = await Student.findOne({ userId });
    }
    const isOwner =
      internship.studentId?._id?.toString() === student?._id?.toString() ||
      internship.studentId?.toString() === student?._id?.toString() ||
      (internship.secondStudentId &&
        internship.secondStudentId.toString() === student?._id?.toString());
    if (!isOwner) {
      throw new AppError("Bạn không có quyền gỡ file báo cáo của hồ sơ thực tập này", 403);
    }
    if (!finalReason) {
      finalReason = "Sinh viên tự gỡ file báo cáo để nộp lại";
    }
  } else if (actorRole === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId });
    if (!lecturer) {
      throw new AppError("Không tìm thấy thông tin giảng viên", 404);
    }
    const isSupervising =
      internship.lecturerId &&
      internship.lecturerId.toString() === lecturer._id.toString();
    if (!isSupervising) {
      throw new AppError("Bạn không phải là Giảng viên Giám sát được phân công cho sinh viên này", 403);
    }
    if (!finalReason) {
      throw new AppError("Vui lòng nhập lý do gỡ file báo cáo của sinh viên", 400);
    }
    actorName = lecturer.academicTitle
      ? `${lecturer.academicTitle} ${user.fullName}`
      : user.fullName;
  } else if (actorRole === "TBM" || actorRole === "ADMIN") {
    if (!finalReason) {
      throw new AppError("Vui lòng nhập lý do gỡ file báo cáo", 400);
    }
  } else {
    throw new AppError("Bạn không có quyền thực hiện thao tác này", 403);
  }

  if (!internship.reportFile || !internship.reportFile.fileUrl) {
    throw new AppError("Hồ sơ thực tập hiện tại chưa có file báo cáo nào để gỡ", 400);
  }

  // 4. Lưu vết lịch sử thao tác gỡ file vào Database (Internship.reportRemovalHistory)
  const removedFile = {
    originalName: internship.reportFile.originalName || "",
    fileName: internship.reportFile.fileName || "",
    fileUrl: internship.reportFile.fileUrl || "",
    fileSize: internship.reportFile.fileSize || 0,
  };

  const studentTarget = internship.studentId;
  const studentCode = studentTarget?.studentCode || "";
  const studentName = studentTarget?.userId?.fullName || "";

  const removalRecord = {
    removedBy: user._id,
    removerRole: actorRole,
    removerName: actorName,
    studentId: studentTarget?._id || studentTarget,
    studentName,
    studentCode,
    fileName: removedFile.originalName || removedFile.fileName,
    fileUrl: removedFile.fileUrl,
    reason: finalReason,
    removedAt: new Date(),
  };

  if (!Array.isArray(internship.reportRemovalHistory)) {
    internship.reportRemovalHistory = [];
  }
  internship.reportRemovalHistory.push(removalRecord);

  // 5. Ghi vào collection Log hệ thống để phục vụ đối chiếu, thanh tra
  try {
    await Log.create({
      userId: user._id,
      action: "REMOVE_REPORT_FILE",
      module: "INTERNSHIP_REPORT",
      description: `${actorName} (${actorRole}) đã gỡ file báo cáo "${removalRecord.fileName}" của sinh viên ${studentName} (${studentCode}). Lý do: ${finalReason}`,
      targetId: internship._id,
      targetModel: "Internship",
      method: "DELETE",
      status: "SUCCESS",
    });
  } catch (logErr) {
    console.warn("[deleteReportFile] Failed to write system Log:", logErr.message);
  }

  // 6. Xóa file vật lý của internship.reportFile
  const oldReportUrl = internship.reportFile.fileUrl;
  unlinkFileSafe(oldReportUrl);

  // 7. Reset trường reportFile trên Internship
  internship.reportFile = {
    originalName: null,
    fileName: null,
    fileUrl: null,
    fileSize: 0,
    fileType: null,
    uploadedAt: null,
  };
  await internship.save();

  // 8. Xóa các bản ghi đồng bộ liên quan trong InternshipDocument (loại Báo cáo thực tập)
  try {
    const reportDocs = await InternshipDocument.find({
      internshipId: internship._id,
      documentType: "SUBMISSION",
      category: { $regex: /báo cáo/i },
    });
    for (const d of reportDocs) {
      if (d.fileUrl && d.fileUrl !== oldReportUrl) {
        unlinkFileSafe(d.fileUrl);
      }
      await InternshipDocument.findByIdAndDelete(d._id);
    }
  } catch (docErr) {
    console.warn("[deleteReportFile] Sync InternshipDocument error:", docErr.message);
  }

  // 9. Xóa / cập nhật InternshipReport FINAL
  try {
    const finalReport = await InternshipReport.findOne({
      internshipId: internship._id,
      reportType: "FINAL",
    });
    if (finalReport) {
      if (finalReport.file?.fileUrl && finalReport.file.fileUrl !== oldReportUrl) {
        unlinkFileSafe(finalReport.file.fileUrl);
      }
      await InternshipReport.findByIdAndDelete(finalReport._id);
    }
  } catch (reportErr) {
    console.warn("[deleteReportFile] Sync InternshipReport error:", reportErr.message);
  }

  // 10. Gửi thông báo đến sinh viên nếu người gỡ là GVGS
  if (actorRole === "LECTURER" && studentTarget?.userId?._id) {
    try {
      await notificationService.createNotification({
        recipientId: studentTarget.userId._id,
        title: "Giảng viên giám sát đã gỡ file báo cáo thực tập",
        message: `Giảng viên giám sát (${actorName}) đã gỡ file báo cáo thực tập "${removalRecord.fileName}" của bạn. Lý do: "${finalReason}". Vui lòng kiểm tra và tải lên file báo cáo mới.`,
        type: "WARNING",
        module: "INTERNSHIP",
        link: "/student/internship",
      });
    } catch (notifErr) {
      console.warn("[deleteReportFile] Failed to send notification to student:", notifErr.message);
    }
  }

  return {
    success: true,
    message: "Đã gỡ file báo cáo thực tập thành công",
    removalRecord,
  };
};

// ====================
// Lecturer Updates PASS PRETEST Status (Prompt 2 - Requirement 3)
// ====================
const updatePretestStatus = async (internshipId, requestingUser, { isPassed = true, note = "" } = {}) => {
  const internship = await Internship.findById(internshipId);
  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  // Permission check
  if (requestingUser.role === "LECTURER") {
    const lecturerUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    let lecturer = await Lecturer.findOne({ userId: lecturerUserId });
    if (!lecturer && requestingUser.email) {
      lecturer = await Lecturer.findOne({ email: requestingUser.email.toLowerCase() });
    }
    if (!lecturer || !internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
      throw new AppError("Bạn không phải là Giảng viên Giám sát được phân công cho hồ sơ này", 403);
    }
  }

  const actorUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
  internship.pretest = {
    isPassed: Boolean(isPassed),
    passedAt: isPassed ? new Date() : null,
    passedBy: isPassed ? actorUserId : null,
    note: note ? note.trim() : null,
  };

  await internship.save();
  return internship;
};

// ====================
// Get Report File with Role Check (Prompt 2 - Requirement 1)
// ====================
const getReportFile = async (internshipId, requestingUser) => {
  const internship = await Internship.findById(internshipId)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId");

  if (!internship) {
    throw new AppError("Không tìm thấy hồ sơ thực tập", 404);
  }

  if (requestingUser.role === "STUDENT") {
    const student = await Student.findOne({ userId: requestingUser.userId });
    if (
      !student ||
      (internship.studentId?._id?.toString() !== student._id.toString() &&
        internship.secondStudentId?.toString() !== student._id.toString())
    ) {
      throw new AppError("Bạn không có quyền truy cập file báo cáo này", 403);
    }
  } else if (requestingUser.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: requestingUser.userId });
    if (!lecturer || !internship.lecturerId || internship.lecturerId.toString() !== lecturer._id.toString()) {
      throw new AppError("Bạn không phải là Giảng viên Giám sát của sinh viên này", 403);
    }
  }

  if (!internship.reportFile || !internship.reportFile.fileUrl) {
    const doc = await InternshipDocument.findOne({
      internshipId: internship._id,
      documentType: "SUBMISSION",
      category: { $regex: /báo cáo/i },
    }).sort({ createdAt: -1 });

    if (doc?.fileUrl) {
      internship.reportFile = {
        originalName: doc.title || doc.fileName,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize || 0,
        fileType: doc.fileType || null,
        uploadedAt: doc.createdAt || new Date(),
      };
      await internship.save();
      return internship.reportFile;
    }

    throw new AppError("Sinh viên chưa nộp file báo cáo thực tập", 404);
  }

  return internship.reportFile;
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
  updateReportCycle,
  updateAcademicTermReportCycle,
  uploadReportFile,
  deleteReportFile,
  updatePretestStatus,
  getReportFile,
};
