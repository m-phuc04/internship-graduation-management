import authService from "../services/authService.js";
import captchaService from "../services/captchaService.js";
import { logActivity } from "../services/logService.js";

// ====================
// Lấy mã CAPTCHA
// ====================

const getCaptcha = async (req, res, next) => {
  try {
    const captcha = captchaService.createCaptcha();

    res.status(200).json({
      success: true,
      data: captcha,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Đăng ký tài khoản (Đã vô hiệu hóa - Chỉ Quản trị viên mới được tạo tài khoản)
// ====================

const register = async (req, res, next) => {
  try {
    await logActivity(req, {
      action: "Tự đăng ký tài khoản bị từ chối",
      module: "AUTH",
      description: `Yêu cầu tự đăng ký bị từ chối (Chức năng đã vô hiệu hóa). Dữ liệu gửi: ${req.body?.studentCode || req.body?.code || req.body?.email || "N/A"}`,
      status: "FAILED",
    });

    return res.status(403).json({
      success: false,
      message: "Chức năng tự đăng ký tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.",
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Đăng nhập hệ thống
// ====================

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    const identifier = result.user.code || result.user.studentCode || result.user.lecturerCode || result.user._id;
    await logActivity(req, {
      userId: result.user._id,
      role: result.user.role,
      action: "Đăng nhập hệ thống",
      module: "AUTH",
      description: `Người dùng ${result.user.fullName} (${identifier}) đăng nhập thành công`,
      targetId: result.user._id,
      targetModel: "User",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (error) {
    const accountAttempt = req.body?.accountCode || req.body?.code || req.body?.username || req.body?.email || "Không xác định";
    await logActivity(req, {
      userId: null,
      role: null,
      action: "Đăng nhập thất bại",
      module: "AUTH",
      description: `Đăng nhập thất bại với tài khoản: "${accountAttempt}". Lý do: ${error.message}`,
      status: "FAILED",
      errorMessage: error.message,
    });

    next(error);
  }
};

// ====================
// Làm mới Access Token
// ====================

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const accessToken = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: "Access token đã được làm mới",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Đăng xuất hệ thống
// ====================

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.userId);

    await logActivity(req, {
      userId: req.user?.userId || req.body?.userId,
      role: req.user?.role,
      action: "Đăng xuất",
      module: "AUTH",
      description: "Người dùng đã đăng xuất khỏi hệ thống",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lấy thông tin cá nhân
// ====================

const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lấy thông tin công khai
// ====================

const getPublicProfile = async (req, res, next) => {
  try {
    const profile = await authService.getPublicUserProfile(req.params.id);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Cập nhật thông tin cá nhân
// ====================

const updateProfile = async (req, res, next) => {
  try {
    const updated = await authService.updateProfile(req.user.userId, req.body);

    await logActivity(req, {
      action: "Cập nhật hồ sơ cá nhân",
      module: "USER",
      description: "Người dùng đã cập nhật thông tin hồ sơ cá nhân",
      targetId: req.user.userId,
      targetModel: "User",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Đã cập nhật hồ sơ thành công.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Đổi mật khẩu
// ====================

const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.userId, req.body);

    await logActivity(req, {
      action: "Đổi mật khẩu",
      module: "AUTH",
      description: "Người dùng đã tự thay đổi mật khẩu tài khoản thành công",
      targetId: req.user.userId,
      targetModel: "User",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCaptcha,
  register,
  login,
  refresh,
  logout,
  getProfile,
  getPublicProfile,
  updateProfile,
  changePassword,
};
