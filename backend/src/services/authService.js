import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Permission from "../models/Permission.js";
import Thesis from "../models/Thesis.js";
import captchaService from "./captchaService.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

// ====================
// Đăng ký tài khoản (Đã vô hiệu hóa - Chỉ Quản trị viên mới được tạo tài khoản)
// ====================

const register = async () => {
  const error = new Error("Chức năng tự đăng ký tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.");
  error.statusCode = 403;
  throw error;
};

// ====================
// Đăng nhập (Chỉ cho phép đăng nhập bằng mã tài khoản: MSSV, mã giảng viên, mã ADMIN, mã TBM)
// ====================

const login = async ({ accountCode, username, code, email, password, captchaId, captchaAnswer }) => {
  // 0. Bắt buộc xác thực CAPTCHA server-side trước khi kiểm tra tài khoản & mật khẩu
  captchaService.verifyCaptcha(captchaId, captchaAnswer);

  const rawIdentifier = (accountCode || username || code || email || "").trim();

  // 1. Nếu người dùng nhập Email thay vì mã tài khoản, từ chối đăng nhập và hiển thị thông báo
  const isEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier) || rawIdentifier.includes("@");
  if (isEmailPattern) {
    const error = new Error("Mã đăng nhập không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const loginIdentifier = rawIdentifier;

  if (!loginIdentifier || !password) {
    const error = new Error("Mã đăng nhập hoặc mật khẩu không chính xác.");
    error.statusCode = 401;
    throw error;
  }

  let user = null;
  let extraInfo = {};

  // 2. Xác định tài khoản dựa trên mã định danh tương ứng:
  // 2.1. Sinh viên: Đăng nhập bằng MSSV (studentCode trong hồ sơ Sinh viên)
  const student = await Student.findOne({ studentCode: loginIdentifier });
  if (student && student.userId) {
    user = await User.findById(student.userId);
    if (user) {
      extraInfo = {
        studentId: student._id,
        studentCode: student.studentCode,
        className: student.className,
      };
    }
  }

  // 2.2. Giảng viên / TBM: Đăng nhập bằng mã giảng viên (lecturerCode trong hồ sơ Giảng viên)
  if (!user) {
    const lecturer = await Lecturer.findOne({ lecturerCode: loginIdentifier });
    if (lecturer && lecturer.userId) {
      user = await User.findById(lecturer.userId);
      if (user) {
        extraInfo = {
          lecturerId: lecturer._id,
          lecturerCode: lecturer.lecturerCode,
          academicTitle: lecturer.academicTitle,
          permissions: lecturer.permissions || ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
        };
      }
    }
  }

  // 2.3. ADMIN / TBM: Đăng nhập bằng mã tài khoản hệ thống (code trong User)
  if (!user) {
    user = await User.findOne({ code: loginIdentifier });
    if (user) {
      if (user.role === "LECTURER" || user.role === "TBM") {
        const lecturer = await Lecturer.findOne({ userId: user._id });
        if (lecturer) {
          extraInfo = {
            lecturerId: lecturer._id,
            lecturerCode: lecturer.lecturerCode,
            academicTitle: lecturer.academicTitle,
            permissions: lecturer.permissions || ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
          };
        }
      } else if (user.role === "STUDENT") {
        const studentDoc = await Student.findOne({ userId: user._id });
        if (studentDoc) {
          extraInfo = {
            studentId: studentDoc._id,
            studentCode: studentDoc.studentCode,
            className: studentDoc.className,
          };
        }
      }
    }
  }

  if (!user) {
    const error = new Error("Mã đăng nhập hoặc mật khẩu không chính xác.");
    error.statusCode = 401;
    throw error;
  }

  // 3. Kiểm tra mật khẩu bằng cơ chế bcrypt hiện tại
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Mã đăng nhập hoặc mật khẩu không chính xác.");
    error.statusCode = 401;
    throw error;
  }

  // 4. Kiểm tra trạng thái tài khoản và các điều kiện xác thực hiện có
  if (!user.isActive) {
    const msg =
      user.role === "LECTURER"
        ? "Tài khoản giảng viên đã bị vô hiệu hóa. Vui lòng liên hệ Trưởng Bộ Môn."
        : "Tài khoản đã bị vô hiệu hóa.";
    const error = new Error(msg);
    error.statusCode = 403;
    throw error;
  }

  // Gắn quyền đang kích hoạt từ collection Permission cho LECTURER / TBM
  if (user.role === "LECTURER" || user.role === "TBM") {
    const activePermDocs = await Permission.find({
      userId: user._id,
      isActive: true,
    }).select("permission");
    if (activePermDocs.length > 0) {
      extraInfo.permissions = activePermDocs.map((p) => p.permission);
    }
  }

  // 5. Cấp Access Token và Refresh Token như hiện tại
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Lưu Refresh Token vào database
  user.refreshToken = refreshToken;
  await user.save();

  // Thông tin user trả về client
  const userResponse = {
    ...user.toObject(),
    ...extraInfo,
  };

  delete userResponse.password;
  delete userResponse.refreshToken;

  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

// ====================
// Làm mới Access Token
// ====================

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error("Refresh token không được cung cấp");

    error.statusCode = 401;

    throw error;
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    const newError = new Error("Refresh token không hợp lệ hoặc đã hết hạn");

    newError.statusCode = 401;

    throw newError;
  }

  const user = await User.findById(payload.userId);

  if (!user || !user.isActive) {
    const error = new Error("Tài khoản không tồn tại hoặc đã bị khóa");

    error.statusCode = 401;

    throw error;
  }

  // Kiểm tra Refresh Token có đúng token
  // đang được lưu trong database hay không
  if (user.refreshToken !== refreshToken) {
    const error = new Error("Refresh token không hợp lệ");

    error.statusCode = 401;

    throw error;
  }

  // Tạo Access Token mới
  const accessToken = generateAccessToken(user);

  return accessToken;
};

