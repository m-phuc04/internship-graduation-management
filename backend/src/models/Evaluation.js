import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    evaluationType: {
      type: String,
      enum: ["INTERNSHIP", "THESIS"],
      required: [true, "Loại đánh giá là bắt buộc"],
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Đối tượng đánh giá là bắt buộc"],
    },

    evaluationRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyEvaluationRequest",
      default: null,
    },

    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    evaluatorInfo: {
      name: { type: String, trim: true, default: null },
      position: { type: String, trim: true, default: null },
      email: { type: String, trim: true, default: null },
      phone: { type: String, trim: true, default: null },
    },

    evaluatorRole: {
      type: String,
      enum: ["COMPANY", "LECTURER", "REVIEWER"],
      required: [true, "Vai trò người đánh giá là bắt buộc"],
    },

    score: {
      type: Number,
      min: [0, "Điểm không được nhỏ hơn 0"],
      max: [10, "Điểm không được lớn hơn 10"],
      required: [true, "Điểm đánh giá là bắt buộc"],
    },

    comments: {
      type: String,
      trim: true,
      maxlength: [3000, "Nhận xét không được quá 3000 ký tự"],
      default: null,
    },

    criteria: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        score: {
          type: Number,
          min: 0,
          max: 10,
          required: true,
        },

        comment: {
          type: String,
          trim: true,
          default: null,
        },
      },
    ],

    // Detailed Company Internship Evaluation Fields
    companyInfo: {
      businessField: { type: String, trim: true, default: null },
      companySize: { type: String, trim: true, default: null },
    },

    workFields: {
      type: [String],
      default: [],
    },

    workFieldOther: {
      type: String,
      trim: true,
      default: null,
    },

    requirements: {
      endUserRequirements: { type: String, trim: true, default: null },
      leaderRequirements: { type: String, trim: true, default: null },
      peo1: { type: String, trim: true, default: null },
      peo2: { type: String, trim: true, default: null },
      peo3: { type: String, trim: true, default: null },
    },

    teamworkEvaluation: {
      type: String,
      enum: ["Đồng ý", "Xuất sắc", "Tốt", "Trung bình", "Yếu", "Khác"],
      default: "Tốt",
    },

    teamworkOther: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "CONFIRMED"],
      default: "DRAFT",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Evaluation = mongoose.model("Evaluation", evaluationSchema);

export default Evaluation;
