import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Internship from "../models/Internship.js";
import Company from "../models/Company.js";
import AcademicTerm from "../models/AcademicTerm.js";
import dashboardService from "../services/dashboardService.js";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/internship-graduation-management";

async function runTest() {
  console.log("--- [TEST] 1. Connecting to DB ---");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  // Find a student
  const student = await Student.findOne().populate("userId");
  if (!student) {
    console.log("No student found to test.");
    await mongoose.disconnect();
    return;
  }
  console.log(`Found student: ${student.studentCode} (${student.userId?.fullName})`);

  // Find or create TDSOUTH company
  let company = await Company.findOne({ $or: [{ name: "TDSOUTH" }, { code: "TDSOUTH" }] });
  if (!company) {
    company = await Company.create({
      name: "TDSOUTH",
      code: "TDSOUTH",
      address: "TP. Hồ Chí Minh",
      email: "contact@tdsouth.vn",
      phone: "0909123456",
      status: "ACTIVE",
    });
  }

  const activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" });

  // Update or create a rejected internship for testing
  let internship = await Internship.findOne({ studentId: student._id });
  if (internship) {
    internship.companyId = company._id;
    internship.status = "REJECTED";
    internship.rejectionReason = "gggg";
    if (activeTerm) internship.academicTermId = activeTerm._id;
    await internship.save();
  }

  console.log("\n--- [TEST] 2. Calling dashboardService.getStudentDashboard ---");
  const dashboardData = await dashboardService.getStudentDashboard(student.userId._id, activeTerm?._id);

  console.log("Pending Actions count:", dashboardData.pendingActions.length);
  console.log("Pending Actions data:", JSON.stringify(dashboardData.pendingActions, null, 2));

  const rejectedTask = dashboardData.pendingActions.find((a) => a.type === "RE_REGISTER_INTERNSHIP");
  if (rejectedTask) {
    console.log("\n✅ PASSED: Found RE_REGISTER_INTERNSHIP task!");
    console.log(`- Title: "${rejectedTask.title}"`);
    console.log(`- Company: "${rejectedTask.companyName}"`);
    console.log(`- Rejection Reason: "${rejectedTask.rejectionReason}"`);
    console.log(`- Description: "${rejectedTask.description}"`);
    console.log(`- Action Label: "${rejectedTask.actionLabel}"`);
    console.log(`- Action Url: "${rejectedTask.actionUrl}"`);
  } else {
    console.error("❌ FAILED: RE_REGISTER_INTERNSHIP task not found in pendingActions!");
  }

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
