import authService from "../services/authService.js";
import captchaService from "../services/captchaService.js";

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
// Đăng ký tài khoản
// ====================

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công",
      data: user,
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

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (error) {
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
