import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Permission from "../models/Permission.js";
import Log from "../models/Log.js";
import { logActivity, getDistinctActions } from "./logService.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import AppError from "../utils/AppError.js";
import {
  sendPasswordResetEmail,
  sendAccountCreationEmail,
} from "./emailService.js";

const VALID_PERMISSIONS = ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"];

/**
 * Tạo mật khẩu ngẫu nhiên an toàn (tối thiểu 12 ký tự, mặc định 16 ký tự gồm hoa, thường, số, ký tự đặc biệt)
 */
const generateSecurePassword = (length = 16) => {
  const safeLength = Math.max(12, length);
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$&*!%?";
  const all = upper + lower + digits + special;

  let pwd = "";
  // Đảm bảo có ít nhất 2 ký tự của mỗi loại
  for (let i = 0; i < 2; i++) {
    pwd += upper[crypto.randomInt(0, upper.length)];
    pwd += lower[crypto.randomInt(0, lower.length)];
    pwd += digits[crypto.randomInt(0, digits.length)];
    pwd += special[crypto.randomInt(0, special.length)];
  }

  for (let i = pwd.length; i < safeLength; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  // Xáo trộn ngẫu nhiên an toàn (Fisher-Yates shuffle)
  const arr = pwd.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join("");
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
 * Lấy danh sách tất cả người dùng cho trang quản trị tổng quan kèm phân trang, tìm kiếm và lọc
 */
const getAllUsers = async ({ role = "", search = "", page = 1, limit = 10 }) => {
  const query = {};
  if (role && role !== "ALL") {
    query.role = role;
  }
  if (search && search.trim()) {
    const searchTrimmed = search.trim();
    const regex = new RegExp(searchTrimmed, "i");

    // Tìm kiếm thêm cả sinh viên theo studentCode nếu có
    const matchingStudents = await Student.find({ studentCode: regex }).select("userId").lean();
    const studentUserIds = matchingStudents.map((s) => s.userId).filter(Boolean);

    query.$or = [
      { fullName: regex },
      { email: regex },
      { code: regex },
      { _id: { $in: studentUserIds } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
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
 * Đặt lại mật khẩu cho tài khoản Sinh viên, Giảng viên hoặc Trưởng bộ môn (STUDENT, LECTURER, TBM)
 * Tuyệt đối cấm ADMIN
 * Quy trình: Kiểm tra STUDENT / LECTURER / TBM -> Tạo mật khẩu ngẫu nhiên -> Gửi email trước -> Lưu DB và thu hồi token
 */
const resetPassword = async (userId, adminUser, req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản người dùng", 404);
  }

  // 1. Kiểm tra phân quyền: Chỉ cho phép STUDENT, LECTURER hoặc TBM, tuyệt đối cấm ADMIN
  const ALLOWED_ROLES = ["STUDENT", "LECTURER", "TBM"];
  if (!ALLOWED_ROLES.includes(user.role)) {
    throw new AppError(
      "Chức năng này chỉ áp dụng cho tài khoản Sinh viên, Giảng viên hoặc Trưởng bộ môn. Không được phép đặt lại mật khẩu của Quản trị viên.",
      403,
    );
  }

  const roleLabelMap = {
    STUDENT: "Sinh viên",
    LECTURER: "Giảng viên",
    TBM: "Trưởng bộ môn",
  };
  const roleLabel = roleLabelMap[user.role] || user.role;

  if (!user.isActive) {
    throw new AppError(`Tài khoản ${roleLabel.toLowerCase()} này đang bị khóa. Vui lòng kích hoạt trước khi đặt lại mật khẩu.`, 400);
  }

  let accountCode = user.code;
  if (user.role === "STUDENT") {
    const student = await Student.findOne({ userId: user._id });
    accountCode = student?.studentCode || user.code;
  } else if (user.role === "LECTURER" || user.role === "TBM") {
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
  await logActivity(req, {
    userId: adminUser?._id || adminUser?.userId || adminUser,
    role: "ADMIN",
    action: `Reset mật khẩu ${roleLabel.toLowerCase()}`,
    module: "USER",
    description: `Quản trị viên ${adminUser?.fullName || "Admin"} đã đặt lại mật khẩu cho ${roleLabel.toLowerCase()} ${accountCode} (${user.fullName}) gửi đến email ${user.email}`,
    targetId: user._id,
    targetModel: "User",
    status: "SUCCESS",
  });

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
 * Đọc file Excel từ buffer hỗ trợ cả .xlsx, .xls, .xlsm, csv
 * Sử dụng XLSX (SheetJS) làm engine chính và ExcelJS làm fallback
 */
const parseExcelBufferToRows = async (fileBuffer) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError("Không nhận được dữ liệu file hoặc file tải lên bị rỗng.", 400);
  }

  // 1. Thử đọc với XLSX (SheetJS) - hỗ trợ .xlsx, .xls (BIFF8 binary), .xlsm, HTML-as-xls
  try {
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      raw: false,
      dateNF: "yyyy-mm-dd",
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new AppError("File Excel không tìm thấy sheet dữ liệu nào (bảng tính trống).", 400);
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new AppError("File Excel không có dữ liệu bảng tính hợp lệ.", 400);
    }

    // Chuyển worksheet thành mảng 2 chiều các dòng
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (Array.isArray(rawData) && rawData.length > 0) {
      return rawData.map((row) =>
        Array.isArray(row)
          ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ""))
          : []
      );
    }
  } catch (sheetJsErr) {
    console.warn("[ExcelParser] SheetJS parse warning, attempting ExcelJS fallback:", sheetJsErr.message);
  }

  // 2. Fallback sang ExcelJS (cho một số file .xlsx chuẩn)
  try {
    const excelJsWb = new ExcelJS.Workbook();
    await excelJsWb.xlsx.load(fileBuffer);

    const worksheet = excelJsWb.worksheets[0];
    if (!worksheet) {
      throw new AppError("File Excel không tìm thấy sheet dữ liệu nào.", 400);
    }

    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowValues = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowValues[colNumber - 1] = (cell.text || "").trim();
      });
      rows.push(rowValues);
    });

    if (rows.length > 0) {
      return rows;
    }
  } catch (excelJsErr) {
    console.error("[ExcelParser] Both SheetJS and ExcelJS failed to load buffer:", excelJsErr.message);
  }

  throw new AppError(
    "Định dạng file không hợp lệ hoặc bị lỗi không thể đọc được. Vui lòng tải lên file Excel (.xlsx, .xls).",
    400
  );
};

