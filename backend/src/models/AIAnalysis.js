import mongoose from "mongoose";

const aiAnalysisSchema = new mongoose.Schema(
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

    progressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ThesisProgress",
      default: null,
    },

    fileName: {
      type: String,
      required: [true, "Tên file là bắt buộc"],
      trim: true,
    },

    fileType: {
      type: String,
      required: [true, "Loại file là bắt buộc"],
      enum: ["PDF", "DOC", "DOCX", "TXT"],
    },

    fileUrl: {
      type: String,
      default: null,
    },

    // Kết quả kiểm tra định dạng
    formatCheck: {
      isValid: {
        type: Boolean,
        default: false,
      },

      message: {
        type: String,
        default: null,
      },
    },

    // Tóm tắt nội dung
    summary: {
      type: String,
      default: null,
    },

    // Các thông tin AI phát hiện bị thiếu
    missingInformation: [
      {
        field: {
          type: String,
          required: true,
        },

        description: {
          type: String,
          default: null,
        },
      },
    ],

    // Phân tích mức độ hoàn thành
    completionAnalysis: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      assessment: {
        type: String,
        default: null,
      },
    },

    // Gợi ý chỉnh sửa
    suggestions: [
      {
        type: String,
      },
    ],

    // Kết quả tổng quan của AI
    overallResult: {
      type: String,
      enum: ["PASS", "NEEDS_REVISION", "INCOMPLETE", "ERROR"],
      default: "ERROR",
    },

    // Lưu model AI đã sử dụng
    aiProvider: {
      type: String,
      default: null,
    },

    aiModel: {
      type: String,
      default: null,
    },

    analyzedAt: {
      type: Date,
      default: null,
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

const AIAnalysis = mongoose.model("AIAnalysis", aiAnalysisSchema);

export default AIAnalysis;
