/**
 * Tạo mật khẩu ngẫu nhiên an toàn trên client (tối thiểu 8 ký tự, mặc định 8 ký tự)
 * Bao gồm: Chữ hoa, chữ thường, chữ số và ký tự đặc biệt
 */
export const generateSecurePassword = (length = 8) => {
  const safeLength = Math.max(8, length);
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '@#$%&*!';

  const getRandomInt = (max) => {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] % max;
  };

  const passwordChars = [
    upper[getRandomInt(upper.length)],
    lower[getRandomInt(lower.length)],
    numbers[getRandomInt(numbers.length)],
    specials[getRandomInt(specials.length)],
  ];

  const allChars = upper + lower + numbers + specials;
  for (let i = passwordChars.length; i < safeLength; i++) {
    passwordChars.push(allChars[getRandomInt(allChars.length)]);
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
};

export default generateSecurePassword;
