import adminService from "../services/adminService.js";
import { logActivity } from "../services/logService.js";

const getPermissionsList = async (req, res, next) => {
  try {
    const data = await adminService.getPermissionsList();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const updateLecturerPermissions = async (req, res, next) => {
  try {
    const { lecturerId } = req.params;
    const { permissions, role } = req.body;
    const data = await adminService.updateLecturerPermissions(lecturerId, {
      permissions,
      role,
    });

    await logActivity(req, {
      action: "Cập nhật phân quyền giảng viên",
      module: "USER",
      description: `Quản trị viên đã cập nhật quyền hạn hướng dẫn/phản biện cho giảng viên ${data?.fullName || lecturerId}`,
      targetId: lecturerId,
      targetModel: "Lecturer",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Cập nhật phân quyền giảng viên thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page, limit } = req.query;
    const data = await adminService.getAllUsers({ role, search, page, limit });
    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await adminService.toggleUserStatus(userId);
    const actionName = user.isActive ? "Kích hoạt tài khoản" : "Khóa tài khoản";

    await logActivity(req, {
      action: actionName,
      module: "USER",
      description: `Quản trị viên đã ${actionName.toLowerCase()} người dùng ${user.fullName} (${user.email || user.code})`,
      targetId: user._id,
      targetModel: "User",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: user.isActive ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await adminService.resetPassword(userId, req.user, req);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getExcelTemplate = async (req, res, next) => {
  try {
    const buffer = await adminService.generateExcelTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Template_Import_SinhVien_IUH.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const previewStudentExcel = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file Excel để tải lên.",
      });
    }
    const result = await adminService.previewStudentExcel(req.file.buffer);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const importStudentExcel = async (req, res, next) => {
  try {
    const { validRows } = req.body;
    if (!validRows || !Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dòng dữ liệu hợp lệ nào để tạo tài khoản.",
      });
    }
    const result = await adminService.importStudentExcel(validRows, req.user, req);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSystemLogs = async (req, res, next) => {
  try {
    const { page, limit, role, status, module, action, search, dateFrom, dateTo } = req.query;
    const data = await adminService.getSystemLogs({
      page,
      limit,
      role,
      status,
      module,
      action,
      search,
      dateFrom,
      dateTo,
    });
    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPermissionsList,
  updateLecturerPermissions,
  getAllUsers,
  toggleUserStatus,
  resetPassword,
  getExcelTemplate,
  previewStudentExcel,
  importStudentExcel,
  getSystemLogs,
};
