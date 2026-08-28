import adminService from "../services/adminService.js";

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
    const { newPassword } = req.body;
    const result = await adminService.resetPassword(userId, newPassword);
    res.status(200).json({
      success: true,
      ...result,
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
};
