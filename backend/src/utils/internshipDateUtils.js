/**
 * Utility functions for internship durations, week intervals, and locking rules (TTDN).
 */

/**
 * Calculate the duration in weeks based on start and end dates.
 * Returns null if dates are invalid or start >= end.
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
 * Determine the actual end date of a given week.
 * Week 1 ends at: startDate + 6 days (23:59:59.999)
 * Week w ends at: startDate + (w * 7 - 1) days (23:59:59.999)
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
 * Determine if a week has ended (is locked).
 * Compares current wall-clock time with 23:59:59.999 of weekEndDate.
 */
export const isWeekEnded = (weekEndDate) => {
  if (!weekEndDate) return false;
  const end = new Date(weekEndDate);
  if (isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return new Date().getTime() > end.getTime();
};

/**
 * Get effective duration in weeks for an internship (safely handles legacy records).
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
  return 12; // default fallback
};

/**
 * Determine the mandatory report weeks based on total weeks and report cycle.
 * Example:
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
 * Automatically check whether a student has completed all mandatory diary reports.
 * Non-cycle weeks are NOT required.
 * Drafts ("DRAFT") or unsubmitted weeks are NOT counted as valid reports.
 * Valid reports must have status in ["SUBMITTED", "APPROVED"].
 */
export const checkInternshipDiaryCompletion = (internship, reports = []) => {
  const totalWeeks = getInternshipTotalWeeks(internship);
  const cycle = internship?.reportCycle || 1;
  const mandatoryWeeks = getMandatoryReportWeeks(totalWeeks, cycle);

  // Collect weeks that have a valid submitted or approved report
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