/**
 * Phân tích và xem trước dữ liệu file Excel sinh viên
 */
const previewStudentExcel = async (fileBuffer) => {
  const rows = await parseExcelBufferToRows(fileBuffer);

  if (!rows || rows.length === 0) {
    throw new AppError("File Excel không chứa dòng dữ liệu nào.", 400);
  }

  // Tìm dòng tiêu đề (quét tối đa 15 dòng đầu tiên)
  let headerRowIndex = -1;
  const colMap = { stt: -1, mssv: -1, fullName: -1, email: -1, className: -1 };

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const tempMap = { stt: -1, mssv: -1, fullName: -1, email: -1, className: -1 };

    row.forEach((cellVal, colIdx) => {
      const text = (cellVal || "").trim().toLowerCase();
      if (!text) return;

      if (text === "stt" || text === "số tt" || text === "số thứ tự" || text === "no" || text === "no.") {
        tempMap.stt = colIdx;
      } else if (
        text.includes("mssv") ||
        text.includes("mã sinh viên") ||
        text.includes("mã số sinh viên") ||
        text.includes("mã sv") ||
        text === "student code" ||
        text === "studentcode" ||
        text === "code"
      ) {
        tempMap.mssv = colIdx;
      } else if (
        text.includes("họ và tên") ||
        text.includes("họ tên") ||
        text.includes("tên sinh viên") ||
        text.includes("họ và tên sv") ||
        text === "full name" ||
        text === "fullname" ||
        text === "name"
      ) {
        tempMap.fullName = colIdx;
      } else if (
        text.includes("email") ||
        text.includes("hộp thư") ||
        text.includes("mail") ||
        text.includes("địa chỉ email")
      ) {
        tempMap.email = colIdx;
      } else if (
        text.includes("lớp") ||
        text.includes("tên lớp") ||
        text.includes("lớp danh nghĩa") ||
        text.includes("mã lớp") ||
        text === "class" ||
        text === "classname"
      ) {
        tempMap.className = colIdx;
      }
    });

    // Nếu tìm thấy đầy đủ 4 cột cốt lõi
    if (tempMap.mssv !== -1 && tempMap.fullName !== -1 && tempMap.email !== -1 && tempMap.className !== -1) {
      headerRowIndex = r;
      Object.assign(colMap, tempMap);
      break;
    }
  }

  if (headerRowIndex === -1) {
    const missing = [];
    if (colMap.mssv === -1) missing.push("MSSV");
    if (colMap.fullName === -1) missing.push("Họ và tên");
    if (colMap.email === -1) missing.push("Email");
    if (colMap.className === -1) missing.push("Lớp");
    throw new AppError(
      `File Excel thiếu các cột bắt buộc: ${missing.join(", ")}. Vui lòng kiểm tra lại dòng tiêu đề trong file.`,
      400
    );
  }

  const rawRows = [];
  const seenMssvsInFile = new Map();
  const seenEmailsInFile = new Map();

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const mssvRaw = (row[colMap.mssv] || "").trim();
    const nameRaw = (row[colMap.fullName] || "").trim();
    const emailRaw = (row[colMap.email] || "").trim().toLowerCase();
    const classRaw = (row[colMap.className] || "").trim();
    const sttRaw = colMap.stt !== -1 && row[colMap.stt] ? String(row[colMap.stt]).trim() : String(rawRows.length + 1);

    // Bỏ qua dòng hoàn toàn trống
    if (!mssvRaw && !nameRaw && !emailRaw && !classRaw) continue;

    rawRows.push({
      rowNumber: r + 1, // Số dòng thực tế trong file Excel (1-indexed)
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
    throw new AppError("File Excel không chứa bất kỳ dòng dữ liệu sinh viên nào sau dòng tiêu đề.", 400);
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
        item.errors.push("Email không đúng định dạng chuẩn");
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
    })
      .select("code email fullName role")
      .lean(),
    Student.find({
      studentCode: { $in: candidateMssvs },
    })
      .select("studentCode")
      .lean(),
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
 * Xác nhận tạo tài khoản sinh viên từ các dòng hợp lệ và gửi thông tin đăng nhập qua Email
 */