// ====================
// Đăng xuất
// ====================

const logout = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");

    error.statusCode = 404;

    throw error;
  }

  // Xóa Refresh Token
  user.refreshToken = null;

  await user.save();

  return true;
};

// ====================
// Lấy thông tin hồ sơ chi tiết theo vai trò
// ====================

const getProfile = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  delete user.password;
  delete user.refreshToken;

  let roleDetails = {};

  if (user.role === "STUDENT") {
    const student = await Student.findOne({ userId }).lean();
    if (student) {
      roleDetails.student = student;
    }
  } else if (user.role === "LECTURER" || user.role === "TBM") {
    const lecturer = await Lecturer.findOne({ userId }).lean();
    if (lecturer) {
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

      roleDetails.lecturer = {
        ...lecturer,
        currentSupervisedStudents,
        maxSupervisedStudents: maxSupervised,
        maxStudents: maxSupervised,
        remainingQuota: Math.max(0, maxSupervised - currentSupervisedStudents),
      };
    }
  }

  return {
    user,
    ...roleDetails,
  };
};

// ====================
// Cập nhật hồ sơ (Chỉ cho phép: Email, Số điện thoại, Thông tin công ty & Giảng viên)
// ====================

const updateProfile = async (userId, updateData = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  // 1. Xử lý email (Kiểm tra định dạng và trùng lặp nếu có cập nhật)
  if (updateData.email !== undefined) {
    if (user.role === "STUDENT") {
      const trimmedNew = (updateData.email || "").trim().toLowerCase();
      const currentEmail = (user.email || "").toLowerCase();
      if (trimmedNew && trimmedNew !== currentEmail) {
        const error = new Error("Sinh viên không được phép tự thay đổi email trường đã xác thực");
        error.statusCode = 400;
        throw error;
      }
    }

    const emailVal = updateData.email ? updateData.email.trim().toLowerCase() : "";
    if (emailVal === "") {
      user.email = null;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailVal)) {
        const error = new Error("Email không hợp lệ");
        error.statusCode = 400;
        throw error;
      }

      const existingUser = await User.findOne({
        email: emailVal,
        _id: { $ne: userId },
      });

      if (existingUser) {
        const error = new Error("Email đã được sử dụng.");
        error.statusCode = 400;
        throw error;
      }

      user.email = emailVal;
    }
  }

  // 2. Xử lý số điện thoại (Kiểm tra định dạng)
  if (updateData.phone !== undefined) {
    const phoneVal = updateData.phone ? updateData.phone.trim() : "";
    if (phoneVal === "") {
      user.phone = null;
    } else {
      const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
      if (!phoneRegex.test(phoneVal)) {
        const error = new Error("Số điện thoại không hợp lệ");
        error.statusCode = 400;
        throw error;
      }
      user.phone = phoneVal;
    }
  }

  await user.save();

  // 3. Cập nhật giới hạn số lượng sinh viên hướng dẫn của giảng viên
  if (user.role === "LECTURER" || user.role === "TBM") {
    const lecturer = await Lecturer.findOne({ userId });
    if (lecturer) {
      const newMax = updateData.maxSupervisedStudents !== undefined ? updateData.maxSupervisedStudents : updateData.maxStudents;
      if (newMax !== undefined) {
        const numLimit = Number(newMax);
        if (isNaN(numLimit) || numLimit < 1) {
          const error = new Error("Số lượng sinh viên hướng dẫn tối đa phải là số nguyên dương lớn hơn 0");
          error.statusCode = 400;
          throw error;
        }

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
          const error = new Error("Không thể đặt số lượng thấp hơn số sinh viên đang được hướng dẫn.");
          error.statusCode = 400;
          throw error;
        }

        lecturer.maxSupervisedStudents = numLimit;
        lecturer.maxStudents = numLimit;
        await lecturer.save();
      }
    }
  }

  return await getProfile(userId);
};

