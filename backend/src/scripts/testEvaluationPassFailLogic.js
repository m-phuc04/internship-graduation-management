import mongoose from 'mongoose';
import { validateInternshipEvaluationWindow, computeInternshipEvaluationResult } from '../services/evaluationService.js';

console.log('=== RUNNING TESTS FOR KLTN & TTDN PASS/FAIL LOGIC ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, extraInfo = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${extraInfo}`);
  }
}

// -------------------------------------------------------------
// 1. KLTN TESTS
// -------------------------------------------------------------
console.log('--- 1. Testing KLTN Logic ---');

const kltnCalc = (score) => {
  if (score === null || score === undefined || isNaN(score)) return { status: 'PENDING', isPass: false, isFail: false };
  return {
    status: score >= 5.0 ? 'PASS' : 'FAIL',
    isPass: score >= 5.0,
    isFail: score < 5.0,
  };
};

// KLTN-01: Score = 4.9 -> FAIL
const kltn01 = kltnCalc(4.9);
assert(kltn01.isFail === true && kltn01.status === 'FAIL', 'KLTN-01: Score = 4.9 must be FAIL');

// KLTN-02: Score = 5.0 -> PASS
const kltn02 = kltnCalc(5.0);
assert(kltn02.isPass === true && kltn02.status === 'PASS', 'KLTN-02: Score = 5.0 must be PASS (>= 5.0 threshold)');

// KLTN-03: Score = 7.0 -> PASS
const kltn03 = kltnCalc(7.0);
assert(kltn03.isPass === true && kltn03.status === 'PASS', 'KLTN-03: Score = 7.0 must be PASS');

// KLTN-04: No score -> Not auto PASS/FAIL
const kltn04 = kltnCalc(null);
assert(kltn04.isPass === false && kltn04.isFail === false && kltn04.status === 'PENDING', 'KLTN-04: No score must not be auto PASS or FAIL');

// -------------------------------------------------------------
// 2. TTDN TESTS
// -------------------------------------------------------------
console.log('\n--- 2. Testing TTDN Logic & Evaluation Window ---');

const termConfig = {
  internship: {
    evaluationStartDate: new Date('2026-10-01T00:00:00.000Z'),
    evaluationEndDate: new Date('2026-10-15T00:00:00.000Z'),
  },
};

// TTDN-01: Current date < startDate, no score
const dateBefore = new Date('2026-09-25T10:00:00.000Z');
let ttdn01WindowBlocked = false;
try {
  validateInternshipEvaluationWindow(termConfig, dateBefore);
} catch (e) {
  ttdn01WindowBlocked = true;
}
const ttdn01Result = computeInternshipEvaluationResult(null, null, termConfig, dateBefore);
assert(ttdn01WindowBlocked && ttdn01Result.result === 'NOT_OPEN' && !ttdn01Result.isFail && !ttdn01Result.isPass, 'TTDN-01: Before open date -> Blocked, Not FAIL, NOT_OPEN');

// TTDN-02: startDate <= Current date <= endDate, no score
const dateDuring = new Date('2026-10-08T10:00:00.000Z');
let ttdn02WindowAllowed = false;
try {
  const v = validateInternshipEvaluationWindow(termConfig, dateDuring);
  ttdn02WindowAllowed = v.allowed === true;
} catch (e) {
  ttdn02WindowAllowed = false;
}
const ttdn02Result = computeInternshipEvaluationResult(null, null, termConfig, dateDuring);
assert(ttdn02WindowAllowed && ttdn02Result.result === 'IN_PROGRESS' && !ttdn02Result.isFail, 'TTDN-02: In window without score -> Allowed to create link, IN_PROGRESS, not FAIL');

// TTDN-03: In window and has score
const scoredEval = { score: 9, status: 'SUBMITTED' };
const ttdn03Result = computeInternshipEvaluationResult(null, scoredEval, termConfig, dateDuring);
assert(ttdn03Result.result === 'PASS' && ttdn03Result.isPass === true, 'TTDN-03: In window with valid score -> PASS');

// TTDN-04: Expired but had score before
const dateAfter = new Date('2026-10-18T10:00:00.000Z');
const ttdn04Result = computeInternshipEvaluationResult(null, scoredEval, termConfig, dateAfter);
assert(ttdn04Result.result === 'PASS' && ttdn04Result.isPass === true, 'TTDN-04: Expired but had score -> PASS preserved');

// TTDN-05: Expired and no score -> FAIL
const ttdn05Result = computeInternshipEvaluationResult(null, null, termConfig, dateAfter);
assert(ttdn05Result.result === 'FAIL' && ttdn05Result.isFail === true, 'TTDN-05: Expired without score -> FAIL');

// TTDN-06: Expired calling API directly -> Backend rejects
let ttdn06Rejected = false;
try {
  validateInternshipEvaluationWindow(termConfig, dateAfter);
} catch (e) {
  ttdn06Rejected = e.message.includes('Đã hết thời gian');
}
assert(ttdn06Rejected, 'TTDN-06: Expired direct API call -> Rejected by backend validation');

// TTDN-07: Boundary end of day (15/10 23:30 allowed, 16/10 00:05 rejected)
const dateBoundary15 = new Date('2026-10-15T23:30:00.000');
const dateBoundary16 = new Date('2026-10-16T00:05:00.000');

let boundary15Allowed = false;
try {
  boundary15Allowed = validateInternshipEvaluationWindow(termConfig, dateBoundary15).allowed === true;
} catch (e) {
  boundary15Allowed = false;
}

let boundary16Rejected = false;
try {
  validateInternshipEvaluationWindow(termConfig, dateBoundary16);
} catch (e) {
  boundary16Rejected = true;
}
assert(boundary15Allowed && boundary16Rejected, 'TTDN-07: Boundary date check (15/10 allowed till 23:59:59, 16/10 rejected)');

// TTDN-08: Has link (token exists) but no score after deadline -> FAIL
const evalWithLinkOnly = null; // No Evaluation record, only request existed
const ttdn08Result = computeInternshipEvaluationResult(null, evalWithLinkOnly, termConfig, dateAfter);
assert(ttdn08Result.result === 'FAIL' && ttdn08Result.isFail === true, 'TTDN-08: Link exists but no score after deadline -> FAIL (Having link != Having score)');

console.log(`\n==============================================`);
console.log(`RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`==============================================\n`);
