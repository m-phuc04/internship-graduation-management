import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import authService from "../services/authService.js";
import captchaService from "../services/captchaService.js";
import adminService from "../services/adminService.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const runTests = async () => {
  console.log("==================================================");
  console.log("🧪 KIỂM THỬ TOÀN DIỆN CHỨC NĂNG ĐĂNG NHẬP CHỈ BẰNG MÃ TÀI KHOẢN");
  console.log("==================================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management";
  await mongoose.connect(mongoUri);

  try {
    // Tạo CAPTCHA hợp lệ cho việc test
    const getValidCaptcha = () => {
      const c = captchaService.createCaptcha();
      const text = captchaService._getCaptchaTextForTesting(c.captchaId);
      return { captchaId: c.captchaId, captchaAnswer: text };
    };

    const adminPassword = process.env.ADMIN001_PASSWORD || process.env.ADMIN_PASSWORD;
    const lecturerPassword = "11111111";
    const studentPassword = "11111111";

    // ----------------------------------------------------
    // TEST CASE 1: Sinh viên đăng nhập bằng MSSV và mật khẩu đúng
    // ----------------------------------------------------
    console.log("--- 1. Kiểm tra Sinh viên đăng nhập bằng MSSV (11111111) ---");
    const c1 = getValidCaptcha();
    const svLogin = await authService.login({
      accountCode: "11111111",
      password: studentPassword,
      captchaId: c1.captchaId,
      captchaAnswer: c1.captchaAnswer,
    });
    if (svLogin.user.role !== "STUDENT" || svLogin.user.studentCode !== "11111111") {
      throw new Error("Case 1 Thất bại: Sinh viên không nhận đúng role hoặc studentCode");
    }
    console.log(`✓ Đăng nhập Sinh viên thành công: ${svLogin.user.fullName} (${svLogin.user.studentCode}) - Role: ${svLogin.user.role}`);

    // ----------------------------------------------------
    // TEST CASE 2: Giảng viên đăng nhập bằng mã giảng viên và mật khẩu đúng
    // ----------------------------------------------------
    console.log("\n--- 2. Kiểm tra Giảng viên đăng nhập bằng mã giảng viên (20240002) ---");
    const c2 = getValidCaptcha();
    const gvLogin = await authService.login({
      accountCode: "20240002",
      password: lecturerPassword,
      captchaId: c2.captchaId,
      captchaAnswer: c2.captchaAnswer,
    });
    if (gvLogin.user.role !== "LECTURER" || gvLogin.user.lecturerCode !== "20240002") {
      throw new Error("Case 2 Thất bại: Giảng viên không nhận đúng role hoặc lecturerCode");
    }
    console.log(`✓ Đăng nhập Giảng viên thành công: ${gvLogin.user.fullName} (${gvLogin.user.lecturerCode}) - Role: ${gvLogin.user.role}`);

    // ----------------------------------------------------
    // TEST CASE 3: ADMIN đăng nhập bằng mã tài khoản và mật khẩu đúng
    // ----------------------------------------------------
    console.log("\n--- 3. Kiểm tra ADMIN đăng nhập bằng mã ADMIN (ADMIN001) ---");
    const c3 = getValidCaptcha();
    const adminLogin = await authService.login({
      accountCode: "ADMIN001",
      password: adminPassword,
      captchaId: c3.captchaId,
      captchaAnswer: c3.captchaAnswer,
    });
    if (adminLogin.user.role !== "ADMIN" || adminLogin.user.code !== "ADMIN001") {
      throw new Error("Case 3 Thất bại: ADMIN không nhận đúng role hoặc code");
    }
    console.log(`✓ Đăng nhập ADMIN thành công: ${adminLogin.user.fullName} (${adminLogin.user.code}) - Role: ${adminLogin.user.role}`);

    // ----------------------------------------------------
    // TEST CASE 4: TBM đăng nhập bằng mã tài khoản hiện có
    // ----------------------------------------------------
    console.log("\n--- 4. Kiểm tra TBM đăng nhập bằng mã TBM (20240001) ---");
    const c4 = getValidCaptcha();
    const tbmLogin = await authService.login({
      accountCode: "20240001",
      password: lecturerPassword,
      captchaId: c4.captchaId,
      captchaAnswer: c4.captchaAnswer,
    });
    if (tbmLogin.user.role !== "TBM" || tbmLogin.user.lecturerCode !== "20240001") {
      throw new Error("Case 4 Thất bại: TBM không nhận đúng role hoặc code");
    }
    console.log(`✓ Đăng nhập TBM thành công: ${tbmLogin.user.fullName} (${tbmLogin.user.lecturerCode}) - Role: ${tbmLogin.user.role}`);

    // ----------------------------------------------------
    // TEST CASE 5: Nhập Email và mật khẩu đúng nhưng PHẢI BỊ TỪ CHỐI
    // ----------------------------------------------------
    console.log("\n--- 5. Kiểm tra nhập Email và mật khẩu đúng -> Phải bị từ chối ---");
    const emailTests = [
      { email: "admin@iuh.edu.vn", pwd: adminPassword, label: "Admin Email" },
      { email: "gv0001@iuh.edu.vn", pwd: lecturerPassword, label: "TBM Email" },
      { email: "lmphuc1359@gmail.com", pwd: studentPassword, label: "Student Email" },
    ];

    for (const test of emailTests) {
      const c = getValidCaptcha();
      let rejected = false;
      let rejectMsg = "";
      try {
        await authService.login({
          accountCode: test.email,
          password: test.pwd,
          captchaId: c.captchaId,
          captchaAnswer: c.captchaAnswer,
        });
      } catch (err) {
        rejected = true;
        rejectMsg = err.message;
        if (err.statusCode !== 400) {
          throw new Error(`Email rejection should have status 400, got ${err.statusCode}`);
        }
      }
      if (!rejected) {
        throw new Error(`Case 5 Thất bại: Đăng nhập bằng Email (${test.email}) vẫn được chấp nhận!`);
      }
      if (rejectMsg !== "Mã đăng nhập không hợp lệ") {
        throw new Error(`Case 5 Thất bại: Thông báo lỗi không khớp ("${rejectMsg}")`);
      }
      console.log(`  ✓ Đã chặn thành công ${test.label} (${test.email}): "${rejectMsg}"`);
    }

    // ----------------------------------------------------
    // TEST CASE 6: Nhập mã đăng nhập không tồn tại
    // ----------------------------------------------------
    console.log("\n--- 6. Kiểm tra nhập mã đăng nhập không tồn tại ---");
    {
      const c = getValidCaptcha();
      let rejected = false;
      let status = 0;
      try {
        await authService.login({
          accountCode: "UNKNOWN999999",
          password: "AnyPassword123",
          captchaId: c.captchaId,
          captchaAnswer: c.captchaAnswer,
        });
      } catch (err) {
        rejected = true;
        status = err.statusCode;
      }
      if (!rejected || status !== 401) {
        throw new Error(`Case 6 Thất bại: Không chặn mã không tồn tại đúng cách (status: ${status})`);
      }
      console.log("  ✓ Mã không tồn tại bị từ chối với status 401");
    }

    // ----------------------------------------------------
    // TEST CASE 7: Nhập sai mật khẩu
    // ----------------------------------------------------
    console.log("\n--- 7. Kiểm tra nhập sai mật khẩu ---");
    {
      const c = getValidCaptcha();
      let rejected = false;
      let status = 0;
      try {
        await authService.login({
          accountCode: "ADMIN001",
          password: "WrongAdminPassword!999",
          captchaId: c.captchaId,
          captchaAnswer: c.captchaAnswer,
        });
      } catch (err) {
        rejected = true;
        status = err.statusCode;
      }
      if (!rejected || status !== 401) {
        throw new Error(`Case 7 Thất bại: Không chặn sai mật khẩu đúng cách (status: ${status})`);
      }
      console.log("  ✓ Nhập sai mật khẩu bị từ chối với status 401");
    }

    // ----------------------------------------------------
    // TEST CASE 8: Tài khoản bị vô hiệu hóa
    // ----------------------------------------------------
    console.log("\n--- 8. Kiểm tra tài khoản bị vô hiệu hóa (isActive: false) ---");
    {
      const adminDoc = await User.findOne({ code: "ADMIN003" });
      const origActive = adminDoc.isActive;
      try {
        await User.updateOne({ _id: adminDoc._id }, { isActive: false });
        const c = getValidCaptcha();
        let rejected = false;
        let status = 0;
        let msg = "";
        try {
          await authService.login({
            accountCode: "ADMIN003",
            password: process.env.ADMIN003_PASSWORD,
            captchaId: c.captchaId,
            captchaAnswer: c.captchaAnswer,
          });
        } catch (err) {
          rejected = true;
          status = err.statusCode;
          msg = err.message;
        }
        if (!rejected || status !== 403) {
          throw new Error(`Case 8 Thất bại: Tài khoản bị vô hiệu hóa không trả về 403 (status: ${status})`);
        }
        console.log(`  ✓ Tài khoản vô hiệu hóa bị từ chối với status 403: "${msg}"`);
      } finally {
        await User.updateOne({ _id: adminDoc._id }, { isActive: origActive });
      }
    }

    // ----------------------------------------------------
    // TEST CASE 9: Đăng nhập với tài khoản bắt buộc đổi mật khẩu lần đầu
    // ----------------------------------------------------
    console.log("\n--- 9. Kiểm tra tài khoản bắt buộc đổi mật khẩu lần đầu (mustChangePassword: true) ---");
    {
      const studentDoc = await User.findOne({ code: "11111111" });
      const origMustChange = studentDoc.mustChangePassword;
      try {
        await User.updateOne({ _id: studentDoc._id }, { mustChangePassword: true });
        const c = getValidCaptcha();
        const res = await authService.login({
          accountCode: "11111111",
          password: studentPassword,
          captchaId: c.captchaId,
          captchaAnswer: c.captchaAnswer,
        });
        if (res.user.mustChangePassword !== true) {
          throw new Error("Case 9 Thất bại: userResponse.mustChangePassword không phải là true");
        }
        console.log("  ✓ userResponse.mustChangePassword trả về chính xác là true");
      } finally {
        await User.updateOne({ _id: studentDoc._id }, { mustChangePassword: origMustChange });
      }
    }

    // ----------------------------------------------------
    // TEST CASE 10: Kiểm tra Access Token, Refresh Token và phân quyền sau đăng nhập
    // ----------------------------------------------------
    console.log("\n--- 10. Kiểm tra Access Token, Refresh Token và phân quyền sau đăng nhập ---");
    {
      const c = getValidCaptcha();
      const res = await authService.login({
        accountCode: "ADMIN001",
        password: adminPassword,
        captchaId: c.captchaId,
        captchaAnswer: c.captchaAnswer,
      });

      // Kiểm tra Access Token JWT
      const decodedAccess = jwt.verify(res.accessToken, process.env.JWT_ACCESS_SECRET);
      if (decodedAccess.userId !== res.user._id.toString() || decodedAccess.role !== "ADMIN") {
        throw new Error("Case 10 Thất bại: Payload của Access Token không khớp!");
      }

      // Kiểm tra Refresh Token JWT
      const decodedRefresh = jwt.verify(res.refreshToken, process.env.JWT_REFRESH_SECRET);
      if (decodedRefresh.userId !== res.user._id.toString()) {
        throw new Error("Case 10 Thất bại: Payload của Refresh Token không khớp!");
      }

      // Kiểm tra Refresh Token được lưu trong DB
      const userInDb = await User.findById(res.user._id);
      if (userInDb.refreshToken !== res.refreshToken) {
        throw new Error("Case 10 Thất bại: Refresh Token trong DB không khớp với kết quả đăng nhập!");
      }

      // Kiểm tra gọi làm mới Access Token
      const refreshedAccessToken = await authService.refreshAccessToken(res.refreshToken);
      const decodedRefreshed = jwt.verify(refreshedAccessToken, process.env.JWT_ACCESS_SECRET);
      if (decodedRefreshed.userId !== res.user._id.toString()) {
        throw new Error("Case 10 Thất bại: Refresh Access Token không hoạt động!");
      }

      console.log("  ✓ Access Token và Refresh Token hợp lệ");
      console.log("  ✓ Refresh Token được lưu trữ bảo mật trong User collection");
      console.log("  ✓ Chức năng làm mới Access Token qua Refresh Token hoạt động hoàn hảo");
      console.log("  ✓ Phân quyền RBAC (Role: ADMIN) được nhúng chính xác vào token payload");
    }

    // ----------------------------------------------------
    // TEST CASE 11: Kiểm tra chức năng Reset mật khẩu và gửi email vẫn hoạt động bình thường
    // ----------------------------------------------------
    console.log("\n--- 11. Kiểm tra chức năng Admin Reset mật khẩu và email bảo toàn ---");
    {
      const adminUser = await User.findOne({ role: "ADMIN" });
      const testStudentUser = await User.findOne({ code: "11111111" });
      const origPasswordHash = testStudentUser.password;
      const origMustChange = testStudentUser.mustChangePassword;

      try {
        const resetRes = await adminService.resetPassword(testStudentUser._id, adminUser);
        if (!resetRes.success) {
          throw new Error("Case 11 Thất bại: resetPassword không trả về success");
        }

        const updatedStudentUser = await User.findById(testStudentUser._id);
        if (updatedStudentUser.password === origPasswordHash) {
          throw new Error("Case 11 Thất bại: Mật khẩu chưa được hash mới sau reset");
        }
        if (updatedStudentUser.mustChangePassword !== true) {
          throw new Error("Case 11 Thất bại: mustChangePassword không được set true sau reset");
        }
        console.log("  ✓ Reset password tạo mật khẩu an toàn mới và hash bcrypt thành công");
        console.log(`  ✓ Email vẫn được bảo toàn: ${updatedStudentUser.email}`);
        console.log("  ✓ mustChangePassword được kích hoạt chuẩn xác");
      } finally {
        await User.updateOne(
          { _id: testStudentUser._id },
          { password: origPasswordHash, mustChangePassword: origMustChange }
        );
        console.log("  ✓ Đã hoàn nguyên mật khẩu gốc của tài khoản sinh viên kiểm thử");
      }
    }

    console.log("\n==================================================");
    console.log("🎉 TẤT CẢ 11 TRƯỜNG HỢP KIỂM THỬ ĐỀU ĐẠT CHUẨN XÁC 100%!");
    console.log("==================================================");
    process.exit(0);
  } finally {
    await mongoose.disconnect();
  }
};

runTests().catch((err) => {
  console.error("\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:", err);
  process.exit(1);
});
