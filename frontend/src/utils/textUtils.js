/**
 * Utility functions for text formatting and normalization
 */

/**
 * Chuẩn hóa tên đề tài theo định dạng viết hoa chữ cái đầu mỗi từ (Title Case).
 * - Chữ cái đầu mỗi từ được viết hoa (hỗ trợ đầy đủ tiếng Việt có dấu).
 * - Các chữ cái còn lại được chuyển thành chữ thường.
 * - Loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi.
 * - Chuẩn hóa các khoảng trắng liên tiếp thành một khoảng trắng duy nhất.
 * - Giữ nguyên dấu câu, dấu ngoặc, ký tự đặc biệt hợp lệ và số.
 * - Loại bỏ các ký tự ẩn zero-width space (thường gặp khi copy từ Word).
 *
 * @param {string} str - Tên đề tài đầu vào
 * @returns {string} - Tên đề tài đã được chuẩn hóa Title Case
 */
export const formatTopicTitle = (str) => {
  if (!str || typeof str !== "string") return "";

  // 1. Loại bỏ ký tự ẩn không nhìn thấy (zero-width spaces) và chuẩn hóa khoảng trắng
  const cleaned = str
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) return "";

  // 2. Viết hoa chữ cái đầu mỗi từ Unicode, các chữ cái còn lại viết thường
  return cleaned.replace(/\p{L}+/gu, (word) => {
    return word.charAt(0).toLocaleUpperCase("vi") + word.slice(1).toLocaleLowerCase("vi");
  });
};

/**
 * Chuẩn hóa chuỗi nhập liệu thô chứa danh sách đề tài (nhiều dòng hoặc phân tách dấu phẩy).
 * Giữ nguyên cấu trúc các dòng khi người dùng nhập hoặc dán nhiều đề tài cùng lúc.
 *
 * @param {string} rawStr - Chuỗi nhiều dòng hoặc dấu phẩy
 * @returns {string} - Chuỗi đã được chuẩn hóa từng dòng
 */
export const formatRawTopicInput = (rawStr) => {
  if (!rawStr || typeof rawStr !== "string") return "";

  const lines = rawStr.split(/\r?\n/);
  return lines
    .map((line) => {
      // Chuẩn hóa khoảng trắng ngang trong dòng (giữ nguyên ngắt dòng)
      const cleaned = line
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[^\S\r\n]+/g, " ");

      return cleaned.replace(/\p{L}+/gu, (word) => {
        return word.charAt(0).toLocaleUpperCase("vi") + word.slice(1).toLocaleLowerCase("vi");
      });
    })
    .join("\n");
};

export default {
  formatTopicTitle,
  formatRawTopicInput,
};
