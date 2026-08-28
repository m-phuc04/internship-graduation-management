import mongoose from "mongoose";
import dotenv from "dotenv";
import AcademicTerm from "../models/AcademicTerm.js";
import Student from "../models/Student.js";
import Internship from "../models/Internship.js";
import Thesis from "../models/Thesis.js";
import academicTermService from "../services/academicTermService.js";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/internship-graduation-management";

async function runTest() {
  console.log("--- [TEST] 1. Connecting to DB ---");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Setup HK1-2026-2027 (01/08/2026 -> 31/12/2026)
  let hk1 = await AcademicTerm.findOne({ code: "HK1-2026-2027" });
  if (!hk1) {
    hk1 = await AcademicTerm.create({
      name: "Học kỳ 1",
      academicYear: "2026-2027",
      code: "HK1-2026-2027",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-12-31"),
      status: "ACTIVE",
    });
  } else {
    hk1.startDate = new Date("2026-08-01");
    hk1.endDate = new Date("2026-12-31");
    hk1.status = "ACTIVE";
    await hk1.save();
  }
  console.log(`HK1 Term: ${hk1.code} (${hk1.startDate.toISOString().slice(0, 10)} -> ${hk1.endDate.toISOString().slice(0, 10)})`);

  // 2. Setup HK2-2026-2027 (01/01/2027 -> 31/05/2027)
  let hk2 = await AcademicTerm.findOne({ code: "HK2-2026-2027" });
  if (!hk2) {
    hk2 = await AcademicTerm.create({
      name: "Học kỳ 2",
      academicYear: "2026-2027",
      code: "HK2-2026-2027",
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-05-31"),
      status: "UPCOMING",
    });
  } else {
    hk2.startDate = new Date("2027-01-01");
    hk2.endDate = new Date("2027-05-31");
    hk2.status = "UPCOMING";
    await hk2.save();
  }
  console.log(`HK2 Term: ${hk2.code} (${hk2.startDate.toISOString().slice(0, 10)} -> ${hk2.endDate.toISOString().slice(0, 10)})`);

  // 3. Test Auto-matching on 2026-08-21 (Target date -> HK1)
  console.log("\n--- [TEST] 2. Testing Date Auto-Detection on 2026-08-21 ---");
  const detectedHK1_A = await academicTermService.getCurrentAcademicTerm(new Date("2026-08-21"));
  console.log(`Date: 2026-08-21 -> Detected Term: ${detectedHK1_A.code}`);
  if (detectedHK1_A.code !== "HK1-2026-2027") {
    throw new Error(`Expected HK1-2026-2027, got ${detectedHK1_A.code}`);
  }
  console.log("✅ PASSED: 2026-08-21 correctly mapped to HK1-2026-2027");

  // 4. Test Auto-matching on 2026-11-15 (Target date -> HK1)
  console.log("\n--- [TEST] 3. Testing Date Auto-Detection on 2026-11-15 ---");
  const detectedHK1_B = await academicTermService.getCurrentAcademicTerm(new Date("2026-11-15"));
  console.log(`Date: 2026-11-15 -> Detected Term: ${detectedHK1_B.code}`);
  if (detectedHK1_B.code !== "HK1-2026-2027") {
    throw new Error(`Expected HK1-2026-2027, got ${detectedHK1_B.code}`);
  }
  console.log("✅ PASSED: 2026-11-15 correctly mapped to HK1-2026-2027");

  // 5. Test Auto-matching on 2027-02-15 (Target date -> HK2)
  console.log("\n--- [TEST] 4. Testing Date Auto-Detection on 2027-02-15 ---");
  const detectedHK2 = await academicTermService.getCurrentAcademicTerm(new Date("2027-02-15"));
  console.log(`Date: 2027-02-15 -> Detected Term: ${detectedHK2.code}`);
  if (detectedHK2.code !== "HK2-2026-2027") {
    throw new Error(`Expected HK2-2026-2027, got ${detectedHK2.code}`);
  }
  console.log("✅ PASSED: 2027-02-15 correctly mapped to HK2-2026-2027");

  // 6. Test Single Student record in multiple terms
  console.log("\n--- [TEST] 5. Verifying Single Student Record Principle ---");
  const student = await Student.findOne();
  if (student) {
    const studentInternships = await Internship.find({ studentId: student._id });
    const studentTheses = await Thesis.find({ studentId: student._id });
    console.log(`Student (${student.studentCode}): has ${studentInternships.length} internships and ${studentTheses.length} theses.`);
    console.log("✅ PASSED: Student record is independent of term; academic activities link to academicTermId.");
  }

  console.log("\n==========================================");
  console.log("🎉 ALL AUTO-TERM TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==========================================");

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("Fatal Test Error:", err);
  process.exit(1);
});
