import mongoose from "mongoose";
import connectDatabase from "../config/database.js";
import Internship from "../models/Internship.js";
import InternshipReport from "../models/InternshipReport.js";
import Evaluation from "../models/Evaluation.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import AcademicTerm from "../models/AcademicTerm.js";
import User from "../models/User.js";
import internshipService from "../services/internshipService.js";
import evaluationService from "../services/evaluationService.js";
import {
  getMandatoryReportWeeks,
  checkInternshipDiaryCompletion,
} from "../utils/internshipDateUtils.js";

async function runPrompt2Tests() {
  await connectDatabase();
  console.log("\n======================================================");
  console.log("   BẮT ĐẦU KIỂM THỬ 17 TRƯỜNG HỢP THEO YÊU CẦU PROMPT 2");
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

  // Backup active academic term
  const activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" });
  const originalGradingStart = activeTerm?.internship?.gradingStart;
  const originalGradingEnd = activeTerm?.internship?.gradingEnd;

  // Temporary test entities
  let testInternship = null;
  let testStudentUser = null;
  let testStudent = null;
  let testLecturerUser = null;
  let testLecturer = null;
  let otherLecturerUser = null;
  let otherLecturer = null;
  let testCompany = null;
  let createdReports = [];

  try {
    // 1. Setup Test Fixtures
    testStudentUser = await User.create({
      fullName: "Test SV Prompt2",
      email: `test_sv_p2_${Date.now()}@iuh.edu.vn`,
      password: "password123",
      role: "STUDENT",
      isActive: true,
    });

    const random8Digits = String(Math.floor(10000000 + Math.random() * 90000000));
    testStudent = await Student.create({
      userId: testStudentUser._id,
      studentCode: random8Digits,
      className: "DHKTPM18A",
      major: "Kỹ thuật phần mềm",
    });

    testLecturerUser = await User.create({
      fullName: "Test GVGS Prompt2",
      email: `test_gv_p2_${Date.now()}@iuh.edu.vn`,
      password: "password123",
      role: "LECTURER",
      isActive: true,
    });

    const randomLecCode1 = `GV${Math.floor(1000 + Math.random() * 8999)}`;
    const randomLecCode2 = `GV${Math.floor(1000 + Math.random() * 8999)}`;

    testLecturer = await Lecturer.create({
      userId: testLecturerUser._id,
      lecturerCode: randomLecCode1,
      academicTitle: "ThS",
      maxStudents: 30,
    });

    otherLecturerUser = await User.create({
      fullName: "Other GVGS Prompt2",
      email: `other_gv_p2_${Date.now()}@iuh.edu.vn`,
      password: "password123",
      role: "LECTURER",
      isActive: true,
    });

    otherLecturer = await Lecturer.create({
      userId: otherLecturerUser._id,
      lecturerCode: randomLecCode2,
      academicTitle: "TS",
      maxStudents: 30,
    });

    testCompany = await Company.create({
      name: `Công ty CP Test Prompt 2 ${Date.now()}`,
      address: "12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM",
      contactPerson: "Anh Tuyển Dụng",
      contactEmail: "recruitment@testp2.com",
      status: "ACTIVE",
    });

    // Create Internship: 10 weeks, Cycle: 2 weeks/time
    // Start date 2026-10-01, End date 2026-12-09 (70 days = 10 weeks)
    testInternship = await Internship.create({
      academicTermId: activeTerm?._id,
      studentId: testStudent._id,
      lecturerId: testLecturer._id,
      companyId: testCompany._id,
      position: "Lập trình viên Backend Node.js",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-12-09"),
      durationInWeeks: 10,
      reportCycle: 2, // mandatory weeks: 2, 4, 6, 8, 10
      status: "INTERNING",
      pretest: {
        isPassed: false,
      },
    });

    // -----------------------------------------------------------------
    // TEST 1: Sinh viên chưa nộp file báo cáo: GVGS không xem được file và điều kiện hồ sơ chưa đạt
    // -----------------------------------------------------------------
    console.log("--- TEST 1: CHƯA NỘP FILE BÁO CÁO THỰC TẬP ---");
    let test1Error = null;
    try {
      await internshipService.getReportFile(testInternship._id, {
        userId: testLecturerUser._id,
        role: "LECTURER",
      });
    } catch (err) {
      test1Error = err;
    }
    assert(
      test1Error !== null && test1Error.message.includes("chưa nộp file báo cáo"),
      "1. Sinh viên chưa nộp file báo cáo: GVGS không xem được file và nhận thông báo chưa nộp"
    );

    // -----------------------------------------------------------------
    // TEST 2: Sinh viên nộp file báo cáo hợp lệ: GVGS xem được đúng file
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: NỘP VÀ XEM FILE BÁO CÁO HỢP LỆ ---");
    const mockFile = {
      originalname: "Bao_Cao_Thuc_Tap_NguyenVanA.pdf",
      filename: `Bao_Cao_Thuc_Tap-${Date.now()}.pdf`,
      size: 2048500, // ~2MB
      mimetype: "application/pdf",
    };

    const updatedWithFile = await internshipService.uploadReportFile({
      internshipId: testInternship._id,
      userId: testStudentUser._id,
      file: mockFile,
    });

    assert(
      updatedWithFile?.reportFile?.fileName === mockFile.filename &&
        updatedWithFile?.reportFile?.fileUrl.includes(mockFile.filename),
      "2a. Sinh viên nộp file báo cáo hợp lệ thành công và lưu vào hồ sơ"
    );

    const reportFileViewed = await internshipService.getReportFile(testInternship._id, {
      userId: testLecturerUser._id,
      role: "LECTURER",
    });

    assert(
      reportFileViewed?.fileName === mockFile.filename &&
        reportFileViewed?.originalName === mockFile.originalname,
      "2b. GVGS xem được đúng file báo cáo sinh viên đã nộp"
    );

    // -----------------------------------------------------------------
    // TEST 3: GVGS chỉ xem được hồ sơ của sinh viên mình có quyền hướng dẫn
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: PHÂN QUYỀN TRUY CẬP FILE BÁO CÁO CỦA GVGS ---");
    let unauthorizedLecturerError = null;
    try {
      await internshipService.getReportFile(testInternship._id, {
        userId: otherLecturerUser._id,
        role: "LECTURER",
      });
    } catch (err) {
      unauthorizedLecturerError = err;
    }
    assert(
      unauthorizedLecturerError !== null &&
        unauthorizedLecturerError.message.includes("không phải là Giảng viên Giám sát"),
      "3. GVGS không có quyền hướng dẫn bị từ chối truy cập file báo cáo của sinh viên (403)"
    );

    // -----------------------------------------------------------------
    // TEST 8: Chu kỳ nhật ký là 2 tuần/lần: hệ thống kiểm tra đúng các tuần 2, 4, 6, 8, 10
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: TỰ ĐỘNG XÁC ĐỊNH TUẦN BẮT BUỘC THEO CHU KỲ 2 TUẦN/LẦN ---");
    const mandatoryWeeksC2 = getMandatoryReportWeeks(10, 2);
    assert(
      JSON.stringify(mandatoryWeeksC2) === JSON.stringify([2, 4, 6, 8, 10]),
      "8a. Thời lượng 10 tuần, chu kỳ 2 xác định chính xác các tuần bắt buộc: [2, 4, 6, 8, 10]"
    );

    const mandatoryWeeksC3 = getMandatoryReportWeeks(12, 3);
    assert(
      JSON.stringify(mandatoryWeeksC3) === JSON.stringify([3, 6, 9, 12]),
      "8b. Thời lượng 12 tuần, chu kỳ 3 xác định chính xác các tuần bắt buộc: [3, 6, 9, 12]"
    );

    // -----------------------------------------------------------------
    // TEST 4: Chưa PASS PRETEST: không được chấm điểm
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: RÀNG BUỘC ĐIỀU KIỆN 1 - PASS PRETEST ---");
    let gradeErrPretest = null;
    try {
      await evaluationService.gradeInternshipByLecturer({
        internshipId: testInternship._id,
        lecturerUserId: testLecturerUser._id,
        score: 8.5,
        comments: "Chấm thử khi chưa pass pretest",
      });
    } catch (err) {
      gradeErrPretest = err;
    }
    assert(
      gradeErrPretest !== null && gradeErrPretest.message.includes("chưa được GVGS xác nhận PASS PRETEST"),
      "4. Chưa PASS PRETEST: hệ thống từ chối chấm điểm với lỗi rõ ràng"
    );

    // GVGS xác nhận PASS PRETEST
    await internshipService.updatePretestStatus(testInternship._id, {
      userId: testLecturerUser._id,
      role: "LECTURER",
    }, { isPassed: true, note: "Đạt kiểm tra kiến thức trước thực tập" });

    const reloadedInternship = await Internship.findById(testInternship._id);
    assert(
      reloadedInternship.pretest?.isPassed === true,
      "4b. GVGS xác nhận PASS PRETEST thành công và lưu vào database"
    );

    // -----------------------------------------------------------------
    // TEST 5 & 9: Đã PASS PRETEST nhưng thiếu nhật ký: không được chấm điểm
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5 & 9: THIẾU NHẬT KÝ BẮT BUỘC: KHÔNG ĐƯỢC CHẤM ĐIỂM ---");
    let gradeErrDiary = null;
    try {
      await evaluationService.gradeInternshipByLecturer({
        internshipId: testInternship._id,
        lecturerUserId: testLecturerUser._id,
        score: 8.5,
        comments: "Chấm thử khi chưa đủ nhật ký",
      });
    } catch (err) {
      gradeErrDiary = err;
    }
    assert(
      gradeErrDiary !== null && gradeErrDiary.message.includes("chưa hoàn thành nhật ký thực tập"),
      "5. Đã PASS PRETEST nhưng thiếu toàn bộ nhật ký: từ chối chấm điểm"
    );

    // Tạo báo cáo hợp lệ cho tuần 2, 4, 6 (vẫn thiếu tuần 8, 10)
    for (const w of [2, 4, 6]) {
      const rep = await InternshipReport.create({
        internshipId: testInternship._id,
        studentId: testStudent._id,
        reportType: "WEEKLY",
        weekNumber: w,
        title: `Nhật ký tuần ${w}`,
        content: `Nội dung tuần ${w}`,
        status: "SUBMITTED",
      });
      createdReports.push(rep);
    }

    let gradeErrPartialDiary = null;
    try {
      await evaluationService.gradeInternshipByLecturer({
        internshipId: testInternship._id,
        lecturerUserId: testLecturerUser._id,
        score: 8.5,
        comments: "Chấm thử khi thiếu tuần 8, 10",
      });
    } catch (err) {
      gradeErrPartialDiary = err;
    }
    assert(
      gradeErrPartialDiary !== null &&
        gradeErrPartialDiary.message.includes("8, 10"),
      "9. Thiếu tuần bắt buộc 8 và 10: hệ thống từ chối chấm điểm và liệt kê rõ tuần thiếu"
    );

    // Tạo thêm bản nháp DRAFT cho tuần 8 (DRAFT không được tính là nộp)
    const draftRep8 = await InternshipReport.create({
      internshipId: testInternship._id,
      studentId: testStudent._id,
      reportType: "WEEKLY",
      weekNumber: 8,
      title: "Nhật ký tuần 8 bản nháp",
      content: "Chưa nộp chính thức",
      status: "DRAFT",
    });
    createdReports.push(draftRep8);

    const diaryCheckDraft = checkInternshipDiaryCompletion(
      testInternship,
      await InternshipReport.find({ internshipId: testInternship._id })
    );
    assert(
      !diaryCheckDraft.isCompleted && diaryCheckDraft.missingWeeks.includes(8),
      "9b. Bản nháp (DRAFT) tuần 8 không được tính là nhật ký hợp lệ, tuần 8 vẫn bị coi là thiếu"
    );

    // Chuyển tuần 8 và 10 sang SUBMITTED
    draftRep8.status = "SUBMITTED";
    await draftRep8.save();

    const rep10 = await InternshipReport.create({
      internshipId: testInternship._id,
      studentId: testStudent._id,
      reportType: "WEEKLY",
      weekNumber: 10,
      title: "Nhật ký tuần 10",
      content: "Nội dung tuần 10",
      status: "APPROVED",
    });
    createdReports.push(rep10);

    const diaryCheckFull = checkInternshipDiaryCompletion(
      testInternship,
      await InternshipReport.find({ internshipId: testInternship._id })
    );
    assert(
      diaryCheckFull.isCompleted === true && diaryCheckFull.missingWeeks.length === 0,
      "9c. Khi đã nộp đủ tuần 2, 4, 6, 8, 10: hệ thống tự động xác nhận hoàn thành nhật ký"
    );

    // -----------------------------------------------------------------
    // TEST 6: Đã PASS PRETEST, đủ nhật ký nhưng chưa nộp file báo cáo: không được chấm điểm
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: ĐÃ PASS PRETEST, ĐỦ NHẬT KÝ NHƯNG CHƯA NỘP FILE BÁO CÁO ---");
    // Xóa tạm reportFile để test điều kiện 3
    await Internship.findByIdAndUpdate(testInternship._id, { reportFile: null });

    let gradeErrNoReportFile = null;
    try {
      await evaluationService.gradeInternshipByLecturer({
        internshipId: testInternship._id,
        lecturerUserId: testLecturerUser._id,
        score: 9.0,
        comments: "Chấm khi thiếu file báo cáo",
      });
    } catch (err) {
      gradeErrNoReportFile = err;
    }
    assert(
      gradeErrNoReportFile !== null && gradeErrNoReportFile.message.includes("chưa nộp file báo cáo"),
      "6. Đã PASS PRETEST và đủ nhật ký nhưng chưa nộp file báo cáo: từ chối chấm điểm"
    );

    // Khôi phục file báo cáo
    await Internship.findByIdAndUpdate(testInternship._id, {
      reportFile: {
        originalName: "Bao_Cao_Thuc_Tap_Chinh_Thuc.docx",
        fileName: "Bao_Cao_Thuc_Tap_Chinh_Thuc.docx",
        fileUrl: "/uploads/internship-reports/Bao_Cao_Thuc_Tap_Chinh_Thuc.docx",
        fileSize: 1048576,
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        uploadedAt: new Date(),
      },
    });

    // -----------------------------------------------------------------
    // TEST 7 & 10: Đã đủ cả 3 điều kiện: GVGS chấm điểm lần đầu và lưu thành công
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7 & 10: ĐỦ CẢ 3 ĐIỀU KIỆN - CHẤM ĐIỂM LẦN ĐẦU ---");
    // Tạm cấu hình gradingStart & gradingEnd cho term để qua tầng kiểm tra khung thời gian
    await AcademicTerm.findByIdAndUpdate(activeTerm._id, {
      "internship.gradingStart": "2026-01-01",
      "internship.gradingEnd": "2027-12-31",
    });

    const gradeResult1 = await evaluationService.gradeInternshipByLecturer({
      internshipId: testInternship._id,
      lecturerUserId: testLecturerUser._id,
      score: 8.5,
      comments: "Sinh viên có tinh thần học hỏi tốt, hoàn thành đầy đủ nhiệm vụ tại doanh nghiệp.",
    });

    assert(
      gradeResult1?.evaluation &&
        gradeResult1.evaluation.score === 8.5 &&
        gradeResult1.isUpdate === false,
      "7 & 10. Đủ cả 3 điều kiện (PASS PRETEST, đủ nhật ký, có file báo cáo): Chấm điểm lần đầu thành công (8.5 điểm)"
    );

    // -----------------------------------------------------------------
    // TEST 11: GVGS mở lại form và thấy đúng điểm đã lưu
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: MỞ LẠI FORM VÀ THẤY ĐÚNG ĐIỂM ĐÃ LƯU ---");
    const savedEval = await Evaluation.findOne({
      evaluationType: "INTERNSHIP",
      targetId: testInternship._id,
    });
    assert(
      savedEval && savedEval.score === 8.5 && savedEval.comments.includes("tinh thần học hỏi tốt"),
      "11. Mở lại dữ liệu đánh giá: Điểm 8.5 và nhận xét được lưu trữ nguyên vẹn"
    );

    // -----------------------------------------------------------------
    // TEST 15: Điểm và nhận xét không bị thay đổi khi chỉ mở form (read-only query)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 15: ĐIỂM KHÔNG BỊ THAY ĐỔI KHI CHỈ XEM/MỞ FORM ---");
    const getEvalQuery = await Evaluation.findOne({ targetId: testInternship._id });
    assert(
      getEvalQuery.score === 8.5,
      "15. Điểm số và nhận xét hoàn toàn không bị biến đổi khi chỉ đọc dữ liệu"
    );

    // -----------------------------------------------------------------
    // TEST 12 & 13: GVGS chỉnh sửa điểm và lưu thành công (Reload vẫn là điểm mới)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 12 & 13: CHỈNH SỬA ĐIỂM ĐÁNH GIÁ (LƯU VẾT LỊCH SỬ) ---");
    const gradeResult2 = await evaluationService.gradeInternshipByLecturer({
      internshipId: testInternship._id,
      lecturerUserId: testLecturerUser._id,
      score: 9.0,
      comments: "Cập nhật: Sinh viên đạt kết quả xuất sắc trong dự án thực tế.",
    });

    assert(
      gradeResult2?.evaluation &&
        gradeResult2.evaluation.score === 9.0 &&
        gradeResult2.isUpdate === true,
      "12a. Chỉnh sửa điểm thành công: Điểm số cập nhật thành 9.0 và phân biệt là thao tác UPDATE"
    );

    // Reload from DB
    const reloadedEval = await Evaluation.findById(savedEval._id);
    assert(
      reloadedEval.score === 9.0 && reloadedEval.comments.includes("kết quả xuất sắc"),
      "13. Tải lại từ database: Điểm mới 9.0 được lưu kiên cố, không bị mất hoặc trở về điểm cũ"
    );

    // Kiểm tra không tạo bản ghi Evaluation trùng lặp
    const totalEvalsForInternship = await Evaluation.countDocuments({
      targetId: testInternship._id,
    });
    assert(
      totalEvalsForInternship === 1,
      "12b. Không tạo bản ghi Evaluation trùng lặp khi chỉnh sửa điểm"
    );

    // Kiểm tra lưu vết lịch sử (editHistory)
    assert(
      Array.isArray(reloadedEval.editHistory) &&
        reloadedEval.editHistory.length >= 2 &&
        reloadedEval.editHistory.some(
          (h) => h.previousScore === 8.5 && h.newScore === 9.0 && h.action === "UPDATE"
        ),
      "12c. Lưu vết lịch sử chỉnh sửa điểm (editHistory) đầy đủ: người sửa, thời gian, điểm cũ (8.5), điểm mới (9.0)"
    );

    // -----------------------------------------------------------------
    // TEST 14: Người không có quyền không thể chỉnh sửa điểm bằng cách gọi API trực tiếp
    // -----------------------------------------------------------------
    console.log("\n--- TEST 14: NGƯỜI KHÔNG CÓ QUYỀN KHÔNG THỂ SỬA ĐIỂM ---");
    let unauthorizedEditErr = null;
    try {
      await evaluationService.gradeInternshipByLecturer({
        internshipId: testInternship._id,
        lecturerUserId: otherLecturerUser._id,
        score: 10,
        comments: "Hacker sửa điểm",
      });
    } catch (err) {
      unauthorizedEditErr = err;
    }
    assert(
      unauthorizedEditErr !== null &&
        unauthorizedEditErr.message.includes("không phải là Giảng viên Giám sát"),
      "14. Giảng viên không được phân công gọi API sửa điểm bị chặn với mã lỗi 403"
    );

    // -----------------------------------------------------------------
    // TEST 16: Không cho phép sửa điểm nếu kết quả đã bị khóa / đã công bố
    // -----------------------------------------------------------------
    console.log("\n--- TEST 16: KHÔNG CHO PHÉP SỬA ĐIỂM KHI ĐÃ CÔNG BỐ (ĐÃ KHÓA) ---");
    reloadedEval.isScorePublished = true;
    await reloadedEval.save();

    await Internship.findByIdAndUpdate(testInternship._id, { isScorePublished: true });

    let lockedScoreEditErr = null;
    try {
      await evaluationService.gradeInternshipByLecturer({
        internshipId: testInternship._id,
        lecturerUserId: testLecturerUser._id,
        score: 9.5,
        comments: "Sửa điểm sau khi đã công bố",
      });
    } catch (err) {
      lockedScoreEditErr = err;
    }
    assert(
      lockedScoreEditErr !== null &&
        lockedScoreEditErr.message.includes("đã được công bố, không thể chỉnh sửa điểm"),
      "16. Kết quả đã công bố: Hệ thống tuân thủ trạng thái khóa, từ chối chỉnh sửa điểm"
    );

    // -----------------------------------------------------------------
    // TEST 17: Các điều kiện chấm điểm TTDN vẫn được áp dụng bình thường
    // -----------------------------------------------------------------
    console.log("\n--- TEST 17: CÁC ĐIỀU KIỆN CHẤM ĐIỂM VẪN ÁP DỤNG BÌNH THƯỜNG ---");
    const finalInternshipData = (
      await internshipService.getSupervisedInternships({
        userId: testLecturerUser._id,
      })
    ).data.find((d) => d._id.toString() === testInternship._id.toString());

    assert(
      finalInternshipData &&
        finalInternshipData.pretestPassed === true &&
        finalInternshipData.reportFileSubmitted === true &&
        finalInternshipData.diaryStatus?.isCompleted === true,
      "17. Danh sách sinh viên của GVGS hiển thị chính xác trạng thái đạt của cả 3 điều kiện"
    );
  } finally {
    // Restore academic term
    if (activeTerm) {
      await AcademicTerm.findByIdAndUpdate(activeTerm._id, {
        "internship.gradingStart": originalGradingStart,
        "internship.gradingEnd": originalGradingEnd,
      });
    }

    // Cleanup created test records
    if (testInternship) {
      await Evaluation.deleteMany({ targetId: testInternship._id });
      await InternshipReport.deleteMany({ internshipId: testInternship._id });
      await Internship.findByIdAndDelete(testInternship._id);
    }
    if (testStudent) await Student.findByIdAndDelete(testStudent._id);
    if (testStudentUser) await User.findByIdAndDelete(testStudentUser._id);
    if (testLecturer) await Lecturer.findByIdAndDelete(testLecturer._id);
    if (testLecturerUser) await User.findByIdAndDelete(testLecturerUser._id);
    if (otherLecturer) await Lecturer.findByIdAndDelete(otherLecturer._id);
    if (otherLecturerUser) await User.findByIdAndDelete(otherLecturerUser._id);
    if (testCompany) await Company.findByIdAndDelete(testCompany._id);

    console.log("\nĐã dọn dẹp toàn bộ dữ liệu test mẫu, bảo toàn nguyên vẹn cơ sở dữ liệu.");
  }

  console.log("\n======================================================");
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log("======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPrompt2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
