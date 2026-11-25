import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Permission from "../models/Permission.js";
import Log from "../models/Log.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import ExcelJS from "exceljs";
import AppError from "../utils/AppError.js";
import {
  sendPasswordResetEmail,
  sendAccountCreationEmail,
} from "./emailService.js";

const VALID_PERMISSIONS = ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"];

/**
 * Tạo mật khẩu ngẫu nhiên an toàn (độ dài mặc định 10 ký tự gồm hoa, thường, số, ký tự đặc biệt)
 */
const generateSecurePassword = (length = 10) => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$&!";
  const all = upper + lower + digits + special;

  let pwd = "";
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  pwd += special[crypto.randomInt(0, special.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  // Trộn ngẫu nhiên các ký tự
  return pwd
    .split("")
    .sort(() => crypto.randomInt(-1, 2))
    .join("");
};

/**
 * Lấy danh sách tất cả giảng viên cùng phân quyền và vai trò
 */
const getPermissionsList = async () => {
  const lecturers = await Lecturer.find()
    .populate("userId", "fullName email phone role isActive code createdAt")
    .sort({ lecturerCode: 1 });

  // Loại trừ tài khoản ADMIN (ADMIN có toàn quyền hệ thống, không phải là giảng viên)
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
 * Cập nhật phân quyền (trong collection Permission) và tùy chọn vai trò (LECTURER <-> TBM) cho giảng viên
 */
const updateLecturerPermissions = async (lecturerId, { permissions, role }) => {
  const lecturer = await Lecturer.findById(lecturerId).populate("userId");
  if (!lecturer || !lecturer.userId) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const userId = lecturer.userId._id;

  // Kiểm tra và cập nhật quyền trong collection Permission
  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      throw new AppError("Danh sách quyền (permissions) phải là một mảng", 400);
    }
    const invalidPerm = permissions.find((p) => !VALID_PERMISSIONS.includes(p));
    if (invalidPerm) {
      throw new AppError(`Quyền không hợp lệ: ${invalidPerm}`, 400);
    }

    // Xử lý từng quyền hợp lệ
    for (const p of VALID_PERMISSIONS) {
      const isGranted = permissions.includes(p);
      await Permission.findOneAndUpdate(
        { userId, permission: p },
        { isActive: isGranted },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  // Gán vai trò (TBM <-> LECTURER)
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
 * Lấy danh sách tất cả người dùng cho trang quản trị tổng quan
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
 * Bật/tắt trạng thái hoạt động của người dùng
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

  // Đồng bộ trạng thái nếu là giảng viên hoặc sinh viên
  if (user.role === "LECTURER" || user.role === "TBM") {
    await Lecturer.updateOne({ userId: user._id }, { isActive: user.isActive });
  } else if (user.role === "STUDENT") {
    await Student.updateOne({ userId: user._id }, { isActive: user.isActive });
  }

  return user;
};

/**
 * Đặt lại mật khẩu cho tài khoản Sinh viên hoặc Giảng viên (Chỉ áp dụng cho role STUDENT và LECTURER)
 * Quy trình: Kiểm tra STUDENT / LECTURER -> Tạo mật khẩu ngẫu nhiên -> Gửi email trước -> Lưu DB và thu hồi token
 */
const resetPassword = async (userId, adminUser) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản người dùng", 404);
  }

  // 1. Kiểm tra phân quyền: Chỉ cho phép STUDENT hoặc LECTURER, tuyệt đối cấm ADMIN
  if (user.role !== "STUDENT" && user.role !== "LECTURER") {
    throw new AppError(
      "Chức năng này chỉ áp dụng cho tài khoản Sinh viên hoặc Giảng viên. Không được phép đặt lại mật khẩu của Quản trị viên.",
      403,
    );
  }

  const roleLabel = user.role === "LECTURER" ? "Giảng viên" : "Sinh viên";

  if (!user.isActive) {
    throw new AppError(`Tài khoản ${roleLabel.toLowerCase()} này đang bị khóa. Vui lòng kích hoạt trước khi đặt lại mật khẩu.`, 400);
  }

  let accountCode = user.code;
  if (user.role === "STUDENT") {
    const student = await Student.findOne({ userId: user._id });
    accountCode = student?.studentCode || user.code;
  } else if (user.role === "LECTURER") {
    const lecturer = await Lecturer.findOne({ userId: user._id });
    accountCode = lecturer?.lecturerCode || user.code;
  }

  if (!user.email) {
    throw new AppError(`Tài khoản ${roleLabel.toLowerCase()} này chưa có email xác thực để nhận mật khẩu.`, 400);
  }

  // Tạo mật khẩu ngẫu nhiên mới, riêng biệt và đủ độ mạnh
  const newPlainPassword = generateSecurePassword(10);

  // 2. GỬI EMAIL TRƯỚC (Đảm bảo không đổi mật khẩu nếu email gửi thất bại)
  let emailResult;
  try {
    emailResult = await sendPasswordResetEmail({
      to: user.email,
      recipientName: user.fullName,
      accountCode,
      studentCode: accountCode,
      role: user.role,
      roleLabel,
      newPassword: newPlainPassword,
    });
  } catch (err) {
    throw new AppError(
      `Gửi email chứa mật khẩu mới đến ${roleLabel.toLowerCase()} thất bại: ${err.message}. Mật khẩu hiện tại chưa bị thay đổi.`,
      500,
    );
  }

  if (!emailResult || !emailResult.success) {
    throw new AppError(
      `Gửi email chứa mật khẩu mới đến ${roleLabel.toLowerCase()} thất bại: ${emailResult?.error || "Lỗi máy chủ email"}. Mật khẩu hiện tại chưa bị thay đổi.`,
      500,
    );
  }

  // 3. CẬP NHẬT MẬT KHẨU SAU KHI GỬI EMAIL THÀNH CÔNG
  user.password = await bcrypt.hash(newPlainPassword, 12);
  user.mustChangePassword = true;
  user.refreshToken = null; // Thu hồi toàn bộ Refresh Token hoặc phiên đăng nhập cũ
  await user.save();

  // 4. Ghi nhật ký hệ thống (KHÔNG lưu mật khẩu vào log)
  try {
    await Log.create({
      userId: adminUser?._id || adminUser?.userId || adminUser,
      action: `Reset mật khẩu ${roleLabel.toLowerCase()}`,
      module: "USER",
      description: `Quản trị viên ${adminUser?.fullName || "Admin"} đã đặt lại mật khẩu cho ${roleLabel.toLowerCase()} ${accountCode} (${user.fullName}) gửi đến email ${user.email}`,
      status: "SUCCESS",
      ipAddress: "127.0.0.1",
    });
  } catch (logErr) {
    console.warn("Lỗi ghi log reset mật khẩu:", logErr.message);
  }

  return {
    message: `Đã đặt lại mật khẩu thành công và gửi thông tin đến email ${roleLabel.toLowerCase()}`,
    data: {
      fullName: user.fullName,
      code: accountCode,
      studentCode: accountCode,
      email: user.email,
      role: user.role,
      roleLabel,
      newPassword: newPlainPassword,
    },
  };
};

/**
 * Tải file Excel mẫu danh sách sinh viên
 */
const generateExcelTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống Quản lý TTDN & KLTN - IUH";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("DanhSachSinhVien", {
    views: [{ showGridLines: true }],
  });

  worksheet.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ và tên", key: "fullName", width: 30 },
    { header: "Email", key: "email", width: 38 },
    { header: "Lớp", key: "className", width: 18 },
  ];

  // Định dạng dòng tiêu đề
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF123891" },
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Dữ liệu minh họa theo yêu cầu đề bài
  const sampleData = [
    {
      stt: 1,
      mssv: "22635271",
      fullName: "Lê Minh Phúc",
      email: "22635271.phuc@student.iuh.edu.vn",
      className: "DHCNTT18A",
    },
    {
      stt: 2,
      mssv: "22635272",
      fullName: "Nguyễn Văn A",
      email: "22635272.a@student.iuh.edu.vn",
      className: "DHCNTT18A",
    },
  ];

  sampleData.forEach((item) => {
    const row = worksheet.addRow(item);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 1 || colNumber === 2 || colNumber === 5 ? "center" : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Phân tích và xem trước dữ liệu file Excel sinh viên
 */
const previewStudentExcel = async (fileBuffer) => {
  if (!fileBuffer) {
    throw new AppError("Không tìm thấy tệp tải lên", 400);
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer);
  } catch (err) {
    throw new AppError("Định dạng file không hợp lệ hoặc bị lỗi. Vui lòng tải lên file Excel (.xlsx, .xls)", 400);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new AppError("File Excel không có dữ liệu bảng tính (sheet trống)", 400);
  }

  // Tìm dòng tiêu đề
  let headerRowIndex = 1;
  const colMap = { stt: -1, mssv: -1, fullName: -1, email: -1, className: -1 };

  worksheet.eachRow((row, rowNumber) => {
    if (Object.values(colMap).every((idx) => idx !== -1)) return;
    row.eachCell((cell, colNumber) => {
      const text = (cell.text || "").trim().toLowerCase();
      if (text === "stt") colMap.stt = colNumber;
      else if (text.includes("mssv") || text.includes("mã sinh viên") || text.includes("mã số sinh viên")) colMap.mssv = colNumber;
      else if (text.includes("họ và tên") || text.includes("họ tên") || text.includes("tên sinh viên")) colMap.fullName = colNumber;
      else if (text.includes("email") || text.includes("hộp thư")) colMap.email = colNumber;
      else if (text.includes("lớp") || text.includes("tên lớp")) colMap.className = colNumber;
    });
    if (colMap.mssv !== -1 && colMap.fullName !== -1 && colMap.email !== -1 && colMap.className !== -1) {
      headerRowIndex = rowNumber;
    }
  });

  if (colMap.mssv === -1 || colMap.fullName === -1 || colMap.email === -1 || colMap.className === -1) {
    throw new AppError("File Excel thiếu các cột bắt buộc: MSSV, Họ và tên, Email, Lớp.", 400);
  }

  const rawRows = [];
  const seenMssvsInFile = new Map();
  const seenEmailsInFile = new Map();

  for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const mssvRaw = (row.getCell(colMap.mssv).text || "").trim();
    const nameRaw = (row.getCell(colMap.fullName).text || "").trim();
    const emailRaw = (row.getCell(colMap.email).text || "").trim().toLowerCase();
    const classRaw = (row.getCell(colMap.className).text || "").trim();
    const sttRaw = colMap.stt !== -1 ? (row.getCell(colMap.stt).text || "").trim() : String(rawRows.length + 1);

    // Bỏ qua dòng hoàn toàn trống
    if (!mssvRaw && !nameRaw && !emailRaw && !classRaw) continue;

    rawRows.push({
      rowNumber: r,
      stt: sttRaw || String(rawRows.length + 1),
      mssv: mssvRaw,
      fullName: nameRaw,
      email: emailRaw,
      className: classRaw,
      errors: [],
      status: "VALID",
    });
  }

  if (rawRows.length === 0) {
    throw new AppError("File Excel không chứa dòng dữ liệu nào", 400);
  }

  // 1. Kiểm tra cấu trúc từng dòng & trùng lặp nội bộ trong file
  const candidateMssvs = [];
  const candidateEmails = [];

  for (const item of rawRows) {
    // Kiểm tra MSSV
    if (!item.mssv) {
      item.errors.push("MSSV không được để trống");
    } else if (!/^\d{8}$/.test(item.mssv)) {
      item.errors.push("MSSV phải gồm đúng 8 chữ số");
    }

    // Kiểm tra Họ tên
    if (!item.fullName) {
      item.errors.push("Họ và tên không được để trống");
    }

    // Kiểm tra Email
    if (!item.email) {
      item.errors.push("Email không được để trống");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(item.email)) {
        item.errors.push("Email không đúng định dạng");
      } else if (!item.email.endsWith("@student.iuh.edu.vn")) {
        item.errors.push("Email phải có tên miền @student.iuh.edu.vn");
      } else if (item.mssv && /^\d{8}$/.test(item.mssv)) {
        const localPart = item.email.split("@")[0];
        if (!localPart.startsWith(item.mssv)) {
          item.errors.push(`MSSV trong email không trùng khớp với MSSV (${item.mssv})`);
        }
      }
    }

    // Kiểm tra Lớp
    if (!item.className) {
      item.errors.push("Lớp không được để trống");
    }

    // Kiểm tra trùng lặp trong chính file Excel
    if (item.mssv) {
      if (seenMssvsInFile.has(item.mssv)) {
        item.errors.push(`Trùng lặp MSSV với dòng ${seenMssvsInFile.get(item.mssv)} trong file`);
      } else {
        seenMssvsInFile.set(item.mssv, item.rowNumber);
        candidateMssvs.push(item.mssv);
      }
    }

    if (item.email) {
      if (seenEmailsInFile.has(item.email)) {
        item.errors.push(`Trùng lặp Email với dòng ${seenEmailsInFile.get(item.email)} trong file`);
      } else {
        seenEmailsInFile.set(item.email, item.rowNumber);
        candidateEmails.push(item.email);
      }
    }

    if (item.errors.length > 0) {
      item.status = "ERROR";
    }
  }

  // 2. Kiểm tra trùng lặp với Database
  const [existingUsers, existingStudents] = await Promise.all([
    User.find({
      $or: [{ code: { $in: candidateMssvs } }, { email: { $in: candidateEmails } }],
    }).select("code email fullName role").lean(),
    Student.find({
      studentCode: { $in: candidateMssvs },
    }).select("studentCode").lean(),
  ]);

  const existingCodesSet = new Set([
    ...existingUsers.map((u) => u.code).filter(Boolean),
    ...existingStudents.map((s) => s.studentCode).filter(Boolean),
  ]);
  const existingEmailsSet = new Set(
    existingUsers.map((u) => (u.email || "").toLowerCase()).filter(Boolean)
  );

  for (const item of rawRows) {
    if (item.status === "ERROR") continue;

    const isCodeExisted = item.mssv && existingCodesSet.has(item.mssv);
    const isEmailExisted = item.email && existingEmailsSet.has(item.email);

    if (isCodeExisted || isEmailExisted) {
      item.status = "EXISTED";
      if (isCodeExisted) {
        item.errors.push("MSSV đã tồn tại trong hệ thống");
      }
      if (isEmailExisted) {
        item.errors.push("Email đã được sử dụng trong hệ thống");
      }
    }
  }

  const summary = {
    total: rawRows.length,
    valid: rawRows.filter((r) => r.status === "VALID").length,
    error: rawRows.filter((r) => r.status === "ERROR").length,
    existed: rawRows.filter((r) => r.status === "EXISTED").length,
  };

  return {
    success: true,
    summary,
    rows: rawRows,
  };
};

