import bcrypt from "bcryptjs";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Internship from "../models/Internship.js";
import Thesis from "../models/Thesis.js";
import AppError from "../utils/AppError.js";

// ====================
// Lấy danh sách sinh viên kèm tìm kiếm, lọc và phân trang
// ====================
const getAllStudents = async ({
  page = 1,
  limit = 10,
  search = "",
  className = "",
  prerequisiteCompleted,
  internshipRegistered,
  thesisRegistered,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  // Xây dựng câu truy vấn lọc sinh viên
  const studentQuery = {};

  if (className) {
    studentQuery.className = className.trim();
  }

  if (prerequisiteCompleted !== undefined && prerequisiteCompleted !== "") {
    studentQuery.prerequisiteCompleted = prerequisiteCompleted === "true" || prerequisiteCompleted === true;
  }

  if (internshipRegistered !== undefined && internshipRegistered !== "") {
    studentQuery.internshipRegistered = internshipRegistered === "true" || internshipRegistered === true;
  }

  if (thesisRegistered !== undefined && thesisRegistered !== "") {
    studentQuery.thesisRegistered = thesisRegistered === "true" || thesisRegistered === true;
  }

  // Tìm kiếm theo MSSV, Lớp hoặc Người dùng (họ tên, email)
  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");

    // Tìm các tài khoản người dùng khớp trước
    const matchedUsers = await User.find({
      role: "STUDENT",
      $or: [{ fullName: searchRegex }, { email: searchRegex }],
    }).select("_id");

    const matchedUserIds = matchedUsers.map((u) => u._id);

    studentQuery.$or = [
      { studentCode: searchRegex },
      { className: searchRegex },
      { userId: { $in: matchedUserIds } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(studentQuery)
      .populate({
        path: "userId",
        select: "fullName email phone isActive createdAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Student.countDocuments(studentQuery),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  // Lấy danh sách các lớp để hiển thị trong bộ lọc
  const availableClasses = await Student.distinct("className");

  return {
    students,
    availableClasses,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

// ====================
// Lấy thông tin sinh viên theo ID
// ====================
const getStudentById = async (id) => {
  const student = await Student.findById(id).populate({
    path: "userId",
    select: "fullName email phone isActive createdAt updatedAt",
  });

  if (!student) {
    throw new AppError("Không tìm thấy sinh viên", 404);
  }

  // Lấy tóm tắt hồ sơ thực tập và khóa luận đang hoạt động nếu có
  const [internship, thesis] = await Promise.all([
    Internship.findOne({ studentId: student._id })
      .populate("companyId", "name code")
      .populate("lecturerId", "lecturerCode")
      .lean(),
    Thesis.findOne({ studentId: student._id })
      .populate("supervisorId", "lecturerCode")
      .lean(),
  ]);

  return {
    ...student.toObject(),
    internshipDetails: internship || null,
    thesisDetails: thesis || null,
  };
};

// ====================
// Tạo sinh viên và tài khoản User
// ====================
const createStudent = async ({
  fullName,
  email,
  password = "1111",
  phone,
  studentCode,
  className,
  gpa = 0,
  accumulatedCredits = 0,
  prerequisiteCompleted = false,
}) => {
  if (!fullName || !email || !studentCode || !className) {
    throw new AppError("Vui lòng điền đầy đủ thông tin bắt buộc (Họ tên, Email, MSSV, Lớp)", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = studentCode.trim();

  // Kiểm tra tính duy nhất của email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("Email này đã được sử dụng trong hệ thống", 409);
  }

  // Kiểm tra tính duy nhất của mã sinh viên
  const existingStudent = await Student.findOne({ studentCode: normalizedCode });
  if (existingStudent) {
    throw new AppError("Mã sinh viên (MSSV) này đã tồn tại", 409);
  }

  // Băm mật khẩu (Hash password)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Tạo tài khoản người dùng User
  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone ? phone.trim() : null,
    role: "STUDENT",
    isActive: true,
  });

  // Tạo hồ sơ sinh viên
  try {
    const student = await Student.create({
      userId: user._id,
      studentCode: normalizedCode,
      className: className.trim(),
      gpa: Number(gpa) || 0,
      accumulatedCredits: Number(accumulatedCredits) || 0,
      prerequisiteCompleted: Boolean(prerequisiteCompleted),
      internshipRegistered: false,
      thesisRegistered: false,
    });

    const populatedStudent = await Student.findById(student._id).populate({
      path: "userId",
      select: "fullName email phone isActive",
    });

    return populatedStudent;
  } catch (error) {
    // Hoàn tác tạo User nếu tạo hồ sơ sinh viên thất bại
    await User.findByIdAndDelete(user._id);
    throw error;
  }
};

// ====================
// Cập nhật thông tin Sinh viên & Tài khoản User
// ====================
const updateStudent = async (id, updateData) => {
  const student = await Student.findById(id);
  if (!student) {
    throw new AppError("Không tìm thấy sinh viên", 404);
  }

  const user = await User.findById(student.userId);
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản liên kết của sinh viên", 404);
  }

  const {
    fullName,
    email,
    phone,
    studentCode,
    className,
    gpa,
    accumulatedCredits,
    prerequisiteCompleted,
    internshipRegistered,
    thesisRegistered,
    isActive,
  } = updateData;

  // Kiểm tra email nếu có thay đổi
  if (email && email.trim().toLowerCase() !== user.email) {
    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: user._id },
    });
    if (existingUser) {
      throw new AppError("Email này đã được sử dụng bởi tài khoản khác", 409);
    }
    user.email = email.trim().toLowerCase();
  }

  // Kiểm tra mã sinh viên nếu có thay đổi
  if (studentCode && studentCode.trim() !== student.studentCode) {
    const existingStudent = await Student.findOne({
      studentCode: studentCode.trim(),
      _id: { $ne: student._id },
    });
    if (existingStudent) {
      throw new AppError("Mã sinh viên (MSSV) này đã được sử dụng", 409);
    }
    student.studentCode = studentCode.trim();
  }

  // Cập nhật các trường thông tin User
  // Cập nhật các trường thông tin User
  if (fullName !== undefined) user.fullName = fullName.trim();
  if (phone !== undefined) user.phone = phone ? phone.trim() : null;
  if (isActive !== undefined) {
    user.isActive = Boolean(isActive);
    student.isActive = Boolean(isActive);
  }
  await user.save();

  // Cập nhật các trường thông tin Sinh viên
  if (className !== undefined) student.className = className.trim();
  if (gpa !== undefined) student.gpa = Math.min(4, Math.max(0, Number(gpa)));
  if (accumulatedCredits !== undefined) student.accumulatedCredits = Math.max(0, Number(accumulatedCredits));
  if (prerequisiteCompleted !== undefined) student.prerequisiteCompleted = Boolean(prerequisiteCompleted);
  if (internshipRegistered !== undefined) student.internshipRegistered = Boolean(internshipRegistered);
  if (thesisRegistered !== undefined) student.thesisRegistered = Boolean(thesisRegistered);

  await student.save();

  return await Student.findById(student._id).populate({
    path: "userId",
    select: "fullName email phone isActive",
  });
};

// ====================
// Khóa tài khoản sinh viên (Xóa mềm, không xóa vật lý)
// ====================
const deleteStudent = async (id) => {
  const student = await Student.findById(id);
  if (!student) {
    throw new AppError("Không tìm thấy sinh viên", 404);
  }

  const user = await User.findById(student.userId);
  if (user) {
    user.isActive = false;
    await user.save();
  }

  student.isActive = false;
  await student.save();

  return { message: "Vô hiệu hóa sinh viên thành công" };
};

// ====================
// Bật/tắt trạng thái hoạt động của sinh viên
// ====================
const toggleStudentActive = async (id, isActive) => {
  const student = await Student.findById(id);
  if (!student) {
    throw new AppError("Không tìm thấy sinh viên", 404);
  }

  const user = await User.findById(student.userId);
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản liên kết của sinh viên", 404);
  }

  const activeState = Boolean(isActive);
  student.isActive = activeState;
  user.isActive = activeState;

  await Promise.all([student.save(), user.save()]);

  return await Student.findById(student._id).populate({
    path: "userId",
    select: "fullName email phone isActive",
  });
};

// ====================
// Đặt lại mật khẩu sinh viên về mặc định 1111 (Đã băm)
// ====================
const resetStudentPassword = async (id) => {
  const student = await Student.findById(id);
  if (!student) {
    throw new AppError("Không tìm thấy sinh viên", 404);
  }

  const user = await User.findById(student.userId);
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản liên kết của sinh viên", 404);
  }

  // Băm mật khẩu mặc định 1111
  const hashedPassword = await bcrypt.hash("1111", 12);
  user.password = hashedPassword;
  await user.save();

  return {
    message: `Đặt lại mật khẩu cho sinh viên ${user.fullName} (${student.studentCode}) thành công`,
    studentCode: student.studentCode,
  };
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
