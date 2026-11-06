import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDatabase from "../config/database.js";
import InternshipDocument from "../models/InternshipDocument.js";
import Internship from "../models/Internship.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import AcademicTerm from "../models/AcademicTerm.js";
import User from "../models/User.js";
import ThesisDocument from "../models/ThesisDocument.js";
import internshipDocumentService from "../services/internshipDocumentService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTTDNDocumentsTests() {
  await connectDatabase();
  console.log("\n======================================================");
  console.log("   BẮT ĐẦU KIỂM THỬ TÀI LIỆU TTDN & ĐIỀU HƯỚNG ĐĂNG KÝ");
  console.log("======================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // Snapshot initial ThesisDocument count to verify KLTN isolation
  const initialThesisDocCount = await ThesisDocument.countDocuments();

  // Find or create test entities
  const activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" }) || (await AcademicTerm.findOne());

  // 1. Setup Lecturer A
  let lecturerAUser = await User.findOne({ email: "test_doc_lecturera@iuh.edu.vn" });
  if (!lecturerAUser) {
    lecturerAUser = await User.create({
      fullName: "TS. Nguyễn Văn Hướng Dẫn A",
      email: "test_doc_lecturera@iuh.edu.vn",
      password: "password123",
      role: "LECTURER",
    });
  }

  let lecturerA = await Lecturer.findOne({ userId: lecturerAUser._id });
  if (!lecturerA) {
    lecturerA = await Lecturer.create({
      userId: lecturerAUser._id,
      lecturerCode: "GV9981",
      academicTitle: "TS",
      department: "Công nghệ phần mềm",
    });
  }

  // 2. Setup Lecturer B
  let lecturerBUser = await User.findOne({ email: "test_doc_lecturerb@iuh.edu.vn" });
  if (!lecturerBUser) {
    lecturerBUser = await User.create({
      fullName: "ThS. Trần Thị Hướng Dẫn B",
      email: "test_doc_lecturerb@iuh.edu.vn",
      password: "password123",
      role: "LECTURER",
    });
  }

  let lecturerB = await Lecturer.findOne({ userId: lecturerBUser._id });
  if (!lecturerB) {
    lecturerB = await Lecturer.create({
      userId: lecturerBUser._id,
      lecturerCode: "GV9982",
      academicTitle: "ThS",
      department: "Hệ thống thông tin",
    });
  }

  // 3. Setup Student A (supervised by Lecturer A - APPROVED)
  let studentAUser = await User.findOne({ email: "test_doc_studenta@iuh.edu.vn" });
  if (!studentAUser) {
    studentAUser = await User.create({
      fullName: "Lê Văn Sinh Viên A",
      email: "test_doc_studenta@iuh.edu.vn",
      password: "password123",
      role: "STUDENT",
    });
  }

  let studentA = await Student.findOne({ userId: studentAUser._id });
  if (!studentA) {
    studentA = await Student.create({
      userId: studentAUser._id,
      studentCode: "21009981",
      className: "DHKTPM17A",
      department: "Công nghệ phần mềm",
    });
  }

  // 4. Setup Student B (supervised by Lecturer A - APPROVED - chưa nộp file)
  let studentBUser = await User.findOne({ email: "test_doc_studentb@iuh.edu.vn" });
  if (!studentBUser) {
    studentBUser = await User.create({
      fullName: "Trần Thị Sinh Viên B",
      email: "test_doc_studentb@iuh.edu.vn",
      password: "password123",
      role: "STUDENT",
    });
  }

  let studentB = await Student.findOne({ userId: studentBUser._id });
  if (!studentB) {
    studentB = await Student.create({
      userId: studentBUser._id,
      studentCode: "21009982",
      className: "DHKTPM17A",
      department: "Công nghệ phần mềm",
    });
  }

  // 5. Setup Student C (supervised by Lecturer B - APPROVED)
  let studentCUser = await User.findOne({ email: "test_doc_studentc@iuh.edu.vn" });
  if (!studentCUser) {
    studentCUser = await User.create({
      fullName: "Phạm Văn Sinh Viên C",
      email: "test_doc_studentc@iuh.edu.vn",
      password: "password123",
      role: "STUDENT",
    });
  }

  let studentC = await Student.findOne({ userId: studentCUser._id });
  if (!studentC) {
    studentC = await Student.create({
      userId: studentCUser._id,
      studentCode: "21009983",
      className: "DHKTPM17B",
      department: "Hệ thống thông tin",
    });
  }

  // 6. Setup Student D (Chưa đăng ký thực tập / Không có hồ sơ)
  let studentDUser = await User.findOne({ email: "test_doc_studentd@iuh.edu.vn" });
  if (!studentDUser) {
    studentDUser = await User.create({
      fullName: "Hoàng Văn Sinh Viên D (Chưa đăng ký)",
      email: "test_doc_studentd@iuh.edu.vn",
      password: "password123",
      role: "STUDENT",
    });
  }

  let studentD = await Student.findOne({ userId: studentDUser._id });
  if (!studentD) {
    studentD = await Student.create({
      userId: studentDUser._id,
      studentCode: "21009984",
      className: "DHKTPM17B",
      department: "Công nghệ phần mềm",
    });
  }

  // 7. Setup Student E (Đã đăng ký nhưng hồ sơ đang PENDING)
  let studentEUser = await User.findOne({ email: "test_doc_studente@iuh.edu.vn" });
  if (!studentEUser) {
    studentEUser = await User.create({
      fullName: "Võ Thị Sinh Viên E (Chờ duyệt PENDING)",
      email: "test_doc_studente@iuh.edu.vn",
      password: "password123",
      role: "STUDENT",
    });
  }

  let studentE = await Student.findOne({ userId: studentEUser._id });
  if (!studentE) {
    studentE = await Student.create({
      userId: studentEUser._id,
      studentCode: "21009985",
      className: "DHKTPM17C",
      department: "Công nghệ phần mềm",
    });
  }

  // Setup Company
  let testCompany = await Company.findOne({ name: "Công ty Test Tài Liệu FPT" });
  if (!testCompany) {
    testCompany = await Company.create({
      name: "Công ty Test Tài Liệu FPT",
      address: "Khu Công Nghệ Cao, TP. Thủ Đức",
      email: "contact@fpt-test.vn",
      phone: "02873001234",
    });
  }

  // Clean old test internships & documents for test users
  await Internship.deleteMany({
    studentId: { $in: [studentA._id, studentB._id, studentC._id, studentD._id, studentE._id] },
  });
  await InternshipDocument.deleteMany({
    $or: [
      { uploadedBy: { $in: [lecturerAUser._id, lecturerBUser._id, studentAUser._id, studentBUser._id, studentCUser._id, studentDUser._id, studentEUser._id] } },
      { supervisorId: { $in: [lecturerA._id, lecturerB._id] } },
    ],
  });

  // Create APPROVED Internship for Student A with Lecturer A
  const internshipA = await Internship.create({
    academicTermId: activeTerm?._id,
    studentId: studentA._id,
    lecturerId: lecturerA._id,
    companyId: testCompany._id,
    position: "Backend Developer",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-11-10"),
    durationInWeeks: 10,
    reportCycle: 1,
    status: "APPROVED",
  });

  // Create APPROVED Internship for Student B with Lecturer A
  const internshipB = await Internship.create({
    academicTermId: activeTerm?._id,
    studentId: studentB._id,
    lecturerId: lecturerA._id,
    companyId: testCompany._id,
    position: "Frontend Developer",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-11-10"),
    durationInWeeks: 10,
    reportCycle: 1,
    status: "APPROVED",
  });

  // Create APPROVED Internship for Student C with Lecturer B
  const internshipC = await Internship.create({
    academicTermId: activeTerm?._id,
    studentId: studentC._id,
    lecturerId: lecturerB._id,
    companyId: testCompany._id,
    position: "QA / Tester",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-11-10"),
    durationInWeeks: 10,
    reportCycle: 1,
    status: "APPROVED",
  });

  // Create PENDING Internship for Student E (chưa duyệt)
  const internshipE = await Internship.create({
    academicTermId: activeTerm?._id,
    studentId: studentE._id,
    lecturerId: null,
    companyId: testCompany._id,
    position: "Data Analyst Intern",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-11-10"),
    durationInWeeks: 10,
    reportCycle: 1,
    status: "PENDING",
  });

  console.log("==> Dữ liệu thử nghiệm đã được chuẩn bị thành công.");

  try {
    // ----------------------------------------------------
    // TEST 1: Sinh viên chưa có hồ sơ thực tập (Student D)
    // ----------------------------------------------------
    const studentDGuides = await internshipDocumentService.getStudentGuides(studentDUser._id);
    assert(
      studentDGuides.hasInternship === false &&
      studentDGuides.canSubmit === false &&
      studentDGuides.documents.length === 0,
      "TEST 1: Sinh viên chưa có hồ sơ thực tập trả về hasInternship: false, canSubmit: false",
    );

    let studentDDirectSubmitBlocked = false;
    try {
      await internshipDocumentService.createStudentSubmission({
        userId: studentDUser._id,
        file: { filename: "test_d.pdf", originalname: "Report_D.pdf", size: 1024, mimetype: "application/pdf" },
      });
    } catch (err) {
      if (err.statusCode === 403) studentDDirectSubmitBlocked = true;
    }
    assert(
      studentDDirectSubmitBlocked,
      "TEST 1b: Sinh viên chưa đăng ký thực tập gọi API nộp file bị Backend từ chối (403)",
    );

    // ----------------------------------------------------
    // TEST 2: Sinh viên đã gửi yêu cầu nhưng chưa được duyệt (PENDING - Student E)
    // ----------------------------------------------------
    const studentEGuides = await internshipDocumentService.getStudentGuides(studentEUser._id);
    assert(
      studentEGuides.hasInternship === true &&
      studentEGuides.canSubmit === false &&
      studentEGuides.submitBlockReason.includes("chờ phê duyệt"),
      "TEST 2: Sinh viên có hồ sơ PENDING trả về canSubmit: false và thông báo chờ phê duyệt",
    );

    let studentEDirectSubmitBlocked = false;
    try {
      await internshipDocumentService.createStudentSubmission({
        userId: studentEUser._id,
        file: { filename: "test_e.pdf", originalname: "Report_E.pdf", size: 1024, mimetype: "application/pdf" },
      });
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes("chờ phê duyệt")) {
        studentEDirectSubmitBlocked = true;
      }
    }
    assert(
      studentEDirectSubmitBlocked,
      "TEST 2b: Sinh viên có hồ sơ PENDING gọi API nộp file bị Backend từ chối (403)",
    );

    // ----------------------------------------------------
    // TEST 3: Giảng viên A thêm tài liệu hướng dẫn mới
    // ----------------------------------------------------
    const fakeGuideFile = {
      filename: "test_huong_dan_ttdn.pdf",
      originalname: "HuongDanThucTapDoanhNghiep.pdf",
      size: 1024 * 500,
      mimetype: "application/pdf",
    };

    const createdGuide = await internshipDocumentService.createLecturerGuide({
      userId: lecturerAUser._id,
      file: fakeGuideFile,
      title: "Tài liệu hướng dẫn viết báo cáo TTDN",
      description: "Quy chuẩn trình bày báo cáo thực tập 2026",
      scope: "ALL",
      category: "Tài liệu hướng dẫn",
      academicTermId: activeTerm?._id,
    });

    assert(
      createdGuide &&
      createdGuide.documentType === "GUIDE" &&
      createdGuide.supervisorId.toString() === lecturerA._id.toString() &&
      createdGuide.scope === "ALL",
      "TEST 3: Giảng viên A thêm tài liệu hướng dẫn thành công với documentType: GUIDE và scope: ALL",
    );

    // ----------------------------------------------------
    // TEST 4: Sinh viên A (APPROVED) xem được tài liệu của GVGS và đủ điều kiện nộp file
    // ----------------------------------------------------
    const studentAGuides = await internshipDocumentService.getStudentGuides(studentAUser._id);
    assert(
      studentAGuides.hasInternship === true &&
      studentAGuides.canSubmit === true &&
      studentAGuides.documents.length === 1 &&
      studentAGuides.documents[0]._id.toString() === createdGuide._id.toString() &&
      studentAGuides.internship.companyName === "Công ty Test Tài Liệu FPT",
      "TEST 4: Sinh viên A xem được tài liệu hướng dẫn của GVGS và canSubmit: true",
    );

    // ----------------------------------------------------
    // TEST 5: SỬA LỖI .trim() - Sinh viên nộp file với các trường không bắt buộc bị undefined/null
    // ----------------------------------------------------
    const fakeSubFileA1 = {
      filename: "test_baocao_svA1.docx",
      originalname: "BaoCaoTienDo_LeVanA.docx",
      size: 1024 * 800,
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    // Nộp khi title = undefined, description = undefined, category = undefined
    let noTrimCrash = true;
    let submissionA1 = null;
    try {
      submissionA1 = await internshipDocumentService.createStudentSubmission({
        userId: studentAUser._id,
        file: fakeSubFileA1,
        title: undefined,
        description: undefined,
        category: undefined,
      });
    } catch (err) {
      if (err.message.includes("trim")) {
        noTrimCrash = false;
      }
    }

    assert(
      noTrimCrash &&
      submissionA1 &&
      submissionA1.title === "BaoCaoTienDo_LeVanA.docx" &&
      submissionA1.description === "" &&
      submissionA1.category === "Báo cáo thực tập",
      "TEST 5a: SỬA LỖI .trim() - Nộp file khi title, description, category là undefined không bị crash và gán giá trị mặc định an toàn",
    );

    // Nộp khi title = null, description = null
    let noTrimCrashNull = true;
    let submissionA2 = null;
    try {
      submissionA2 = await internshipDocumentService.createStudentSubmission({
        userId: studentAUser._id,
        file: {
          filename: "test_baocao_svA2.pdf",
          originalname: "PhieuKhaoSat_A.pdf",
          size: 1024 * 200,
          mimetype: "application/pdf",
        },
        title: null,
        description: null,
        category: "Phiếu khảo sát",
      });
    } catch (err) {
      if (err.message.includes("trim")) {
        noTrimCrashNull = false;
      }
    }

    assert(
      noTrimCrashNull &&
      submissionA2 &&
      submissionA2.title === "PhieuKhaoSat_A.pdf" &&
      submissionA2.category === "Phiếu khảo sát",
      "TEST 5b: SỬA LỖI .trim() - Nộp file khi title, description là null không bị crash",
    );

    // ----------------------------------------------------
    // TEST 6: Nộp file khi thiếu file đính kèm (trường bắt buộc)
    // ----------------------------------------------------
    let emptyFileBlocked = false;
    try {
      await internshipDocumentService.createStudentSubmission({
        userId: studentAUser._id,
        file: null,
        title: "Báo cáo thiếu file",
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes("chọn tệp tài liệu")) {
        emptyFileBlocked = true;
      }
    }
    assert(
      emptyFileBlocked,
      "TEST 6: Nộp file thiếu file đính kèm bị chặn với thông báo lỗi 400 rõ ràng",
    );

    // ----------------------------------------------------
    // TEST 7: Sinh viên A xem danh sách file đã nộp & tải file
    // ----------------------------------------------------
    const studentASubmissions = await internshipDocumentService.getStudentSubmissions(studentAUser._id);
    assert(
      studentASubmissions.length === 2 &&
      studentASubmissions.some((s) => s.title === "BaoCaoTienDo_LeVanA.docx") &&
      studentASubmissions.some((s) => s.title === "PhieuKhaoSat_A.pdf"),
      "TEST 7: Sinh viên A xem được danh sách file đã nộp đầy đủ và chính xác",
    );

    // ----------------------------------------------------
    // TEST 8: Sinh viên A xóa file đã nộp của chính mình
    // ----------------------------------------------------
    const deleteSubRes = await internshipDocumentService.deleteStudentSubmission(
      submissionA2._id,
      studentAUser._id,
    );
    const subsAfterDelete = await internshipDocumentService.getStudentSubmissions(studentAUser._id);
    assert(
      deleteSubRes.success === true && subsAfterDelete.length === 1,
      "TEST 8: Sinh viên A xóa file đã nộp của chính mình thành công",
    );

    // ----------------------------------------------------
    // TEST 9: Giảng viên A xem danh sách file và thống kê ai đã nộp / ai chưa nộp
    // ----------------------------------------------------
    const lecturerASubmissions = await internshipDocumentService.getLecturerSubmissions(
      lecturerAUser._id,
      { academicTermId: activeTerm?._id },
    );
    assert(
      lecturerASubmissions.stats.totalStudents === 2 &&
      lecturerASubmissions.stats.submittedCount === 1 &&
      lecturerASubmissions.stats.notSubmittedCount === 1 &&
      lecturerASubmissions.studentsStatus.find((s) => s.studentCode === "21009981")?.hasSubmitted === true &&
      lecturerASubmissions.studentsStatus.find((s) => s.studentCode === "21009982")?.hasSubmitted === false,
      "TEST 9: Giảng viên A kiểm tra chính xác thống kê nộp: SV A đã nộp, SV B chưa nộp",
    );

    // ----------------------------------------------------
    // TEST 10: KIỂM TRA ĐIỀU HƯỚNG NÚT "ĐĂNG KÝ NGAY" TRÊN TRANG THÔNG TIN THỰC TẬP
    // ----------------------------------------------------
    const myInternshipPageContent = fs.readFileSync(
      path.join(__dirname, "../../../frontend/src/pages/student/MyInternshipPage.jsx"),
      "utf8",
    );
    const hasFixedRegisterLink =
      myInternshipPageContent.includes('to="/student/internship/register"') &&
      !myInternshipPageContent.includes('to="/student/register-internship"');
    assert(
      hasFixedRegisterLink,
      "TEST 10: Nút 'Đăng ký Thực tập ngay' tại MyInternshipPage đã trỏ đúng vào '/student/internship/register' (không còn 404)",
    );

    // ----------------------------------------------------
    // TEST 11: KIỂM TRA THỨ TỰ SIDEBAR TTDN
    // ----------------------------------------------------
    const studentSidebarContent = fs.readFileSync(
      path.join(__dirname, "../../../frontend/src/components/layout/StudentSidebar.jsx"),
      "utf8",
    );

    const subItemsStart = studentSidebarContent.indexOf("const internshipSubItems = [");
    const subItemsEnd = studentSidebarContent.indexOf("];", subItemsStart);
    const slice = studentSidebarContent.slice(subItemsStart, subItemsEnd);

    const regIdx = slice.indexOf("label: 'Đăng ký thực tập'");
    const infoIdx = slice.indexOf("label: 'Thông tin thực tập'");
    const docIdx = slice.indexOf("label: 'Tài liệu thực tập'");
    const reportIdx = slice.indexOf("label: 'Nhật ký thực tập'");
    const evalIdx = slice.indexOf("label: 'Đánh giá thực tập'");

    const isOrderCorrect =
      regIdx !== -1 &&
      infoIdx !== -1 &&
      docIdx !== -1 &&
      reportIdx !== -1 &&
      evalIdx !== -1 &&
      regIdx < infoIdx &&
      infoIdx < docIdx &&
      docIdx < reportIdx &&
      reportIdx < evalIdx;

    assert(
      isOrderCorrect,
      "TEST 11: Thứ tự sidebar TTDN chính xác: 1. Đăng ký -> 2. Thông tin -> 3. Tài liệu -> 4. Nhật ký -> 5. Đánh giá",
    );

    // ----------------------------------------------------
    // TEST 12: BẢO TOÀN TUYỆT ĐỐI MODULE KHÓA LUẬN TỐT NGHIỆP (KLTN)
    // ----------------------------------------------------
    const finalThesisDocCount = await ThesisDocument.countDocuments();
    assert(
      initialThesisDocCount === finalThesisDocCount,
      `TEST 12: Số lượng tài liệu KLTN giữ nguyên (${initialThesisDocCount} = ${finalThesisDocCount}) - Không chỉnh sửa KLTN`,
    );

  } catch (err) {
    console.error("LỖI NGOẠI LỆ TRONG KHI KIỂM THỬ:", err);
    failedCount++;
  } finally {
    // Dọn dẹp dữ liệu thử nghiệm
    await Internship.deleteMany({
      studentId: { $in: [studentA._id, studentB._id, studentC._id, studentD._id, studentE._id] },
    });
    await InternshipDocument.deleteMany({
      $or: [
        { uploadedBy: { $in: [lecturerAUser._id, lecturerBUser._id, studentAUser._id, studentBUser._id, studentCUser._id, studentDUser._id, studentEUser._id] } },
        { supervisorId: { $in: [lecturerA._id, lecturerB._id] } },
      ],
    });
    await Student.deleteMany({ _id: { $in: [studentA._id, studentB._id, studentC._id, studentD._id, studentE._id] } });
    await Lecturer.deleteMany({ _id: { $in: [lecturerA._id, lecturerB._id] } });
    await User.deleteMany({
      _id: { $in: [lecturerAUser._id, lecturerBUser._id, studentAUser._id, studentBUser._id, studentCUser._id, studentDUser._id, studentEUser._id] },
    });
    if (testCompany) {
      await Company.deleteOne({ _id: testCompany._id });
    }

    await mongoose.disconnect();
  }

  console.log("\n======================================================");
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedCount} PASS / ${failedCount} FAIL`);
  console.log("======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTTDNDocumentsTests();
