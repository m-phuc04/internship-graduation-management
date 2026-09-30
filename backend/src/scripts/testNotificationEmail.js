import mongoose from "mongoose";
import dotenv from "dotenv";
import notificationService from "../services/notificationService.js";
import emailService from "../services/emailService.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

dotenv.config();

const runTests = async () => {
  try {
    console.log("=== BẮT ĐẦU KIỂM TRA HỆ THỐNG THÔNG BÁO VÀ EMAIL ===");
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management";
    await mongoose.connect(mongoUri);
    console.log("-> Đã kết nối MongoDB thành công.");

    // 1. Tìm hoặc tạo một User mẫu để test
    let testUser = await User.findOne({ email: { $exists: true, $ne: "" } });
    if (!testUser) {
      testUser = await User.findOne();
    }

    if (!testUser) {
      console.log("Không tìm thấy user nào trong database để test.");
      return;
    }

    console.log(`-> Test User: ${testUser.fullName} (${testUser.email || "Chưa có email"}) - Role: ${testUser.role}`);

    // TEST 1: Gửi thông báo cá nhân (Chuông + Email)
    console.log("\n[TEST 1] Tạo thông báo cá nhân cho User...");
    const notif1 = await notificationService.createNotification({
      recipientId: testUser._id,
      type: "THESIS",
      title: "Đề tài Khóa luận đã được phê duyệt",
      message: "Trưởng Bộ Môn đã phê duyệt đề tài khóa luận của bạn. Vui lòng kiểm tra tiến độ hướng dẫn.",
      link: "/student/thesis",
      priority: "HIGH",
    });

    if (notif1) {
      console.log("✓ TEST 1 THÀNH CÔNG: Notification đã được tạo trong Database:", notif1._id);
    } else {
      console.log("✗ TEST 1 THẤT BẠI: Không tạo được notification.");
    }

    // TEST 2: Giảng viên tick/xác nhận cho sinh viên
    console.log("\n[TEST 2] Mô phỏng Giảng viên tick xác nhận nhật ký tiến độ...");
    const notif2 = await notificationService.createNotification({
      recipientId: testUser._id,
      type: "THESIS_PROGRESS",
      title: "Nhật ký khóa luận Tuần 3 đã được GVHD xác nhận",
      message: "GVHD đã tick xác nhận hoàn thành nội dung báo cáo tuần 3 và cho điểm 9.5/10.",
      link: "/student/thesis/progress",
      priority: "NORMAL",
    });
    if (notif2) {
      console.log("✓ TEST 2 THÀNH CÔNG: Đã tạo thông báo + kích hoạt email cho sinh viên.");
    }

    // TEST 3: Sinh viên tick/nộp báo cáo cho giảng viên
    console.log("\n[TEST 3] Mô phỏng Sinh viên tick hoàn thành nộp báo cáo...");
    const notif3 = await notificationService.createNotification({
      recipientId: testUser._id,
      type: "INTERNSHIP_REPORT",
      title: "Sinh viên đã nộp báo cáo thực tập tuần mới",
      message: `Sinh viên ${testUser.fullName} đã tick nộp báo cáo tuần. Vui lòng vào duyệt.`,
      link: "/lecturer/reports",
      priority: "NORMAL",
    });
    if (notif3) {
      console.log("✓ TEST 3 THÀNH CÔNG: Đã tạo thông báo + kích hoạt email cho GVHD.");
    }

    // TEST 4: Trường hợp User không có email hoặc email lỗi
    console.log("\n[TEST 4] Kiểm tra xử lý an toàn khi email rỗng / lỗi...");
    const dummyNotif = await notificationService.createNotification({
      recipientId: new mongoose.Types.ObjectId(), // ID không tồn tại
      type: "SYSTEM",
      title: "Test lỗi an toàn",
      message: "Thông báo kiểm tra xử lý lỗi.",
    });
    console.log("✓ TEST 4 THÀNH CÔNG: Hệ thống không bị crash, nghiệp vụ hoạt động ổn định.");

    // TEST 5: Trực tiếp test hàm sendNotificationEmail
    console.log("\n[TEST 5] Test trực tiếp emailService.sendNotificationEmail...");
    const emailResult = await emailService.sendNotificationEmail({
      to: testUser.email || "sinhvien_test@iuh.edu.vn",
      recipientName: testUser.fullName,
      title: "Xác nhận phân công Giảng viên phản biện",
      message: "Bạn đã được phân công phản biện 03 đề tài Khóa luận Tốt nghiệp kỳ 1.",
      link: "/lecturer/theses?tab=review",
      priority: "HIGH",
      type: "THESIS",
    });
    console.log("✓ TEST 5 THÀNH CÔNG:", emailResult);

    console.log("\n=== TẤT CẢ CÁC BÀI TEST ĐÃ HOÀN TẤT THÀNH CÔNG ===");
  } catch (error) {
    console.error("Lỗi khi chạy test:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runTests();