// ====================
// Đổi mật khẩu (Chức năng bảo mật)
// ====================

const changePassword = async (userId, { currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword) {
    const error = new Error("Vui lòng nhập mật khẩu hiện tại");
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 6) {
    const error = new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error("Xác nhận mật khẩu mới không khớp");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentValid) {
    const error = new Error("Mật khẩu hiện tại không chính xác");
    error.statusCode = 400;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  user.refreshToken = null; // Invalidate other sessions
  await user.save();

  return true;
};

// ====================
// Xem thông tin hồ sơ công khai của người dùng
// ====================

const getPublicUserProfile = async (targetId) => {
  if (!targetId) {
    const error = new Error("ID người dùng không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  // 1. Tìm theo User._id
  let user = null;
  let student = null;
  let lecturer = null;

  try {
    user = await User.findById(targetId)
      .select("fullName email avatar phone role isActive createdAt")
      .lean();
  } catch {
    // Có thể không phải là User ObjectId trực tiếp
  }

  // 2. Nếu không tìm thấy theo User ID, kiểm tra targetId là Student._id, Lecturer._id hoặc Company._id
  if (!user) {
    try {
      student = await Student.findById(targetId)
        .populate("userId", "fullName email avatar phone role isActive createdAt")
        .lean();
      if (student && student.userId) {
        user = student.userId;
      }
    } catch {}
  }

  if (!user) {
    try {
      lecturer = await Lecturer.findById(targetId)
        .populate("userId", "fullName email avatar phone role isActive createdAt")
        .lean();
      if (lecturer && lecturer.userId) {
        user = lecturer.userId;
      }
    } catch {}
  }

  if (!user) {
    const error = new Error("Không tìm thấy người dùng");
    error.statusCode = 404;
    throw error;
  }

  const userId = user._id;

  // Nạp thông tin chi tiết sinh viên / giảng viên nếu chưa có
  if (user.role === "STUDENT" && !student) {
    student = await Student.findOne({ userId })
      .select("studentCode class faculty gpa accumulatedCredits")
      .lean();
  } else if ((user.role === "LECTURER" || user.role === "TBM") && !lecturer) {
    lecturer = await Lecturer.findOne({ userId })
      .select("lecturerCode academicTitle department specialization permissions")
      .lean();
  }

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar || null,
      role: user.role,
      isActive: user.isActive,
      emailNotificationEnabled: Boolean(user.emailNotificationEnabled),
      emailThesisEnabled: Boolean(user.emailThesisEnabled),
      emailNewsEnabled: Boolean(user.emailNewsEnabled),
    },
    lecturer: lecturer
      ? {
          academicTitle: lecturer.academicTitle || null,
        }
      : null,
  };
};

// ====================
// Xuất dữ liệu
// ====================

export default {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  getPublicUserProfile,
  updateProfile,
  changePassword,
};
