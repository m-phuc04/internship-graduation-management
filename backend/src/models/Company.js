import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: [true, "Tên công ty là bắt buộc"],
      trim: true,
      maxlength: [200, "Tên công ty không được quá 200 ký tự"],
    },

    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      maxlength: [50, "Mã công ty không được quá 50 ký tự"],
    },

    address: {
      type: String,
      required: [true, "Địa chỉ công ty là bắt buộc"],
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email công ty không hợp lệ"],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{8,20}$/, "Số điện thoại không hợp lệ"],
    },

    website: {
      type: String,
      trim: true,
      default: null,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: null,
    },

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email người liên hệ không hợp lệ"],
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Mô tả không được quá 1000 ký tự"],
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

const Company = mongoose.model("Company", companySchema);

export default Company;
