import councilService from "../services/councilService.js";

// ====================
// Get Councils
// ====================
const getCouncils = async (req, res, next) => {
  try {
    const { academicTermId, search } = req.query;
    const councils = await councilService.getCouncils({
      academicTermId,
      search,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách phòng hội đồng thành công",
      data: councils,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Council by ID
// ====================
const getCouncilById = async (req, res, next) => {
  try {
    const council = await councilService.getCouncilById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết phòng hội đồng thành công",
      data: council,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Create Council
// ====================
const createCouncil = async (req, res, next) => {
  try {
    const council = await councilService.createCouncil(
      req.body,
      req.user?.userId
    );

    res.status(201).json({
      success: true,
      message: "Tạo phòng hội đồng mới thành công",
      data: council,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Update Council
// ====================
const updateCouncil = async (req, res, next) => {
  try {
    const council = await councilService.updateCouncil(
      req.params.id,
      req.body,
      req.user?.userId
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật phòng hội đồng thành công",
      data: council,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Delete Council
// ====================
const deleteCouncil = async (req, res, next) => {
  try {
    const result = await councilService.deleteCouncil(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Assign Council to Thesis
// ====================
const assignCouncilToThesis = async (req, res, next) => {
  try {
    const { thesisId, councilId } = req.body;
    const thesis = await councilService.assignCouncilToThesis({
      thesisId,
      councilId,
    });

    res.status(200).json({
      success: true,
      message: councilId
        ? "Phân công đề tài vào phòng hội đồng thành công"
        : "Đã hủy phân công đề tài khỏi phòng hội đồng",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Clear All Councils
// ====================
const clearAllCouncils = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const result = await councilService.clearAllCouncils({
      academicTermId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCouncils,
  getCouncilById,
  createCouncil,
  updateCouncil,
  deleteCouncil,
  assignCouncilToThesis,
  clearAllCouncils,
};
