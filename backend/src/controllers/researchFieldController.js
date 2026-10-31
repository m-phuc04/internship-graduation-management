import researchFieldService from "../services/researchFieldService.js";

const getUserId = (req) => req.user?.userId || req.user?._id;

const getAllFields = async (req, res, next) => {
  try {
    const fields = await researchFieldService.getAllFields();
    res.status(200).json({
      success: true,
      message: "Lấy danh sách lĩnh vực thành công",
      data: fields,
    });
  } catch (error) {
    next(error);
  }
};

const createField = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const field = await researchFieldService.createField({
      name,
      description,
      userId: getUserId(req),
    });
    res.status(201).json({
      success: true,
      message: "Thêm lĩnh vực thành công",
      data: field,
    });
  } catch (error) {
    next(error);
  }
};

const deleteField = async (req, res, next) => {
  try {
    const result = await researchFieldService.deleteField(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message || "Xóa lĩnh vực thành công",
    });
  } catch (error) {
    next(error);
  }
};

const getLecturersWithFields = async (req, res, next) => {
  try {
    const lecturers = await researchFieldService.getLecturersWithFields();
    res.status(200).json({
      success: true,
      message: "Lấy danh sách giảng viên thành công",
      data: lecturers,
    });
  } catch (error) {
    next(error);
  }
};

const assignFields = async (req, res, next) => {
  try {
    const { lecturerIds, fields } = req.body;
    const result = await researchFieldService.assignFieldsToLecturers({
      lecturerIds,
      fields,
      updatedByUserId: getUserId(req),
    });
    res.status(200).json({
      success: true,
      message: "Cập nhật lĩnh vực giảng viên thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMyRequest = async (req, res, next) => {
  try {
    const result = await researchFieldService.getMyPendingRequest(getUserId(req));
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createRequest = async (req, res, next) => {
  try {
    const { requestedFields, proposedNewTags } = req.body;
    const result = await researchFieldService.createFieldChangeRequest({
      userId: getUserId(req),
      requestedFields,
      proposedNewTags,
    });
    res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu thay đổi lĩnh vực tới Trưởng bộ môn",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllRequests = async (req, res, next) => {
  try {
    const requests = await researchFieldService.getAllRequests();
    res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu thay đổi lĩnh vực thành công",
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

const approveRequest = async (req, res, next) => {
  try {
    const result = await researchFieldService.approveRequest(req.params.id, getUserId(req));
    res.status(200).json({
      success: true,
      message: result.message || "Duyệt yêu cầu thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const result = await researchFieldService.rejectRequest(req.params.id, getUserId(req));
    res.status(200).json({
      success: true,
      message: result.message || "Từ chối yêu cầu thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllFields,
  createField,
  deleteField,
  getLecturersWithFields,
  assignFields,
  getMyRequest,
  createRequest,
  getAllRequests,
  approveRequest,
  rejectRequest,
};
