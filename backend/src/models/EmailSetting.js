import mongoose from "mongoose";

const emailSettingSchema = new mongoose.Schema(
  {
    isMasterEnabled: {
      type: Boolean,
      default: true,
      description: "Công tắc tổng: Cho phép gửi email hệ thống",
    },
    sendOnCreateStudent: {
      type: Boolean,
      default: true,
      description: "Gửi email khi tạo tài khoản sinh viên mới",
    },
    sendOnCreateLecturer: {
      type: Boolean,
      default: true,
      description: "Gửi email khi tạo tài khoản giảng viên mới",
    },
    sendOnImportStudentExcel: {
      type: Boolean,
      default: true,
      description: "Gửi email khi Import sinh viên qua file Excel",
    },
    sendOnResetPassword: {
      type: Boolean,
      default: true,
      description: "Gửi email khi đặt lại mật khẩu tài khoản",
    },
    sendOnNotification: {
      type: Boolean,
      default: true,
      description: "Gửi email thông báo tiến độ & hoạt động TTDN / KLTN",
    },
    sendOnNews: {
      type: Boolean,
      default: true,
      description: "Gửi email thông báo Bản tin & Sự kiện mới",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const EmailSetting = mongoose.model("EmailSetting", emailSettingSchema);

export default EmailSetting;
