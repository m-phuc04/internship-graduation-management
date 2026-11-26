import bcrypt from "bcryptjs";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Permission from "../models/Permission.js";
import Internship from "../models/Internship.js";
import Thesis from "../models/Thesis.js";
import AppError from "../utils/AppError.js";
import { generateSecurePassword } from "../utils/passwordGenerator.js";
import emailService from "./emailService.js";

// ====================
// Lấy danh sách giảng viên kèm tìm kiếm, lọc và phân trang
// ====================
const getAllLecturers = async ({
  page = 1,
  limit = 10,
  search = "",
  isAvailable,
  isActive,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  const lecturerQuery = {
    lecturerCode: { $ne: "99999999" },
  };

  if (isAvailable !== undefined && isAvailable !== "") {
    lecturerQuery.isAvailable = isAvailable === "true" || isAvailable === true;
  }

  if (isActive !== undefined && isActive !== "") {
    lecturerQuery.isActive = isActive === "true" || isActive === true;
  }

  if (search && search.trim() !== "") {
    const rawSearch = search.trim();
    // Thoát các ký tự đặc biệt trong biểu thức chính quy
    const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedSearch, "i");

    // Also strip academic title prefix if present (e.g. "TS. Tạ Duy Công Chiến" -> "Tạ Duy Công Chiến")
    const strippedSearch = rawSearch
      .replace(/^(TS|ThS|PGS\.TS|GS\.TS|NCS|ThS\. NCS|TS\.|ThS\.|PGS\.|GS\.)\s+/i, "")
      .trim();
    const strippedRegex =
      strippedSearch && strippedSearch !== rawSearch
        ? new RegExp(strippedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : null;

    // Match linked User records (allow both LECTURER and TBM roles, e.g. TS. Tạ Duy Công Chiến)
    const userOrConditions = [
      { fullName: searchRegex },
      { email: searchRegex },
      { code: searchRegex },
      { phone: searchRegex },
    ];
    if (strippedRegex) {
      userOrConditions.push({ fullName: strippedRegex });
    }

    const userQuery = {
      role: { $in: ["LECTURER", "TBM"] },
      $or: userOrConditions,
    };
    if (isActive !== undefined && isActive !== "") {
      userQuery.isActive = isActive === "true" || isActive === true;
    }

    const matchedUsers = await User.find(userQuery).select("_id");
    const matchedUserIds = matchedUsers.map((u) => u._id);

    const lecturerOrConditions = [
      { lecturerCode: searchRegex },
      { specialization: searchRegex },
      { fields: searchRegex },
      { academicTitle: searchRegex },
      { userId: { $in: matchedUserIds } },
    ];
    if (strippedRegex) {
      lecturerOrConditions.push({ specialization: strippedRegex });
      lecturerOrConditions.push({ fields: strippedRegex });
      lecturerOrConditions.push({ academicTitle: strippedRegex });
      lecturerOrConditions.push({ lecturerCode: strippedRegex });
    }

    lecturerQuery.$or = lecturerOrConditions;
  }

  // 1. Đếm tổng số bản ghi khớp trước trên toàn bộ dữ liệu
  const total = await Lecturer.countDocuments(lecturerQuery);
  const totalPages = Math.ceil(total / limitNum) || 1;

  // 2. Điều chỉnh trang hợp lệ: Nếu trang yêu cầu vượt quá tổng số trang,
  // tự động chuyển về trang 1 để hiển thị ngay kết quả phù hợp!
  const effectivePage = pageNum > totalPages ? 1 : pageNum;
  const skip = (effectivePage - 1) * limitNum;

  const [allLecturers, allActivePermissions] = await Promise.all([
    Lecturer.find(lecturerQuery)
      .populate({
        path: "userId",
        select: "fullName email phone role isActive createdAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Permission.find({ isActive: true }).select("userId permission").lean(),
  ]);

  // Đảm bảo không bao gồm tài khoản ADMIN
  const lecturers = allLecturers.filter(
    (l) => l.userId && l.userId.role !== "ADMIN" && l.lecturerCode !== "99999999"
  );

  const permMap = {};
  allActivePermissions.forEach((p) => {
    const uId = p.userId.toString();
    if (!permMap[uId]) permMap[uId] = [];
    permMap[uId].push(p.permission);
  });

  // Tính số lượng sinh viên đang được giám sát bởi mỗi giảng viên
  const lecturersWithCounts = await Promise.all(
    lecturers.map(async (lec) => {
      const [internshipCount, activeTheses] = await Promise.all([
        Internship.countDocuments({
          lecturerId: lec._id,
          status: { $in: ["APPROVED", "INTERNING"] },
        }),
        Thesis.find({
          supervisorId: lec._id,
          status: {
            $in: [
              "PENDING_SUPERVISOR_APPROVAL",
              "PENDING_TBM_APPROVAL",
              "PENDING_SUPERVISOR_ACCEPTANCE",
              "APPROVED",
              "ASSIGNED_REVIEWERS",
              "IN_PROGRESS",
              "SUBMITTED",
              "GRADED",
            ],
          },
        }).select("secondStudentId"),
      ]);

      let supervisorStudentsCount = 0;
      activeTheses.forEach((t) => {
        supervisorStudentsCount += t.secondStudentId ? 2 : 1;
      });

      const maxSupervised =
        lec.maxSupervisedStudents !== undefined && lec.maxSupervisedStudents !== null
          ? lec.maxSupervisedStudents
          : (lec.maxStudents !== undefined && lec.maxStudents !== null ? lec.maxStudents : 10);
      const remainingQuota = Math.max(0, maxSupervised - supervisorStudentsCount);

      const uId = lec.userId?._id?.toString();
      const activePerms = uId && permMap[uId] ? permMap[uId] : (lec.permissions || []);

      return {
        ...lec,
        permissions: activePerms,
        activeInternshipsCount: internshipCount,
        activeThesesSupervisorCount: activeTheses.length,
        currentSupervisedStudents: supervisorStudentsCount,
        maxSupervisedStudents: maxSupervised,
        maxStudents: maxSupervised,
        remainingQuota,
        totalActiveStudents: internshipCount + supervisorStudentsCount,
      };
    }),
  );

  return {
    lecturers: lecturersWithCounts,
    pagination: {
      total,
      page: effectivePage,
      limit: limitNum,
      totalPages,
      hasNextPage: effectivePage < totalPages,
      hasPrevPage: effectivePage > 1,
    },
  };
};

// ====================
// Lấy thông tin giảng viên theo ID
// ====================
const getLecturerById = async (id) => {
  const lecturer = await Lecturer.findById(id).populate({
    path: "userId",
    select: "fullName email phone isActive createdAt updatedAt",
  });

  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên", 404);
  }

  // Lấy thông tin các đề tài khóa luận đang hoạt động
  const activeTheses = await Thesis.find({
    supervisorId: lecturer._id,
    status: {
      $in: [
        "PENDING_SUPERVISOR_APPROVAL",
        "PENDING_TBM_APPROVAL",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "ASSIGNED_REVIEWERS",
        "IN_PROGRESS",
        "SUBMITTED",
        "GRADED",
      ],
    },
  }).select("secondStudentId");

  let currentSupervisedStudents = 0;
  activeTheses.forEach((t) => {
    currentSupervisedStudents += t.secondStudentId ? 2 : 1;
  });

  const maxSupervised =
    lecturer.maxSupervisedStudents !== undefined && lecturer.maxSupervisedStudents !== null
      ? lecturer.maxSupervisedStudents
      : (lecturer.maxStudents !== undefined && lecturer.maxStudents !== null ? lecturer.maxStudents : 10);

  return {
    ...lecturer.toObject(),
    currentSupervisedStudents,
    maxSupervisedStudents: maxSupervised,
    maxStudents: maxSupervised,
    remainingQuota: Math.max(0, maxSupervised - currentSupervisedStudents),
  };
};

// ====================
// Thêm mới giảng viên
// ====================
const createLecturer = async (lecturerData) => {
  const {
    fullName,
    email,
    password,
    phone,
    lecturerCode,
    academicTitle,
    specialization,
    fields,
    maxSupervisedStudents,
    maxStudents = 10,
    isAvailable = true,
  } = lecturerData;

  if (!fullName || !fullName.trim()) {
    throw new AppError("Họ tên giảng viên là bắt buộc", 400);
  }

  if (!email || !email.trim()) {
    throw new AppError("Email là bắt buộc", 400);
  }

  if (!lecturerCode || !lecturerCode.trim()) {
    throw new AppError("Mã giảng viên là bắt buộc", 400);
  }

  const normalizedCode = lecturerCode.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // Kiểm tra tính duy nhất của email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("Email này đã được sử dụng bởi tài khoản khác", 409);
  }

  // Kiểm tra tính duy nhất của mã giảng viên
  const existingLecturer = await Lecturer.findOne({ lecturerCode: normalizedCode });
  if (existingLecturer) {
    throw new AppError("Mã giảng viên này đã tồn tại", 409);
  }

  // Mật khẩu khởi tạo (nếu không nhập hoặc rỗng, sinh mật khẩu ngẫu nhiên an toàn 16 ký tự)
  let plainPassword;
  if (password && typeof password === "string" && password.trim().length > 0) {
    if (password.trim().length < 6) {
      throw new AppError("Mật khẩu phải có ít nhất 6 ký tự", 400);
    }
    plainPassword = password.trim();
  } else {
    plainPassword = generateSecurePassword(16);
  }

  // Băm mật khẩu (Hash password bằng bcrypt cost 12)
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  // Tạo tài khoản người dùng User (bắt buộc đổi mật khẩu ở lần đầu đăng nhập)
  const user = await User.create({
    fullName: fullName.trim(),
    code: normalizedCode,
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone ? phone.trim() : null,
    role: "LECTURER",
    mustChangePassword: true,
    isActive: true,
  });

  // Thêm mới giảng viên profile
  try {
    const finalMax = maxSupervisedStudents !== undefined
      ? Math.max(1, Number(maxSupervisedStudents) || 5)
      : Math.max(1, Number(maxStudents) || 5);

    let parsedFields = [];
    if (Array.isArray(fields)) {
      parsedFields = fields.map((f) => (typeof f === "string" ? f.trim() : "")).filter(Boolean);
    } else if (typeof fields === "string" && fields.trim()) {
      parsedFields = fields.split(",").map((f) => f.trim()).filter(Boolean);
    }

    const finalSpecialization = specialization && specialization.trim()
      ? specialization.trim()
      : (parsedFields.length > 0 ? parsedFields.join(", ") : null);

    const lecturer = await Lecturer.create({
      userId: user._id,
      lecturerCode: normalizedCode,
      academicTitle: academicTitle ? academicTitle.trim() : null,
      specialization: finalSpecialization,
      fields: parsedFields,
      maxSupervisedStudents: finalMax,
      maxStudents: finalMax,
      isAvailable: Boolean(isAvailable),
    });

    const populatedLecturer = await Lecturer.findById(lecturer._id).populate({
      path: "userId",
      select: "fullName email phone isActive",
    });

    // Gửi email thông tin tài khoản qua SMTP (lỗi SMTP không làm hủy tài khoản)
    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await emailService.sendAccountCreationEmail({
        to: normalizedEmail,
        recipientName: user.fullName,
        lecturerCode: normalizedCode,
        password: plainPassword,
        role: "LECTURER",
      });

      if (emailResult && emailResult.success) {
        emailSent = true;
      } else {
        emailSent = false;
        emailError = emailResult?.error || "Máy chủ SMTP không tiếp nhận email";
      }
    } catch (mailErr) {
      emailSent = false;
      emailError = mailErr.message || "Lỗi máy chủ email khi gửi qua SMTP";
    }

    return {
      ...populatedLecturer.toObject(),
      initialPassword: plainPassword,
      emailSent,
      emailError,
    };
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
};

// ====================
// Cập nhật thông tin Giảng viên & Tài khoản User
// ====================
const updateLecturer = async (id, updateData, requestingUser = null) => {
  const lecturer = await Lecturer.findById(id);
  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên", 404);
  }

  const user = await User.findById(lecturer.userId);
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản liên kết của giảng viên", 404);
  }

  const {
    fullName,
    email,
    phone,
    lecturerCode,
    academicTitle,
    specialization,
    fields,
    maxSupervisedStudents,
    maxStudents,
    isAvailable,
    isActive,
  } = updateData;

  // Kiểm tra tính duy nhất của email if changed
  if (email && email.trim().toLowerCase() !== user.email) {
    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: user._id },
    });
    if (existingUser) {
      throw new AppError("Email này đã được sử dụng bởi tài khoản khác", 409);
    }
    user.email = email.trim().toLowerCase();
  }

  // Kiểm tra tính duy nhất của mã giảng viên if changed
  if (lecturerCode && lecturerCode.trim() !== lecturer.lecturerCode) {
    const existingLecturer = await Lecturer.findOne({
      lecturerCode: lecturerCode.trim(),
      _id: { $ne: lecturer._id },
    });
    if (existingLecturer) {
      throw new AppError("Mã giảng viên này đã được sử dụng", 409);
    }
    lecturer.lecturerCode = lecturerCode.trim();
  }

  // Xử lý cập nhật số sinh viên tối đa kèm kiểm tra với số lượng đang hướng dẫn
  const newMax = maxSupervisedStudents !== undefined ? maxSupervisedStudents : maxStudents;
  if (newMax !== undefined) {
    const numLimit = Number(newMax);
    if (isNaN(numLimit) || numLimit < 1) {
      throw new AppError("Số lượng sinh viên hướng dẫn tối đa phải lớn hơn 0", 400);
    }

    // Tính số sinh viên hiện đang hướng dẫn trên các đề tài hoạt động
    const activeTheses = await Thesis.find({
      supervisorId: lecturer._id,
      status: {
        $in: [
          "PENDING_SUPERVISOR_APPROVAL",
          "PENDING_TBM_APPROVAL",
          "PENDING_SUPERVISOR_ACCEPTANCE",
          "APPROVED",
          "ASSIGNED_REVIEWERS",
          "IN_PROGRESS",
          "SUBMITTED",
          "GRADED",
        ],
      },
    }).select("secondStudentId");

    let currentSupervisedStudents = 0;
    activeTheses.forEach((t) => {
      currentSupervisedStudents += t.secondStudentId ? 2 : 1;
    });

    if (numLimit < currentSupervisedStudents) {
      throw new AppError("Không thể đặt số lượng thấp hơn số sinh viên đang được hướng dẫn.", 400);
    }

    lecturer.maxSupervisedStudents = numLimit;
    lecturer.maxStudents = numLimit;
  }

  // Cập nhật các trường thông tin User
  if (fullName !== undefined) user.fullName = fullName.trim();
  if (phone !== undefined) user.phone = phone ? phone.trim() : null;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  await user.save();

  // Cập nhật các trường thông tin Giảng viên
  if (fields !== undefined) {
    let parsedFields = [];
    if (Array.isArray(fields)) {
      parsedFields = fields.map((f) => (typeof f === "string" ? f.trim() : "")).filter(Boolean);
    } else if (typeof fields === "string") {
      parsedFields = fields.split(",").map((f) => f.trim()).filter(Boolean);
    }
    lecturer.fields = parsedFields;
    if (specialization === undefined) {
      lecturer.specialization = parsedFields.length > 0 ? parsedFields.join(", ") : null;
    }
  }

  if (academicTitle !== undefined) lecturer.academicTitle = academicTitle ? academicTitle.trim() : null;
  if (specialization !== undefined) lecturer.specialization = specialization ? specialization.trim() : null;
  if (isAvailable !== undefined) lecturer.isAvailable = Boolean(isAvailable);
  if (isActive !== undefined) lecturer.isActive = Boolean(isActive);
  await lecturer.save();

  return await Lecturer.findById(lecturer._id).populate({
    path: "userId",
    select: "fullName email phone isActive",
  });
};

