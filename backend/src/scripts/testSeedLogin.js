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
    const LECTURER_PASSWORD = "11111111";

    const adminPasswords = {
      ADMIN001: process.env.ADMIN001_PASSWORD || process.env.ADMIN_PASSWORD,
      ADMIN002: process.env.ADMIN002_PASSWORD,
      ADMIN003: process.env.ADMIN003_PASSWORD,
    };

    // 1. Kiểm tra 3 tài khoản Admin: ADMIN001, ADMIN002, ADMIN003
    console.log("1. Kiểm tra 3 tài khoản Quản trị viên (ADMIN):");
    const adminCodes = ["ADMIN001", "ADMIN002", "ADMIN003"];
    const verifiedHashes = new Set();
    const verifiedPasswords = new Set();

    for (const code of adminCodes) {
      const admin = await User.findOne({ code, role: "ADMIN" });
      if (!admin) {
        throw new Error(`Không tìm thấy tài khoản Admin ${code}!`);
      }

      const rawPassword = adminPasswords[code];
      if (!rawPassword || rawPassword.length < 16) {
        throw new Error(`Mật khẩu trong .env cho ${code} phải có tối thiểu 16 ký tự!`);
      }

      // Kiểm tra độ mạnh: hoa, thường, số, ký tự đặc biệt
      const hasUpper = /[A-Z]/.test(rawPassword);
      const hasLower = /[a-z]/.test(rawPassword);
      const hasDigit = /[0-9]/.test(rawPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(rawPassword);

      if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
        throw new Error(`Mật khẩu của ${code} phải kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt!`);
      }

      // Kiểm tra mật khẩu riêng biệt
      if (verifiedPasswords.has(rawPassword)) {
        throw new Error(`Phát hiện mật khẩu trùng lặp giữa các tài khoản Admin! Mật khẩu phải riêng biệt.`);
      }
      verifiedPasswords.add(rawPassword);

      // Kiểm tra lưu dưới dạng bcrypt hash trong DB
      const isBcryptHash = typeof admin.password === "string" && admin.password.startsWith("$2");
      if (!isBcryptHash) {
        throw new Error(`Mật khẩu của ${code} trong DB không phải dạng hash bcrypt!`);
      }

      if (verifiedHashes.has(admin.password)) {
        throw new Error(`Phát hiện bcrypt hash trùng lặp giữa các tài khoản Admin!`);
      }
      verifiedHashes.add(admin.password);

      const isPasswordValid = await bcrypt.compare(rawPassword, admin.password);
      const isWrongPasswordRejected = !(await bcrypt.compare("SaiMatKhauAdmin@123", admin.password));

      console.log(`  ✓ ${admin.code}: ${admin.fullName} (${admin.email})`);
      console.log(`    - Role: ${admin.role} | isActive: ${admin.isActive}`);
      console.log(`    - Lưu hash bcrypt: ${isBcryptHash ? "ĐẠT CHUẨN BẢO MẬT" : "KHÔNG ĐẠT"}`);
      console.log(`    - Độ dài >= 16 và đa dạng ký tự: ĐẠT (${rawPassword.length} ký tự)`);
      console.log(`    - Xác thực đăng nhập mật khẩu .env: ${isPasswordValid ? "THÀNH CÔNG" : "THẤT BẠI"}`);
      console.log(`    - Chặn mật khẩu sai: ${isWrongPasswordRejected ? "CHÍNH XÁC" : "THẤT BẠI"}`);

      if (!isPasswordValid || !isWrongPasswordRejected) {
        throw new Error(`Xác thực đăng nhập tài khoản ${code} không hợp lệ!`);
      }

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
