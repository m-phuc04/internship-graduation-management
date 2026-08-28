import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lecturer from "../models/Lecturer.js";
import Permission from "../models/Permission.js";

dotenv.config();

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const passwordHash = await bcrypt.hash("1111", 12);

    // 1. Create or update main ADMIN account (ADMIN001)
    let adminUser = await User.findOne({
      $or: [{ code: "ADMIN001" }, { email: "admin@iuh.edu.vn" }],
    });

    if (!adminUser) {
      adminUser = await User.create({
        code: "ADMIN001",
        fullName: "Quản Trị Viên Hệ Thống",
        email: "admin@iuh.edu.vn",
        password: passwordHash,
        role: "ADMIN",
        isActive: true,
      });
      console.log("Created new ADMIN user: ADMIN001");
    } else {
      adminUser.code = "ADMIN001";
      adminUser.fullName = "Quản Trị Viên Hệ Thống";
      adminUser.email = "admin@iuh.edu.vn";
      adminUser.password = passwordHash;
      adminUser.role = "ADMIN";
      adminUser.isActive = true;
      await adminUser.save();
      console.log("Updated existing ADMIN user: ADMIN001");
    }

    // 2. Ensure ADMIN is NOT in Lecturer collection (Admin is pure System Administrator)
    await Lecturer.deleteMany({
      $or: [{ userId: adminUser._id }, { lecturerCode: "99999999" }],
    });
    console.log("Verified ADMIN is not in Lecturer collection.");

    // 3. Clean up any lecturer-specific permissions for ADMIN
    await Permission.deleteMany({ userId: adminUser._id });
    console.log("Cleaned up any lecturer permissions for ADMIN001.");

    console.log("\n============================================================");
    console.log("THÔNG TIN TÀI KHOẢN ADMIN ĐÃ SẴN SÀNG:");
    console.log("------------------------------------------------------------");
    console.log("1. Mã tài khoản: ADMIN001 (hoặc email: admin@iuh.edu.vn)");
    console.log("2. Mật khẩu:     1111");
    console.log("3. Họ và tên:    Quản Trị Viên Hệ Thống");
    console.log("4. Role:         ADMIN");
    console.log("============================================================\n");
  } catch (error) {
    console.error("Error creating ADMIN account:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
