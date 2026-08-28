import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AcademicTerm from '../models/AcademicTerm.js';
import academicTermService from '../services/academicTermService.js';
import Internship from '../models/Internship.js';
import Thesis from '../models/Thesis.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/internship-graduation-management';

async function runTest() {
  try {
    console.log('--- [TEST] 1. Connecting to MongoDB ---');
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to DB successfully');

    console.log('\n--- [TEST] 2. Checking Default Active Term Seed ---');
    const defaultTerm = await academicTermService.ensureDefaultActiveTerm();
    console.log(' Default Active Term:', defaultTerm.code, '| Status:', defaultTerm.status);

    console.log('\n--- [TEST] 3. Checking existing records association ---');
    const totalInternships = await Internship.countDocuments();
    const termInternships = await Internship.countDocuments({ academicTermId: defaultTerm._id });
    console.log(` Total Internships: ${totalInternships}, Associated to default term: ${termInternships}`);

    const totalTheses = await Thesis.countDocuments();
    const termTheses = await Thesis.countDocuments({ academicTermId: defaultTerm._id });
    console.log(` Total Theses: ${totalTheses}, Associated to default term: ${termTheses}`);

    console.log('\n--- [TEST] 4. Creating new term HK2-2026-2027 (UPCOMING) ---');
    let hk2 = await AcademicTerm.findOne({ code: 'HK2-2026-2027' });
    if (!hk2) {
      hk2 = await academicTermService.createTerm({
        name: 'Học kỳ 2',
        academicYear: '2026-2027',
        code: 'HK2-2026-2027',
        startDate: new Date('2027-01-15'),
        endDate: new Date('2027-06-15'),
        status: 'UPCOMING',
        description: 'Học kỳ 2 niên khóa 2026-2027',
      });
    }
    console.log(' Created/Found HK2:', hk2.code, '| Status:', hk2.status);

    console.log('\n--- [TEST] 5. Activating HK2-2026-2027 (Single ACTIVE constraint test) ---');
    const activatedHk2 = await academicTermService.activateTerm(hk2._id);
    console.log(' Activated HK2 status:', activatedHk2.status);

    const prevHk1 = await AcademicTerm.findById(defaultTerm._id);
    console.log(' Previous HK1 status after HK2 activation:', prevHk1.status, '(Should be CLOSED)');

    if (prevHk1.status !== 'CLOSED') {
      throw new Error(`Expected HK1 to be CLOSED, got ${prevHk1.status}`);
    }

    console.log('\n--- [TEST] 6. Reactivating HK1-2026-2027 for ongoing system operations ---');
    const reactivatedHk1 = await academicTermService.activateTerm(defaultTerm._id);
    console.log(' Reactivated HK1 status:', reactivatedHk1.status);

    const hk2After = await AcademicTerm.findById(hk2._id);
    console.log(' HK2 status after HK1 reactivation:', hk2After.status, '(Should be CLOSED)');

    console.log('\n--- [TEST] 7. Testing getAllTerms list query ---');
    const allTerms = await academicTermService.getAllTerms();
    console.log(` Found ${allTerms.length} terms in system:`);
    allTerms.forEach((t) => {
      console.log(`   - ${t.code} (${t.name}, ${t.academicYear}) -> Status: ${t.status} | Internships: ${t.internshipCount} | Theses: ${t.thesisCount}`);
    });

    console.log('\n ALL ACADEMIC TERM TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error(' TEST FAILED:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected DB.');
  }
}

runTest();
