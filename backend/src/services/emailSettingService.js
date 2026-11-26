import EmailSetting from "../models/EmailSetting.js";
import { logActivity } from "./logService.js";
import AppError from "../utils/AppError.js";

// Cache in-memory để kiểm tra nhanh trong các tác vụ gửi mail ngầm
let cachedSettings = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 giây

/**
 * Lấy cấu hình email hệ thống (nếu chưa có thì tự động tạo bản ghi mặc định)
 */
export const getEmailSettings = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now - lastCacheTime < CACHE_TTL) {
    return cachedSettings;
  }

  let settings = await EmailSetting.findOne().populate("updatedBy", "fullName email code role");

  if (!settings) {
    settings = await EmailSetting.create({
      isMasterEnabled: true,
      sendOnCreateStudent: true,
      sendOnCreateLecturer: true,
      sendOnImportStudentExcel: true,
      sendOnResetPassword: true,
      sendOnNotification: true,
      sendOnNews: true,
    });
  }

  cachedSettings = settings.toObject ? settings.toObject() : settings;
  lastCacheTime = now;
  return cachedSettings;
};

/**
 * Cập nhật cấu hình email hệ thống (chỉ dành cho ADMIN)
 */
export const updateEmailSettings = async (payload = {}, adminUser, req = null) => {
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new AppError("Chỉ Quản trị viên (ADMIN) mới có quyền cập nhật cấu hình email.", 403);
  }

  let settings = await EmailSetting.findOne();
  if (!settings) {
    settings = new EmailSetting();
  }

  const oldState = {
    isMasterEnabled: settings.isMasterEnabled,
    sendOnCreateStudent: settings.sendOnCreateStudent,
    sendOnCreateLecturer: settings.sendOnCreateLecturer,
    sendOnImportStudentExcel: settings.sendOnImportStudentExcel,
    sendOnResetPassword: settings.sendOnResetPassword,
    sendOnNotification: settings.sendOnNotification,
    sendOnNews: settings.sendOnNews,
  };

  const allowedFields = [
    "isMasterEnabled",
    "sendOnCreateStudent",
    "sendOnCreateLecturer",
    "sendOnImportStudentExcel",
    "sendOnResetPassword",
    "sendOnNotification",
    "sendOnNews",
  ];

  const changedFields = [];

  allowedFields.forEach((field) => {
    if (typeof payload[field] === "boolean") {
      if (settings[field] !== payload[field]) {
        changedFields.push(`${field}: ${settings[field]} -> ${payload[field]}`);
      }
      settings[field] = payload[field];
    }
  });

  settings.updatedBy = adminUser._id || adminUser.userId;
  await settings.save();

  // Làm mới cache
  cachedSettings = await EmailSetting.findById(settings._id)
    .populate("updatedBy", "fullName email code role")
    .lean();
  lastCacheTime = Date.now();

  // Ghi nhật ký hệ thống
  if (changedFields.length > 0) {
    await logActivity(req, {
      userId: adminUser._id || adminUser.userId,
      role: "ADMIN",
      action: "Cập nhật cấu hình email",
      module: "SYSTEM",
      description: `Quản trị viên đã thay đổi cấu hình email: ${changedFields.join(", ")}`,
      status: "SUCCESS",
    });
  }

  return cachedSettings;
};

/**
 * Kiểm tra xem một loại email có được phép gửi hay không
 * Điều kiện: Công tắc tổng BẬT VÀ công tắc của chức năng tương ứng BẬT
 * @param {'createStudent' | 'createLecturer' | 'importStudentExcel' | 'resetPassword' | 'notification' | 'news'} type
 */
export const isEmailTypeEnabled = async (type) => {
  try {
    const settings = await getEmailSettings();
    if (!settings || !settings.isMasterEnabled) {
      return false;
    }

    switch (type) {
      case "createStudent":
        return Boolean(settings.sendOnCreateStudent);
      case "createLecturer":
        return Boolean(settings.sendOnCreateLecturer);
      case "importStudentExcel":
        return Boolean(settings.sendOnImportStudentExcel);
      case "resetPassword":
        return Boolean(settings.sendOnResetPassword);
      case "notification":
        return Boolean(settings.sendOnNotification);
      case "news":
        return Boolean(settings.sendOnNews);
      default:
        return true;
    }
  } catch (err) {
    console.error("[EmailSettingService] Lỗi khi kiểm tra cấu hình email:", err.message);
    // Nếu có lỗi truy vấn cấu hình, an toàn mặc định là false để tránh gửi thư sai ý định
    return false;
  }
};

export default {
  getEmailSettings,
  updateEmailSettings,
  isEmailTypeEnabled,
};