// ====================
// Hàm chuyên dụng cập nhật số lượng sinh viên hướng dẫn tối đa
// ====================
const updateMaxSupervisedStudents = async (lecturerId, newLimit, requestingUser) => {
  const numLimit = Number(newLimit);
  if (isNaN(numLimit) || numLimit < 1) {
    throw new AppError("Số lượng sinh viên hướng dẫn tối đa phải là số nguyên dương lớn hơn 0", 400);
  }

  const lecturer = await Lecturer.findById(lecturerId).populate("userId");
  if (!lecturer || !lecturer.userId) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  // Kiểm tra quyền thực hiện
  if (requestingUser.role === "LECTURER") {
    if (lecturer.userId._id.toString() !== requestingUser.userId.toString()) {
      throw new AppError("Bạn chỉ có thể chỉnh sửa số lượng sinh viên của chính mình", 403);
    }
  } else if (requestingUser.role !== "TBM" && requestingUser.role !== "ADMIN") {
    throw new AppError("Bạn không có quyền thực hiện thao tác này", 403);
  }

  // Tính số sinh viên hiện đang hướng dẫn trên các đề tài hoạt động
  const activeTheses = await Thesis.find({
    supervisorId: lecturer._id,
    status: {
      $in: [
        "PENDING_SUPERVISOR_APPROVAL",
        "PENDING_TBM_APPROVAL",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "ASSIGNED_REVIEWERS",
        "IN_PROGRESS",
        "SUBMITTED",
        "GRADED",
      ],
    },
  }).select("secondStudentId");

  let currentSupervisedStudents = 0;
  activeTheses.forEach((t) => {
    currentSupervisedStudents += t.secondStudentId ? 2 : 1;
  });

  if (numLimit < currentSupervisedStudents) {
    throw new AppError("Không thể đặt số lượng thấp hơn số sinh viên đang được hướng dẫn.", 400);
  }

  lecturer.maxSupervisedStudents = numLimit;
  lecturer.maxStudents = numLimit;
  await lecturer.save();

  return {
    lecturerId: lecturer._id,
    lecturerCode: lecturer.lecturerCode,
    maxSupervisedStudents: lecturer.maxSupervisedStudents,
    currentSupervisedStudents,
    remainingQuota: Math.max(0, lecturer.maxSupervisedStudents - currentSupervisedStudents),
  };
};

