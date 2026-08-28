import mongoose from "mongoose";

const internshipReportSchema = new mongoose.Schema(
  {
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: [true, "Hồ sơ thực tập là bắt buộc"],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Sinh viên là bắt buộc"],
    },

    reportType: {
      type: String,
      enum: ["WEEKLY", "MONTHLY", "FINAL"],
      required: [true, "Loại báo cáo là bắt buộc"],
    },

    title: {
      type: String,
      required: [true, "Tiêu đề báo cáo là bắt buộc"],
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"],
    },

    content: {
      type: String,
      trim: true,
      default: null,
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

    weekNumber: {
      type: Number,
      min: [1, "Tuần phải lớn hơn hoặc bằng 1"],
      max: [52, "Tuần không được lớn hơn 52"],
      default: null,
    },

    monthNumber: {
      type: Number,
      min: [1, "Tháng phải từ 1 đến 12"],
      max: [12, "Tháng phải từ 1 đến 12"],
      default: null,
    },

    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"],
      default: "DRAFT",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    lecturerComment: {
      type: String,
      trim: true,
      default: null,
    },

    lecturerScore: {
      type: Number,
      min: [0, "Điểm không được nhỏ hơn 0"],
      max: [10, "Điểm không được lớn hơn 10"],
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

const InternshipReport = mongoose.model(
  "InternshipReport",
  internshipReportSchema,
);

export default InternshipReport;
