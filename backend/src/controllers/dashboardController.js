import dashboardService from "../services/dashboardService.js";

// Student Dashboard
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

// TBM Dashboard
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

// Lecturer Dashboard
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

// Company Dashboard
const getCompanyDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getCompanyDashboard(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Lấy thông tin tổng quan Doanh nghiệp thành công",
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
  getCompanyDashboard,
};
