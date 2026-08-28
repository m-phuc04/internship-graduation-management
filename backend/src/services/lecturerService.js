import bcrypt from "bcryptjs";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Permission from "../models/Permission.js";
import Internship from "../models/Internship.js";
import Thesis from "../models/Thesis.js";
import AppError from "../utils/AppError.js";

// ====================
// Get All Lecturers with Search, Filter & Pagination
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
  const skip = (pageNum - 1) * limitNum;

  const lecturerQuery = {};

  if (isAvailable !== undefined && isAvailable !== "") {
    lecturerQuery.isAvailable = isAvailable === "true" || isAvailable === true;
  }

  if (isActive !== undefined && isActive !== "") {
    lecturerQuery.isActive = isActive === "true" || isActive === true;
  }

  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");

    const matchedUsers = await User.find({
      role: "LECTURER",
      $or: [{ fullName: searchRegex }, { email: searchRegex }],
    }).select("_id");

    const matchedUserIds = matchedUsers.map((u) => u._id);

    lecturerQuery.$or = [
      { lecturerCode: searchRegex },
      { specialization: searchRegex },
      { academicTitle: searchRegex },
      { userId: { $in: matchedUserIds } },
    ];
  }

  const [allLecturers, total, allActivePermissions] = await Promise.all([
    Lecturer.find(lecturerQuery)
      .populate({
        path: "userId",
        select: "fullName email phone role isActive createdAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lecturer.countDocuments(lecturerQuery),
    Permission.find({ isActive: true }).select("userId permission").lean(),
  ]);

  // Ensure ADMIN is excluded
  const lecturers = allLecturers.filter(
    (l) => l.userId && l.userId.role !== "ADMIN" && l.lecturerCode !== "99999999"
  );

  const permMap = {};
  allActivePermissions.forEach((p) => {
    const uId = p.userId.toString();
    if (!permMap[uId]) permMap[uId] = [];
    permMap[uId].push(p.permission);
  });

  // Compute active student count for each lecturer
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

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    lecturers: lecturersWithCounts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

// ====================
// Get Lecturer By ID
// ====================
const getLecturerById = async (id) => {
  const lecturer = await Lecturer.findById(id).populate({
    path: "userId",
    select: "fullName email phone isActive createdAt updatedAt",
  });

  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên", 404);
  }

  // Fetch active theses details
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
// Create Lecturer
// ====================
const createLecturer = async (lecturerData) => {
  const {
    fullName,
    email,
    password = "1111",
    phone,
    lecturerCode,
    academicTitle,
    specialization,
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

  // Check email uniqueness
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("Email này đã được sử dụng bởi tài khoản khác", 409);
  }

  // Check lecturerCode uniqueness
  const existingLecturer = await Lecturer.findOne({ lecturerCode: normalizedCode });
  if (existingLecturer) {
    throw new AppError("Mã giảng viên này đã tồn tại", 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create User
  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone ? phone.trim() : null,
    role: "LECTURER",
    isActive: true,
  });

  // Create Lecturer profile
  try {
    const finalMax = maxSupervisedStudents !== undefined
      ? Math.max(1, Number(maxSupervisedStudents) || 5)
      : Math.max(1, Number(maxStudents) || 5);

    const lecturer = await Lecturer.create({
      userId: user._id,
      lecturerCode: normalizedCode,
      academicTitle: academicTitle ? academicTitle.trim() : null,
      specialization: specialization ? specialization.trim() : null,
      maxSupervisedStudents: finalMax,
      maxStudents: finalMax,
      isAvailable: Boolean(isAvailable),
    });

    return await Lecturer.findById(lecturer._id).populate({
      path: "userId",
      select: "fullName email phone isActive",
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
};

// ====================
// Update Lecturer & User
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
    maxSupervisedStudents,
    maxStudents,
    isAvailable,
    isActive,
  } = updateData;

  // Check email uniqueness if changed
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

  // Check lecturerCode uniqueness if changed
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

  // Handle maxSupervisedStudents update with validation against currently supervised count
  const newMax = maxSupervisedStudents !== undefined ? maxSupervisedStudents : maxStudents;
  if (newMax !== undefined) {
    const numLimit = Number(newMax);
    if (isNaN(numLimit) || numLimit < 1) {
      throw new AppError("Số lượng sinh viên hướng dẫn tối đa phải lớn hơn 0", 400);
    }

    // Calculate current supervised students across active theses
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

  // Update User fields
  if (fullName !== undefined) user.fullName = fullName.trim();
  if (phone !== undefined) user.phone = phone ? phone.trim() : null;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  await user.save();

  // Update Lecturer fields
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
// Update Max Supervised Students Dedicated Function
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

  // Authorization check
  if (requestingUser.role === "LECTURER") {
    if (lecturer.userId._id.toString() !== requestingUser.userId.toString()) {
      throw new AppError("Bạn chỉ có thể chỉnh sửa số lượng sinh viên của chính mình", 403);
    }
  } else if (requestingUser.role !== "TBM" && requestingUser.role !== "ADMIN") {
    throw new AppError("Bạn không có quyền thực hiện thao tác này", 403);
  }

  // Calculate current supervised students across active theses
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
// Toggle Lecturer Active / Inactive (Soft Deactivation / Reactivation)
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
// Delete Lecturer -> Soft Deactivation (Preserve all historical records)
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
