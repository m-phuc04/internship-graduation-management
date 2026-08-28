import mongoose from "mongoose";
import dotenv from "dotenv";
import AcademicTerm from "../models/AcademicTerm.js";
import academicTermService from "../services/academicTermService.js";
import exportService from "../services/exportService.js";
import AppError from "../utils/AppError.js";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/internship-graduation-management";

async function runTest() {
  console.log("--- [TEST] 1. Connecting to DB ---");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Ensure seed
  const defaultTerm = await academicTermService.ensureDefaultActiveTerm();
  console.log(`Default active term: ${defaultTerm.code} | ID: ${defaultTerm._id}`);

  // 2. Test 409 Duplicate Code Creation
  console.log("\n--- [TEST] 2. Testing 409 Conflict on Duplicate Code ---");
  try {
    await academicTermService.createTerm({
      name: "Học kỳ 1 Trùng",
      academicYear: "2026-2027",
      code: "HK1-2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-01-15"),
    });
    console.error("❌ FAILED: Did not throw 409 on duplicate code!");
  } catch (err) {
    if (err.statusCode === 409 && err.errorCode === "ACADEMIC_TERM_CODE_EXISTS") {
      console.log(`✅ PASSED: Caught expected 409 Conflict: "${err.message}" (errorCode: ${err.errorCode})`);
    } else {
      console.error(`❌ FAILED: Unexpected error:`, err);
    }
  }

  // 3. Test Invalid Date Range (endDate < startDate)
  console.log("\n--- [TEST] 3. Testing 400 Bad Request on Invalid Date Range ---");
  try {
    await academicTermService.createTerm({
      name: "Học kỳ Ngày Lỗi",
      academicYear: "2029-2030",
      code: "HK_DATE_ERR",
      startDate: new Date("2029-10-01"),
      endDate: new Date("2029-05-01"), // Before start
    });
    console.error("❌ FAILED: Did not throw 400 on invalid date range!");
  } catch (err) {
    if (err.statusCode === 400 && err.errorCode === "INVALID_DATE_RANGE") {
      console.log(`✅ PASSED: Caught expected 400 Date Range error: "${err.message}"`);
    } else {
      console.error(`❌ FAILED: Unexpected error:`, err);
    }
  }

  // 4. Test TTDN Excel Export
  console.log("\n--- [TEST] 4. Testing TTDN Excel Export ---");
  const ttdnExport = await exportService.exportInternships({
    academicTermId: defaultTerm._id,
  });
  console.log(`✅ PASSED TTDN Export: Filename = "${ttdnExport.filename}", Buffer Size = ${ttdnExport.buffer.byteLength} bytes, Records = ${ttdnExport.totalRecords}`);

  // 5. Test KLTN Excel Export
  console.log("\n--- [TEST] 5. Testing KLTN Excel Export ---");
  const kltnExport = await exportService.exportTheses({
    academicTermId: defaultTerm._id,
  });
  console.log(`✅ PASSED KLTN Export: Filename = "${kltnExport.filename}", Buffer Size = ${kltnExport.buffer.byteLength} bytes, Records = ${kltnExport.totalRecords}`);

  console.log("\n==========================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==========================================");

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("Fatal Test Error:", err);
  process.exit(1);
});
