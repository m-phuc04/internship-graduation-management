import mongoose from "mongoose";

const thesisProgressSchema = new mongoose.Schema(
  {
    thesisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thesis",
      required: [true, "Đề tài KLTN là bắt buộc"],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Sinh viên là bắt buộc"],
    },

    progressType: {
      type: String,
      enum: ["WEEKLY", "MONTHLY"],
      required: [true, "Loại tiến độ là bắt buộc"],
    },

    weekNumber: {
      type: Number,
      min: 1,
      max: 52,
      default: null,
    },

    weekStartDate: {
      type: Date,
      default: null,
    },

    weekEndDate: {
      type: Date,
      default: null,
    },

    monthNumber: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },

    secondStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    student2Status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "REJECTED", "NOT_APPLICABLE"],
      default: "NOT_APPLICABLE",
    },

    student2ConfirmedAt: {
      type: Date,
      default: null,
    },

    student2RejectedReason: {
      type: String,
      trim: true,
      default: null,
    },

    title: {
      type: String,
      required: [true, "Tiêu đề tiến độ là bắt buộc"],
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Nội dung không được quá 5000 ký tự"],
      default: null,
    },

    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    file: {
      originalName: {
        type: String,
        default: null,
      },

      fileName: {
        type: String,
        default: null,
      },

      fileUrl: {
        type: String,
        default: null,
      },

      mimeType: {
        type: String,
        default: null,
      },

      size: {
        type: Number,
        default: null,
      },

      uploadedAt: {
        type: Date,
        default: null,
      },
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "WAITING_STUDENT_2",
        "NEEDS_REVISION",
        "SUBMITTED",
        "REVIEWING",
        "APPROVED",
        "REJECTED",
      ],
      default: "DRAFT",
    },

    lecturerComment: {
      type: String,
      trim: true,
      default: null,
    },

    lecturerScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const ThesisProgress = mongoose.model("ThesisProgress", thesisProgressSchema);

export default ThesisProgress;
