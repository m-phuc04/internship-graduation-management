/**
 * Utility functions for date parsing and formatting in Vietnamese standard format (DD/MM/YYYY)
 */

/**
 * Safely parse date from Date object, ISO string, or 'YYYY-MM-DD' without UTC timezone shift
 * @param {Date|string|number} d
 * @returns {Date|null}
 */
export const parseLocalDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    return d;
  }
  if (typeof d === 'string') {
    // If format is YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const datePart = d.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format date to standard Vietnamese DD/MM/YYYY (e.g. 11/08/2026)
 * @param {Date|string|number} d
 * @returns {string}
 */
export const formatDateVN = (d) => {
  if (!d) return '—';
  const dateObj = parseLocalDate(d);
  if (!dateObj) return '—';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date to clear Vietnamese text (e.g. "Ngày 11 tháng 08, 2026")
 * @param {Date|string|number} d
 * @returns {string}
 */
export const formatFullDateVN = (d) => {
  if (!d) return '';
  const dateObj = parseLocalDate(d);
  if (!dateObj) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `Ngày ${day} tháng ${month}, ${year}`;
};

/**
 * Format date for HTML <input type="date"> (YYYY-MM-DD) safely using local time
 * @param {Date|string|number} d
 * @returns {string}
 */
export const formatDateForInput = (d) => {
  if (!d) return '';
  const dateObj = parseLocalDate(d);
  if (!dateObj) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if the report time / defense time of a Council room has expired (ended)
 * @param {Object} council
 * @returns {boolean}
 */
export const isCouncilReportTimeExpired = (council) => {
  if (!council) return false;

  try {
    const now = new Date();

    // 1. If reportDate is set
    if (council.reportDate) {
      const dateObj = parseLocalDate(council.reportDate);
      if (dateObj) {
        let endHour = 23;
        let endMinute = 59;

        if (council.reportEndTime && typeof council.reportEndTime === 'string') {
          const [h, m] = council.reportEndTime.split(':').map(Number);
          if (!isNaN(h)) endHour = h;
          if (!isNaN(m)) endMinute = m;
        } else if (council.endHour && council.endPeriod) {
          let h = parseInt(council.endHour, 10);
          const m = parseInt(council.endMinute || '0', 10);
          if (council.endPeriod === 'PM' && h < 12) h += 12;
          if (council.endPeriod === 'AM' && h === 12) h = 0;
          if (!isNaN(h)) endHour = h;
          if (!isNaN(m)) endMinute = m;
        }

        dateObj.setHours(endHour, endMinute, 59, 999);
        return now > dateObj;
      }
    }

    // 2. Parse from reportTime string (e.g. "08:00 - 11:30, 07/10/2026")
    if (council.reportTime && typeof council.reportTime === 'string') {
      const dateMatchVN = council.reportTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const dateMatchISO = council.reportTime.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      const timeRangeMatch = council.reportTime.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);

      let year, month, day;
      if (dateMatchVN) {
        day = parseInt(dateMatchVN[1], 10);
        month = parseInt(dateMatchVN[2], 10) - 1;
        year = parseInt(dateMatchVN[3], 10);
      } else if (dateMatchISO) {
        year = parseInt(dateMatchISO[1], 10);
        month = parseInt(dateMatchISO[2], 10) - 1;
        day = parseInt(dateMatchISO[3], 10);
      }

      if (year !== undefined && month !== undefined && day !== undefined) {
        let endHour = 23;
        let endMinute = 59;
        if (timeRangeMatch && timeRangeMatch[2]) {
          const [h, m] = timeRangeMatch[2].split(':').map(Number);
          if (!isNaN(h)) endHour = h;
          if (!isNaN(m)) endMinute = m;
        }
        const endDateTime = new Date(year, month, day, endHour, endMinute, 59, 999);
        return now > endDateTime;
      }
    }

    // 3. Fallback: defenseDate
    if (council.defenseDate) {
      const defDate = parseLocalDate(council.defenseDate);
      if (defDate) {
        defDate.setHours(23, 59, 59, 999);
        return now > defDate;
      }
    }
  } catch (err) {
    console.warn('Error checking council expiry:', err);
  }

  return false;
};