// ====================
// Bật/tắt trạng thái hoạt động của giảng viên (Khóa / Mở khóa tài khoản)
// ====================
const toggleLecturerActive = async (id, isActive) => {
  const lecturer = await Lecturer.findById(id);
  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên", 404);
  }

  const activeBool = Boolean(isActive);
  lecturer.isActive = activeBool;
  if (!activeBool) {
    lecturer.isAvailable = false;
  } else {
    lecturer.isAvailable = true;
  }
  await lecturer.save();

  if (lecturer.userId) {
    await User.findByIdAndUpdate(lecturer.userId, { isActive: activeBool });
  }

  return await Lecturer.findById(lecturer._id).populate({
    path: "userId",
    select: "fullName email phone isActive",
  });
};

// ====================
// Xóa giảng viên -> Khóa tài khoản mềm (Bảo toàn lịch sử dữ liệu)
// ====================
const deleteLecturer = async (id) => {
  const lecturer = await Lecturer.findById(id);
  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên", 404);
  }

  await toggleLecturerActive(id, false);

  return { message: "Vô hiệu hóa giảng viên thành công. Dữ liệu lịch sử được bảo lưu an toàn." };
};

export default {
  getAllLecturers,
  getLecturerById,
  createLecturer,
  updateLecturer,
  updateMaxSupervisedStudents,
  toggleLecturerActive,
  deleteLecturer,
};
