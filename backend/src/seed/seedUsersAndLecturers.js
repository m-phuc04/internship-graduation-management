import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDatabase from "../config/database.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Permission from "../models/Permission.js";
import ThesisTopic from "../models/ThesisTopic.js";
import AcademicTerm from "../models/AcademicTerm.js";
import ResearchField from "../models/ResearchField.js";
import Company from "../models/Company.js";
import Internship from "../models/Internship.js";
import { kltnTopicsData } from "./kltnTopicsData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const seedUsersAndLecturers = async () => {
  let createdStudentsCount = 0;
  let createdLecturersCount = 0;
  let skippedStudentsCount = 0;
  let skippedLecturersCount = 0;
  let createdTopicsCount = 0;
  let skippedTopicsCount = 0;
  let errorsCount = 0;

  try {
    await connectDatabase();
    console.log("==========================================");
    console.log("🚀 KẾT NỐI MONGODB THÀNH CÔNG");
    console.log("==========================================\n");

    const DEFAULT_PASSWORD = "11111111";
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const adminPasswordHash = await bcrypt.hash("1111", 12);

    // ==========================================
    // 0. SEED TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN001)
    // ==========================================
    console.log("=== 0. SEED TÀI KHOẢN ADMIN ===");
    let adminUser = await User.findOne({
      $or: [{ code: "ADMIN001" }, { email: "admin@iuh.edu.vn" }],
    });

    if (!adminUser) {
      adminUser = await User.create({
        fullName: "Quản Trị Viên Hệ Thống",
        code: "ADMIN001",
        email: "admin@iuh.edu.vn",
        phone: "0909999999",
        password: adminPasswordHash,
        role: "ADMIN",
        isActive: true,
      });
      console.log("✓ Tạo mới tài khoản ADMIN: ADMIN001 (Mật khẩu: 1111)");
    } else {
      adminUser.fullName = "Quản Trị Viên Hệ Thống";
      adminUser.code = "ADMIN001";
      adminUser.email = "admin@iuh.edu.vn";
      adminUser.role = "ADMIN";
      adminUser.password = adminPasswordHash;
      adminUser.isActive = true;
      await adminUser.save();
      console.log("- Đồng bộ tài khoản ADMIN: ADMIN001 (Mật khẩu: 1111)");
    }

    // Đảm bảo Admin không bị gán vào bảng Lecturer hay quyền chấm điểm
    await Lecturer.deleteMany({
      $or: [{ userId: adminUser._id }, { lecturerCode: "ADMIN001" }, { lecturerCode: "99999999" }],
    });
    await Permission.deleteMany({ userId: adminUser._id });

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
        { $setOnInsert: { name: fieldName, isActive: true, createdBy: adminUser._id } },
        { upsert: true }
      );
    }
    console.log(`✓ Đã đồng bộ đầy đủ ${systemResearchFields.length} Tag Lĩnh vực hệ thống.`);

    // ==========================================
    // 2. SEED HỌC KỲ MẪU (KỲ TRƯỚC ĐÃ KHÓA & KỲ HIỆN TẠI ĐANG HOẠT ĐỘNG)
    // ==========================================
    console.log("\n=== 2. SEED HỌC KỲ MẪU ===");

    // 2.1. Học kỳ trước (HK2-2025-2026): Đã kết thúc (CLOSED) và Đã khóa đăng ký đề tài KLTN
    let prevTerm = await AcademicTerm.findOne({ code: "HK2-2025-2026" });
    if (!prevTerm) {
      prevTerm = await AcademicTerm.create({
        name: "Học kỳ 2",
        academicYear: "2025-2026",
        code: "HK2-2025-2026",
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-06-30"),
        status: "CLOSED",
        description: "Học kỳ 2 năm học 2025-2026 (Kỳ trước - Đã khóa & Lưu trữ đề tài)",
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
          lockedBy: adminUser._id,
        },
        createdBy: adminUser._id,
      });
      console.log("✓ Đã tạo Học kỳ trước: HK2-2025-2026 (CLOSED, isRegistrationLocked: true)");
    } else {
      prevTerm.status = "CLOSED";
      if (!prevTerm.thesis) prevTerm.thesis = {};
      prevTerm.thesis.isRegistrationLocked = true;
      if (!prevTerm.thesis.lockedAt) prevTerm.thesis.lockedAt = new Date("2026-04-01");
      await prevTerm.save();
      console.log("- Đã xác nhận Học kỳ trước: HK2-2025-2026 (CLOSED, isRegistrationLocked: true)");
    }

    // 2.2. Học kỳ hiện tại (HK1-2026-2027): Đang hoạt động (ACTIVE), KLTN chưa khóa để tạo mới
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
          reportCycle: 2, // Chu kỳ nộp nhật ký 2 tuần/lần chung toàn học kỳ
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
        createdBy: adminUser._id,
      });
      console.log("✓ Đã tạo mới Học kỳ hiện tại: HK1-2026-2027 (ACTIVE, Chu kỳ TTDN: 2 tuần/lần)");
    } else {
      currentTerm.status = "ACTIVE";
      if (!currentTerm.internship) currentTerm.internship = {};
      if (!currentTerm.internship.reportCycle) {
        currentTerm.internship.reportCycle = 2;
      }
      if (!currentTerm.thesis) currentTerm.thesis = {};
      currentTerm.thesis.isRegistrationLocked = false;
      await currentTerm.save();
      console.log("- Đã xác nhận Học kỳ hiện tại: HK1-2026-2027 (ACTIVE, Chu kỳ TTDN: " + (currentTerm.internship?.reportCycle || 2) + " tuần/lần)");
    }

    // ==========================================
    // 3. SEED DANH MỤC DOANH NGHIỆP TIẾP NHẬN (COMPANIES)
    // ==========================================
    console.log("\n=== 3. SEED DANH MỤC DOANH NGHIỆP ===");
    const sampleCompanies = [
      {
        name: "Công ty Cổ phần Công nghệ TDSouth",
        code: "TDSOUTH",
        address: "Tòa nhà QTSC 9, Công viên phần mềm Quang Trung, Q.12, TP.HCM",
        email: "contact@tdsouth.com",
        phone: "02837155666",
        website: "https://tdsouth.com",
        contactPerson: "Nguyễn Vũ Minh",
        contactEmail: "minh.nguyen@tdsouth.com",
        description: "Chuyên phát triển giải pháp EdTech, Quản trị doanh nghiệp và Chuyển đổi số.",
        status: "ACTIVE",
        userId: null,
      },
      {
        name: "Công ty TNHH Phần mềm FPT Software TP.HCM",
        code: "FPTSOFT",
        address: "Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM",
        email: "recruitment@fsoft.com.vn",
        phone: "02873007575",
        website: "https://fptsoftware.com",
        contactPerson: "Lê Hoàng Yến",
        contactEmail: "yen.lh@fsoft.com.vn",
        description: "Tập đoàn công nghệ và gia công phần mềm hàng đầu Việt Nam.",
        status: "ACTIVE",
        userId: null,
      },
      {
        name: "Công ty Cổ phần VNG (VNG Corporation)",
        code: "VNG",
        address: "Z06 Đường số 13, Tân Thuận Đông, Quận 7, TP.HCM",
        email: "careers@vng.com.vn",
        phone: "02839623888",
        website: "https://vng.com.vn",
        contactPerson: "Trần Anh Khoa",
        contactEmail: "khoa.ta@vng.com.vn",
        description: "Kỳ lân công nghệ với các nền tảng Zalo, ZaloPay và dịch vụ số.",
        status: "ACTIVE",
        userId: null,
      },
      {
        name: "Công ty TMA Solutions",
        code: "TMASOL",
        address: "Công viên phần mềm Quang Trung, Q.12, TP.HCM",
        email: "intern@tmasolutions.com",
        phone: "02839978000",
        website: "https://tmasolutions.com",
        contactPerson: "Phan Thị Thu Hà",
        contactEmail: "ha.ptt@tma.com.vn",
        description: "Công ty phát triển phần mềm với hơn 4000 kỹ sư công nghệ.",
        status: "ACTIVE",
        userId: null,
      },
    ];

    for (const cData of sampleCompanies) {
      await Company.findOneAndUpdate(
        { code: cData.code },
        { $set: cData },
        { upsert: true, returnDocument: "after" }
      );
    }
    console.log(`✓ Đã đồng bộ ${sampleCompanies.length} Doanh nghiệp tiếp nhận thực tập (userId = null, không tạo tài khoản login).`);

    // ==========================================
    // 4. SEED SINH VIÊN MẪU
    // ==========================================
    console.log("\n=== 4. SEED SINH VIÊN ===");

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
          existingUser.email = stData.email;
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
          existingStudent.gpa = stData.gpa;
          existingStudent.accumulatedCredits = stData.accumulatedCredits;
          existingStudent.isActive = true;
          await existingStudent.save();
          if (isNew) {
            console.log(`✓ ${stData.studentCode} - ${stData.fullName} (Đã cập nhật)`);
            createdStudentsCount++;
          } else {
            console.log(`- Sinh viên ${stData.studentCode} (${stData.fullName}): Đã đồng bộ mật khẩu 11111111`);
            skippedStudentsCount++;
          }
        }
      } catch (err) {
        console.error(`✗ Lỗi khi tạo sinh viên ${stData.studentCode}:`, err.message);
        errorsCount++;
      }
    }

    // ==========================================
    // 5. SEED GIẢNG VIÊN MẪU (CHUẨN HÓA HỌ TÊN VÀ GẮN ĐẦY ĐỦ TAG LĨNH VỰC)
    // ==========================================
    console.log("\n=== 5. SEED GIẢNG VIÊN (KHẮC PHỤC LẶP HỌC VỊ & GÁN TAG LĨNH VỰC) ===");

    const sampleLecturers = [
      {
        userCode: "20240001",
        lecturerCode: "20240001",
        academicTitle: "TS.",
        fullName: "Tạ Duy Công Chiến", // Lưu họ tên thuần túy để không bị lặp "TS. TS."
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

        // Create or update User (Lưu fullName thuần túy, tránh bị lặp "TS. TS.")
        if (!existingUser) {
          existingUser = await User.create({
            fullName: lecData.fullName,
            code: lecData.userCode,
            email: lecData.email,
            phone: lecData.phone,
            password: passwordHash,
            role: lecData.role,
            isActive: true,
          });
        } else {
          existingUser.fullName = lecData.fullName;
          existingUser.code = lecData.userCode;
          existingUser.email = lecData.email;
          existingUser.password = passwordHash;
          existingUser.role = lecData.role;
          existingUser.isActive = true;
          await existingUser.save();
        }

        let existingLecturer = await Lecturer.findOne({
          $or: [
            { lecturerCode: lecData.lecturerCode },
            ...(existingUser ? [{ userId: existingUser._id }] : []),
          ],
        });

        const isNew = !existingLecturer;

        // Create or update Lecturer profile kèm mảng fields
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
          console.log(`✓ ${lecData.lecturerCode} - ${lecData.academicTitle} ${lecData.fullName} (Lĩnh vực: ${(lecData.fields || []).join(", ")})`);
          createdLecturersCount++;
        } else {
          existingLecturer.userId = existingUser._id;
          existingLecturer.lecturerCode = lecData.lecturerCode;
          existingLecturer.academicTitle = lecData.academicTitle;
          existingLecturer.specialization = lecData.specialization;
          existingLecturer.fields = lecData.fields || [];
          existingLecturer.isActive = true;
          await existingLecturer.save();
          if (isNew) {
            console.log(`✓ ${lecData.lecturerCode} - ${lecData.academicTitle} ${lecData.fullName} (Đã cập nhật fields)`);
            createdLecturersCount++;
          } else {
            console.log(`- Giảng viên ${lecData.lecturerCode} - ${lecData.academicTitle} ${lecData.fullName}: Đã đồng bộ fields & mật khẩu 11111111`);
            skippedLecturersCount++;
          }
        }

        // Đảm bảo 3 quyền hội đồng luôn tồn tại trong collection permissions
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
    // 6. SEED ĐỀ TÀI KLTN MẪU (LƯU VÀO KỲ TRƯỚC HK2-2025-2026 ĐÃ KHÓA)
    // ==========================================
    console.log("\n=== 6. SEED ĐỀ TÀI KLTN (GẮN VÀO KỲ TRƯỚC HK2-2025-2026 ĐÃ KHÓA) ===");

    const targetSeedTerm = prevTerm;

    // Đảm bảo học kỳ hiện tại (HK1-2026-2027) hoàn toàn sạch sẽ, không có đề tài mẫu nào
    // Chuyển toàn bộ đề tài mẫu cũ về kỳ trước HK2-2025-2026
    if (currentTerm && prevTerm) {
      const movedResult = await ThesisTopic.updateMany(
        { academicTermId: currentTerm._id },
        { $set: { academicTermId: prevTerm._id } }
      );
      if (movedResult.modifiedCount > 0) {
        console.log(`- Đã chuyển ${movedResult.modifiedCount} đề tài từ HK1-2026-2027 về kỳ trước HK2-2025-2026 (đã khóa).`);
      }
    }

    const topicTargetCounts = new Map();
    for (const item of kltnTopicsData) {
      const key = `${item.lecturerCode}___${item.title}`;
      topicTargetCounts.set(key, (topicTargetCounts.get(key) || 0) + 1);
    }

    const processedKeys = new Set();

    for (const item of kltnTopicsData) {
      const key = `${item.lecturerCode}___${item.title}`;
      if (processedKeys.has(key)) {
        continue;
      }
      processedKeys.add(key);

      const targetCount = topicTargetCounts.get(key);

      try {
        const lecturer = await Lecturer.findOne({
          $or: [
            { lecturerCode: item.lecturerCode },
            { lecturerCode: item.lecturerCode.replace(/^GV00/i, "202400") },
          ],
        }).populate("userId");
        if (!lecturer) {
          console.error(`✗ Không tìm thấy giảng viên ${item.supervisorName} (${item.lecturerCode})`);
          errorsCount++;
          continue;
        }

        const existingCount = await ThesisTopic.countDocuments({
          supervisorId: lecturer._id,
          title: item.title,
          academicTermId: targetSeedTerm?._id,
        });

        const needToCreate = Math.max(0, targetCount - existingCount);

        if (needToCreate > 0) {
          for (let i = 0; i < needToCreate; i++) {
            await ThesisTopic.create({
              title: item.title,
              supervisorId: lecturer._id,
              academicTermId: targetSeedTerm?._id || null,
              fields: lecturer.fields || [],
              currentGroups: 0,
              description: null,
              status: "APPROVED",
              approvedAt: new Date("2026-03-15"),
            });
            createdTopicsCount++;
            console.log(`✓ [KLTN Kỳ Trước] [${item.lecturerCode} - ${item.supervisorName}] ${item.title}`);
          }
        }

        const alreadyExistCount = Math.min(existingCount, targetCount);
        if (alreadyExistCount > 0) {
          for (let i = 0; i < alreadyExistCount; i++) {
            skippedTopicsCount++;
          }
          // Đảm bảo academicTermId trỏ về đúng kỳ trước
          await ThesisTopic.updateMany(
            { supervisorId: lecturer._id, title: item.title, academicTermId: { $ne: targetSeedTerm?._id } },
            { $set: { academicTermId: targetSeedTerm?._id || null } }
          );
          console.log(`- [KLTN Kỳ Trước] Đã có ${alreadyExistCount}/${targetCount} bản ghi: [${item.lecturerCode} - ${item.supervisorName}] ${item.title}`);
        }
      } catch (err) {
        console.error(`✗ Lỗi khi tạo đề tài "${item.title}":`, err.message);
        errorsCount++;
      }
    }

    // ==========================================
    // 7. SEED HỒ SƠ THỰC TẬP MẪU TTDN (CHO SV 22635271 TẠI KỲ HIỆN TẠI)
    // ==========================================
    console.log("\n=== 7. SEED HỒ SƠ THỰC TẬP TTDN MẪU (KỲ HIỆN TẠI) ===");
    const stAn = await Student.findOne({ studentCode: "22635271" });
    const lecKhoa = await Lecturer.findOne({ lecturerCode: "20240002" });
    const compTDS = await Company.findOne({ code: "TDSOUTH" });

    if (stAn && lecKhoa && compTDS && currentTerm) {
      let sampleInternship = await Internship.findOne({ studentId: stAn._id });
      const startDate = new Date("2026-09-01");
      const endDate = new Date("2026-11-10");

      if (!sampleInternship) {
        sampleInternship = await Internship.create({
          academicTermId: currentTerm._id,
          studentId: stAn._id,
          lecturerId: lecKhoa._id,
          companyId: compTDS._id,
          position: "Kỹ sư Thực tập Phát triển Phần mềm",
          startDate: startDate,
          endDate: endDate,
          durationInWeeks: 10,
          reportCycle: currentTerm.internship?.reportCycle || 2,
          mentorName: "Nguyễn Vũ Minh",
          mentorPosition: "Technical Lead",
          mentorEmail: "minh.nguyen@tdsouth.com",
          mentorPhone: "0909123456",
          status: "INTERNING",
          pretest: {
            isPassed: true,
            passedAt: new Date(),
            passedBy: lecKhoa.userId,
            note: "Đã hoàn thành pretest và được duyệt vào thực tập",
          },
        });
        console.log(`✓ Tạo mới hồ sơ TTDN mẫu cho SV 22635271 ở kỳ hiện tại HK1-2026-2027 (GVGS: TS. Trần Thị Minh Khoa - PASS PRETEST: Đạt)`);
      } else {
        sampleInternship.academicTermId = currentTerm._id;
        sampleInternship.lecturerId = lecKhoa._id;
        sampleInternship.companyId = compTDS._id;
        sampleInternship.reportCycle = currentTerm.internship?.reportCycle || 2;
        sampleInternship.durationInWeeks = 10;
        if (!sampleInternship.pretest || typeof sampleInternship.pretest.isPassed === "undefined") {
          sampleInternship.pretest = {
            isPassed: true,
            passedAt: new Date(),
            passedBy: lecKhoa.userId,
            note: "Đã hoàn thành pretest và được duyệt vào thực tập",
          };
        }
        await sampleInternship.save();
        console.log(`- Đồng bộ hồ sơ TTDN mẫu cho SV 22635271 ở kỳ hiện tại HK1-2026-2027 (Chu kỳ: ${sampleInternship.reportCycle} tuần/lần, PASS PRETEST: ${sampleInternship.pretest?.isPassed ? "Đạt" : "Chưa đạt"})`);
      }

      stAn.internshipRegistered = true;
      await stAn.save();
    }

    // ==========================================
    // 8. TỔNG KẾT
    // ==========================================
    console.log("\n==========================================");
    console.log("📊 KẾT QUẢ SEED DỮ LIỆU:");
    console.log("==========================================");
    console.log(`- Admin: ADMIN001 (Mật khẩu: 1111)`);
    console.log(`- Tag Lĩnh vực nghiên cứu: ${systemResearchFields.length}`);
    console.log(`- Doanh nghiệp tiếp nhận: ${sampleCompanies.length}`);
    console.log(`- Sinh viên đã tạo mới: ${createdStudentsCount}`);
    console.log(`- Giảng viên đã tạo mới: ${createdLecturersCount}`);
    console.log(`- Tài khoản sinh viên đã bỏ qua / đồng bộ: ${skippedStudentsCount}`);
    console.log(`- Tài khoản giảng viên đã bỏ qua / đồng bộ: ${skippedLecturersCount}`);
    console.log(`- Đề tài KLTN kỳ trước (HK2-2025-2026 đã khóa): ${createdTopicsCount + skippedTopicsCount}`);
    console.log(`- Đề tài KLTN kỳ hiện tại (HK1-2026-2027 đang chạy): 0 (Sạch đề tài để GV tạo mới)`);
    console.log(`- Tổng số lỗi: ${errorsCount}`);
    console.log("------------------------------------------");
    console.log("🔑 MẬT KHẨU ĐĂNG NHẬP MẶC ĐỊNH:");
    console.log("   - Sinh viên & Giảng viên: 11111111");
    console.log("   - Quản trị viên (Admin):  1111");
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("CRITICAL SEED ERROR:", error);
    process.exit(1);
  }
};

seedUsersAndLecturers();