const importStudentExcel = async (validRows, adminUser, req = null) => {
  if (!Array.isArray(validRows) || validRows.length === 0) {
    throw new AppError("Không có danh sách dữ liệu hợp lệ để tạo tài khoản", 400);
  }

  let createdCount = 0;
  let emailSuccessCount = 0;
  let emailFailCount = 0;
  let skippedCount = 0;
  const createdStudents = [];
  const failedEmailStudents = [];
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

      // 1. Tạo mật khẩu ngẫu nhiên riêng biệt cho từng sinh viên (16 ký tự mạnh)
      const plainPassword = generateSecurePassword(16);
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      // 2. Tạo tài khoản User (role: STUDENT, mustChangePassword: true)
      const newUser = await User.create({
        fullName,
        code: mssv,
        email,
        password: hashedPassword,
        role: "STUDENT",
        mustChangePassword: true,
        isActive: true,
      });

      // 3. Khởi tạo hồ sơ Sinh viên liên kết
      await Student.create({
        userId: newUser._id,
        studentCode: mssv,
        className,
        major: "Công nghệ Thông tin",
        prerequisiteCompleted: true,
        internshipRegistered: false,
        thesisRegistered: false,
        isActive: true,
      });

      createdCount++;

      // 4. Gửi email thông tin tài khoản cho sinh viên
      const emailRes = await sendAccountCreationEmail({
        to: email,
        recipientName: fullName,
        studentCode: mssv,
        password: plainPassword,
        className,
      });

      if (emailRes && emailRes.success) {
        emailSuccessCount++;
        createdStudents.push({
          mssv,
          fullName,
          email,
          className,
          emailSent: true,
        });
      } else {
        emailFailCount++;
        const errMsg = emailRes?.error || "Gửi email thất bại";
        failedEmailStudents.push({
          mssv,
          fullName,
          email,
          className,
          error: errMsg,
        });
        createdStudents.push({
          mssv,
          fullName,
          email,
          className,
          emailSent: false,
          emailError: errMsg,
        });
      }
    } catch (err) {
      console.error(`[ImportExcel] Lỗi khi tạo tài khoản cho sinh viên ${mssv}:`, err.message);
      errorsList.push({ mssv, error: err.message });
      skippedCount++;
    }
  }

  // Ghi nhật ký hệ thống
  if (adminUser) {
    const isSuccess = createdCount > 0;
    await logActivity(req, {
      userId: adminUser._id || adminUser.userId || adminUser,
      role: "ADMIN",
      action: "Import sinh viên Excel",
      module: "USER",
      description: `Quản trị viên đã import: Tạo thành công ${createdCount} tài khoản (Gửi email: ${emailSuccessCount} thành công, ${emailFailCount} thất bại). Bỏ qua ${skippedCount} dòng.`,
      status: isSuccess ? "SUCCESS" : "FAILED",
      errorMessage: errorsList.length > 0 ? `Có ${errorsList.length} lỗi khi import` : null,
    });
  }

  return {
    success: true,
    message: `Đã tạo thành công ${createdCount} tài khoản sinh viên (${emailSuccessCount} email gửi thành công, ${emailFailCount} email gửi thất bại). Bỏ qua ${skippedCount} dòng đã tồn tại hoặc không hợp lệ.`,
    summary: {
      totalRequested: validRows.length,
      created: createdCount,
      emailSuccess: emailSuccessCount,
      emailFailed: emailFailCount,
      skipped: skippedCount,
      errorsCount: errorsList.length,
    },
    createdStudents,
    failedEmails: failedEmailStudents,
    errors: errorsList,
  };
};

