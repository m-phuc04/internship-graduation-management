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

    const adminAccounts = [
      {
        code: "ADMIN001",
        fullName: "Quản Trị Viên Hệ Thống",
        email: "admin@iuh.edu.vn",
        phone: "0909999999",
        role: "ADMIN",
        isActive: true,
      },
      {
        code: "ADMIN002",
        fullName: "Quản Trị Viên Hệ Thống 02",
        email: "admin002@iuh.edu.vn",
        phone: "0909999992",
        role: "ADMIN",
        isActive: true,
      },
      {
        code: "ADMIN003",
        fullName: "Quản Trị Viên Hệ Thống 03",
        email: "admin003@iuh.edu.vn",
        phone: "0909999993",
        role: "ADMIN",
        isActive: true,
      },
    ];

    for (const adm of adminAccounts) {
      let adminUser = await User.findOne({
        $or: [{ code: adm.code }, { email: adm.email }],
      });

      if (!adminUser) {
        adminUser = await User.create({
          code: adm.code,
          fullName: adm.fullName,
          email: adm.email,
          phone: adm.phone,
          password: passwordHash,
          role: "ADMIN",
          isActive: true,
        });
        console.log(`Created new ADMIN user: ${adm.code}`);
      } else {
        console.log(`ADMIN user ${adm.code} already exists, keeping existing info.`);
      }

      await Lecturer.deleteMany({
        $or: [{ userId: adminUser._id }, { lecturerCode: adm.code }, { lecturerCode: "99999999" }],
      });
      await Permission.deleteMany({ userId: adminUser._id });
    }

    console.log("\n============================================================");
    console.log("THÔNG TIN CÁC TÀI KHOẢN ADMIN:");
    console.log("------------------------------------------------------------");
    console.log("1. ADMIN001 (admin@iuh.edu.vn)     / Mật khẩu: 1111");
    console.log("2. ADMIN002 (admin002@iuh.edu.vn)  / Mật khẩu: 1111");
    console.log("3. ADMIN003 (admin003@iuh.edu.vn)  / Mật khẩu: 1111");
    console.log("============================================================\n");
  } catch (error) {
    console.error("Error creating ADMIN accounts:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
