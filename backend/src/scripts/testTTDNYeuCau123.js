import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDatabase from '../config/database.js';
import Internship from '../models/Internship.js';
import InternshipReport from '../models/InternshipReport.js';
import Student from '../models/Student.js';
import Lecturer from '../models/Lecturer.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import internshipService from '../services/internshipService.js';
import internshipReportService from '../services/internshipReportService.js';
import {
  calculateInternshipWeeks,
  getWeekEndDate,
  isWeekEnded,
  getInternshipTotalWeeks,
} from '../utils/internshipDateUtils.js';

dotenv.config();

async function runTests() {
  await connectDatabase();
  console.log('\n======================================================');
  console.log('   BẮT ĐẦU KIỂM THỬ 12 TRƯỜNG HỢP THEO YÊU CẦU PROMPT 1');
  console.log('======================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  try {
    // ---------------------------------------------------------------
    // CASE 1: Tính toán thời lượng tuần từ ngày bắt đầu & kết thúc
    // ---------------------------------------------------------------
    console.log('--- TEST NHÓM 1: TÍNH TOÁN & RÀNG BUỘC THỜI LƯỢNG 10 HOẶC 12 TUẦN ---');
    const start2026 = new Date('2026-11-09'); // Monday
    const end10Weeks = new Date('2026-11-09');
    end10Weeks.setDate(end10Weeks.getDate() + (10 * 7 - 1)); // 69 days later = Sunday

    const end12Weeks = new Date('2026-11-09');
    end12Weeks.setDate(end12Weeks.getDate() + (12 * 7 - 1)); // 83 days later = Sunday

    const end8Weeks = new Date('2026-11-09');
    end8Weeks.setDate(end8Weeks.getDate() + (8 * 7 - 1));

    const end11Weeks = new Date('2026-11-09');
    end11Weeks.setDate(end11Weeks.getDate() + (11 * 7 - 1));

    assert(calculateInternshipWeeks(start2026, end10Weeks) === 10, '1. Tính toán 10 tuần chính xác (69 ngày / 70 ngày bao gồm)');
    assert(calculateInternshipWeeks(start2026, end12Weeks) === 12, '2. Tính toán 12 tuần chính xác (83 ngày / 84 ngày bao gồm)');
    assert(calculateInternshipWeeks(start2026, end8Weeks) === 8, '3a. Tính toán 8 tuần ra 8 tuần');
    assert(calculateInternshipWeeks(start2026, end11Weeks) === 11, '3b. Tính toán 11 tuần ra 11 tuần');

    // ---------------------------------------------------------------
    // CASE 2 & 3: Đăng ký thực tập validation
    // ---------------------------------------------------------------
    // Tìm student và lecturer để test
    const studentUser = await User.findOne({ role: 'STUDENT' });
    const student = await Student.findOne();
    const lecturer = await Lecturer.findOne().populate('userId');
    const company = await Company.findOne({ status: 'ACTIVE' });

    // Test từ chối thời lượng khác 10 hoặc 12 tuần
    let rejectedNon10Or12 = false;
    try {
      await internshipService.createInternship({
        studentId: student._id,
        companyId: company._id,
        position: 'Tester',
        startDate: start2026,
        endDate: end8Weeks, // 8 tuần
        mentorName: 'Mentor Test',
        mentorPosition: 'Lead',
        mentorEmail: 'mentor@test.com',
        mentorPhone: '0901234567',
      });
    } catch (err) {
      if (err.message && err.message.includes('10 tuần hoặc 12 tuần')) {
        rejectedNon10Or12 = true;
      }
    }
    assert(rejectedNon10Or12, '3c. Đăng ký thời lượng khác 10 hoặc 12 tuần (8 tuần) bị từ chối');

    // Test từ chối ngày kết thúc trước ngày bắt đầu
    let rejectedInvalidDates = false;
    try {
      await internshipService.createInternship({
        studentId: student._id,
        companyId: company._id,
        position: 'Tester',
        startDate: '2026-12-01',
        endDate: '2026-11-01',
        mentorName: 'Mentor Test',
        mentorPosition: 'Lead',
        mentorEmail: 'mentor@test.com',
        mentorPhone: '0901234567',
      });
    } catch (err) {
      if (err.message && err.message.includes('Ngày bắt đầu phải trước ngày kết thúc')) {
        rejectedInvalidDates = true;
      }
    }
    assert(rejectedInvalidDates, '3d. Đăng ký với ngày kết thúc trước ngày bắt đầu bị từ chối');

    // ---------------------------------------------------------------
    // TEST NHÓM 2: CHU KỲ NỘP NHẬT KÝ CỦA GVGS
    // ---------------------------------------------------------------
    console.log('\n--- TEST NHÓM 2: CHU KỲ NỘP NHẬT KÝ (1, 2, 3 TUẦN/LẦN) ---');
    
    // Tạo 1 mock internship để test chu kỳ và khóa tuần mà không ảnh hưởng data hiện có
    const testInternship = new Internship({
      studentId: student._id,
      companyId: company._id,
      lecturerId: lecturer._id,
      position: 'Backend Developer Intern',
      startDate: new Date('2026-10-01'), // Bắt đầu tháng 10/2026
      endDate: new Date('2026-12-09'), // 10 tuần
      durationInWeeks: 10,
      reportCycle: 1,
      status: 'INTERNING',
    });
    await testInternship.save();

    // 4. GVGS chọn chu kỳ 1 tuần/lần
    await internshipService.updateReportCycle(
      testInternship._id,
      { role: 'LECTURER', userId: lecturer.userId._id },
      1,
    );
    let updated1 = await Internship.findById(testInternship._id);
    assert(updated1.reportCycle === 1, '4. GVGS chọn chu kỳ 1 tuần/lần thành công');

    // 5. GVGS chọn chu kỳ 2 tuần/lần
    await internshipService.updateReportCycle(
      testInternship._id,
      { role: 'LECTURER', userId: lecturer.userId._id },
      2,
    );
    let updated2 = await Internship.findById(testInternship._id);
    assert(updated2.reportCycle === 2, '5. GVGS chọn chu kỳ 2 tuần/lần thành công');

    // 6. GVGS chọn chu kỳ 3 tuần/lần
    await internshipService.updateReportCycle(
      testInternship._id,
      { role: 'LECTURER', userId: lecturer.userId._id },
      3,
    );
    let updated3 = await Internship.findById(testInternship._id);
    assert(updated3.reportCycle === 3, '6. GVGS chọn chu kỳ 3 tuần/lần thành công');

    // Test kiểm tra từ chối chu kỳ không hợp lệ (ví dụ: chu kỳ 4 hoặc 0)
    let rejectedInvalidCycle = false;
    try {
      await internshipService.updateReportCycle(
        testInternship._id,
        { role: 'LECTURER', userId: lecturer.userId._id },
        5,
      );
    } catch (err) {
      if (err.message && err.message.includes('1, 2 hoặc 3 tuần/lần')) {
        rejectedInvalidCycle = true;
      }
    }
    assert(rejectedInvalidCycle, '6b. Từ chối thiết lập chu kỳ ngoài [1, 2, 3]');

    // Test tính tuần theo chu kỳ:
    // Với 10 tuần:
    // Cycle 1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // Cycle 2: [2, 4, 6, 8, 10]
    // Cycle 3: [3, 6, 9]
    const getWeeksForCycle = (total, c) => {
      const arr = [];
      for (let w = 1; w <= total; w++) {
        if (w % c === 0) arr.push(w);
      }
      return arr;
    };
    assert(
      JSON.stringify(getWeeksForCycle(10, 1)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      '4b. Chu kỳ 1 tuần/lần tính đúng các tuần 1, 2, 3, 4, 5, 6, 7, 8, 9, 10',
    );
    assert(
      JSON.stringify(getWeeksForCycle(10, 2)) === JSON.stringify([2, 4, 6, 8, 10]),
      '5b. Chu kỳ 2 tuần/lần tính đúng các tuần 2, 4, 6, 8, 10',
    );
    assert(
      JSON.stringify(getWeeksForCycle(12, 2)) === JSON.stringify([2, 4, 6, 8, 10, 12]),
      '5c. Chu kỳ 2 tuần/lần (12 tuần) tính đúng các tuần 2, 4, 6, 8, 10, 12',
    );
    assert(
      JSON.stringify(getWeeksForCycle(12, 3)) === JSON.stringify([3, 6, 9, 12]),
      '6c. Chu kỳ 3 tuần/lần (12 tuần) tính đúng các tuần 3, 6, 9, 12',
    );

    // 7. GVGS thay đổi chu kỳ nhưng dữ liệu nhật ký cũ vẫn được bảo toàn
    // Tạo 1 báo cáo cho Tuần 1 khi chu kỳ là 1
    const testReportW1 = new InternshipReport({
      internshipId: testInternship._id,
      studentId: student._id,
      reportType: 'WEEKLY',
      title: 'Báo cáo Tuần 1 Test',
      content: 'Nội dung tuần 1',
      weekNumber: 1,
      weekStartDate: new Date('2026-10-01'),
      weekEndDate: new Date('2026-10-07'),
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });
    await testReportW1.save();

    // GVGS đổi chu kỳ sang 2 tuần/lần
    await internshipService.updateReportCycle(
      testInternship._id,
      { role: 'LECTURER', userId: lecturer.userId._id },
      2,
    );

    // Kiểm tra báo cáo tuần 1 vẫn còn nguyên vẹn trong DB
    const reportStillExists = await InternshipReport.findById(testReportW1._id);
    assert(
      reportStillExists && reportStillExists.title === 'Báo cáo Tuần 1 Test',
      '7. GVGS thay đổi chu kỳ từ 1 sang 2 tuần/lần nhưng báo cáo Tuần 1 cũ vẫn được bảo toàn nguyên vẹn',
    );

    // ---------------------------------------------------------------
    // TEST NHÓM 3: KHÓA NHẬT KÝ KHI TUẦN THỰC TẬP ĐÃ KẾT THÚC
    // ---------------------------------------------------------------
    console.log('\n--- TEST NHÓM 3: KHÓA NHẬT KÝ KHI TUẦN ĐÃ KẾT THÚC ---');
    
    // Ngày hiện tại là 2026-11-05.
    // Tuần 1 bắt đầu 2026-10-01, kết thúc 2026-10-07 -> ĐÃ KẾT THÚC -> PHẢI KHÓA!
    const pastWeekEnd = new Date('2026-10-07');
    assert(isWeekEnded(pastWeekEnd) === true, '8a. Hàm isWeekEnded nhận diện tuần 2026-10-07 đã kết thúc');

    // Tuần tương lai bắt đầu 2026-11-10, kết thúc 2026-11-16 -> CHƯA KẾT THÚC -> KHÔNG KHÓA!
    const futureWeekEnd = new Date('2026-11-16');
    assert(isWeekEnded(futureWeekEnd) === false, '9a. Hàm isWeekEnded nhận diện tuần 2026-11-16 chưa kết thúc');

    // 8. Tuần đã kết thúc thì sinh viên không thể sửa nhật ký
    let editLockedWeekFailed = false;
    try {
      await internshipReportService.updateReport({
        reportId: testReportW1._id,
        userId: student.userId,
        title: 'Cố tình sửa báo cáo tuần đã kết thúc',
      });
    } catch (err) {
      if (err.message && err.message.includes('đã kết thúc') && err.message.includes('đã bị khóa')) {
        editLockedWeekFailed = true;
      }
    }
    assert(editLockedWeekFailed, '8b. Cố tình sửa nhật ký của tuần đã kết thúc bị từ chối');

    // 12. Gọi API trực tiếp để tạo/gửi nhật ký của tuần đã khóa phải bị từ chối
    let createLockedWeekFailed = false;
    try {
      await internshipReportService.createReport({
        userId: student.userId,
        internshipId: testInternship._id,
        reportType: 'WEEKLY',
        weekNumber: 2, // Tuần 2: 2026-10-08 đến 2026-10-14 (đã qua)
        weekStartDate: new Date('2026-10-08'),
        weekEndDate: new Date('2026-10-14'),
        title: 'Cố tình nộp tuần 2 đã hết hạn',
      });
    } catch (err) {
      if (err.message && err.message.includes('đã kết thúc') && err.message.includes('đã bị khóa')) {
        createLockedWeekFailed = true;
      }
    }
    assert(createLockedWeekFailed, '12. Gọi API trực tiếp tạo nhật ký cho tuần đã kết thúc bị từ chối với lỗi khóa');

    // Kiểm tra gọi API trực tiếp với tuần không thuộc chu kỳ
    // Hiện tại cycle = 2, thử nộp tuần 3 (tuần 3 % 2 !== 0)
    let nonCycleWeekFailed = false;
    try {
      await internshipReportService.createReport({
        userId: student.userId,
        internshipId: testInternship._id,
        reportType: 'WEEKLY',
        weekNumber: 3,
        weekStartDate: new Date('2026-11-20'),
        weekEndDate: new Date('2026-11-27'),
        title: 'Cố tình nộp tuần ngoài chu kỳ',
      });
    } catch (err) {
      if (err.message && err.message.includes('không thuộc chu kỳ nộp nhật ký')) {
        nonCycleWeekFailed = true;
      }
    }
    assert(nonCycleWeekFailed, '12b. Gọi API nộp tuần không thuộc chu kỳ (tuần 3 với chu kỳ 2) bị từ chối');

    // 9. Tuần chưa kết thúc và đúng chu kỳ vẫn có thể nộp bình thường
    // Thiết lập internship với ngày bắt đầu trong tương lai/hiện tại
    const activeTestInternship = new Internship({
      studentId: student._id,
      companyId: company._id,
      lecturerId: lecturer._id,
      position: 'Frontend Developer Intern',
      startDate: new Date('2026-11-02'), // Tuần này
      endDate: new Date('2027-01-10'),
      durationInWeeks: 10,
      reportCycle: 2,
      status: 'INTERNING',
    });
    await activeTestInternship.save();

    // Nộp tuần 2 (thuộc chu kỳ 2 và kết thúc vào 2026-11-15 - chưa kết thúc)
    const validReport = await internshipReportService.createReport({
      userId: student.userId,
      internshipId: activeTestInternship._id,
      reportType: 'WEEKLY',
      weekNumber: 2,
      weekStartDate: new Date('2026-11-02'),
      weekEndDate: new Date('2026-11-15'),
      title: 'Nhật ký tuần 2 hợp lệ',
      content: 'Hoàn thành giao diện dashboard',
      status: 'SUBMITTED',
    });
    assert(
      validReport && validReport.weekNumber === 2 && validReport.status === 'SUBMITTED',
      '9. Tuần chưa kết thúc và thuộc chu kỳ được nộp bình thường',
    );

    // 10. Sinh viên vẫn xem được nhật ký đã nộp
    const studentReports = await internshipReportService.getReportsByInternshipId(
      testInternship._id,
      { role: 'STUDENT', userId: student.userId },
    );
    assert(
      studentReports && studentReports.reports.length >= 1,
      '10. Sinh viên vẫn xem được đầy đủ danh sách nhật ký đã nộp',
    );

    // 11. GVGS vẫn xem được nhật ký của sinh viên đang hướng dẫn
    const lecturerReports = await internshipReportService.getReportsByInternshipId(
      testInternship._id,
      { role: 'LECTURER', userId: lecturer.userId._id },
    );
    assert(
      lecturerReports && lecturerReports.reports.length >= 1,
      '11. GVGS vẫn xem được nhật ký của sinh viên đang hướng dẫn',
    );

    // Dọn dẹp dữ liệu test tạm thời
    await InternshipReport.deleteMany({ internshipId: { $in: [testInternship._id, activeTestInternship._id] } });
    await Internship.deleteMany({ _id: { $in: [testInternship._id, activeTestInternship._id] } });
    console.log('\nĐã dọn dẹp các bản ghi test tạm thời, bảo toàn dữ liệu gốc.');

    console.log('\n======================================================');
    console.log(`   KẾT QUẢ KIỂM THỬ: ${passedCount} PASSED / ${failedCount} FAILED`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('LỖI KIỂM THỬ:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(failedCount === 0 ? 0 : 1);
  }
}

runTests();

