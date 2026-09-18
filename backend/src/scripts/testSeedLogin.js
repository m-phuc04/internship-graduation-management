import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import authService from "../services/authService.js";

dotenv.config();

const testLogin = async () => {
  console.log("==========================================");
  console.log("🔍 KIỂM TRA ĐĂNG NHẬP VÀ DỮ LIỆU TÀI KHOẢN MẪU");
  console.log("==========================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship_management";
  await mongoose.connect(mongoUri);

  try {
    const TEST_PASSWORD = "11111111";

    // 1. Check Sinh viên 22635271
    console.log("1. Kiểm tra tài khoản Sinh viên: 22635271");
    const stDoc = await Student.findOne({ studentCode: "22635271" }).populate("userId");
    if (!stDoc || !stDoc.userId) {
      throw new Error("Không tìm thấy Student 22635271 hoặc thiếu User linked!");
    }
    const isStPasswordValid = await bcrypt.compare(TEST_PASSWORD, stDoc.userId.password);
    console.log(`  ✓ Sinh viên tồn tại: ${stDoc.userId.fullName}`);
    console.log(`  ✓ Lớp: ${stDoc.className}`);
    console.log(`  ✓ Role: ${stDoc.userId.role}`);
    console.log(`  ✓ Trạng thái isActive: ${stDoc.userId.isActive}`);
    console.log(`  ✓ Khớp mật khẩu 11111111: ${isStPasswordValid ? "ĐÚNG (HỢP LỆ)" : "SAI"}`);

    if (!isStPasswordValid) throw new Error("Mật khẩu sinh viên không đúng hash 11111111");

    // 2. Check Trưởng Bộ Môn GV0001
    console.log("\n2. Kiểm tra tài khoản Trưởng Bộ Môn: GV0001");
    const tbmDoc = await Lecturer.findOne({ lecturerCode: "GV0001" }).populate("userId");
    if (!tbmDoc || !tbmDoc.userId) {
      throw new Error("Không tìm thấy Lecturer GV0001 hoặc thiếu User linked!");
    }
    const isTbmPasswordValid = await bcrypt.compare(TEST_PASSWORD, tbmDoc.userId.password);
    console.log(`  ✓ TBM tồn tại: ${tbmDoc.userId.fullName}`);
    console.log(`  ✓ Học hàm/Học vị: ${tbmDoc.academicTitle}`);
    console.log(`  ✓ Role: ${tbmDoc.userId.role}`);
    console.log(`  ✓ Trạng thái isActive: ${tbmDoc.userId.isActive}`);
    console.log(`  ✓ Khớp mật khẩu 11111111: ${isTbmPasswordValid ? "ĐÚNG (HỢP LỆ)" : "SAI"}`);

    if (!isTbmPasswordValid) throw new Error("Mật khẩu TBM không đúng hash 11111111");

    // 3. Check Giảng viên GV0002
    console.log("\n3. Kiểm tra tài khoản Giảng viên: GV0002");
    const gvDoc = await Lecturer.findOne({ lecturerCode: "GV0002" }).populate("userId");
    if (!gvDoc || !gvDoc.userId) {
      throw new Error("Không tìm thấy Lecturer GV0002 hoặc thiếu User linked!");
    }
    const isGvPasswordValid = await bcrypt.compare(TEST_PASSWORD, gvDoc.userId.password);
    console.log(`  ✓ Giảng viên tồn tại: ${gvDoc.userId.fullName}`);
    console.log(`  ✓ Học hàm/Học vị: ${gvDoc.academicTitle}`);
    console.log(`  ✓ Chuyên môn: ${gvDoc.specialization}`);
    console.log(`  ✓ Role: ${gvDoc.userId.role}`);
    console.log(`  ✓ Trạng thái isActive: ${gvDoc.userId.isActive}`);
    console.log(`  ✓ Khớp mật khẩu 11111111: ${isGvPasswordValid ? "ĐÚNG (HỢP LỆ)" : "SAI"}`);

    if (!isGvPasswordValid) throw new Error("Mật khẩu Giảng viên không đúng hash 11111111");

    // 4. Verify all 6 students exist
    console.log("\n4. Kiểm tra danh sách 6 sinh viên:");
    const expectedStudents = ["22635271", "22635201", "22635202", "22635203", "22635204", "22635205"];
    for (const code of expectedStudents) {
      const s = await Student.findOne({ studentCode: code }).populate("userId");
      if (!s || !s.userId) throw new Error(`Thiếu sinh viên ${code}`);
      console.log(`  ✓ ${code} - ${s.userId.fullName} (${s.className})`);
    }

    // 5. Verify all 12 lecturers exist
    console.log("\n5. Kiểm tra danh sách 12 giảng viên:");
    const expectedLecs = [
      "GV0001", "GV0002", "GV0003", "GV0004", "GV0005", "GV0006",
      "GV0007", "GV0008", "GV0009", "GV0010", "GV0011", "GV0012"
    ];
    for (const code of expectedLecs) {
      const l = await Lecturer.findOne({ lecturerCode: code }).populate("userId");
      if (!l || !l.userId) throw new Error(`Thiếu giảng viên ${code}`);
      console.log(`  ✓ ${code} - ${l.userId.fullName} (${l.userId.role})`);
    }

    console.log("\n==========================================");
    console.log("🎉 TẤT CẢ TÀI KHOẢN VÀ MẬT KHẨU HỢP LỆ 100%!");
    console.log("==========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("✗ Lỗi kiểm tra:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

testLogin();
