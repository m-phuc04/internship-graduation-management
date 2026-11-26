import crypto from "crypto";

/**
 * Tạo mật khẩu ngẫu nhiên an toàn (tối thiểu 12 ký tự, mặc định 16 ký tự)
 * Bao gồm: Chữ hoa, chữ thường, chữ số và ký tự đặc biệt
 */
export const generateSecurePassword = (length = 16) => {
  const safeLength = Math.max(12, length);
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // loại bỏ I, O để tránh nhầm 1, 0
  const lower = "abcdefghijkmnpqrstuvwxyz"; // loại bỏ l
  const numbers = "23456789"; // loại bỏ 0, 1
  const specials = "@#$%&*!";

  // Đảm bảo có ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt
  const passwordChars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    specials[crypto.randomInt(0, specials.length)],
  ];

  const allChars = upper + lower + numbers + specials;
  for (let i = passwordChars.length; i < safeLength; i++) {
    passwordChars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Trộn ngẫu nhiên (Fisher-Yates shuffle bằng crypto)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
};

export default generateSecurePassword;
