import bcrypt from "bcryptjs";
import connectDatabase from "../config/database.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Company from "../models/Company.js";

const seedData = async () => {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB for seeding Master Data...");

    // Common password hash for test accounts (Default password is 1111)
    const defaultPasswordHash = await bcrypt.hash("1111", 12);

    // ==========================================
    // 0. Seed Admin (Quản trị viên)
    // ==========================================
    let adminUser = await User.findOne({ $or: [{ code: "ADMIN001" }, { role: "ADMIN" }] });
    if (!adminUser) {
      adminUser = await User.create({
        fullName: "Quản Trị Viên Hệ Thống",
        code: "ADMIN001",
        email: "admin@iuh.edu.vn",
        password: defaultPasswordHash,
        phone: "0909999999",
        role: "ADMIN",
        isActive: true,
      });
      console.log("Created Admin user: ADMIN001 / 1111");
    } else {
      adminUser.fullName = "Quản Trị Viên Hệ Thống";
      adminUser.code = "ADMIN001";
      adminUser.role = "ADMIN";
      adminUser.password = defaultPasswordHash;
      adminUser.isActive = true;
      await adminUser.save();
    }

    // ==========================================
    // 1. Seed TBM (Trưởng Bộ Môn)
    // ==========================================
    let tbmUser = await User.findOne({ $or: [{ email: "tbm@iuh.edu.vn" }, { role: "TBM" }] });
    if (!tbmUser) {
      tbmUser = await User.create({
        fullName: "Trưởng Bộ Môn CNTT",
        email: "tbm@iuh.edu.vn",
        password: defaultPasswordHash,
        phone: "0908123456",
        role: "TBM",
        isActive: true,
      });
      console.log("Created TBM user: tbm@iuh.edu.vn / 1111");
    } else {
      tbmUser.fullName = "Trưởng Bộ Môn CNTT";
      tbmUser.role = "TBM";
      tbmUser.password = defaultPasswordHash;
      await tbmUser.save();
    }

    let tbmLecturer = await Lecturer.findOne({ lecturerCode: "20240000" });
    if (!tbmLecturer) {
      await Lecturer.create({
        userId: tbmUser._id,
        lecturerCode: "20240000",
        academicTitle: "TS.",
        specialization: "Quản trị Hệ thống & Quản lý Đào tạo CNTT",
        maxStudents: 10,
        isAvailable: true,
      });
      console.log("Created TBM lecturer record: 20240000");
    } else {
      tbmLecturer.userId = tbmUser._id;
      await tbmLecturer.save();
    }

    // ==========================================
    // 2. Seed Lecturers
    // ==========================================
    const lecturersData = [
      {
        fullName: "ThS. Trần Hoàng Nam",
        email: "lecturer@iuh.edu.vn",
        phone: "0912345678",
        lecturerCode: "12345678",
        academicTitle: "ThS.",
        specialization: "Kỹ nghệ phần mềm & Web",
        maxStudents: 10,
        isAvailable: true,
      },
      {
        fullName: "PGS.TS. Lê Văn Thắng",
        email: "thang.le@iuh.edu.vn",
        phone: "0913456789",
        lecturerCode: "20240001",
        academicTitle: "PGS.TS.",
        specialization: "Trí tuệ nhân tạo & Data Science",
        maxStudents: 12,
        isAvailable: true,
      },
      {
        fullName: "TS. Phạm Thị Mai",
        email: "mai.pham@iuh.edu.vn",
        phone: "0914567890",
        lecturerCode: "20240002",
        academicTitle: "TS.",
        specialization: "Hệ thống thông tin & Big Data",
        maxStudents: 8,
        isAvailable: true,
      },
      {
        fullName: "ThS. Đỗ Minh Quân",
        email: "quan.do@iuh.edu.vn",
        phone: "0915678901",
        lecturerCode: "20240003",
        academicTitle: "ThS.",
        specialization: "An toàn thông tin & Mạng",
        maxStudents: 6,
        isAvailable: false,
      },
      {
        fullName: "TS. Hoàng Quốc Bảo",
        email: "bao.hoang@iuh.edu.vn",
        phone: "0916789012",
        lecturerCode: "20240004",
        academicTitle: "TS.",
        specialization: "Điện toán đám mây & DevOps",
        maxStudents: 10,
        isAvailable: true,
      },
    ];

    for (const item of lecturersData) {
      let u = await User.findOne({ email: item.email });
      if (!u) {
        u = await User.create({
          fullName: item.fullName,
          email: item.email,
          password: defaultPasswordHash,
          phone: item.phone,
          role: "LECTURER",
          isActive: true,
        });
      } else {
        u.password = defaultPasswordHash;
        await u.save();
      }

      let lec = await Lecturer.findOne({ lecturerCode: item.lecturerCode });
      if (!lec) {
        await Lecturer.create({
          userId: u._id,
          lecturerCode: item.lecturerCode,
          academicTitle: item.academicTitle,
          specialization: item.specialization,
          maxStudents: item.maxStudents,
          isAvailable: item.isAvailable,
        });
      } else {
        lec.userId = u._id;
        await lec.save();
      }
    }
    console.log(`Seeded ${lecturersData.length} Lecturers`);

    // ==========================================
    // 3. Seed Companies
    // ==========================================
    const companiesData = [
      {
        name: "TDSouth Technology JSC",
        code: "TDSOUTH",
        address: "Tòa nhà QTSC 9, Công viên phần mềm Quang Trung, Q.12, TP.HCM",
        email: "company@tdsouth.com",
        phone: "02837155666",
        website: "https://tdsouth.com",
        contactPerson: "Nguyễn Vũ Minh",
        contactEmail: "minh.nguyen@tdsouth.com",
        description: "Chuyên phát triển giải pháp EdTech, Quản trị doanh nghiệp và Chuyển đổi số.",
        status: "ACTIVE",
      },
      {
        name: "FPT Software TP.HCM",
        code: "FPTSOFT",
        address: "Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM",
        email: "recruitment@fsoft.com.vn",
        phone: "02873007575",
        website: "https://fptsoftware.com",
        contactPerson: "Lê Hoàng Yến",
        contactEmail: "yen.lh@fsoft.com.vn",
        description: "Tập đoàn công nghệ và gia công phần mềm hàng đầu Việt Nam.",
        status: "ACTIVE",
      },
      {
        name: "VNG Corporation",
        code: "VNG",
        address: "Z06 Đường số 13, Tân Thuận Đông, Quận 7, TP.HCM",
        email: "careers@vng.com.vn",
        phone: "02839623888",
        website: "https://vng.com.vn",
        contactPerson: "Trần Anh Khoa",
        contactEmail: "khoa.ta@vng.com.vn",
        description: "Kỳ lân công nghệ hàng đầu với các nền tảng Zalo, ZaloPay, Game Publishing.",
        status: "ACTIVE",
      },
      {
        name: "TMA Solutions",
        code: "TMASOL",
        address: "Công viên phần mềm Quang Trung, Q.12, TP.HCM",
        email: "intern@tmasolutions.com",
        phone: "02839978000",
        website: "https://tmasolutions.com",
        contactPerson: "Phan Thị Thu Hà",
        contactEmail: "ha.ptt@tma.com.vn",
        description: "Công ty phát triển phần mềm cho đối tác quốc tế với hơn 4000 kỹ sư.",
        status: "ACTIVE",
      },
      {
        name: "Công ty Cổ phần Công nghệ ABC (Tạm ngưng)",
        code: "ABC_TECH",
        address: "123 Cách Mạng Tháng 8, Quận 3, TP.HCM",
        email: "hr@abctech.vn",
        phone: "02838221122",
        website: "https://abctech.vn",
        contactPerson: "Bùi Tuấn Anh",
        contactEmail: "tuananh@abctech.vn",
        description: "Đang tạm dừng tiếp nhận thực tập kỳ này.",
        status: "INACTIVE",
      },
    ];

    // Also ensure company user accounts exist
    let compUser = await User.findOne({ email: "company@tdsouth.com" });
    if (!compUser) {
      compUser = await User.create({
        fullName: "Đại diện TDSouth Tech",
        email: "company@tdsouth.com",
        password: defaultPasswordHash,
        phone: "02837155666",
        role: "COMPANY",
        isActive: true,
      });
      console.log("Created Company user: company@tdsouth.com / 1111");
    } else {
      compUser.password = defaultPasswordHash;
      await compUser.save();
    }

    let comp2User = await User.findOne({ email: "company2@vietai.vn" });
    if (!comp2User) {
      comp2User = await User.create({
        fullName: "Đại diện VietAI Labs",
        email: "company2@vietai.vn",
        password: defaultPasswordHash,
        phone: "02838221199",
        role: "COMPANY",
        isActive: true,
      });
      console.log("Created Company 2 user: company2@vietai.vn / 1111");
    } else {
      comp2User.password = defaultPasswordHash;
      await comp2User.save();
    }

    for (const item of companiesData) {
      let comp = await Company.findOne({ code: item.code });
      let assignedUserId = item.code === "TDSOUTH" ? compUser._id : item.code === "FPTSOFT" ? comp2User._id : null;
      if (!comp) {
        await Company.create({ ...item, userId: assignedUserId });
      } else if (assignedUserId) {
        comp.userId = assignedUserId;
        await comp.save();
      }
    }
    console.log(`Seeded ${companiesData.length} Companies`);

    // ==========================================
    // 4. Seed Students
    // ==========================================
    const studentsData = [
      {
        fullName: "Nguyễn Văn An",
        email: "student@iuh.edu.vn",
        phone: "0987654321",
        studentCode: "22635271",
        className: "DHCNTT18A",
        gpa: 3.65,
        accumulatedCredits: 125,
        prerequisiteCompleted: true,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Trần Thị Bích Ngọc",
        email: "ngoc.tran@student.iuh.edu.vn",
        phone: "0981112223",
        studentCode: "22635272",
        className: "DHCNTT18A",
        gpa: 3.82,
        accumulatedCredits: 130,
        prerequisiteCompleted: true,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Lê Minh Cường",
        email: "cuong.le@student.iuh.edu.vn",
        phone: "0982223334",
        studentCode: "22635273",
        className: "DHKTPM18A",
        gpa: 3.25,
        accumulatedCredits: 118,
        prerequisiteCompleted: true,
        internshipRegistered: true,
        thesisRegistered: false,
      },
      {
        fullName: "Phạm Hải Đăng",
        email: "dang.pham@student.iuh.edu.vn",
        phone: "0983334445",
        studentCode: "22635274",
        className: "DHKTPM18B",
        gpa: 2.95,
        accumulatedCredits: 105,
        prerequisiteCompleted: false,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Vũ Thị Hương Giang",
        email: "giang.vu@student.iuh.edu.vn",
        phone: "0984445556",
        studentCode: "22635275",
        className: "DHHTTT18A",
        gpa: 3.5,
        accumulatedCredits: 122,
        prerequisiteCompleted: true,
        internshipRegistered: true,
        thesisRegistered: true,
      },
      {
        fullName: "Hoàng Đức Huy",
        email: "huy.hoang@student.iuh.edu.vn",
        phone: "0985556667",
        studentCode: "22635276",
        className: "DHATTT18A",
        gpa: 3.1,
        accumulatedCredits: 110,
        prerequisiteCompleted: false,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Đỗ Khánh Linh",
        email: "linh.do@student.iuh.edu.vn",
        phone: "0986667778",
        studentCode: "22635277",
        className: "DHCNTT18B",
        gpa: 3.75,
        accumulatedCredits: 128,
        prerequisiteCompleted: true,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Bùi Quốc Nam",
        email: "nam.bui@student.iuh.edu.vn",
        phone: "0987778889",
        studentCode: "22635278",
        className: "DHCNTT18B",
        gpa: 2.8,
        accumulatedCredits: 98,
        prerequisiteCompleted: false,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Ngô Mỹ Phượng",
        email: "phuong.ngo@student.iuh.edu.vn",
        phone: "0988889990",
        studentCode: "22635279",
        className: "DHCNTT18A",
        gpa: 3.42,
        accumulatedCredits: 120,
        prerequisiteCompleted: true,
        internshipRegistered: false,
        thesisRegistered: false,
      },
      {
        fullName: "Dương Thái Sơn",
        email: "son.duong@student.iuh.edu.vn",
        phone: "0989990001",
        studentCode: "22635280",
        className: "DHKTPM18A",
        gpa: 3.6,
        accumulatedCredits: 126,
        prerequisiteCompleted: true,
        internshipRegistered: true,
        thesisRegistered: false,
      },
    ];

    for (const item of studentsData) {
      let u = await User.findOne({ email: item.email });
      if (!u) {
        u = await User.create({
          fullName: item.fullName,
          email: item.email,
          password: defaultPasswordHash,
          phone: item.phone,
          role: "STUDENT",
          isActive: true,
        });
      } else {
        u.password = defaultPasswordHash;
        await u.save();
      }

      let st = await Student.findOne({ studentCode: item.studentCode });
      if (!st) {
        await Student.create({
          userId: u._id,
          studentCode: item.studentCode,
          className: item.className,
          gpa: item.gpa,
          accumulatedCredits: item.accumulatedCredits,
          prerequisiteCompleted: item.prerequisiteCompleted,
          internshipRegistered: item.internshipRegistered,
          thesisRegistered: item.thesisRegistered,
        });
      } else {
        st.userId = u._id;
        await st.save();
      }
    }
    console.log(`Seeded ${studentsData.length} Students`);

    console.log("\n=======================================================");
    console.log("MASTER DATA SEEDED SUCCESSFULLY!");
    console.log("Accounts ready for testing:");
    console.log("1. TBM:      tbm@iuh.edu.vn / 123456");
    console.log("2. Lecturer: lecturer@iuh.edu.vn / 123456");
    console.log("3. Student:  student@iuh.edu.vn / 123456");
    console.log("4. Company:  company@tdsouth.com / 123456");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
