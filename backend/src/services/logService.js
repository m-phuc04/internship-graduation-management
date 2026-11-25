import Log from "../models/Log.js";

/**
 * Trích xuất thông tin khách (Client) từ Request
 */
export const extractClientInfo = (req) => {
  if (!req) {
    return {
      ipAddress: "127.0.0.1",
      userAgent: null,
      method: null,
      endpoint: null,
      userId: null,
      role: "SYSTEM",
    };
  }

  // Lấy IP thực (ưu tiên header proxy x-forwarded-for, loại bỏ prefix IPv6 ::ffff:)
  const forwarded = req.headers?.["x-forwarded-for"];
  const rawIp = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || req.ip || "127.0.0.1";
  const ipAddress = rawIp ? rawIp.replace(/^::ffff:/, "") : "127.0.0.1";

  const userAgent = req.headers?.["user-agent"] || null;
  const method = req.method || null;
  const endpoint = req.originalUrl || req.url || null;

  const user = req.user;
  const userId = user?._id || user?.userId || user?.id || null;
  const role = user?.role || (userId ? null : "SYSTEM");

  return {
    ipAddress,
    userAgent,
    method,
    endpoint,
    userId,
    role,
  };
};

/**
 * Hàm ghi nhật ký hoạt động hệ thống dùng chung (Thread-safe & Safe-fail)
 * @param {Object} req - Express Request object (hoặc null nếu là tác vụ ngầm)
 * @param {Object} logData - Dữ liệu chi tiết về hành động
 */
export const logActivity = async (req, logData = {}) => {
  try {
    const clientInfo = extractClientInfo(req);

    const record = {
      userId: logData.userId !== undefined ? logData.userId : clientInfo.userId,
      role: logData.role !== undefined ? logData.role : clientInfo.role,
      action: logData.action,
      module: logData.module || "SYSTEM",
      description: logData.description || null,
      targetId: logData.targetId || null,
      targetModel: logData.targetModel || null,
      method: logData.method || clientInfo.method,
      endpoint: logData.endpoint || clientInfo.endpoint,
      ipAddress: logData.ipAddress || clientInfo.ipAddress,
      userAgent: logData.userAgent || clientInfo.userAgent,
      status: logData.status || "SUCCESS",
      errorMessage: logData.errorMessage || null,
    };

    if (!record.action) {
      console.warn("[LogService] Action is required to record activity log.");
      return null;
    }

    // Nếu userId rỗng, đảm bảo vai trò là SYSTEM
    if (!record.userId && !record.role) {
      record.role = "SYSTEM";
    }

    return await Log.create(record);
  } catch (error) {
    // Không bao giờ để lỗi ghi log làm gián đoạn luồng nghiệp vụ chính
    console.warn("[LogService] Failed to record system log:", error.message);
    return null;
  }
};

/**
 * Lấy danh sách tất cả các hành động duy nhất hiện có trong hệ thống
 */
export const getDistinctActions = async () => {
  try {
    return await Log.distinct("action");
  } catch (err) {
    console.warn("[LogService] Failed to fetch distinct actions:", err.message);
    return [];
  }
};

export default {
  extractClientInfo,
  logActivity,
  getDistinctActions,
};
