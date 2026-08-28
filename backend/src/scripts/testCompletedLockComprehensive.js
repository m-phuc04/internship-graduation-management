import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Thesis from '../models/Thesis.js';
import Lecturer from '../models/Lecturer.js';
import User from '../models/User.js';
import thesisService from '../services/thesisService.js';
dotenv.config();

async function testComprehensiveCompletedLock() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.');

  const tbm = await User.findOne({ role: 'TBM' });
  const lecturers = await Lecturer.find().populate('userId');
  let thesis = await Thesis.findOne();

  const originalStatus = thesis.status;
  console.log('Target thesis:', thesis.thesisTitle, '| Original status:', originalStatus);

  // Set status to COMPLETED
  thesis.status = 'COMPLETED';
  await thesis.save();
  console.log('Set thesis status to COMPLETED.\n');

  let passedChecks = 0;

  // Check 1: assignReviewers
  try {
    await thesisService.assignReviewers(thesis._id, {
      reviewers: [
        { lecturerId: lecturers[0]._id, isPrivateReviewer: true, isCouncilReviewer: false },
      ],
      tbmUserId: tbm._id,
    });
    console.error('FAIL 1: assignReviewers should be blocked');
  } catch (err) {
    console.log('PASS 1: assignReviewers blocked ->', err.message);
    passedChecks++;
  }

  // Check 2: assignSupervisor
  try {
    await thesisService.assignSupervisor(thesis._id, {
      supervisorId: lecturers[0]._id,
      tbmUserId: tbm._id,
    });
    console.error('FAIL 2: assignSupervisor should be blocked');
  } catch (err) {
    console.log('PASS 2: assignSupervisor blocked ->', err.message);
    passedChecks++;
  }

  // Check 3: gradeThesisByLecturer
  try {
    await thesisService.gradeThesisByLecturer(thesis._id, {
      score: 10,
      comment: 'Illegal grade update',
      userId: lecturers[0].userId._id,
      userRole: 'LECTURER',
      roleType: 'REVIEWER1',
    });
    console.error('FAIL 3: gradeThesisByLecturer should be blocked');
  } catch (err) {
    console.log('PASS 3: gradeThesisByLecturer blocked ->', err.message);
    passedChecks++;
  }

  // Check 4: approveThesis
  try {
    await thesisService.approveThesis(thesis._id, { tbmUserId: tbm._id });
    console.error('FAIL 4: approveThesis should be blocked');
  } catch (err) {
    console.log('PASS 4: approveThesis blocked ->', err.message);
    passedChecks++;
  }

  // Check 5: rejectThesis
  try {
    await thesisService.rejectThesis(thesis._id, { reason: 'Test reject', tbmUserId: tbm._id });
    console.error('FAIL 5: rejectThesis should be blocked');
  } catch (err) {
    console.log('PASS 5: rejectThesis blocked ->', err.message);
    passedChecks++;
  }

  // Restore original status
  thesis.status = originalStatus;
  await thesis.save();
  console.log('\nRestored thesis status to:', originalStatus);

  await mongoose.disconnect();
  console.log(`\n>>> COMPREHENSIVE COMPLETED LOCK TEST PASSED: ${passedChecks}/5 CHECKS OK <<<`);
}
testComprehensiveCompletedLock();
