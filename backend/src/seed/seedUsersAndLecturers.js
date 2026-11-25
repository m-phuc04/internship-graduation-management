import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDatabase from "../config/database.js";
import User from "../models/User.js";
import Lecturer from "../models/Lecturer.js";
import Permission from "../models/Permission.js";
import AcademicTerm from "../models/AcademicTerm.js";
import ResearchField from "../models/ResearchField.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

/**
 * Tạo mật khẩu quản trị viên ngẫu nhiên bảo mật cao nếu chưa có trong biến môi trường
 * Tối thiểu 18 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt
 */
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

const seedUsersAndLecturers = async () => {
  let createdAdminsCount = 0;
  let skippedAdminsCount = 0;
  let createdLecturersCount = 0;
  let skippedLecturersCount = 0;
  let errorsCount = 0;

  try {
    await connectDatabase();
    console.log("==========================================");
    console.log("🚀 KẾT NỐI MONGODB THÀNH CÔNG");
    console.log("==========================================\n");

    const DEFAULT_LECTURER_PASSWORD = "11111111";
    const lecturerPasswordHash = await bcrypt.hash(DEFAULT_LECTURER_PASSWORD, 12);

    // ==========================================
    // 0. SEED TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN001, ADMIN002, ADMIN003)
    // ==========================================
    console.log("=== 0. SEED TÀI KHOẢN ADMIN (ADMIN001, ADMIN002, ADMIN003) ===");
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

    let firstAdminDoc = null;

    for (const adm of adminAccounts) {
      let existingAdmin = await User.findOne({
        $or: [{ code: adm.code }, { email: adm.email }],
      });

      if (!existingAdmin) {
        const plainPassword = getAdminSeedPassword(adm.code);
        const adminPasswordHash = await bcrypt.hash(plainPassword, 12);
        existingAdmin = await User.create({
          fullName: adm.fullName,
          code: adm.code,
          email: adm.email,
          phone: adm.phone,
          password: adminPasswordHash,
          role: "ADMIN",
          isActive: true,
        });
        console.log(`✓ Tạo mới tài khoản ADMIN: ${adm.code} (${adm.email})`);
        createdAdminsCount++;
      } else {
        console.log(`- Tài khoản ADMIN ${adm.code} đã tồn tại, giữ nguyên thông tin.`);
        skippedAdminsCount++;
      }

      if (!firstAdminDoc) {
        firstAdminDoc = existingAdmin;
      }

      // Đảm bảo Admin không bị gán vào bảng Lecturer hay quyền chấm điểm
      await Lecturer.deleteMany({
        $or: [{ userId: existingAdmin._id }, { lecturerCode: adm.code }, { lecturerCode: "99999999" }],
      });
      await Permission.deleteMany({ userId: existingAdmin._id });
    }

    const adminUser = firstAdminDoc;

    // ==========================================
    // 1. SEED 12 LĨNH VỰC NGHIÊN CỨU DÙNG CHUNG (RESEARCH FIELDS)
    // ==========================================
    console.log("\n=== 1. SEED 12 LĨNH VỰC NGHIÊN CỨU HỆ THỐNG ===");
    const systemResearchFields = [
      "An toàn thông tin & Bảo mật",
      "Công nghệ phần mềm",
      "Hệ thống nhúng & IoT",
      "Học máy & Deep Learning",
      "Khoa học dữ liệu (Data Science)",
      "Mạng máy tính & Viễn thông",
      "Phát triển Web",
      "Phát triển Ứng dụng Di động",
      "Thị giác máy tính (Computer Vision)",
      "Trí tuệ nhân tạo (AI)",
      "Xử lý ngôn ngữ tự nhiên (NLP)",
      "Điện toán đám mây (Cloud Computing)",
    ];

    for (const fieldName of systemResearchFields) {
      await ResearchField.findOneAndUpdate(
        { name: fieldName },
        { $setOnInsert: { name: fieldName, isActive: true, createdBy: adminUser?._id } },
        { upsert: true }
      );
    }
    console.log(`✓ Đã đồng bộ đầy đủ ${systemResearchFields.length} Tag Lĩnh vực hệ thống.`);

    // ==========================================
    // 2. SEED HỌC KỲ HỆ THỐNG (NẾU CHƯA CÓ)
    // ==========================================
    console.log("\n=== 2. SEED HỌC KỲ HỆ THỐNG ===");

    // 2.1. Học kỳ trước (HK2-2025-2026): Đã kết thúc (CLOSED)
    let prevTerm = await AcademicTerm.findOne({ code: "HK2-2025-2026" });
    if (!prevTerm) {
      prevTerm = await AcademicTerm.create({
        name: "Học kỳ 2",
        academicYear: "2025-2026",
        code: "HK2-2025-2026",
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-06-30"),
        status: "CLOSED",
        description: "Học kỳ 2 năm học 2025-2026 (Kỳ trước - Đã đóng)",
        internship: {
          registrationStart: new Date("2026-01-15"),
          registrationEnd: new Date("2026-02-28"),
          reportStart: new Date("2026-03-01"),
          reportDeadline: new Date("2026-05-31"),
          reportCycle: 2,
        },
        thesis: {
          registrationStart: new Date("2026-01-15"),
          registrationEnd: new Date("2026-03-31"),
          assignmentStart: new Date("2026-03-01"),
          assignmentEnd: new Date("2026-04-15"),
          defenseStart: new Date("2026-05-15"),
          defenseEnd: new Date("2026-06-10"),
          isRegistrationLocked: true,
          lockedAt: new Date("2026-04-01"),
          lockedBy: adminUser?._id,
        },
        createdBy: adminUser?._id,
      });
      console.log("✓ Đã tạo Học kỳ trước: HK2-2025-2026 (CLOSED)");
    } else {
      console.log("- Đã xác nhận Học kỳ trước: HK2-2025-2026");
    }

    // 2.2. Học kỳ hiện tại (HK1-2026-2027): Đang hoạt động (ACTIVE)
    let currentTerm = await AcademicTerm.findOne({ code: "HK1-2026-2027" });
    if (!currentTerm) {
      currentTerm = await AcademicTerm.create({
        name: "Học kỳ 1",
        academicYear: "2026-2027",
        code: "HK1-2026-2027",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-01-15"),
        status: "ACTIVE",
        description: "Học kỳ 1 năm học 2026-2027 (Kỳ hiện tại)",
        internship: {
          registrationStart: new Date("2026-08-01"),
          registrationEnd: new Date("2026-08-31"),
          reportStart: new Date("2026-09-01"),
          reportDeadline: new Date("2026-12-31"),
          reportCycle: 2,
        },
        thesis: {
          registrationStart: new Date("2026-08-01"),
          registrationEnd: new Date("2026-10-31"),
          assignmentStart: new Date("2026-10-01"),
          assignmentEnd: new Date("2026-11-15"),
          defenseStart: new Date("2026-12-15"),
          defenseEnd: new Date("2027-01-10"),
          isRegistrationLocked: false,
        },
        createdBy: adminUser?._id,
      });
      console.log("✓ Đã tạo mới Học kỳ hiện tại: HK1-2026-2027 (ACTIVE)");
    } else {
      console.log("- Đã xác nhận Học kỳ hiện tại: HK1-2026-2027");
    }

    // ==========================================
    // 3. SEED GIẢNG VIÊN (12 TÀI KHOẢN GIẢNG VIÊN & TRƯỞNG BỘ MÔN)
    // ==========================================
    console.log("\n=== 3. SEED GIẢNG VIÊN (12 GIẢNG VIÊN & TRƯỞNG BỘ MÔN) ===");

    const sampleLecturers = [
      {
        userCode: "20240001",
        lecturerCode: "20240001",
        academicTitle: "TS.",
        fullName: "Tạ Duy Công Chiến",
        email: "gv0001@iuh.edu.vn",
        phone: "0908000001",
        specialization: "Quản trị Hệ thống & Trưởng bộ môn",
        fields: ["Công nghệ phần mềm", "Mạng máy tính & Viễn thông"],
        role: "TBM", // Trưởng bộ môn
      },
      {
        userCode: "20240002",
        lecturerCode: "20240002",
        academicTitle: "TS.",
        fullName: "Trần Thị Minh Khoa",
        email: "gv0002@iuh.edu.vn",
        phone: "0908000002",
        specialization: "Công nghệ Phần mềm & Kiến trúc Hệ thống",
        fields: ["Công nghệ phần mềm", "Trí tuệ nhân tạo (AI)"],
        role: "LECTURER",
      },
      {
        userCode: "20240003",
        lecturerCode: "20240003",
        academicTitle: "ThS.",
        fullName: "Hoàng Đình Hạnh",
        email: "gv0003@iuh.edu.vn",
        phone: "0908000003",
        specialization: "Lập trình Web & Ứng dụng Di động",
        fields: ["Phát triển Web", "Phát triển Ứng dụng Di động"],
        role: "LECTURER",
      },
      {
        userCode: "20240004",
        lecturerCode: "20240004",
        academicTitle: "TS.",
        fullName: "Lê Thị Thủy",
        email: "gv0004@iuh.edu.vn",
        phone: "0908000004",
        specialization: "Học máy & Khai phá Dữ liệu",
        fields: ["Khoa học dữ liệu (Data Science)", "Học máy & Deep Learning"],
        role: "LECTURER",
      },
      {
        userCode: "20240005",
        lecturerCode: "20240005",
        academicTitle: "ThS. NCS.",
        fullName: "Võ Công Minh",
        email: "gv0005@iuh.edu.vn",
        phone: "0908000005",
        specialization: "Hệ phân tán & Mạng máy tính",
        fields: ["Mạng máy tính & Viễn thông", "Hệ thống nhúng & IoT"],
        role: "LECTURER",
      },
      {
        userCode: "20240006",
        lecturerCode: "20240006",
        academicTitle: "ThS. NCS.",
        fullName: "Nguyễn Thành Thái",
        email: "gv0006@iuh.edu.vn",
        phone: "0908000006",
        specialization: "Trí tuệ nhân tạo & Thị giác Máy tính",
        fields: ["Trí tuệ nhân tạo (AI)", "Thị giác máy tính (Computer Vision)"],
        role: "LECTURER",
      },
      {
        userCode: "20240007",
        lecturerCode: "20240007",
        academicTitle: "ThS.",
        fullName: "Nguyễn Văn Quang",
        email: "gv0007@iuh.edu.vn",
        phone: "0908000007",
        specialization: "An toàn Thông tin & Mạng Máy tính",
        fields: ["An toàn thông tin & Bảo mật", "Mạng máy tính & Viễn thông"],
        role: "LECTURER",
      },
      {
        userCode: "20240008",
        lecturerCode: "20240008",
        academicTitle: "ThS.",
        fullName: "Nguyễn Xuân Lô",
        email: "gv0008@iuh.edu.vn",
        phone: "0908000008",
        specialization: "Cơ sở Dữ liệu & Hệ thống Thông tin",
        fields: ["Khoa học dữ liệu (Data Science)", "Công nghệ phần mềm"],
        role: "LECTURER",
      },
      {
        userCode: "20240009",
        lecturerCode: "20240009",
        academicTitle: "ThS.",
        fullName: "Phạm Thái Khanh",
        email: "gv0009@iuh.edu.vn",
        phone: "0908000009",
        specialization: "DevOps & Điện toán Đám mây",
        fields: ["Điện toán đám mây (Cloud Computing)", "Hệ thống nhúng & IoT"],
        role: "LECTURER",
      },
      {
        userCode: "20240010",
        lecturerCode: "20240010",
        academicTitle: "ThS.",
        fullName: "Trương Bá Phúc",
        email: "gv0010@iuh.edu.vn",
        phone: "0908000010",
        specialization: "Kiểm thử Phần mềm & Đảm bảo Chất lượng",
        fields: ["Công nghệ phần mềm"],
        role: "LECTURER",
      },
      {
        userCode: "20240011",
        lecturerCode: "20240011",
        academicTitle: "TS.",
        fullName: "Đặng Thanh Bình",
        email: "gv0011@iuh.edu.vn",
        phone: "0908000011",
        specialization: "Xử lý Ngôn ngữ Tự nhiên & AI",
        fields: ["Xử lý ngôn ngữ tự nhiên (NLP)", "Trí tuệ nhân tạo (AI)"],
        role: "LECTURER",
      },
      {
        userCode: "20240012",
        lecturerCode: "20240012",
        academicTitle: "ThS.",
        fullName: "Đỗ Hà Phương",
        email: "gv0012@iuh.edu.vn",
        phone: "0908000012",
        specialization: "Thiết kế Giao diện UI/UX & Web",
        fields: ["Phát triển Web", "Công nghệ phần mềm"],
        role: "LECTURER",
      },
    ];

    for (const lecData of sampleLecturers) {
      try {
        let existingUser = await User.findOne({
          $or: [
            { code: lecData.userCode },
            { code: lecData.lecturerCode },
            { email: lecData.email },
          ],
        });

        // Chỉ tạo mới nếu chưa tồn tại; không ghi đè mật khẩu hoặc thông tin tài khoản đã có
        if (!existingUser) {
          existingUser = await User.create({
            fullName: lecData.fullName,
            code: lecData.userCode,
            email: lecData.email,
            phone: lecData.phone,
            password: lecturerPasswordHash,
            role: lecData.role,
            isActive: true,
          });
          createdLecturersCount++;
          console.log(`✓ Tạo mới tài khoản: ${lecData.lecturerCode} - ${lecData.fullName} (${lecData.role})`);
        } else {
          skippedLecturersCount++;
          console.log(`- Tài khoản ${lecData.lecturerCode} (${existingUser.fullName}) đã tồn tại, giữ nguyên.`);
        }

        let existingLecturer = await Lecturer.findOne({
          $or: [
            { lecturerCode: lecData.lecturerCode },
            ...(existingUser ? [{ userId: existingUser._id }] : []),
          ],
        });

        if (!existingLecturer) {
          existingLecturer = await Lecturer.create({
            userId: existingUser._id,
            lecturerCode: lecData.lecturerCode,
            academicTitle: lecData.academicTitle,
            specialization: lecData.specialization,
            fields: lecData.fields || [],
            maxSupervisedStudents: 10,
            maxStudents: 10,
            isAvailable: true,
            isActive: true,
            permissions: ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
          });
        }

        // Đảm bảo 3 quyền hội đồng luôn tồn tại trong collection permissions (nếu chưa có)
        const defaultPerms = ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"];
        for (const p of defaultPerms) {
          await Permission.findOneAndUpdate(
            { userId: existingUser._id, permission: p },
            { $setOnInsert: { isActive: true } },
            { upsert: true }
          );
        }
      } catch (err) {
        console.error(`✗ Lỗi khi xử lý giảng viên ${lecData.lecturerCode}:`, err.message);
        errorsCount++;
      }
    }

    // ==========================================
    // 4. TỔNG KẾT
    // ==========================================
    console.log("\n==========================================");
    console.log("📊 KẾT QUẢ SEED DỮ LIỆU:");
    console.log("==========================================");
    console.log(`- Tài khoản Admin tạo mới: ${createdAdminsCount}`);
    console.log(`- Tài khoản Admin đã tồn tại (giữ nguyên): ${skippedAdminsCount}`);
    console.log(`- Tài khoản Giảng viên tạo mới: ${createdLecturersCount}`);
    console.log(`- Tài khoản Giảng viên đã tồn tại (giữ nguyên): ${skippedLecturersCount}`);
    console.log(`- Tag Lĩnh vực nghiên cứu: ${systemResearchFields.length}`);
    console.log(`- Tổng số lỗi: ${errorsCount}`);
    console.log("------------------------------------------");
    console.log("🔑 THÔNG TIN ĐĂNG NHẬP:");
    console.log("   - Quản trị viên (ADMIN001, ADMIN002, ADMIN003): Mật khẩu bảo mật được cấu hình an toàn qua biến môi trường (.env)");
    console.log("   - Giảng viên & Trưởng Bộ Môn (20240001 - 20240012): Mật khẩu 11111111");
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("CRITICAL SEED ERROR:", error);
    process.exit(1);
  }
};

seedUsersAndLecturers();
