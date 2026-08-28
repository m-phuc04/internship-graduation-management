import studentService from "../services/studentService.js";

const getAllStudents = async (req, res, next) => {
  try {
    const result = await studentService.getAllStudents(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách sinh viên thành công",
      data: result.students,
      availableClasses: result.availableClasses,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy chi tiết sinh viên thành công",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo sinh viên mới thành công",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin sinh viên thành công",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const result = await studentService.deleteStudent(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const toggleStudentActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const student = await studentService.toggleStudentActive(req.params.id, isActive);
    res.status(200).json({
      success: true,
      message: isActive ? "Kích hoạt sinh viên thành công" : "Vô hiệu hóa sinh viên thành công",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const resetStudentPassword = async (req, res, next) => {
  try {
    const result = await studentService.resetStudentPassword(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        studentCode: result.studentCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleStudentActive,
  resetStudentPassword,
};
