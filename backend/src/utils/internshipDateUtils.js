/**
 * Các hàm tiện ích tính toán thời lượng thực tập, khoảng thời gian các tuần và quy tắc khóa báo cáo (TTDN).
 */

/**
 * Tính toán thời lượng theo số tuần dựa trên ngày bắt đầu và ngày kết thúc.
 * Trả về null nếu ngày không hợp lệ hoặc ngày bắt đầu >= ngày kết thúc.
 */
export const calculateInternshipWeeks = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.round(diffDays / 7);
};

/**
 * Xác định ngày kết thúc thực tế của một tuần nhất định.
 * Tuần 1 kết thúc lúc: startDate + 6 ngày (23:59:59.999)
 * Tuần w kết thúc lúc: startDate + (w * 7 - 1) ngày (23:59:59.999)
 */
export const getWeekEndDate = (internshipStartDate, weekNumber, explicitWeekEndDate = null) => {
  if (explicitWeekEndDate) {
    const exp = new Date(explicitWeekEndDate);
    if (!isNaN(exp.getTime())) {
      const d = new Date(exp);
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }

  if (!internshipStartDate || !weekNumber) return null;
  const start = new Date(internshipStartDate);
  if (isNaN(start.getTime())) return null;

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + (weekNumber * 7 - 1));
  endDate.setHours(23, 59, 59, 999);
  return endDate;
};

/**
 * Kiểm tra xem một tuần thực tập đã kết thúc hay chưa (đã bị khóa).
 * So sánh thời gian hiện tại với thời điểm 23:59:59.999 của weekEndDate.
 */
export const isWeekEnded = (weekEndDate) => {
  if (!weekEndDate) return false;
  const end = new Date(weekEndDate);
  if (isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return new Date().getTime() > end.getTime();
};

/**
 * Lấy tổng số tuần thực tế của một hồ sơ thực tập (xử lý an toàn cho các bản ghi cũ).
 */
export const getInternshipTotalWeeks = (internship) => {
  if (!internship) return 0;
  if (internship?.durationInWeeks && [10, 12].includes(internship.durationInWeeks)) {
    return internship.durationInWeeks;
  }
  if (internship?.startDate && internship?.endDate) {
    const calculated = calculateInternshipWeeks(internship.startDate, internship.endDate);
    if (calculated === 10 || calculated === 12) return calculated;
  }
  return 12; // Mặc định dự phòng 12 tuần
};

/**
 * Xác định danh sách các tuần bắt buộc phải nộp báo cáo dựa trên tổng số tuần và chu kỳ báo cáo.
 * Ví dụ:
 * - totalWeeks: 10, cycle: 1 -> [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 * - totalWeeks: 10, cycle: 2 -> [2, 4, 6, 8, 10]
 * - totalWeeks: 10, cycle: 3 -> [3, 6, 9]
 * - totalWeeks: 12, cycle: 2 -> [2, 4, 6, 8, 10, 12]
 * - totalWeeks: 12, cycle: 3 -> [3, 6, 9, 12]
 */
export const getMandatoryReportWeeks = (totalWeeks, reportCycle = 1) => {
  const weeks = [];
  const limit = totalWeeks === 10 || totalWeeks === 12 ? totalWeeks : 12;
  const cycle = [1, 2, 3].includes(Number(reportCycle)) ? Number(reportCycle) : 1;

  for (let w = 1; w <= limit; w++) {
    if (w % cycle === 0) {
      weeks.push(w);
    }
  }
  return weeks;
};

/**
 * Tự động kiểm tra sinh viên đã hoàn thành tất cả các báo cáo nhật ký bắt buộc chưa.
 * Các tuần ngoài chu kỳ không bắt buộc.
 * Bản nháp ("DRAFT") hoặc các tuần chưa nộp không được tính là báo cáo hợp lệ.
 * Báo cáo hợp lệ phải có trạng thái thuộc ["SUBMITTED", "APPROVED"].
 */
export const checkInternshipDiaryCompletion = (internship, reports = []) => {
  const totalWeeks = getInternshipTotalWeeks(internship);
  const cycle = internship?.reportCycle || 1;
  const mandatoryWeeks = getMandatoryReportWeeks(totalWeeks, cycle);

  // Tập hợp các tuần đã có báo cáo hợp lệ (đã nộp hoặc đã duyệt)
  const validReportWeeks = new Set(
    (reports || [])
      .filter((r) => r.reportType === "WEEKLY" && ["SUBMITTED", "APPROVED"].includes(r.status))
      .map((r) => r.weekNumber)
  );

  const missingWeeks = mandatoryWeeks.filter((w) => !validReportWeeks.has(w));
  const submittedWeeks = mandatoryWeeks.filter((w) => validReportWeeks.has(w));
  const isCompleted = missingWeeks.length === 0;

  return {
    isCompleted,
    totalWeeks,
    reportCycle: cycle,
    mandatoryWeeks,
    submittedWeeks,
    missingWeeks,
    totalMandatory: mandatoryWeeks.length,
    totalSubmitted: submittedWeeks.length,
    summaryText: isCompleted
      ? `Đủ nhật ký (${submittedWeeks.length}/${mandatoryWeeks.length} tuần)`
      : `Chưa đủ nhật ký (Thiếu tuần ${missingWeeks.join(", ")})`,
  };
};

