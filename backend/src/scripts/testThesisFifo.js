import mongoose from "mongoose";
import dotenv from "dotenv";
import ThesisTopic from "../models/ThesisTopic.js";
import Thesis from "../models/Thesis.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import AcademicTerm from "../models/AcademicTerm.js";
import thesisService from "../services/thesisService.js";

dotenv.config();

const runTests = async () => {
  console.log("=== STARTING KLTN THESIS TOPIC & FIFO TESTS ===");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship_management";
  await mongoose.connect(mongoUri);
  console.log("MongoDB Connected for testing");

  try {
    // 0. Setup dummy active term & users
    let activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" });
    if (!activeTerm) {
      activeTerm = await AcademicTerm.create({
        code: "HK1-2026-2027-TEST",
        name: "Học kỳ 1 Năm học 2026 - 2027 Test",
        academicYear: "2026-2027",
        termNumber: 1,
        status: "ACTIVE",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-01-31"),
      });
    }

    let lecturer = await Lecturer.findOne({ lecturerCode: "GV0001" }).populate("userId");
    let gvUser = lecturer?.userId;
    if (!lecturer) {
      gvUser = await User.create({
        username: "gv0001_test",
        password: "password123",
        fullName: "TS. Nguyễn Văn A",
        email: "gv0001@iuh.edu.vn",
        role: "LECTURER",
        isActive: true,
      });

      lecturer = await Lecturer.create({
        userId: gvUser._id,
        lecturerCode: "GV0001",
        academicTitle: "TS",
        department: "KTPM",
        isAvailable: true,
      });
    }

    // 0.2 Create TBM User
    let tbmUser = await User.findOne({ username: "tbm_test" });
    if (!tbmUser) {
      tbmUser = await User.create({
        username: "tbm_test",
        password: "password123",
        fullName: "Trưởng Bộ Môn KTPM",
        email: "tbm@iuh.edu.vn",
        role: "TBM",
        isActive: true,
      });
    }

    // 0.3 Create Students (SV_A, SV_B, SV_C, SV_D)
    const createTestStudent = async (mssv, name) => {
      let s = await Student.findOne({ studentCode: mssv }).populate("userId");
      if (s) return { user: s.userId, student: s };

      let u = await User.create({
        username: `sv_${mssv}`,
        password: "password123",
        fullName: name,
        email: `${mssv}@student.iuh.edu.vn`,
        role: "STUDENT",
        isActive: true,
      });

      s = await Student.create({
        userId: u._id,
        studentCode: mssv,
        className: "DHKTPM18A",
        gpa: 3.5,
        thesisRegistered: false,
      });
      return { user: u, student: s };
    };

    const svA = await createTestStudent("22635201", "Sinh Viên A");
    const svB = await createTestStudent("22635202", "Sinh Viên B");
    const svC = await createTestStudent("22635203", "Sinh Viên C");
    const svD = await createTestStudent("22635204", "Sinh Viên D");

    // Clean up old test data for these students & topics
    await ThesisTopic.deleteMany({ supervisorId: lecturer._id });
    await Thesis.deleteMany({
      $or: [
        { studentId: svA.student._id },
        { studentId: svB.student._id },
        { studentId: svC.student._id },
        { studentId: svD.student._id },
      ],
    });

    // ----------------------------------------------------
    // TEST 1: GV0001 tạo 3 đề tài cùng lúc
    // ----------------------------------------------------
    console.log("\n--- TEST 1: GV0001 tạo 3 đề tài cùng lúc ---");
    const rawList = `Xây dựng hệ thống quản lý thực tập doanh nghiệp,
Xây dựng hệ thống quản lý khóa luận tốt nghiệp,
Ứng dụng AI phân tích dữ liệu học tập sinh viên`;

    const createdTopics = await thesisService.batchCreateTopicsByLecturer({
      userId: gvUser._id,
      topicListRaw: rawList,
      defaultMaxGroups: 2,
      defaultDescription: "Mô tả đề tài mẫu 2026",
      academicTermId: activeTerm._id,
    });

    console.log(`✓ Đã tạo thành công ${createdTopics.length} đề tài. Tất cả đều có status: ${createdTopics[0].status}`);
    if (createdTopics.length !== 3 || createdTopics[0].status !== "PENDING") {
      throw new Error("TEST 1 FAILED: Số lượng hoặc trạng thái đề tài không đúng!");
    }
    console.log("-> TEST 1 PASSED!");

    // ----------------------------------------------------
    // TEST 2: GV gửi đề tài -> TBM nhìn thấy PENDING
    // ----------------------------------------------------
    console.log("\n--- TEST 2: TBM xem danh sách đề tài PENDING ---");
    const tbmPendingTopics = await thesisService.getTopicsForTbm({
      status: "PENDING",
      academicTermId: activeTerm._id,
    });
    console.log(`✓ TBM thấy ${tbmPendingTopics.length} đề tài PENDING`);
    if (tbmPendingTopics.length < 3) {
      throw new Error("TEST 2 FAILED: TBM không nhìn thấy các đề tài PENDING!");
    }
    console.log("-> TEST 2 PASSED!");

    // ----------------------------------------------------
    // TEST 3: TBM duyệt đề tài 1 & từ chối đề tài 3
    // ----------------------------------------------------
    console.log("\n--- TEST 3: TBM duyệt đề tài & từ chối đề tài ---");
    const topic1 = createdTopics[0];
    const topic3 = createdTopics[2];

    const approvedTopic1 = await thesisService.approveTopicByTbm(topic1._id, tbmUser._id);
    console.log(`✓ Đề tài 1 (${approvedTopic1.title}) -> Status: ${approvedTopic1.status}`);

    const rejectedTopic3 = await thesisService.rejectTopicByTbm(topic3._id, tbmUser._id, "Đề tài trùng lặp");
    console.log(`✓ Đề tài 3 (${rejectedTopic3.title}) -> Status: ${rejectedTopic3.status}`);

    if (approvedTopic1.status !== "APPROVED" || rejectedTopic3.status !== "REJECTED") {
      throw new Error("TEST 3 FAILED: Trạng thái duyệt / từ chối không khớp!");
    }
    console.log("-> TEST 3 PASSED!");

    // ----------------------------------------------------
    // TEST 4: SV mở danh sách -> Chỉ thấy đề tài APPROVED
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Sinh viên chỉ thấy đề tài APPROVED ---");
    const studentTopics = await thesisService.getApprovedTopicsForStudent({
      academicTermId: activeTerm._id,
      userId: svA.user._id,
    });
    console.log(`✓ Sinh viên nhận được ${studentTopics.length} đề tài`);
    const hasPendingOrRejected = studentTopics.some((t) => t._id.toString() === topic3._id.toString());
    if (hasPendingOrRejected) {
      throw new Error("TEST 4 FAILED: Sinh viên vẫn nhìn thấy đề tài REJECTED!");
    }
    console.log("-> TEST 4 PASSED!");

    // ----------------------------------------------------
    // TEST 5: FIFO Algorithm (maxGroups = 2). A -> B -> C
    // ----------------------------------------------------
    console.log("\n--- TEST 5: FIFO Algorithm (maxGroups = 2). A -> B -> C ---");
    // SV A đăng ký
    const regA = await thesisService.registerTopicByStudent({
      userId: svA.user._id,
      topicId: topic1._id,
      studentCount: 1,
    });
    console.log(`✓ SV A đăng ký thành công: Nhóm ${regA.groupOrder}/${regA.topic.maxGroups}`);

    // SV B đăng ký
    const regB = await thesisService.registerTopicByStudent({
      userId: svB.user._id,
      topicId: topic1._id,
      studentCount: 1,
    });
    console.log(`✓ SV B đăng ký thành công: Nhóm ${regB.groupOrder}/${regB.topic.maxGroups}`);

    // SV C đăng ký -> Phải bị từ chối vì đã đủ 2 nhóm!
    let svCFailedAsExpected = false;
    try {
      await thesisService.registerTopicByStudent({
        userId: svC.user._id,
        topicId: topic1._id,
        studentCount: 1,
      });
    } catch (err) {
      svCFailedAsExpected = true;
      console.log(`✓ SV C bị từ chối chính xác: "${err.message}" (Code: ${err.statusCode})`);
    }

    if (!svCFailedAsExpected || regA.groupOrder !== 1 || regB.groupOrder !== 2) {
      throw new Error("TEST 5 FAILED: FIFO hoặc giới hạn nhóm không chính xác!");
    }
    console.log("-> TEST 5 PASSED!");

    // ----------------------------------------------------
    // TEST 6: Race Condition Concurrent Click Simulation
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Mô phỏng 2 sinh viên click đồng thời khi chỉ còn 1 slot ---");
    // Tạo đề tài mới có maxGroups = 1
    const singleSlotTopicList = await thesisService.batchCreateTopicsByLecturer({
      userId: gvUser._id,
      topics: [{ title: "Đề tài thử nghiệm Concurrent FIFO", maxGroups: 1 }],
      academicTermId: activeTerm._id,
    });
    const singleSlotTopic = await thesisService.approveTopicByTbm(singleSlotTopicList[0]._id, tbmUser._id);

    // Tạo SV C và SV D (chưa có đề tài)
    await Student.findByIdAndUpdate(svC.student._id, { thesisRegistered: false });
    await Student.findByIdAndUpdate(svD.student._id, { thesisRegistered: false });

    // Cùng lúc gửi 2 request bằng Promise.allSettled
    const results = await Promise.allSettled([
      thesisService.registerTopicByStudent({
        userId: svC.user._id,
        topicId: singleSlotTopic._id,
        studentCount: 1,
      }),
      thesisService.registerTopicByStudent({
        userId: svD.user._id,
        topicId: singleSlotTopic._id,
        studentCount: 1,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    console.log(`✓ Kết quả đồng thời: ${fulfilled.length} thành công, ${rejected.length} bị từ chối`);
    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error("TEST 6 FAILED: Race condition làm vượt quá slot cho phép!");
    }

    const checkTopic = await ThesisTopic.findById(singleSlotTopic._id);
    if (checkTopic.currentGroups !== 1 || checkTopic.registeredGroups.length !== 1) {
      throw new Error("TEST 6 FAILED: Database lưu vượt quá số nhóm!");
    }
    console.log("-> TEST 6 PASSED: Atomic FIFO hoàn toàn chống race condition!");

    // ----------------------------------------------------
    // TEST 7: Sinh viên đã có đề tài thử đăng ký tiếp
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Sinh viên đã có đề tài thử đăng ký thêm ---");
    let duplicateFailed = false;
    try {
      await thesisService.registerTopicByStudent({
        userId: svA.user._id,
        topicId: singleSlotTopic._id,
        studentCount: 1,
      });
    } catch (err) {
      duplicateFailed = true;
      console.log(`✓ Sinh viên A thử đăng ký thêm bị chặn: "${err.message}"`);
    }

    if (!duplicateFailed) {
      throw new Error("TEST 7 FAILED: Cho phép sinh viên đăng ký nhiều đề tài!");
    }
    console.log("-> TEST 7 PASSED!");

    // ----------------------------------------------------
    // TEST 8: Đề tài REJECTED không hiển thị cho sinh viên
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Đề tài REJECTED tuyệt đối không hiển thị cho SV ---");
    const finalStudentList = await thesisService.getApprovedTopicsForStudent({
      academicTermId: activeTerm._id,
      userId: svA.user._id,
    });
    const foundRejected = finalStudentList.find((t) => t._id.toString() === topic3._id.toString());
    if (foundRejected) {
      throw new Error("TEST 8 FAILED: Đề tài bị từ chối vẫn xuất hiện trong danh sách sinh viên!");
    }
    console.log("✓ Đề tài REJECTED không tồn tại trong danh sách SV.");
    // ----------------------------------------------------
    // TEST 9: GVHD duyệt đề tài (supervisorAcceptThesis)
    // ----------------------------------------------------
    console.log("\n--- TEST 9: GVHD duyệt đề tài đã đăng ký (Chờ GVHD xác nhận -> Đã duyệt) ---");
    const regThesisA = await Thesis.findById(regA.thesis._id);
    console.log(`✓ Trạng thái ban đầu của đề tài SV A: ${regThesisA.status}`);
    if (regThesisA.status !== "PENDING_SUPERVISOR_APPROVAL") {
      throw new Error(`TEST 9 FAILED: Trạng thái ban đầu phải là PENDING_SUPERVISOR_APPROVAL nhưng là ${regThesisA.status}`);
    }

    const acceptedThesis = await thesisService.supervisorAcceptThesis(regThesisA._id, {
      userId: gvUser._id,
      role: "LECTURER",
    });
    console.log(`✓ GVHD đã duyệt đề tài -> Trạng thái mới: ${acceptedThesis.status}`);
    if (acceptedThesis.status !== "APPROVED") {
      throw new Error("TEST 9 FAILED: Trạng thái đề tài sau khi GV duyệt không phải là APPROVED!");
    }
    console.log("-> TEST 9 PASSED!");

    // ----------------------------------------------------
    // TEST 10: GVHD từ chối đề tài (supervisorRejectThesis) & giải phóng slot FIFO
    // ----------------------------------------------------
    console.log("\n--- TEST 10: GVHD từ chối đề tài -> Giải phóng slot FIFO & cho phép SV đăng ký lại ---");
    const regThesisB = await Thesis.findById(regB.thesis._id);
    await thesisService.supervisorRejectThesis(regThesisB._id, {
      userId: gvUser._id,
      role: "LECTURER",
    }, { reason: "Không đủ điều kiện kiến thức chuyên sâu" });

    const topic1AfterReject = await ThesisTopic.findById(topic1._id);
    console.log(`✓ Số nhóm sau khi từ chối: ${topic1AfterReject.currentGroups}/${topic1AfterReject.maxGroups}`);
    if (topic1AfterReject.currentGroups !== 1) {
      throw new Error(`TEST 10 FAILED: currentGroups không giảm về 1 (hiện tại: ${topic1AfterReject.currentGroups})`);
    }

    const svBRefreshed = await Student.findById(svB.student._id);
    console.log(`✓ Cờ thesisRegistered của SV B: ${svBRefreshed.thesisRegistered}`);
    if (svBRefreshed.thesisRegistered !== false) {
      throw new Error("TEST 10 FAILED: SV B chưa được giải phóng cờ thesisRegistered!");
    }
    console.log("-> TEST 10 PASSED: GVHD từ chối đề tài thành công và giải phóng slot FIFO!");

    console.log("\n==========================================");
    console.log("🎉 TẤT CẢ 10 BÀI TEST ĐÃ VƯỢT QUA 100%! 🎉");
    console.log("==========================================\n");
  } catch (error) {
    console.error("TEST ERROR:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runTests();
