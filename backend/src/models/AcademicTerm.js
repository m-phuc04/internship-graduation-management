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
      gradingStart: { type: Date, default: null },
      gradingEnd: { type: Date, default: null },
      evaluationStartDate: { type: Date, default: null },
      evaluationEndDate: { type: Date, default: null },
      evaluationStart: { type: Date, default: null },
      evaluationDeadline: { type: Date, default: null },
      reportCycle: { type: Number, enum: [1, 2, 3], default: 1 },
    },

    // Mốc thời gian Khóa luận Tốt nghiệp (KLTN)
    thesis: {
      registrationStart: { type: Date, default: null },
      registrationEnd: { type: Date, default: null },
      assignmentStart: { type: Date, default: null },
      assignmentEnd: { type: Date, default: null },
      defenseStart: { type: Date, default: null },
      defenseEnd: { type: Date, default: null },
      isRegistrationLocked: { type: Boolean, default: false },
      lockedAt: { type: Date, default: null },
      lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reopenedAt: { type: Date, default: null },
      reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
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

// Helper: Tự động tính thời gian chấm điểm TTDN dựa trên registrationEnd
// gradingStart = registrationEnd + 10 tuần (70 ngày)
// gradingEnd = gradingStart + 15 ngày
export const calculateInternshipGradingDates = (registrationEndDate) => {
  if (!registrationEndDate) {
    return { gradingStart: null, gradingEnd: null };
  }
  let year, month, day;
  if (typeof registrationEndDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(registrationEndDate)) {
    const parts = registrationEndDate.substring(0, 10).split("-").map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    const d = new Date(registrationEndDate);
    if (isNaN(d.getTime())) {
      return { gradingStart: null, gradingEnd: null };
    }
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const parts = dateStr.split("-").map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  }

  const startD = new Date(Date.UTC(year, month, day + 70, 0, 0, 0));
  const endD = new Date(Date.UTC(year, month, day + 70 + 15, 23, 59, 59, 999));

  return {
    gradingStart: startD,
    gradingEnd: endD,
  };
};

// Ràng buộc ngày kết thúc phải sau ngày bắt đầu và tự động tính mốc chấm điểm TTDN nếu chưa được thiết lập thủ công
academicTermSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error("Ngày kết thúc học kỳ phải sau ngày bắt đầu");
  }

  // Tự động tính hai mốc thời gian chấm điểm TTDN nếu có registrationEnd và chưa có gradingStart/gradingEnd
  if (this.internship?.registrationEnd) {
    if (!this.internship.gradingStart || !this.internship.gradingEnd) {
      const { gradingStart, gradingEnd } = calculateInternshipGradingDates(this.internship.registrationEnd);
      if (!this.internship.gradingStart && gradingStart) {
        this.internship.gradingStart = gradingStart;
      }
      if (!this.internship.gradingEnd && gradingEnd) {
        this.internship.gradingEnd = gradingEnd;
      }
    }
  } else if (this.internship && !this.internship.registrationEnd) {
    this.internship.gradingStart = null;
    this.internship.gradingEnd = null;
  }
});

academicTermSchema.index({ status: 1 });
academicTermSchema.index({ academicYear: 1 });

const AcademicTerm = mongoose.model("AcademicTerm", academicTermSchema);

export default AcademicTerm;
