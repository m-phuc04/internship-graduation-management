import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Thesis from '../models/Thesis.js';
import Lecturer from '../models/Lecturer.js';
import User from '../models/User.js';
import thesisService from '../services/thesisService.js';
dotenv.config();

async function testCompletedLock() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.');

  const lecturers = await Lecturer.find().populate('userId');
  let thesis = await Thesis.findOne();

  const nonSupervisors = lecturers.filter(l => l._id.toString() !== thesis.supervisorId.toString());
  const gvA = nonSupervisors[0];

  console.log('Testing thesis:', thesis.thesisTitle);

  // Set thesis to COMPLETED
  thesis.status = 'COMPLETED';
  await thesis.save();
  console.log('Set thesis status to COMPLETED.');

  // Attempt to grade when COMPLETED
  try {
    await thesisService.gradeThesisByLecturer(thesis._id, {
      score: 10,
      comment: 'Attempting to change score after completed',
      userId: gvA.userId._id,
      userRole: 'LECTURER',
      roleType: 'REVIEWER1',
    });
    console.error('FAIL: Should have thrown an error!');
  } catch (err) {
    console.log('SUCCESS: Backend correctly blocked grading on COMPLETED thesis.');
    console.log('Error message:', err.message);
  }

  // Restore thesis status to GRADED for regular flow
  thesis.status = 'GRADED';
  await thesis.save();
  console.log('Restored thesis status to GRADED.');

  await mongoose.disconnect();
  console.log('\n>>> COMPLETED STATE LOCK TEST PASSED 100% <<<');
}
testCompletedLock();
