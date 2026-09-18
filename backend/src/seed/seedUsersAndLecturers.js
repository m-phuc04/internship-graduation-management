import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDatabase from "../config/database.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Permission from "../models/Permission.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const seedUsersAndLecturers = async () => {
  let createdStudentsCount = 0;
  let createdLecturersCount = 0;
  let skippedStudentsCount = 0;
  let skippedLecturersCount = 0;
  let errorsCount = 0;

  try {
    await connectDatabase();
    console.log("==========================================");
    console.log("🚀 KẾT NỐI MONGODB THÀNH CÔNG");
    console.log("==========================================\n");

    const DEFAULT_PASSWORD = "11111111";
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // ==========================================
    // I. SEED SINH VIÊN MẪU
    // ==========================================
    console.log("=== SEED SINH VIÊN ===");

    const sampleStudents = [
      {
        studentCode: "22635271",
        fullName: "Nguyễn Văn An",
        email: "22635271@student.iuh.edu.vn",
        phone: "0901234501",
        className: "DHCNTT18A",
        major: "Công nghệ Thông tin",
        dateOfBirth: new Date("2004-05-12"),
        gender: "Nam",
        gpa: 3.65,
        accumulatedCredits: 120,
      },
      {
        studentCode: "22635201",
        fullName: "Trần Thị Bích",
        email: "22635201@student.iuh.edu.vn",
        phone: "0901234502",
        className: "DHCNTT18A",
        major: "Công nghệ Thông tin",
        dateOfBirth: new Date("2004-08-20"),
        gender: "Nữ",
        gpa: 3.52,
        accumulatedCredits: 118,
      },
      {
        studentCode: "22635202",
        fullName: "Lê Hoàng Cường",
        email: "22635202@student.iuh.edu.vn",
        phone: "0901234503",
        className: "DHCNTT18A",
        major: "Công nghệ Thông tin",
        dateOfBirth: new Date("2004-03-15"),
        gender: "Nam",
        gpa: 3.48,
        accumulatedCredits: 115,
      },
      {
        studentCode: "22635203",
        fullName: "Phạm Minh Đức",
        email: "22635203@student.iuh.edu.vn",
        phone: "0901234504",
        className: "DHCNTT18A",
        major: "Công nghệ Thông tin",
        dateOfBirth: new Date("2004-11-28"),
        gender: "Nam",
        gpa: 3.75,
        accumulatedCredits: 124,
      },
      {
        studentCode: "22635204",
        fullName: "Võ Ngọc Hân",
        email: "22635204@student.iuh.edu.vn",
        phone: "0901234505",
        className: "DHCNTT18A",
        major: "Công nghệ Thông tin",
        dateOfBirth: new Date("2004-07-09"),
        gender: "Nữ",
        gpa: 3.60,
        accumulatedCredits: 120,
      },
      {
        studentCode: "22635205",
        fullName: "Đỗ Gia Huy",
        email: "22635205@student.iuh.edu.vn",
        phone: "0901234506",
        className: "DHCNTT18A",
        major: "Công nghệ Thông tin",
        dateOfBirth: new Date("2004-01-22"),
        gender: "Nam",
        gpa: 3.40,
        accumulatedCredits: 114,
      },
    ];

    for (const stData of sampleStudents) {
      try {
        let existingStudent = await Student.findOne({ studentCode: stData.studentCode });
        let existingUser = await User.findOne({
          $or: [{ code: stData.studentCode }, { email: stData.email }],
        });

        const isNew = !existingStudent || !existingUser;

        // Create or update User
        if (!existingUser) {
          existingUser = await User.create({
            fullName: stData.fullName,
            code: stData.studentCode,
            email: stData.email,
            phone: stData.phone,
            password: passwordHash,
            role: "STUDENT",
            isActive: true,
          });
        } else {
          existingUser.fullName = stData.fullName;
          existingUser.code = stData.studentCode;
          existingUser.password = passwordHash;
          existingUser.role = "STUDENT";
          existingUser.isActive = true;
          await existingUser.save();
        }

        // Create or update Student profile
        if (!existingStudent) {
          existingStudent = await Student.create({
            userId: existingUser._id,
            studentCode: stData.studentCode,
            className: stData.className,
            major: stData.major,
            dateOfBirth: stData.dateOfBirth,
            gender: stData.gender,
            gpa: stData.gpa,
            accumulatedCredits: stData.accumulatedCredits,
            prerequisiteCompleted: true,
            internshipRegistered: false,
            thesisRegistered: false,
            isActive: true,
          });
          console.log(`✓ ${stData.studentCode} - ${stData.fullName} (Lớp: ${stData.className})`);
          createdStudentsCount++;
        } else {
          existingStudent.userId = existingUser._id;
          existingStudent.className = stData.className;
          existingStudent.major = stData.major;
          existingStudent.dateOfBirth = stData.dateOfBirth;
          existingStudent.gender = stData.gender;
          existingStudent.isActive = true;
          await existingStudent.save();
          if (isNew) {
            console.log(`✓ ${stData.studentCode} - ${stData.fullName} (Đã cập nhật)`);
            createdStudentsCount++;
          } else {
            console.log(`- Sinh viên ${stData.studentCode} (${stData.fullName}): Đã tồn tại & đồng bộ mật khẩu 11111111`);
            skippedStudentsCount++;
          }
        }
      } catch (err) {
        console.error(`✗ Lỗi khi tạo sinh viên ${stData.studentCode}:`, err.message);
        errorsCount++;
      }
    }

    // ==========================================
    // II. SEED GIẢNG VIÊN MẪU
    // ==========================================
    console.log("\n=== SEED GIẢNG VIÊN ===");

    const sampleLecturers = [
      {
        userCode: "20240001",
        lecturerCode: "GV0001",
        academicTitle: "TS.",
        fullName: "Tạ Duy Công Chiến",
        displayTitle: "TS. Tạ Duy Công Chiến",
        email: "gv0001@iuh.edu.vn",
        phone: "0908000001",
        specialization: "Quản trị Hệ thống & Trưởng bộ môn",
        role: "TBM", // Trưởng bộ môn
      },
      {
        userCode: "20240002",
        lecturerCode: "GV0002",
        academicTitle: "TS.",
        fullName: "Trần Thị Minh Khoa",
        displayTitle: "TS. Trần Thị Minh Khoa",
        email: "gv0002@iuh.edu.vn",
        phone: "0908000002",
        specialization: "Công nghệ Phần mềm & Kiến trúc Hệ thống",
        role: "LECTURER",
      },
      {
        userCode: "20240003",
        lecturerCode: "GV0003",
        academicTitle: "ThS.",
        fullName: "Hoàng Đình Hạnh",
        displayTitle: "ThS. Hoàng Đình Hạnh",
        email: "gv0003@iuh.edu.vn",
        phone: "0908000003",
        specialization: "Lập trình Web & Ứng dụng Di động",
        role: "LECTURER",
      },
      {
        userCode: "20240004",
        lecturerCode: "GV0004",
        academicTitle: "TS.",
        fullName: "Lê Thị Thủy",
        displayTitle: "TS. Lê Thị Thủy",
        email: "gv0004@iuh.edu.vn",
        phone: "0908000004",
        specialization: "Học máy & Khai phá Dữ liệu",
        role: "LECTURER",
      },
      {
        userCode: "20240005",
        lecturerCode: "GV0005",
        academicTitle: "ThS. NCS.",
        fullName: "Võ Công Minh",
        displayTitle: "ThS. NCS. Võ Công Minh",
        email: "gv0005@iuh.edu.vn",
        phone: "0908000005",
        specialization: "Hệ phân tán & Phó bộ môn",
        role: "LECTURER",
      },
      {
        userCode: "20240006",
        lecturerCode: "GV0006",
        academicTitle: "ThS. NCS.",
        fullName: "Nguyễn Thành Thái",
        displayTitle: "ThS. Nguyễn Thành Thái",
        email: "gv0006@iuh.edu.vn",
        phone: "0908000006",
        specialization: "Trí tuệ nhân tạo & Thị giác Máy tính",
        role: "LECTURER",
      },
      {
        userCode: "20240007",
        lecturerCode: "GV0007",
        academicTitle: "ThS.",
        fullName: "Nguyễn Văn Quang",
        displayTitle: "ThS. Nguyễn Văn Quang",
        email: "gv0007@iuh.edu.vn",
        phone: "0908000007",
        specialization: "An toàn Thông tin & Mạng Máy tính",
        role: "LECTURER",
      },
      {
        userCode: "20240008",
        lecturerCode: "GV0008",
        academicTitle: "ThS.",
        fullName: "Nguyễn Xuân Lô",
        displayTitle: "ThS. Nguyễn Xuân Lô",
        email: "gv0008@iuh.edu.vn",
        phone: "0908000008",
        specialization: "Cơ sở Dữ liệu & Hệ thống Thông tin",
        role: "LECTURER",
      },
      {
        userCode: "20240009",
        lecturerCode: "GV0009",
        academicTitle: "ThS.",
        fullName: "Phạm Thái Khanh",
        displayTitle: "ThS. Phạm Thái Khanh",
        email: "gv0009@iuh.edu.vn",
        phone: "0908000009",
        specialization: "DevOps & Điện toán Đám mây",
        role: "LECTURER",
      },
      {
        userCode: "20240010",
        lecturerCode: "GV0010",
        academicTitle: "ThS.",
        fullName: "Trương Bá Phúc",
        displayTitle: "ThS. Trương Bá Phúc",
        email: "gv0010@iuh.edu.vn",
        phone: "0908000010",
        specialization: "Kiểm thử Phần mềm & Đảm bảo Chất lượng",
        role: "LECTURER",
      },
      {
        userCode: "20240011",
        lecturerCode: "GV0011",
        academicTitle: "TS.",
        fullName: "Đặng Thanh Bình",
        displayTitle: "TS. Đặng Thanh Bình",
        email: "gv0011@iuh.edu.vn",
        phone: "0908000011",
        specialization: "Xử lý Ngôn ngữ Tự nhiên & AI",
        role: "LECTURER",
      },
      {
        userCode: "20240012",
        lecturerCode: "GV0012",
        academicTitle: "ThS.",
        fullName: "Đỗ Hà Phương",
        displayTitle: "ThS. Đỗ Hà Phương",
        email: "gv0012@iuh.edu.vn",
        phone: "0908000012",
        specialization: "Thiết kế Giao diện UI/UX & Tương tác Người Máy",
        role: "LECTURER",
      },
    ];

    for (const lecData of sampleLecturers) {
      try {
        let existingLecturer = await Lecturer.findOne({ lecturerCode: lecData.lecturerCode });
        let existingUser = await User.findOne({
          $or: [
            { code: lecData.userCode },
            { code: lecData.lecturerCode },
            { email: lecData.email },
          ],
        });

        const isNew = !existingLecturer || !existingUser;

        // Create or update User with 8-digit userCode
        if (!existingUser) {
          existingUser = await User.create({
            fullName: `${lecData.academicTitle} ${lecData.fullName}`,
            code: lecData.userCode,
            email: lecData.email,
            phone: lecData.phone,
            password: passwordHash,
            role: lecData.role,
            isActive: true,
          });
        } else {
          existingUser.fullName = `${lecData.academicTitle} ${lecData.fullName}`;
          existingUser.code = lecData.userCode;
          existingUser.password = passwordHash;
          existingUser.role = lecData.role;
          existingUser.isActive = true;
          await existingUser.save();
        }

        // Create or update Lecturer profile
        if (!existingLecturer) {
          existingLecturer = await Lecturer.create({
            userId: existingUser._id,
            lecturerCode: lecData.lecturerCode,
            academicTitle: lecData.academicTitle,
            specialization: lecData.specialization,
            maxSupervisedStudents: 10,
            maxStudents: 10,
            isAvailable: true,
            isActive: true,
            permissions: ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
          });
          console.log(`✓ ${lecData.lecturerCode} - ${lecData.displayTitle} (${lecData.role === "TBM" ? "Trưởng bộ môn" : "Giảng viên"})`);
          createdLecturersCount++;
        } else {
          existingLecturer.userId = existingUser._id;
          existingLecturer.academicTitle = lecData.academicTitle;
          existingLecturer.specialization = lecData.specialization;
          existingLecturer.isActive = true;
          await existingLecturer.save();
          if (isNew) {
            console.log(`✓ ${lecData.lecturerCode} - ${lecData.displayTitle} (Đã cập nhật)`);
            createdLecturersCount++;
          } else {
            console.log(`- Giảng viên ${lecData.lecturerCode} - ${lecData.displayTitle}: Đã tồn tại & đồng bộ mật khẩu 11111111`);
            skippedLecturersCount++;
          }
        }

        // Ensure permissions exist in Permission collection
        const defaultPerms = ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"];
        for (const p of defaultPerms) {
          await Permission.findOneAndUpdate(
            { userId: existingUser._id, permission: p },
            { $set: { isActive: true } },
            { upsert: true, returnDocument: "after" }
          );
        }
      } catch (err) {
        console.error(`✗ Lỗi khi tạo giảng viên ${lecData.lecturerCode}:`, err.message);
        errorsCount++;
      }
    }

    // ==========================================
    // III. TỔNG KẾT
    // ==========================================
    console.log("\n==========================================");
    console.log("📊 KẾT QUẢ SEED DỮ LIỆU:");
    console.log("==========================================");
    console.log(`- Sinh viên đã tạo mới: ${createdStudentsCount}`);
    console.log(`- Giảng viên đã tạo mới: ${createdLecturersCount}`);
    console.log(`- Tài khoản sinh viên đã bỏ qua (đã có): ${skippedStudentsCount}`);
    console.log(`- Tài khoản giảng viên đã bỏ qua (đã có): ${skippedLecturersCount}`);
    console.log(`- Tổng số lỗi: ${errorsCount}`);
    console.log("------------------------------------------");
    console.log("🔑 MẬT KHẨU ĐĂNG NHẬP MẶC ĐỊNH: 11111111");
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("CRITICAL SEED ERROR:", error);
    process.exit(1);
  }
};

seedUsersAndLecturers();
