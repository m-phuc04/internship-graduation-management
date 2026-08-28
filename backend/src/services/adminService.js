import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import Permission from "../models/Permission.js";
import bcrypt from "bcryptjs";
import AppError from "../utils/AppError.js";

const VALID_PERMISSIONS = ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"];

/**
 * Get list of all lecturers with their permission assignments and roles
 */
const getPermissionsList = async () => {
  const lecturers = await Lecturer.find()
    .populate("userId", "fullName email phone role isActive code createdAt")
    .sort({ lecturerCode: 1 });

  // Exclude any ADMIN users (ADMIN has top-level system privileges and is not a lecturer)
  const validLecturers = lecturers.filter(
    (l) => l.userId && l.userId.role !== "ADMIN" && l.lecturerCode !== "99999999"
  );

  const lecturerUserIds = validLecturers.map((l) => l.userId?._id).filter(Boolean);
  const allActivePermissions = await Permission.find({
    userId: { $in: lecturerUserIds },
    isActive: true,
  });

  const permissionsByUser = {};
  allActivePermissions.forEach((p) => {
    const uId = p.userId.toString();
    if (!permissionsByUser[uId]) {
      permissionsByUser[uId] = [];
    }
    permissionsByUser[uId].push(p.permission);
  });

  return validLecturers.map((lec) => {
    const uId = lec.userId?._id?.toString();
    const userPerms = uId && permissionsByUser[uId] ? permissionsByUser[uId] : [];
    return {
      _id: lec._id,
      lecturerCode: lec.lecturerCode,
      academicTitle: lec.academicTitle,
      specialization: lec.specialization,
      permissions: userPerms,
      isActive: lec.isActive,
      user: lec.userId,
    };
  });
};

/**
 * Update permissions (in Permission collection) and optionally role (LECTURER <-> TBM) for a lecturer
 */
const updateLecturerPermissions = async (lecturerId, { permissions, role }) => {
  const lecturer = await Lecturer.findById(lecturerId).populate("userId");
  if (!lecturer || !lecturer.userId) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const userId = lecturer.userId._id;

  // Validate & Update Permissions in Permission collection
  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      throw new AppError("Danh sách quyền (permissions) phải là một mảng", 400);
    }
    const invalidPerm = permissions.find((p) => !VALID_PERMISSIONS.includes(p));
    if (invalidPerm) {
      throw new AppError(`Quyền không hợp lệ: ${invalidPerm}`, 400);
    }

    // Process each valid permission
    for (const p of VALID_PERMISSIONS) {
      const isGranted = permissions.includes(p);
      await Permission.findOneAndUpdate(
        { userId, permission: p },
        { isActive: isGranted },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  // Role Assignment (TBM <-> LECTURER)
  if (role !== undefined && lecturer.userId) {
    if (role !== "LECTURER" && role !== "TBM") {
      throw new AppError("Role chỉ có thể là LECTURER hoặc TBM", 400);
    }
    const user = await User.findById(userId);
    if (user) {
      user.role = role;
      await user.save();
    }
  }

  const updatedPermsDocs = await Permission.find({
    userId,
    isActive: true,
  });

  const updated = await Lecturer.findById(lecturerId).populate(
    "userId",
    "fullName email phone role isActive code",
  );

  return {
    _id: updated._id,
    lecturerCode: updated.lecturerCode,
    academicTitle: updated.academicTitle,
    specialization: updated.specialization,
    permissions: updatedPermsDocs.map((p) => p.permission),
    isActive: updated.isActive,
    user: updated.userId,
  };
};

/**
 * Get all users for admin overview
 */
const getAllUsers = async ({ role = "", search = "", page = 1, limit = 20 }) => {
  const query = {};
  if (role && role !== "ALL") {
    query.role = role;
  }
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ fullName: regex }, { email: regex }, { code: regex }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query).select("-password -refreshToken").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Toggle user active status
 */
const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Không tìm thấy người dùng", 404);
  }
  if (user.role === "ADMIN" && user.isActive) {
    const activeAdminCount = await User.countDocuments({ role: "ADMIN", isActive: true });
    if (activeAdminCount <= 1) {
      throw new AppError("Không thể vô hiệu hóa tài khoản Admin cuối cùng.", 400);
    }
  }

  user.isActive = !user.isActive;
  await user.save();

  // If lecturer/student, sync status
  if (user.role === "LECTURER" || user.role === "TBM") {
    await Lecturer.updateOne({ userId: user._id }, { isActive: user.isActive });
  } else if (user.role === "STUDENT") {
    await Student.updateOne({ userId: user._id }, { isActive: user.isActive });
  }

  return user;
};

/**
 * Reset password for a user
 */
const resetPassword = async (userId, newPassword = "1111") => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Không tìm thấy người dùng", 404);
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  return { message: "Đã đặt lại mật khẩu thành công (mặc định: 1111)" };
};

export default {
  getPermissionsList,
  updateLecturerPermissions,
  getAllUsers,
  toggleUserStatus,
  resetPassword,
};
