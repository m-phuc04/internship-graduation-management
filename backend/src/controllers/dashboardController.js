import dashboardService from "../services/dashboardService.js";

// Bảng điều khiển Sinh viên
const getStudentDashboard = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const data = await dashboardService.getStudentDashboard(
      req.user.userId,
      academicTermId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy thông tin tổng quan sinh viên thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Bảng điều khiển Trưởng Bộ Môn (TBM)
const getTbmDashboard = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const data = await dashboardService.getTbmDashboard(academicTermId);

    res.status(200).json({
      success: true,
      message: "Lấy thông tin tổng quan Trưởng Bộ Môn thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Bảng điều khiển Giảng viên
const getLecturerDashboard = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const data = await dashboardService.getLecturerDashboard(
      req.user.userId,
      academicTermId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy thông tin tổng quan Giảng viên thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getStudentDashboard,
  getTbmDashboard,
  getLecturerDashboard,
};
