import academicTermService from "../services/academicTermService.js";
import { logActivity } from "../services/logService.js";

// ====================
// 1. Lấy danh sách tất cả học kỳ
// ====================
const getAllTerms = async (req, res, next) => {
  try {
    const { status, academicYear, search } = req.query;
    const terms = await academicTermService.getAllTerms({
      status,
      academicYear,
      search,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách học kỳ thành công",
      data: terms,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 2. Lấy học kỳ đang kích hoạt
// ====================
const getActiveTerm = async (req, res, next) => {
  try {
    const term = await academicTermService.getActiveTerm();
    res.status(200).json({
      success: true,
      message: "Lấy học kỳ hiện tại thành công",
      data: term,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 2b. Lấy học kỳ hiện tại (theo ngày)
// ====================
const getCurrentTerm = async (req, res, next) => {
  try {
    const { date } = req.query;
    const term = await academicTermService.getCurrentAcademicTerm(date || new Date());
    res.status(200).json({
      success: true,
      message: "Lấy học kỳ hiện tại thành công",
      data: term,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 3. Lấy thông tin chi tiết học kỳ theo ID
// ====================
const getTermById = async (req, res, next) => {
  try {
    const term = await academicTermService.getTermById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy chi tiết học kỳ thành công",
      data: term,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 4. Tạo học kỳ mới
// ====================
const createTerm = async (req, res, next) => {
  try {
    const newTerm = await academicTermService.createTerm(
      req.body,
      req.user?.userId,
    );

    await logActivity(req, {
      action: "Tạo mới học kỳ",
      module: "SCHEDULE",
      description: `Đã tạo mới học kỳ ${newTerm.code || ""} (${newTerm.academicYear || ""})`,
      targetId: newTerm._id,
      targetModel: "AcademicTerm",
      status: "SUCCESS",
    });

    res.status(201).json({
      success: true,
      message: "Tạo mới học kỳ thành công",
      data: newTerm,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 5. Cập nhật thông tin học kỳ
// ====================
const updateTerm = async (req, res, next) => {
  try {
    const updated = await academicTermService.updateTerm(
      req.params.id,
      req.body,
    );

    await logActivity(req, {
      action: "Cập nhật học kỳ",
      module: "SCHEDULE",
      description: `Đã cập nhật thông tin học kỳ ${updated.code || req.params.id}`,
      targetId: updated._id,
      targetModel: "AcademicTerm",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Cập nhật học kỳ thành công",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 6. Kích hoạt học kỳ
// ====================
const activateTerm = async (req, res, next) => {
  try {
    const activated = await academicTermService.activateTerm(req.params.id);

    await logActivity(req, {
      action: "Thiết lập học kỳ hiện tại",
      module: "SCHEDULE",
      description: `Đã kích hoạt học kỳ ${activated.code} làm học kỳ hiện tại`,
      targetId: activated._id,
      targetModel: "AcademicTerm",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: `Đã kích hoạt học kỳ ${activated.code} thành công.`,
      data: activated,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 7. Đóng học kỳ
// ====================
const closeTerm = async (req, res, next) => {
  try {
    const closed = await academicTermService.closeTerm(req.params.id);

    await logActivity(req, {
      action: "Đóng học kỳ",
      module: "SCHEDULE",
      description: `Đã đóng học kỳ ${closed.code || req.params.id}`,
      targetId: closed._id,
      targetModel: "AcademicTerm",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: `Đã đóng học kỳ ${closed.code}.`,
      data: closed,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 8. Xóa học kỳ
// ====================
const deleteTerm = async (req, res, next) => {
  try {
    const result = await academicTermService.deleteTerm(req.params.id);

    await logActivity(req, {
      action: "Xóa học kỳ",
      module: "SCHEDULE",
      description: `Đã xóa học kỳ ${req.params.id}`,
      targetId: req.params.id,
      targetModel: "AcademicTerm",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: result.message || "Xóa học kỳ thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// 8b. Bật/tắt khóa đăng ký Khóa luận Tốt nghiệp
// ====================
const toggleThesisRegistrationLock = async (req, res, next) => {
  try {
    const { isLocked, newDeadline } = req.body;
    const updated = await academicTermService.toggleThesisRegistrationLock(
      req.params.id,
      {
        isLocked,
        newDeadline,
        userId: req.user.userId || req.user._id,
      },
    );

    res.status(200).json({
      success: true,
      message: isLocked
        ? "Đã khóa đăng ký đề tài KLTN thành công"
        : "Đã mở lại đăng ký đề tài KLTN thành công",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllTerms,
  getCurrentTerm,
  getActiveTerm,
  getTermById,
  createTerm,
  updateTerm,
  activateTerm,
  closeTerm,
  deleteTerm,
  toggleThesisRegistrationLock,
};
