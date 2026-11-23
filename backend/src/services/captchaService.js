import crypto from 'crypto';

// Bộ nhớ lưu trữ CAPTCHA tạm thời: captchaId -> { text, expiresAt }
const captchaStore = new Map();

// Ký tự cho phép: Chữ cái in hoa và số, loại trừ các ký tự dễ nhầm lẫn (0, O, 1, I, L)
const CHAR_SET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Dọn dẹp định kỳ các mã CAPTCHA đã hết hạn mỗi 60 giây
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore.entries()) {
    if (data.expiresAt < now) {
      captchaStore.delete(id);
    }
  }
}, 60 * 1000);

/**
 * Tạo một chuỗi ngẫu nhiên từ tập ký tự an toàn
 */
const generateRandomText = (length = 5) => {
  let text = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHAR_SET.length);
    text += CHAR_SET[randomIndex];
  }
  return text;
};

/**
 * Hàm tiện ích lấy số nguyên ngẫu nhiên trong khoảng [min, max]
 */
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Hàm tiện ích lấy các màu tối nổi bật cho chữ/đường nét
 */
const getRandomColor = () => {
  const colors = [
    '#1e293b', '#0f172a', '#1e3a8a', '#1e40af', '#3730a3',
    '#5b21b6', '#86198f', '#9f1239', '#9a3412', '#065f46',
  ];
  return colors[getRandomInt(0, colors.length - 1)];
};

/**
 * Tạo ảnh SVG cho mã CAPTCHA kèm các đường nhiễu, điểm chấm và ký tự biến dạng
 */
const generateCaptchaSvg = (text) => {
  const width = 170;
  const height = 48;

  // Tạo dải màu nền nhẹ cho CAPTCHA
  const bgHue = getRandomInt(200, 260);
  const bg1 = `hsl(${bgHue}, 40%, 96%)`;
  const bg2 = `hsl(${bgHue + 20}, 40%, 92%)`;

  let noiseLines = '';
  // Vẽ 5 đường cong gây nhiễu
  for (let i = 0; i < 5; i++) {
    const x1 = getRandomInt(0, 30);
    const y1 = getRandomInt(5, height - 5);
    const x2 = getRandomInt(width - 30, width);
    const y2 = getRandomInt(5, height - 5);
    const cx = getRandomInt(40, width - 40);
    const cy = getRandomInt(5, height - 5);
    const stroke = getRandomColor();
    const strokeWidth = getRandomInt(1, 2);
    noiseLines += `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" opacity="0.45" />`;
  }

  let noiseDots = '';
  // Vẽ 30 điểm chấm ngẫu nhiên gây nhiễu
  for (let i = 0; i < 30; i++) {
    const cx = getRandomInt(5, width - 5);
    const cy = getRandomInt(5, height - 5);
    const r = getRandomInt(1, 2.5);
    const fill = getRandomColor();
    noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.35" />`;
  }

  // Vẽ từng ký tự bị biến dạng ngẫu nhiên
  let charElements = '';
  const charSpacing = (width - 30) / text.length;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 18 + i * charSpacing + getRandomInt(-2, 2);
    const y = getRandomInt(30, 36);
    const angle = getRandomInt(-22, 22);
    const fontSize = getRandomInt(24, 29);
    const color = getRandomColor();

    charElements += `
      <text
        x="${x}"
        y="${y}"
        font-family="Arial, 'Helvetica Neue', sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        fill="${color}"
        transform="rotate(${angle}, ${x + 6}, ${y - 10})"
        letter-spacing="2"
      >${char}</text>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="captchaBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg1}" />
          <stop offset="100%" stop-color="${bg2}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="10" fill="url(#captchaBg)" stroke="#cbd5e1" stroke-width="1" />
      ${noiseLines}
      ${noiseDots}
      ${charElements}
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg.trim()).toString('base64')}`;
};

/**
 * Tạo một phiên CAPTCHA mới
 */
export const createCaptcha = () => {
  const captchaId = crypto.randomUUID();
  const text = generateRandomText(5);
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const image = generateCaptchaSvg(text);

  captchaStore.set(captchaId, {
    text: text.toUpperCase(),
    expiresAt,
  });

  return {
    captchaId,
    image,
    expiresAt,
  };
};

/**
 * Xác minh và vô hiệu hóa mã CAPTCHA (sử dụng một lần)
 */
export const verifyCaptcha = (captchaId, answer) => {
  if (!captchaId || !answer || typeof answer !== 'string') {
    const error = new Error('Vui lòng nhập mã CAPTCHA');
    error.statusCode = 400;
    throw error;
  }

  const stored = captchaStore.get(captchaId);

  // Hủy CAPTCHA ngay lập tức để chống tấn công phát lại (Replay Attack)
  captchaStore.delete(captchaId);

  if (!stored) {
    const error = new Error('Mã CAPTCHA đã hết hạn hoặc không tồn tại. Vui lòng nhập mã mới.');
    error.statusCode = 400;
    throw error;
  }

  if (Date.now() > stored.expiresAt) {
    const error = new Error('Mã CAPTCHA đã hết hạn. Vui lòng nhập mã mới.');
    error.statusCode = 400;
    throw error;
  }

  if (stored.text !== answer.trim().toUpperCase()) {
    const error = new Error('Mã CAPTCHA không chính xác.');
    error.statusCode = 400;
    throw error;
  }

  return true;
};

export default {
  createCaptcha,
  verifyCaptcha,
};
