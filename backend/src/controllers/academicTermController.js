import academicTermService from "../services/academicTermService.js";

// ====================
// 1. Get All Academic Terms
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
// 2. Get Active Academic Term
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
// 2b. Get Current Academic Term (by Date)
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
// 3. Get Term Details by ID
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
// 4. Create Academic Term
// ====================
const createTerm = async (req, res, next) => {
  try {
    const newTerm = await academicTermService.createTerm(
      req.body,
      req.user?.userId,
    );

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
// 5. Update Academic Term
// ====================
const updateTerm = async (req, res, next) => {
  try {
    const updated = await academicTermService.updateTerm(
      req.params.id,
      req.body,
    );

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
// 6. Activate Academic Term
// ====================
const activateTerm = async (req, res, next) => {
  try {
    const activated = await academicTermService.activateTerm(req.params.id);

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
// 7. Close Academic Term
// ====================
const closeTerm = async (req, res, next) => {
  try {
    const closed = await academicTermService.closeTerm(req.params.id);

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
// 8. Delete Academic Term
// ====================
const deleteTerm = async (req, res, next) => {
  try {
    const result = await academicTermService.deleteTerm(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
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
};