/**
 * Gửi lại thông tin đăng nhập qua Email cho sinh viên (khi gửi lần đầu thất bại hoặc cần cấp lại)
 */
const resendStudentCredentials = async ({ mssv, mssvs }, adminUser, req = null) => {
  const codes = [];
  if (mssv) codes.push(String(mssv).trim());
  if (Array.isArray(mssvs)) {
    mssvs.forEach((c) => {
      const codeStr = String(c).trim();
      if (codeStr && !codes.includes(codeStr)) codes.push(codeStr);
    });
  }

  if (codes.length === 0) {
    throw new AppError("Vui lòng cung cấp mã sinh viên để gửi lại thông tin đăng nhập", 400);
  }

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const code of codes) {
    try {
      const user = await User.findOne({ code, role: "STUDENT" });
      if (!user) {
        failCount++;
        results.push({ mssv: code, success: false, error: "Không tìm thấy tài khoản sinh viên" });
        continue;
      }

      const student = await Student.findOne({ studentCode: code });

      // Sinh mật khẩu mới an toàn 16 ký tự
      const newPlainPassword = generateSecurePassword(16);
      const hashedPassword = await bcrypt.hash(newPlainPassword, 12);

      // Cập nhật User và thu hồi token cũ
      user.password = hashedPassword;
      user.mustChangePassword = true;
      user.refreshToken = null;
      await user.save();

      // Gửi email mới
      const emailRes = await sendAccountCreationEmail({
        to: user.email,
        recipientName: user.fullName,
        studentCode: code,
        password: newPlainPassword,
        className: student?.className || "—",
      });

      if (emailRes && emailRes.success) {
        successCount++;
        results.push({ mssv: code, email: user.email, success: true });
      } else {
        failCount++;
        results.push({
          mssv: code,
          email: user.email,
          success: false,
          error: emailRes?.error || "Gửi email thất bại",
        });
      }
    } catch (err) {
      failCount++;
      results.push({ mssv: code, success: false, error: err.message });
    }
  }

  if (adminUser) {
    await logActivity(req, {
      userId: adminUser._id || adminUser.userId || adminUser,
      role: "ADMIN",
      action: "Gửi lại email đăng nhập",
      module: "USER",
      description: `Quản trị viên gửi lại email thông tin đăng nhập cho ${codes.length} sinh viên: ${successCount} thành công, ${failCount} thất bại`,
      status: successCount > 0 ? "SUCCESS" : "FAILED",
    });
  }

  return {
    success: true,
    message: `Đã gửi lại email cho ${successCount}/${codes.length} sinh viên thành công (${failCount} thất bại).`,
    summary: {
      total: codes.length,
      successCount,
      failCount,
    },
    results,
  };
};

