import connectDatabase from "../config/database.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Internship from "../models/Internship.js";
import InternshipDocument from "../models/InternshipDocument.js";
import internshipService from "../services/internshipService.js";
import internshipDocumentService from "../services/internshipDocumentService.js";

const verifyReportSync = async () => {
  try {
    await connectDatabase();
    console.log("=== BẮT ĐẦU KIỂM THỬ ĐỒNG BỘ BÁO CÁO TTDN ===");

    const bich = await Student.findOne({ studentCode: "22635201" }).populate("userId");
    const an = await Student.findOne({ studentCode: "22635271" }).populate("userId");

    if (!bich || !an) {
      throw new Error("Không tìm thấy sinh viên mẫu Bích hoặc An");
    }

    const bichInternship = await Internship.findOne({ studentId: bich._id });
    const anInternship = await Internship.findOne({ studentId: an._id });

    console.log("\n[1] Kiểm tra Database Model trực tiếp:");
    console.log("Trần Thị Bích reportFile:", bichInternship?.reportFile);
    console.log("Nguyễn Văn An reportFile:", anInternship?.reportFile);

    const supervisorId = bichInternship.lecturerId || anInternship.lecturerId;
    const lecturer = await Lecturer.findById(supervisorId);
    console.log(`\nGiảng viên giám sát: ${lecturer.lecturerCode} (User ID: ${lecturer.userId})`);

    // [2] Kiểm tra API Màn hình 1 ("Sinh viên thực tập") & Màn hình 2 ("Hồ sơ thực tập")
    console.log("\n[2] Kiểm tra qua internshipService.getSupervisedInternships (Cổng GV: Màn hình 1 & 2):");
    const supervisedRes = await internshipService.getSupervisedInternships(lecturer.userId, { limit: 100 });
    const list = supervisedRes.data;

    const bichInList = list.find((i) => i.studentId?._id?.toString() === bich._id.toString());
    const anInList = list.find((i) => i.studentId?._id?.toString() === an._id.toString());

    console.log(`- Trần Thị Bích:`);
    console.log(`  + reportFileSubmitted:`, bichInList?.reportFileSubmitted);
    console.log(`  + fileUrl:`, bichInList?.reportFile?.fileUrl);
    console.log(`  + canGrade:`, bichInList?.canGrade);
    console.log(`  + gradingBlockReasons:`, bichInList?.gradingBlockReasons);

    console.log(`- Nguyễn Văn An:`);
    console.log(`  + reportFileSubmitted:`, anInList?.reportFileSubmitted);
    console.log(`  + fileUrl:`, anInList?.reportFile?.fileUrl);
    console.log(`  + canGrade:`, anInList?.canGrade);
    console.log(`  + gradingBlockReasons:`, anInList?.gradingBlockReasons);

    // [3] Kiểm tra API Màn hình 3 ("Tài liệu thực tập -> Tab Tài liệu sinh viên")
    console.log("\n[3] Kiểm tra qua internshipDocumentService.getLecturerSubmissions (Cổng GV: Màn hình 3):");
    const subRes = await internshipDocumentService.getLecturerSubmissions(lecturer.userId);
    const submissions = subRes.submissions;
    const studentsStatus = subRes.studentsStatus;

    const bichSub = submissions.filter((s) => s.studentId?._id?.toString() === bich._id.toString());
    const anSub = submissions.filter((s) => s.studentId?._id?.toString() === an._id.toString());

    const bichStatus = studentsStatus.find((s) => s.studentId === bich._id.toString());
    const anStatus = studentsStatus.find((s) => s.studentId === an._id.toString());

    console.log(`- Trần Thị Bích:`);
    console.log(`  + Số file xuất hiện trong submissions:`, bichSub.length);
    console.log(`  + Danh sách file:`, bichSub.map((s) => ({ title: s.title, file: s.fileName, url: s.fileUrl, cat: s.category })));
    console.log(`  + Trạng thái studentsStatus: hasSubmitted =`, bichStatus?.hasSubmitted, `, count =`, bichStatus?.submissionCount);

    console.log(`- Nguyễn Văn An:`);
    console.log(`  + Số file xuất hiện trong submissions:`, anSub.length);
    console.log(`  + Danh sách file:`, anSub.map((s) => ({ title: s.title, file: s.fileName, url: s.fileUrl, cat: s.category })));
    console.log(`  + Trạng thái studentsStatus: hasSubmitted =`, anStatus?.hasSubmitted, `, count =`, anStatus?.submissionCount);

    // [4] Kiểm tra getReportFile tải xuống
    console.log("\n[4] Kiểm tra tải file báo cáo qua internshipService.getReportFile:");
    const requestingLecturerUser = { userId: lecturer.userId, role: "LECTURER" };
    const bichFile = await internshipService.getReportFile(bichInternship._id, requestingLecturerUser);
    const anFile = await internshipService.getReportFile(anInternship._id, requestingLecturerUser);
    console.log("Trần Thị Bích getReportFile:", bichFile.fileName, bichFile.fileUrl);
    console.log("Nguyễn Văn An getReportFile:", anFile.fileName, anFile.fileUrl);

    // Assertions
    const passBich = bichInList?.reportFileSubmitted === true && bichSub.length > 0 && bichStatus?.hasSubmitted === true && Boolean(bichFile?.fileUrl);
    const passAn = anInList?.reportFileSubmitted === true && anSub.length > 0 && anStatus?.hasSubmitted === true && Boolean(anFile?.fileUrl);

    console.log("\n==========================================");
    if (passBich && passAn) {
      console.log("✅ TẤT CẢ CÁC ĐIỀU KIỆN KIỂM THỬ ĐÃ ĐẠT 100%!");
    } else {
      console.error("❌ CÓ ĐIỀU KIỆN KIỂM THỬ CHƯA ĐẠT!");
    }
    console.log("==========================================");
    process.exit(passBich && passAn ? 0 : 1);
  } catch (err) {
    console.error("Lỗi kiểm thử:", err);
    process.exit(1);
  }
};

verifyReportSync();

