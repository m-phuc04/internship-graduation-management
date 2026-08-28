import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Họ tên là bắt buộc"],
      trim: true,
      maxlength: [100, "Họ tên không được quá 100 ký tự"],
    },

    email: {
      type: String,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email không hợp lệ"],
      default: null,
    },

    code: {
      type: String,
      sparse: true,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
    },

    role: {
      type: String,
      required: [true, "Role là bắt buộc"],
      enum: ["ADMIN", "TBM", "LECTURER", "COMPANY", "STUDENT"],
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
