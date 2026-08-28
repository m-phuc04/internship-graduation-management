import mongoose from "mongoose";

const academicTermSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên học kỳ là bắt buộc"],
      trim: true,
      maxlength: [100, "Tên học kỳ không được quá 100 ký tự"],
    },

    academicYear: {
      type: String,
      required: [true, "Năm học là bắt buộc"],
      trim: true,
      maxlength: [20, "Năm học không được quá 20 ký tự"],
    },

    code: {
      type: String,
      required: [true, "Mã học kỳ là bắt buộc"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, "Mã học kỳ không được quá 50 ký tự"],
    },

    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu học kỳ là bắt buộc"],
    },

    endDate: {
      type: Date,
      required: [true, "Ngày kết thúc học kỳ là bắt buộc"],
    },

    status: {
      type: String,
      enum: ["DRAFT", "UPCOMING", "ACTIVE", "CLOSED"],
      default: "DRAFT",
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    // Mốc thời gian Thực tập Doanh nghiệp (TTDN)
    internship: {
      registrationStart: { type: Date, default: null },
      registrationEnd: { type: Date, default: null },
      reportStart: { type: Date, default: null },
      reportDeadline: { type: Date, default: null },
    },

    // Mốc thời gian Khóa luận Tốt nghiệp (KLTN)
    thesis: {
      registrationStart: { type: Date, default: null },
      registrationEnd: { type: Date, default: null },
      assignmentStart: { type: Date, default: null },
      assignmentEnd: { type: Date, default: null },
      defenseStart: { type: Date, default: null },
      defenseEnd: { type: Date, default: null },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Ràng buộc ngày kết thúc phải sau ngày bắt đầu
academicTermSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error("Ngày kết thúc học kỳ phải sau ngày bắt đầu");
  }
});

academicTermSchema.index({ status: 1 });
academicTermSchema.index({ academicYear: 1 });

const AcademicTerm = mongoose.model("AcademicTerm", academicTermSchema);

export default AcademicTerm;
