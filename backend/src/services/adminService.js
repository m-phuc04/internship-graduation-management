import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Permission from "../models/Permission.js";
import Log from "../models/Log.js";
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

/**
 * Seed initial sample logs if collection is empty
 */
const seedInitialLogsIfEmpty = async () => {
  try {
    const count = await Log.countDocuments();
    if (count > 0) return;

    // Fetch sample users across roles
    const users = await User.find({ isActive: true }).select("_id fullName role email").lean();
    if (!users || users.length === 0) return;

    const admins = users.filter((u) => u.role === "ADMIN");
    const tbms = users.filter((u) => u.role === "TBM");
    const lecturers = users.filter((u) => u.role === "LECTURER");
    const students = users.filter((u) => u.role === "STUDENT");

    const sampleLogs = [];
    const now = Date.now();

    // Sample Admin actions
    admins.forEach((admin, i) => {
      sampleLogs.push({
        userId: admin._id,
        action: "Cập nhật phân quyền",
        module: "USER",
        description: `Quản trị viên ${admin.fullName} đã cập nhật quyền hạn hướng dẫn cho giảng viên`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 2),
      });
      sampleLogs.push({
        userId: admin._id,
        action: "Đăng nhập hệ thống",
        module: "AUTH",
        description: `Quản trị viên ${admin.fullName} đăng nhập thành công vào Cổng Quản Trị`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 5),
      });
    });

    // Sample TBM actions
    tbms.forEach((tbm, i) => {
      sampleLogs.push({
        userId: tbm._id,
        action: "Phê duyệt lĩnh vực",
        module: "USER",
        description: `Trưởng bộ môn ${tbm.fullName} đã phê duyệt đề xuất lĩnh vực nghiên cứu cho giảng viên`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 3),
      });
      sampleLogs.push({
        userId: tbm._id,
        action: "Cấu hình mốc thời gian",
        module: "SCHEDULE",
        description: `Trưởng bộ môn ${tbm.fullName} cập nhật thời hạn chấm điểm và nộp báo cáo TTDN`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 8),
      });
    });

    // Sample Lecturer actions
    lecturers.forEach((lec, i) => {
      sampleLogs.push({
        userId: lec._id,
        action: "Yêu cầu thay đổi lĩnh vực",
        module: "USER",
        description: `Giảng viên ${lec.fullName} gửi yêu cầu cập nhật lĩnh vực nghiên cứu chuyên môn`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 4),
      });
      sampleLogs.push({
        userId: lec._id,
        action: "Đánh giá báo cáo thực tập",
        module: "EVALUATION",
        description: `Giảng viên ${lec.fullName} đã nhận xét và chấm điểm nhật ký tuần của sinh viên`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 12),
      });
    });

    // Sample Student actions
    students.slice(0, 5).forEach((stu, i) => {
      sampleLogs.push({
        userId: stu._id,
        action: "Đăng ký thực tập doanh nghiệp",
        module: "INTERNSHIP",
        description: `Sinh viên ${stu.fullName} đã nộp hồ sơ đăng ký nguyện vọng thực tập`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 6),
      });
      sampleLogs.push({
        userId: stu._id,
        action: "Nộp báo cáo tuần thực tập",
        module: "INTERNSHIP_REPORT",
        description: `Sinh viên ${stu.fullName} đã nộp báo cáo tiến độ tuần`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        createdAt: new Date(now - (i + 1) * 3600000 * 15),
      });
    });

    if (sampleLogs.length > 0) {
      await Log.insertMany(sampleLogs, { ordered: false });
    }
  } catch (err) {
    console.warn("Could not seed initial logs:", err.message);
  }
};

/**
 * Get system activity logs with pagination, role filter, and search
 */
const getSystemLogs = async ({ page = 1, limit = 10, role = "", search = "" }) => {
  await seedInitialLogsIfEmpty();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  const andConditions = [];

  // Filter by Role (if specified)
  if (role && role !== "ALL" && role !== "") {
    const usersInRole = await User.find({ role }).select("_id").lean();
    const userIds = usersInRole.map((u) => u._id);
    andConditions.push({ userId: { $in: userIds } });
  }

  // Filter by Search (search action, description, module, or user info)
  if (search && search.trim()) {
    const rawSearch = search.trim();
    const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedSearch, "i");

    const matchedUsers = await User.find({
      $or: [{ fullName: regex }, { email: regex }, { code: regex }],
    }).select("_id").lean();
    const matchedUserIds = matchedUsers.map((u) => u._id);

    andConditions.push({
      $or: [
        { action: regex },
        { description: regex },
        { module: regex },
        { userId: { $in: matchedUserIds } },
      ],
    });
  }

  const query = andConditions.length > 0 ? { $and: andConditions } : {};
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    Log.find(query)
      .populate("userId", "fullName email role code avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Log.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

export default {
  getPermissionsList,
  updateLecturerPermissions,
  getAllUsers,
  toggleUserStatus,
  resetPassword,
  getSystemLogs,
};
