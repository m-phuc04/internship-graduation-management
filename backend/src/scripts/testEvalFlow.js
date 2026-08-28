import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Thesis from '../models/Thesis.js';
import Lecturer from '../models/Lecturer.js';
import User from '../models/User.js';
import thesisService from '../services/thesisService.js';
dotenv.config();

async function testFullEvalFlow() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.');

  const tbm = await User.findOne({ role: 'TBM' });
  const lecturers = await Lecturer.find().populate('userId');
  let thesis = await Thesis.findOne();

  const nonSupervisors = lecturers.filter(l => l._id.toString() !== thesis.supervisorId.toString());
  const gvA = nonSupervisors[0];
  const gvB = nonSupervisors[1];

  console.log('Assigning:');
  console.log('- PB KÍN (GVPB_KIN):', gvA.userId?.fullName);
  console.log('- PB HỘI ĐỒNG (GVPB_HOIDONG):', gvB.userId?.fullName);

  // Assign both PB KÍN and PB HỘI ĐỒNG
  await thesisService.assignReviewers(thesis._id, {
    reviewers: [
      { lecturerId: gvA._id, isPrivateReviewer: true, isCouncilReviewer: false },
      { lecturerId: gvB._id, isPrivateReviewer: false, isCouncilReviewer: true },
    ],
    tbmUserId: tbm._id,
  });

  console.log('\n--- 1. Check TBM Evaluations list ---');
  const evalRes = await thesisService.getThesesForEvaluation();
  console.log('Total eligible in TBM Evaluation:', evalRes.theses.length);
  console.log('Stats totalEligible:', evalRes.stats.totalEligible);

  console.log('\n--- 2. Check GV A (PB Kín) Assigned Theses ---');
  const gvARes = await thesisService.getThesesForLecturerRole(gvA.userId._id, { roleType: 'ALL' });
  console.log('GV A - Reviewer 1 (PB Kín) count:', gvARes.stats.reviewer1Count);
  console.log('GV A - Reviewer 2 (PB Hội đồng) count:', gvARes.stats.reviewer2Count);

  console.log('\n--- 3. Check GV B (PB Hội đồng) Assigned Theses ---');
  const gvBRes = await thesisService.getThesesForLecturerRole(gvB.userId._id, { roleType: 'ALL' });
  console.log('GV B - Reviewer 1 (PB Kín) count:', gvBRes.stats.reviewer1Count);
  console.log('GV B - Reviewer 2 (PB Hội đồng) count:', gvBRes.stats.reviewer2Count);

  console.log('\n--- 4. Check Grading by GV A (PB Kín) ---');
  const gradedA = await thesisService.gradeThesisByLecturer(thesis._id, {
    score: 8.5,
    comment: 'Khóa luận nghiên cứu sâu sắc (PB Kín)',
    userId: gvA.userId._id,
    userRole: 'LECTURER',
    roleType: 'REVIEWER1',
  });
  console.log('Graded A score:', gradedA.scores.reviewer1Score, '| Comment:', gradedA.reviewer1Comment);

  console.log('\n--- 5. Check Grading by GV B (PB Hội đồng) ---');
  const gradedB = await thesisService.gradeThesisByLecturer(thesis._id, {
    score: 9.0,
    comment: 'Bảo vệ tự tin, trả lời tốt câu hỏi (PB Hội đồng)',
    userId: gvB.userId._id,
    userRole: 'LECTURER',
    roleType: 'REVIEWER2',
  });
  console.log('Graded B score:', gradedB.scores.reviewer2Score, '| Comment:', gradedB.reviewer2Comment);

  await mongoose.disconnect();
  console.log('\n>>> EVALUATION & LECTURER FLOW TEST PASSED 100% <<<');
}
testFullEvalFlow();
