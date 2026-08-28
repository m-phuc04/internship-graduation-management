import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    action: {
      type: String,
      required: [true, "Hành động là bắt buộc"],
      trim: true,
      maxlength: [200, "Hành động không được quá 200 ký tự"],
    },

    module: {
      type: String,
      enum: [
        "AUTH",
        "USER",
        "INTERNSHIP",
        "INTERNSHIP_REPORT",
        "THESIS",
        "THESIS_PROGRESS",
        "AI_ANALYSIS",
        "EVALUATION",
        "NOTIFICATION",
        "SCHEDULE",
        "SYSTEM",
      ],
      required: [true, "Module là bắt buộc"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Mô tả không được quá 1000 ký tự"],
      default: null,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    targetModel: {
      type: String,
      enum: [
        "User",
        "Student",
        "Lecturer",
        "Company",
        "Internship",
        "InternshipReport",
        "Thesis",
        "ThesisProgress",
        "AIAnalysis",
        "Evaluation",
        "Notification",
        "Schedule",
        null,
      ],
      default: null,
    },

    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      default: null,
    },

    endpoint: {
      type: String,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Log = mongoose.model("Log", logSchema);

export default Log;
