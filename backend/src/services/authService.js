import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Company from "../models/Company.js";
import Permission from "../models/Permission.js";
import Thesis from "../models/Thesis.js";
import captchaService from "./captchaService.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

// ====================
// Register
// ====================

const register = async ({ fullName, email, password, role }) => {
  const existingUser = await User.findOne({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    const error = new Error("Email đã được sử dụng");
    error.statusCode = 409;

    throw error;
  }

  const hashedPassword = await bcrypt.hash(password || "1111", 12);

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
  });

  const userResponse = user.toObject();

  delete userResponse.password;
  delete userResponse.refreshToken;

  return userResponse;
};

// ====================
// Login (Authenticate via Account Code: studentCode, lecturerCode, companyCode)
// ====================

const login = async ({ accountCode, username, code, email, password, captchaId, captchaAnswer }) => {
  // 0. Bắt buộc xác thực CAPTCHA server-side trước khi kiểm tra tài khoản & mật khẩu
  captchaService.verifyCaptcha(captchaId, captchaAnswer);

  const loginIdentifier = (accountCode || username || code || "").trim();

  if (!loginIdentifier || !password) {
    const error = new Error("Mã tài khoản hoặc mật khẩu không chính xác.");
    error.statusCode = 401;
    throw error;
  }

  let user = null;
  let extraInfo = {};

  // 1. Check Student by studentCode (MSSV)
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

  // 2. Check Lecturer / TBM by lecturerCode
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

  // 3. Check Company by companyCode (code)
  if (!user) {
    const company = await Company.findOne({ code: loginIdentifier.toUpperCase() });
    if (company && company.userId) {
      user = await User.findById(company.userId);
      if (user) {
        extraInfo = {
          companyId: company._id,
          companyCode: company.code,
          companyName: company.name,
        };
      }
    }
  }

  // 4. Check User by code (e.g. ADMIN001) or email
  if (!user) {
    user = await User.findOne({
      $or: [
        { code: loginIdentifier },
        { email: loginIdentifier.toLowerCase() },
      ],
    });
    if (user && (user.role === "LECTURER" || user.role === "TBM")) {
      const lecturer = await Lecturer.findOne({ userId: user._id });
      if (lecturer) {
        extraInfo = {
          lecturerId: lecturer._id,
          lecturerCode: lecturer.lecturerCode,
          academicTitle: lecturer.academicTitle,
          permissions: lecturer.permissions || ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
        };
      }
    }
  }

  if (!user) {
    const error = new Error("Mã tài khoản hoặc mật khẩu không chính xác.");
    error.statusCode = 401;
    throw error;
  }

  // Attach active permissions from Permission collection for LECTURER / TBM
  if (user.role === "LECTURER" || user.role === "TBM") {
    const activePermDocs = await Permission.find({
      userId: user._id,
      isActive: true,
    }).select("permission");
    extraInfo.permissions = activePermDocs.map((p) => p.permission);
  }

  if (!user.isActive) {
    const msg =
      user.role === "LECTURER"
        ? "Tài khoản giảng viên đã bị vô hiệu hóa. Vui lòng liên hệ Trưởng Bộ Môn."
        : "Tài khoản đã bị vô hiệu hóa.";
    const error = new Error(msg);
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Mã tài khoản hoặc mật khẩu không chính xác.");
    error.statusCode = 401;
    throw error;
  }

  // Tạo Access Token
  const accessToken = generateAccessToken(user);

  // Tạo Refresh Token
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
// Refresh Access Token
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
// Logout
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
// Get Profile with Role-Specific Details
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
  } else if (user.role === "COMPANY") {
    const company = await Company.findOne({ userId }).lean();
    if (company) {
      roleDetails.company = company;
    }
  }

  return {
    user,
    ...roleDetails,
  };
};

// ====================
// Update Profile (Strict Whitelist: Email, Phone, Company & Lecturer Info)
// ====================

const updateProfile = async (userId, updateData = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  // 1. Email Handling (Optional, format validation, duplicate check)
  if (updateData.email !== undefined) {
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

  // 2. Phone Handling (Optional, format validation)
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

  // 3. Optional Lecturer Supervision Capacity Updates
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

  // 4. Optional Company Profile Contact Updates
  if (user.role === "COMPANY") {
    const company = await Company.findOne({ userId });
    if (company) {
      if (updateData.website !== undefined) company.website = updateData.website ? updateData.website.trim() : null;
      if (updateData.contactPerson !== undefined) company.contactPerson = updateData.contactPerson ? updateData.contactPerson.trim() : null;
      if (updateData.contactEmail !== undefined) company.contactEmail = updateData.contactEmail ? updateData.contactEmail.trim() : null;
      if (updateData.contactPhone !== undefined) company.contactPhone = updateData.contactPhone ? updateData.contactPhone.trim() : null;
      if (updateData.address !== undefined && updateData.address.trim()) company.address = updateData.address.trim();
      await company.save();
    }
  }

  return await getProfile(userId);
};

// ====================
// Change Password (Dedicated Security Function)
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
  user.refreshToken = null; // Invalidate other sessions
  await user.save();

  return true;
};

// ====================
// Get Public Profile of Any User
// ====================

const getPublicUserProfile = async (targetId) => {
  if (!targetId) {
    const error = new Error("ID người dùng không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  // 1. Try finding by User._id
  let user = null;
  let student = null;
  let lecturer = null;
  let company = null;

  try {
    user = await User.findById(targetId)
      .select("fullName email avatar phone role isActive createdAt")
      .lean();
  } catch {
    // Might not be valid User ObjectId directly
  }

  // 2. If not found by User ID, check if targetId is a Student._id or Lecturer._id or Company._id
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
    try {
      company = await Company.findById(targetId)
        .populate("userId", "fullName email avatar phone role isActive createdAt")
        .lean();
      if (company && company.userId) {
        user = company.userId;
      }
    } catch {}
  }

  if (!user) {
    const error = new Error("Không tìm thấy người dùng");
    error.statusCode = 404;
    throw error;
  }

  const userId = user._id;

  // Populate student / lecturer / company details if not already fetched
  if (user.role === "STUDENT" && !student) {
    student = await Student.findOne({ userId })
      .select("studentCode class faculty gpa accumulatedCredits")
      .lean();
  } else if ((user.role === "LECTURER" || user.role === "TBM") && !lecturer) {
    lecturer = await Lecturer.findOne({ userId })
      .select("lecturerCode academicTitle department specialization permissions")
      .lean();
  } else if (user.role === "COMPANY" && !company) {
    company = await Company.findOne({ userId })
      .select("companyName address website contactPerson contactEmail contactPhone")
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
    },
    lecturer: lecturer
      ? {
          academicTitle: lecturer.academicTitle || null,
        }
      : null,
  };
};

// ====================
// Export
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
