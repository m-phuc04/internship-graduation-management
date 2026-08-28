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

