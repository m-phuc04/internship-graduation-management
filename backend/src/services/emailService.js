import nodemailer from "nodemailer";

/**
 * Cấu hình Email Transporter
 * Tự động nhận diện SMTP từ biến môi trường (.env)
 * Nếu chưa cấu hình SMTP, hệ thống sẽ ghi log an toàn mà không làm gián đoạn nghiệp vụ.
 */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: SMTP_SECURE === "true" || SMTP_PORT === "465",
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      console.log(`[EmailService] SMTP Transporter configured for: ${SMTP_USER}@${SMTP_HOST}`);
    } catch (err) {
      console.warn("[EmailService] Failed to initialize SMTP Transporter:", err.message);
      transporter = null;
    }
  }

  return transporter;
};

/**
 * Format thời gian tiếng Việt
 */
const formatVietnameseDateTime = (date = new Date()) => {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

/**
 * Map loại thông báo sang nhãn tiếng Việt
 */
const getTypeLabel = (type) => {
  switch (type) {
    case "THESIS":
      return "Khóa Luận Tốt Nghiệp";
    case "THESIS_PROGRESS":
      return "Tiến Độ & Nhật Ký KLTN";
    case "INTERNSHIP":
      return "Thực Tập Doanh Nghiệp";
    case "INTERNSHIP_REPORT":
      return "Báo Cáo Thực Tập";
    case "EVALUATION":
      return "Đánh Giá Thực Tập";
    case "SCHEDULE":
      return "Lịch Trình Đào Tạo";
    case "SYSTEM":
    default:
      return "Hệ Thống";
  }
};

/**
 * Gửi email thông báo cá nhân
 * @param {Object} params
 * @param {string} params.to - Email người nhận
 * @param {string} params.recipientName - Tên người nhận
 * @param {string} params.title - Tiêu đề thông báo
 * @param {string} params.message - Nội dung thông báo
 * @param {string} [params.link] - Đường dẫn xem chi tiết (nội bộ hệ thống)
 * @param {string} [params.priority] - Mức độ ưu tiên (LOW, NORMAL, HIGH, URGENT)
 * @param {string} [params.type] - Loại thông báo
 */
export const sendNotificationEmail = async ({
  to,
  recipientName = "Quý Thầy/Cô và Sinh viên",
  title,
  message,
  link = null,
  priority = "NORMAL",
  type = "SYSTEM",
}) => {
  if (!to || !to.trim() || !title || !message) {
    console.warn("[EmailService] Missing required email parameters (to, title, message).");
    return { success: false, reason: "Missing parameters" };
  }

  const targetEmail = to.trim();
  const frontendBaseUrl = process.env.APP_FRONTEND_URL || "http://localhost:5173";
  const actionUrl = link ? (link.startsWith("http") ? link : `${frontendBaseUrl}${link.startsWith("/") ? "" : "/"}${link}`) : frontendBaseUrl;
  const sentTimeStr = formatVietnameseDateTime(new Date());
  const typeLabel = getTypeLabel(type);
  const fromAddress = process.env.SMTP_FROM || `"Hệ Thống KLTN & TTDN - IUH" <${process.env.SMTP_USER || "no-reply@iuh.edu.vn"}>`;

  // HTML Template chuyên nghiệp chuẩn giao diện IUH
  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0d2a75 0%, #123891 100%); color: #ffffff; padding: 24px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #ffffff; }
    .header p { margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1; }
    .badge { display: inline-block; background: #ECA124; color: #0f172a; font-weight: 700; font-size: 11px; padding: 3px 10px; border-radius: 20px; margin-top: 10px; text-transform: uppercase; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .notification-box { background: #f8fafc; border-left: 4px solid #123891; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border: 1px solid #e2e8f0; border-left-width: 4px; }
    .notif-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .notif-message { font-size: 14px; color: #334155; white-space: pre-line; line-height: 1.6; }
    .notif-time { font-size: 12px; color: #64748b; margin-top: 12px; font-style: italic; }
    .btn-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { display: inline-block; background: #123891; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(18, 56, 145, 0.2); }
    .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>KHOA CÔNG NGHỆ THÔNG TIN - ĐH CÔNG NGHIỆP TP.HCM</h1>
      <p>CỔNG QUẢN LÝ THỰC TẬP DOANH NGHIỆP & KHÓA LUẬN TỐT NGHIỆP</p>
      <div class="badge">${typeLabel}</div>
    </div>
    
    <div class="content">
      <div class="greeting">Xin chào ${recipientName},</div>
      <p style="font-size: 14px; color: #475569; margin: 0 0 12px 0;">
        Hệ thống vừa ghi nhận một thông báo mới liên quan đến tài khoản của bạn:
      </p>
      
      <div class="notification-box">
        <div class="notif-title">${title}</div>
        <div class="notif-message">${message}</div>
        <div class="notif-time">🕒 Thời gian: ${sentTimeStr}</div>
      </div>

      <div class="btn-container">
        <a href="${actionUrl}" target="_blank" class="btn">
          Truy cập Hệ thống để xem chi tiết &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
        Nếu nút bấm trên không hoạt động, bạn có thể truy cập qua liên kết: <br/>
        <a href="${actionUrl}" style="color: #123891; word-break: break-all;">${actionUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p><strong>Khoa Công nghệ Thông tin - Đại học Công nghiệp TP.HCM (IUH)</strong></p>
      <p>Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh</p>
      <p style="margin-top: 10px; color: #94a3b8;">
        Đây là email thông báo tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
[HỆ THỐNG KLTN & TTDN - KHOA CNTT IUH]
THÔNG BÁO: ${title}

Xin chào ${recipientName},

Nội dung:
${message}

Thời gian: ${sentTimeStr}
Loại thông báo: ${typeLabel}

Truy cập xem chi tiết tại: ${actionUrl}
--------------------------------------------------
Email tự động từ Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp IUH.
  `;

  const mailOptions = {
    from: fromAddress,
    to: targetEmail,
    subject: `[Hệ thống KLTN/TTDN] ${title}`,
    text: textContent,
    html: htmlContent,
  };

  try {
    const activeTransporter = getTransporter();
    if (activeTransporter) {
      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent successfully to ${targetEmail} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } else {
      // Fallback khi chưa cấu hình SMTP: Log console chi tiết
      console.log(`\n================== [EMAIL NOTIFICATION DISPATCHED] ==================`);
      console.log(`To: ${targetEmail} (${recipientName})`);
      console.log(`Subject: [Hệ thống KLTN/TTDN] ${title}`);
      console.log(`Type: ${typeLabel} | Priority: ${priority}`);
      console.log(`Message: ${message}`);
      console.log(`Link: ${actionUrl}`);
      console.log(`Time: ${sentTimeStr}`);
      console.log(`Status: SIMULATED (Configure SMTP in .env for live dispatch)`);
      console.log(`=====================================================================\n`);
      return { success: true, simulated: true };
    }
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${targetEmail}:`, error.message);
    // Bắt lỗi an toàn, không làm hỏng nghiệp vụ chính
    return { success: false, error: error.message };
  }
};

/**
 * Gửi email thông báo hàng loạt đến danh sách người dùng
 * @param {Array<{email: string, fullName: string}>} recipients
 * @param {Object} emailData
 */
export const sendBatchNotificationEmail = async (recipients, emailData) => {
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const validRecipients = recipients.filter((r) => r && r.email && r.email.trim());
  if (validRecipients.length === 0) return;

  // Gửi bất đồng bộ không chặn luồng chính
  Promise.allSettled(
    validRecipients.map((r) =>
      sendNotificationEmail({
        ...emailData,
        to: r.email,
        recipientName: r.fullName || "Người dùng",
      }),
    ),
  ).catch((err) => {
    console.error("[EmailService] Batch send error:", err.message);
  });
};

export default {
  sendNotificationEmail,
  sendBatchNotificationEmail,
};
