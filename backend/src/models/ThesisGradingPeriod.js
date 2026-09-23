import mongoose from "mongoose";

const thesisGradingPeriodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên đợt nhập điểm là bắt buộc"],
      trim: true,
      maxlength: [200, "Tên đợt nhập điểm không được quá 200 ký tự"],
    },

    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      required: [true, "Học kỳ áp dụng là bắt buộc"],
      index: true,
    },

    startDate: {
      type: Date,
      required: [true, "Thời gian bắt đầu là bắt buộc"],
    },

    endDate: {
      type: Date,
      required: [true, "Thời gian kết thúc là bắt buộc"],
    },

    notificationScope: {
      type: String,
      enum: ["PUBLIC", "LECTURER_ONLY"],
      default: "LECTURER_ONLY",
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Nội dung thông báo không được quá 1000 ký tự"],
      default: null,
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

thesisGradingPeriodSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
  }
});

thesisGradingPeriodSchema.index({ academicTermId: 1, startDate: 1, endDate: 1 });

const ThesisGradingPeriod = mongoose.model(
  "ThesisGradingPeriod",
  thesisGradingPeriodSchema,
);

export default ThesisGradingPeriod;