/**
 * Khởi tạo dữ liệu nhật ký mẫu ban đầu nếu collection còn trống
 */
/**
 * Lấy nhật ký hoạt động hệ thống có phân trang, lọc đa điều kiện (role, status, module, action, dateFrom, dateTo, search)
 */
const getSystemLogs = async ({
  page = 1,
  limit = 15,
  role = "",
  status = "",
  module = "",
  action = "",
  search = "",
  dateFrom = "",
  dateTo = "",
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 15);

  const andConditions = [];

  // 1. Lọc theo vai trò (hỗ trợ cả SYSTEM và các vai trò User)
  if (role && role !== "ALL" && role !== "") {
    if (role === "SYSTEM") {
      andConditions.push({
        $or: [{ role: "SYSTEM" }, { userId: null }],
      });
    } else {
      const usersInRole = await User.find({ role }).select("_id").lean();
      const userIds = usersInRole.map((u) => u._id);
      andConditions.push({
        $or: [{ role }, { userId: { $in: userIds } }],
      });
    }
  }

  // 2. Lọc theo trạng thái (SUCCESS / FAILED)
  if (status && status !== "ALL" && status !== "") {
    andConditions.push({ status });
  }

  // 3. Lọc theo phân hệ (module)
  if (module && module !== "ALL" && module !== "") {
    andConditions.push({ module });
  }

  // 4. Lọc theo hành động (action)
  if (action && action !== "ALL" && action !== "") {
    andConditions.push({ action });
  }

  // 5. Lọc theo khoảng thời gian (theo múi giờ Việt Nam UTC+7)
  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom && dateFrom.trim()) {
      const start = new Date(`${dateFrom.trim()}T00:00:00.000+07:00`);
      if (!isNaN(start.getTime())) {
        dateQuery.$gte = start;
      }
    }
    if (dateTo && dateTo.trim()) {
      const end = new Date(`${dateTo.trim()}T23:59:59.999+07:00`);
      if (!isNaN(end.getTime())) {
        dateQuery.$lte = end;
      }
    }
    if (dateQuery.$gte && dateQuery.$lte && dateQuery.$gte > dateQuery.$lte) {
      const temp = dateQuery.$gte;
      dateQuery.$gte = new Date(`${dateTo.trim()}T00:00:00.000+07:00`);
      dateQuery.$lte = new Date(`${dateFrom.trim()}T23:59:59.999+07:00`);
    }
    if (Object.keys(dateQuery).length > 0) {
      andConditions.push({ createdAt: dateQuery });
    }
  }

  // 6. Lọc theo tìm kiếm (hành động, mô tả, module hoặc thông tin người dùng)
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

  const [logs, total, availableActions] = await Promise.all([
    Log.find(query)
      .populate("userId", "fullName email role code avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Log.countDocuments(query),
    getDistinctActions(),
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
    availableActions: availableActions.filter(Boolean).sort(),
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
  resendStudentCredentials,
  getSystemLogs,
};
