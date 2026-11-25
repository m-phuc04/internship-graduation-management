import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lecturer from "../models/Lecturer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const testLogin = async () => {
  console.log("==========================================");
  console.log("🔍 KIỂM TRA ĐĂNG NHẬP VÀ XÁC THỰC ROLE SEED DATA");
  console.log("==========================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management";
  await mongoose.connect(mongoUri);

  try {
    const ADMIN_PASSWORD = "1111";
    const LECTURER_PASSWORD = "11111111";

    // 1. Kiểm tra 3 tài khoản Admin: ADMIN001, ADMIN002, ADMIN003
    console.log("1. Kiểm tra 3 tài khoản Quản trị viên (ADMIN):");
    const adminCodes = ["ADMIN001", "ADMIN002", "ADMIN003"];
    for (const code of adminCodes) {
      const admin = await User.findOne({ code, role: "ADMIN" });
      if (!admin) {
        throw new Error(`Không tìm thấy tài khoản Admin ${code}!`);
      }
      const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
      console.log(`  ✓ ${admin.code}: ${admin.fullName} (${admin.email})`);
      console.log(`    - Role: ${admin.role} | isActive: ${admin.isActive}`);
      console.log(`    - Khớp mật khẩu 1111: ${isPasswordValid ? "HỢP LỆ" : "SAI MẬT KHẨU"}`);
      if (!isPasswordValid) throw new Error(`Mật khẩu tài khoản ${code} không đúng!`);

      // Kiểm tra đảm bảo Admin không nằm trong bảng Lecturer
      const inLec = await Lecturer.findOne({ userId: admin._id });
      if (inLec) throw new Error(`Admin ${code} không được liên kết với bảng Lecturer!`);
    }

    // 2. Kiểm tra tài khoản Trưởng Bộ Môn 20240001
    console.log("\n2. Kiểm tra tài khoản Trưởng Bộ Môn (TBM):");
    const tbmDoc = await Lecturer.findOne({ lecturerCode: "20240001" }).populate("userId");
    if (!tbmDoc || !tbmDoc.userId) {
      throw new Error("Không tìm thấy Lecturer 20240001 hoặc thiếu User linked!");
    }
    const isTbmPasswordValid = await bcrypt.compare(LECTURER_PASSWORD, tbmDoc.userId.password);
    console.log(`  ✓ TBM: ${tbmDoc.userId.fullName} (${tbmDoc.userId.email})`);
    console.log(`    - Học vị: ${tbmDoc.academicTitle} | Role: ${tbmDoc.userId.role}`);
    console.log(`    - Khớp mật khẩu 11111111: ${isTbmPasswordValid ? "HỢP LỆ" : "SAI MẬT KHẨU"}`);
    if (!isTbmPasswordValid) throw new Error("Mật khẩu TBM không đúng!");
    if (tbmDoc.userId.role !== "TBM") throw new Error("Role của 20240001 phải là TBM!");

    // 3. Kiểm tra danh sách đầy đủ 12 giảng viên
    console.log("\n3. Kiểm tra danh sách 12 giảng viên:");
    const expectedLecs = [
      "20240001", "20240002", "20240003", "20240004", "20240005", "20240006",
      "20240007", "20240008", "20240009", "20240010", "20240011", "20240012"
    ];
    for (const code of expectedLecs) {
      const l = await Lecturer.findOne({ lecturerCode: code }).populate("userId");
      if (!l || !l.userId) throw new Error(`Thiếu giảng viên ${code}!`);
      const isMatch = await bcrypt.compare(LECTURER_PASSWORD, l.userId.password);
      if (!isMatch) throw new Error(`Mật khẩu giảng viên ${code} không hợp lệ!`);
      console.log(`  ✓ ${code} - ${l.academicTitle} ${l.userId.fullName} [Role: ${l.userId.role}]`);
    }

    console.log("\n==========================================");
    console.log("🎉 TẤT CẢ TÀI KHOẢN ADMIN VÀ GIẢNG VIÊN ĐĂNG NHẬP THÀNH CÔNG VÀ CHUẨN XÁC!");
    console.log("==========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("✗ Lỗi kiểm tra:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

testLogin();
