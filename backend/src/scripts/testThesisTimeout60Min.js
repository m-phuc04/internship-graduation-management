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

const runTest = async () => {
  console.log("=== STARTING 60-MINUTE COUNTDOWN & TIMEOUT TEST ===");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship_management";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  try {
    // 1. Get or create active term
    let activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" });
    if (!activeTerm) {
      activeTerm = await AcademicTerm.create({
        code: "HK1-2026-TIMEOUT-TEST",
        name: "Học kỳ 1 Test Timeout",
        academicYear: "2026-2027",
        termNumber: 1,
        status: "ACTIVE",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-01-31"),
        thesis: {
          isRegistrationLocked: false,
          registrationStart: new Date("2026-08-01"),
          registrationEnd: new Date("2027-01-31"),
        },
      });
    }

    // 2. Get or create Lecturer
    let lecturer = await Lecturer.findOne().populate("userId");
    if (!lecturer) {
      const gvUser = await User.create({
        username: "gv_timeout_test",
        password: "password123",
        fullName: "TS. Test Timeout",
        email: "gv_timeout@iuh.edu.vn",
        role: "LECTURER",
        isActive: true,
      });
      lecturer = await Lecturer.create({
        userId: gvUser._id,
        lecturerCode: "GV9999",
        academicTitle: "TS",
        department: "KTPM",
        isAvailable: true,
        maxSupervisedStudents: 10,
      });
    }

    // 3. Create 2 test students
    const random8 = () => Math.floor(10000000 + Math.random() * 90000000).toString();
    const sv1User = await User.create({
      username: `sv1_timer_${Date.now()}`,
      password: "password123",
      fullName: "Sinh Viên 1 Timer",
      email: `sv1_${Date.now()}@student.iuh.edu.vn`,
      role: "STUDENT",
      isActive: true,
    });
    const sv1 = await Student.create({
      userId: sv1User._id,
      studentCode: random8(),
      className: "DHKTPM17A",
      thesisRegistered: false,
    });

    const sv2User = await User.create({
      username: `sv2_timer_${Date.now()}`,
      password: "password123",
      fullName: "Sinh Viên 2 Timer",
      email: `sv2_${Date.now()}@student.iuh.edu.vn`,
      role: "STUDENT",
      isActive: true,
    });
    const sv2 = await Student.create({
      userId: sv2User._id,
      studentCode: random8(),
      className: "DHKTPM17A",
      thesisRegistered: false,
    });

    // 4. Create an APPROVED topic
    const topic = await ThesisTopic.create({
      title: `Đề tài kiểm tra 60 phút timer ${Date.now()}`,
      supervisorId: lecturer._id,
      academicTermId: activeTerm._id,
      maxGroups: 2,
      currentGroups: 0,
      status: "APPROVED",
      registeredGroups: [],
    });

    console.log("Created test topic:", topic.title);

    // ==========================================
    // TEST 1: Register 2-student group -> verify 60-min countdown starts
    // ==========================================
    console.log("\n--- TEST 1: Register 2-student group ---");
    const regResult = await thesisService.registerTopicByStudent({
      userId: sv1User._id,
      topicId: topic._id,
      studentCount: 2,
      secondStudentId: sv2._id,
      secondStudentCode: sv2.studentCode,
    });

    const thesis1 = await Thesis.findById(regResult.thesis._id);
    console.log("Thesis created status:", thesis1.status);
    console.log("Thesis student2Status:", thesis1.student2Status);
    console.log("Thesis expiresAt:", thesis1.expiresAt);

    if (thesis1.status !== "WAITING_FOR_STUDENT2_CONFIRMATION") {
      throw new Error(`Expected status WAITING_FOR_STUDENT2_CONFIRMATION, got ${thesis1.status}`);
    }
    if (!thesis1.expiresAt) {
      throw new Error("Expected expiresAt to be set, but it is null");
    }
    const diffMinutes = Math.round((new Date(thesis1.expiresAt).getTime() - Date.now()) / (60 * 1000));
    console.log(`Countdown time: ~${diffMinutes} minutes remaining (Target: 60)`);
    if (diffMinutes < 58 || diffMinutes > 60) {
      throw new Error(`Expected expiresAt to be ~60 mins, got ${diffMinutes} mins`);
    }

    // ==========================================
    // TEST 2: SV2 accepts invitation -> status WAITING_FOR_SUPERVISOR_REQUEST, expiresAt preserved
    // ==========================================
    console.log("\n--- TEST 2: SV2 accepts invitation ---");
    await thesisService.respondStudent2Invitation(thesis1._id, sv2User._id, "ACCEPT");
    const thesis2 = await Thesis.findById(thesis1._id);
    console.log("After SV2 accept, status:", thesis2.status);
    console.log("After SV2 accept, student2Status:", thesis2.student2Status);
    console.log("After SV2 accept, expiresAt preserved:", thesis2.expiresAt);

    if (thesis2.status !== "WAITING_FOR_SUPERVISOR_REQUEST") {
      throw new Error(`Expected status WAITING_FOR_SUPERVISOR_REQUEST, got ${thesis2.status}`);
    }
    if (!thesis2.expiresAt) {
      throw new Error("Expected expiresAt to remain active across pending steps");
    }

    // ==========================================
    // TEST 3: SV1 sends request to GVHD -> status PENDING_SUPERVISOR_APPROVAL, expiresAt cleared
    // ==========================================
    console.log("\n--- TEST 3: SV1 sends request to GVHD ---");
    await thesisService.sendSupervisorRequest(thesis1._id, sv1User._id);
    const thesis3 = await Thesis.findById(thesis1._id);
    console.log("After SV1 submit to GV, status:", thesis3.status);
    console.log("After SV1 submit to GV, expiresAt cleared:", thesis3.expiresAt);

    if (thesis3.status !== "PENDING_SUPERVISOR_APPROVAL") {
      throw new Error(`Expected status PENDING_SUPERVISOR_APPROVAL, got ${thesis3.status}`);
    }
    if (thesis3.expiresAt !== null) {
      throw new Error("Expected expiresAt to be cleared (null) after submitting to GV");
    }

    // ==========================================
    // TEST 4: Expiration timeout cancellation
    // ==========================================
    console.log("\n--- TEST 4: 60-Minute Timeout Auto-Cancellation ---");
    // Create students 3 and 4
    const sv3User = await User.create({
      username: `sv3_timer_${Date.now()}`,
      password: "password123",
      fullName: "Sinh Viên 3 Timeout",
      email: `sv3_${Date.now()}@student.iuh.edu.vn`,
      role: "STUDENT",
      isActive: true,
    });
    const sv3 = await Student.create({
      userId: sv3User._id,
      studentCode: random8(),
      className: "DHKTPM17A",
      thesisRegistered: false,
    });

    const sv4User = await User.create({
      username: `sv4_timer_${Date.now()}`,
      password: "password123",
      fullName: "Sinh Viên 4 Timeout",
      email: `sv4_${Date.now()}@student.iuh.edu.vn`,
      role: "STUDENT",
      isActive: true,
    });
    const sv4 = await Student.create({
      userId: sv4User._id,
      studentCode: random8(),
      className: "DHKTPM17A",
      thesisRegistered: false,
    });

    const regResult2 = await thesisService.registerTopicByStudent({
      userId: sv3User._id,
      topicId: topic._id,
      studentCount: 2,
      secondStudentId: sv4._id,
      secondStudentCode: sv4.studentCode,
    });

    const topicBeforeTimeout = await ThesisTopic.findById(topic._id);
    console.log("Topic currentGroups before timeout:", topicBeforeTimeout.currentGroups);
    console.log("Topic registeredGroups count before timeout:", topicBeforeTimeout.registeredGroups.length);

    // Fast-forward expiresAt to 10 minutes in the past
    await Thesis.findByIdAndUpdate(regResult2.thesis._id, {
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    // Calling getMyThesis for sv3 will detect the expiration and trigger cancellation
    const myThesisRes = await thesisService.getMyThesis(sv3User._id);
    console.log("getMyThesis after timeout returned thesis:", myThesisRes.thesis);
    console.log("getMyThesis canRegisterNew:", myThesisRes.canRegisterNew);

    if (myThesisRes.thesis !== null) {
      throw new Error("Expected expired thesis to be cancelled/null in getMyThesis");
    }
    if (!myThesisRes.canRegisterNew) {
      throw new Error("Expected canRegisterNew to be true after cancellation");
    }

    // Verify thesis record is deleted
    const checkDeleted = await Thesis.findById(regResult2.thesis._id);
    if (checkDeleted) {
      throw new Error("Expected thesis record to be deleted after expiration");
    }

    // Verify Topic FIFO slot is released
    const topicAfterTimeout = await ThesisTopic.findById(topic._id);
    console.log("Topic currentGroups after timeout:", topicAfterTimeout.currentGroups);
    console.log("Topic registeredGroups count after timeout:", topicAfterTimeout.registeredGroups.length);
    if (topicAfterTimeout.currentGroups !== topicBeforeTimeout.currentGroups - 1) {
      throw new Error("Expected currentGroups to decrement by 1");
    }

    // Verify students thesisRegistered flag is reset
    const s3Check = await Student.findById(sv3._id);
    const s4Check = await Student.findById(sv4._id);
    console.log("SV3 thesisRegistered:", s3Check.thesisRegistered);
    console.log("SV4 thesisRegistered:", s4Check.thesisRegistered);
    if (s3Check.thesisRegistered || s4Check.thesisRegistered) {
      throw new Error("Expected thesisRegistered to be reset to false for both students");
    }

    // Clean up test records
    await Thesis.findByIdAndDelete(thesis1._id);
    await ThesisTopic.findByIdAndDelete(topic._id);
    await Student.deleteMany({ _id: { $in: [sv1._id, sv2._id, sv3._id, sv4._id] } });
    await User.deleteMany({ _id: { $in: [sv1User._id, sv2User._id, sv3User._id, sv4User._id] } });

    console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runTest();
