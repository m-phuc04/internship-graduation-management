import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người nhận thông báo là bắt buộc"],
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "INTERNSHIP",
        "INTERNSHIP_REPORT",
        "THESIS",
        "THESIS_PROGRESS",
        "AI_ANALYSIS",
        "EVALUATION",
        "SCHEDULE",
        "SYSTEM",
      ],
      required: [true, "Loại thông báo là bắt buộc"],
    },

    title: {
      type: String,
      required: [true, "Tiêu đề thông báo là bắt buộc"],
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"],
    },

    message: {
      type: String,
      required: [true, "Nội dung thông báo là bắt buộc"],
      trim: true,
      maxlength: [1000, "Nội dung không được quá 1000 ký tự"],
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceModel: {
      type: String,
      enum: [
        "Internship",
        "InternshipReport",
        "Thesis",
        "ThesisProgress",
        "AIAnalysis",
        "Evaluation",
        "Schedule",
        null,
      ],
      default: null,
    },

    link: {
      type: String,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
