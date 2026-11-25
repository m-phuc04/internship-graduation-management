import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lecturer from "../models/Lecturer.js";
import Permission from "../models/Permission.js";

dotenv.config();

const generateSecureAdminPassword = (length = 18) => {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%^&*()_+~|}{[]:;?><";
  const all = uppers + lowers + digits + specials;

  const pwd = [
    uppers[crypto.randomInt(0, uppers.length)],
    lowers[crypto.randomInt(0, lowers.length)],
    digits[crypto.randomInt(0, digits.length)],
    specials[crypto.randomInt(0, specials.length)],
  ];

  while (pwd.length < length) {
    pwd.push(all[crypto.randomInt(0, all.length)]);
  }

  for (let i = pwd.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join("");
};

const getAdminSeedPassword = (code) => {
  const envKey = `${code.toUpperCase()}_PASSWORD`;
  const envVal = process.env[envKey] || (code === "ADMIN001" ? process.env.ADMIN_PASSWORD : null);
  if (envVal && envVal.trim().length >= 16) {
    return envVal.trim();
  }
  return generateSecureAdminPassword(18);
};

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

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
        const plainPassword = getAdminSeedPassword(adm.code);
        const passwordHash = await bcrypt.hash(plainPassword, 12);
        adminUser = await User.create({
          code: adm.code,
          fullName: adm.fullName,
          email: adm.email,
          phone: adm.phone,
          password: passwordHash,
          role: "ADMIN",
          isActive: true,
        });
        console.log(`Created new ADMIN user: ${adm.code} (${adm.email})`);
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
    console.log("1. ADMIN001 (admin@iuh.edu.vn)");
    console.log("2. ADMIN002 (admin002@iuh.edu.vn)");
    console.log("3. ADMIN003 (admin003@iuh.edu.vn)");
    console.log("* Mật khẩu được quản lý an toàn qua biến môi trường (.env)");
    console.log("============================================================\n");
  } catch (error) {
    console.error("Error creating ADMIN accounts:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
