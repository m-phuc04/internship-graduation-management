import mongoose from "mongoose";

const companyEvaluationRequestSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token đánh giá là bắt buộc"],
      unique: true,
      index: true,
      trim: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Sinh viên là bắt buộc"],
      index: true,
    },

    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: [true, "Đợt thực tập là bắt buộc"],
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Doanh nghiệp là bắt buộc"],
    },

    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    allowRecreate: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to guarantee 1 evaluation request per student per internship
companyEvaluationRequestSchema.index(
  { studentId: 1, internshipId: 1 },
  { unique: true },
);

const CompanyEvaluationRequest = mongoose.model(
  "CompanyEvaluationRequest",
  companyEvaluationRequestSchema,
);

export default CompanyEvaluationRequest;