/**
 * Xác nhận tạo tài khoản sinh viên từ các dòng hợp lệ
 */
const importStudentExcel = async (validRows, adminUser) => {
  if (!Array.isArray(validRows) || validRows.length === 0) {
    throw new AppError("Không có danh sách dữ liệu hợp lệ để tạo tài khoản", 400);
  }

  let createdCount = 0;
  let skippedCount = 0;
  const errorsList = [];

  for (const row of validRows) {
    const mssv = (row.mssv || "").trim();
    const fullName = (row.fullName || "").trim();
    const email = (row.email || "").trim().toLowerCase();
    const className = (row.className || "").trim();

    // Bỏ qua nếu thiếu trường bắt buộc
    if (!mssv || !fullName || !email || !className) {
      skippedCount++;
      continue;
    }

    try {
      // Kiểm tra lại database ngay trước khi tạo để tránh race condition
      const [existingUser, existingStudent] = await Promise.all([
        User.findOne({ $or: [{ code: mssv }, { email }] }),
        Student.findOne({ studentCode: mssv }),
      ]);

      if (existingUser || existingStudent) {
        skippedCount++;
        continue;
      }

      // Tạo mật khẩu ngẫu nhiên riêng biệt cho từng sinh viên
      const plainPassword = generateSecurePassword(10);
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      const newUser = await User.create({
        fullName,
        code: mssv,
        email,
        password: hashedPassword,
        role: "STUDENT",
        mustChangePassword: true,
        isActive: true,
      });

      await Student.create({
        userId: newUser._id,
        studentCode: mssv,
        className,
        major: "Công nghệ Thông tin",
        prerequisiteCompleted: true,
        isActive: true,
      });

      createdCount++;

      // Gửi email bất đồng bộ không chặn luồng
      sendAccountCreationEmail({
        to: email,
        recipientName: fullName,
        studentCode: mssv,
        password: plainPassword,
        className,
      }).catch((err) =>
        console.error(`[EmailService] Lỗi gửi email tạo tài khoản cho ${mssv}:`, err.message)
      );
    } catch (err) {
      console.error(`Lỗi khi tạo tài khoản cho sinh viên ${mssv}:`, err.message);
      errorsList.push({ mssv, error: err.message });
      skippedCount++;
    }
  }

  // Ghi nhật ký hệ thống
  if (adminUser && createdCount > 0) {
    try {
      await Log.create({
        userId: adminUser._id || adminUser.userId || adminUser,
        action: "Import sinh viên Excel",
        module: "USER",
        description: `Quản trị viên ${adminUser.fullName || "Admin"} đã import thành công ${createdCount} tài khoản sinh viên từ Excel`,
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
      });
    } catch (logErr) {
      console.warn("Lỗi ghi log import excel:", logErr.message);
    }
  }

  return {
    success: true,
    message: `Đã tạo thành công ${createdCount} tài khoản sinh viên. Bỏ qua ${skippedCount} dòng không hợp lệ hoặc đã tồn tại.`,
    summary: {
      created: createdCount,
      skipped: skippedCount,
      totalRequested: validRows.length,
      errorsCount: errorsList.length,
    },
    errors: errorsList,
  };
};

