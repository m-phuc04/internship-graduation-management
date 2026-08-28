import lecturerService from "../services/lecturerService.js";

const getAllLecturers = async (req, res, next) => {
  try {
    const result = await lecturerService.getAllLecturers(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách giảng viên thành công",
      data: result.lecturers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getLecturerById = async (req, res, next) => {
  try {
    const lecturer = await lecturerService.getLecturerById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy chi tiết giảng viên thành công",
      data: lecturer,
    });
  } catch (error) {
    next(error);
  }
};

const createLecturer = async (req, res, next) => {
  try {
    const lecturer = await lecturerService.createLecturer(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo giảng viên mới thành công",
      data: lecturer,
    });
  } catch (error) {
    next(error);
  }
};

const updateLecturer = async (req, res, next) => {
  try {
    const lecturer = await lecturerService.updateLecturer(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin giảng viên thành công",
      data: lecturer,
    });
  } catch (error) {
    next(error);
  }
};

const toggleLecturerActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const lecturer = await lecturerService.toggleLecturerActive(req.params.id, isActive);
    res.status(200).json({
      success: true,
      message: isActive ? "Kích hoạt giảng viên thành công" : "Vô hiệu hóa giảng viên thành công",
      data: lecturer,
    });
  } catch (error) {
    next(error);
  }
};

const deleteLecturer = async (req, res, next) => {
  try {
    const result = await lecturerService.deleteLecturer(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const updateMaxSupervisedStudents = async (req, res, next) => {
  try {
    const { maxSupervisedStudents, maxStudents } = req.body;
    const newLimit = maxSupervisedStudents !== undefined ? maxSupervisedStudents : maxStudents;
    const lecturerId = req.params.id;
    const result = await lecturerService.updateMaxSupervisedStudents(
      lecturerId,
      newLimit,
      req.user,
    );
    res.status(200).json({
      success: true,
      message: "Cập nhật số lượng sinh viên hướng dẫn tối đa thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllLecturers,
  getLecturerById,
  createLecturer,
  updateLecturer,
  updateMaxSupervisedStudents,
  toggleLecturerActive,
  deleteLecturer,
};
