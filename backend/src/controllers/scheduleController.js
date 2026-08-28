import scheduleService from "../services/scheduleService.js";

// ====================
// Get All Schedules (All authenticated roles)
// ====================
const getAllSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.getAllSchedules(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch trình đào tạo thành công",
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Create Schedule (TBM & ADMIN only)
// ====================
const createSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body, req.user.userId);
    res.status(201).json({
      success: true,
      message: "Tạo lịch trình đào tạo thành công",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Update Schedule (TBM & ADMIN only)
// ====================
const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.updateSchedule(
      req.params.id,
      req.body,
      req.user.userId,
    );
    res.status(200).json({
      success: true,
      message: "Cập nhật lịch trình đào tạo thành công",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Delete Schedule (TBM & ADMIN only)
// ====================
const deleteSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.deleteSchedule(
      req.params.id,
      req.user.userId,
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