/**
 * Khởi tạo dữ liệu nhật ký mẫu ban đầu nếu collection còn trống
 */
const seedInitialLogsIfEmpty = async () => {
  try {
    const count = await Log.countDocuments();
    if (count > 0) return;

    // Lấy người dùng mẫu theo các vai trò
    const users = await User.find({ isActive: true }).select("_id fullName role email").lean();
    if (!users || users.length === 0) return;

    const admins = users.filter((u) => u.role === "ADMIN");
    const tbms = users.filter((u) => u.role === "TBM");
    const lecturers = users.filter((u) => u.role === "LECTURER");
    const students = users.filter((u) => u.role === "STUDENT");

    const sampleLogs = [];
    const now = Date.now();

    // Hành động mẫu của Quản trị viên (Admin)
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

    // Hành động mẫu của Trưởng bộ môn (TBM)
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

    // Hành động mẫu của Giảng viên
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

    // Hành động mẫu của Sinh viên
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
 * Lấy nhật ký hoạt động hệ thống có phân trang, lọc theo vai trò và tìm kiếm
 */
const getSystemLogs = async ({ page = 1, limit = 10, role = "", search = "" }) => {
  await seedInitialLogsIfEmpty();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  const andConditions = [];

  // Lọc theo vai trò (nếu có)
  if (role && role !== "ALL" && role !== "") {
    const usersInRole = await User.find({ role }).select("_id").lean();
    const userIds = usersInRole.map((u) => u._id);
    andConditions.push({ userId: { $in: userIds } });
  }

  // Lọc theo tìm kiếm (hành động, mô tả, module hoặc thông tin người dùng)
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
  generateExcelTemplate,
  previewStudentExcel,
  importStudentExcel,
  getSystemLogs,
};
