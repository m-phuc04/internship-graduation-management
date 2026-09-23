import mongoose from "mongoose";

const thesisEvaluationCriteriaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên tiêu chí là bắt buộc"],
      trim: true,
      maxlength: [200, "Tên tiêu chí không được quá 200 ký tự"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Mô tả tiêu chí không được quá 1000 ký tự"],
      default: null,
    },

    isRequired: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
      index: true,
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

thesisEvaluationCriteriaSchema.index({ isActive: 1, order: 1 });
thesisEvaluationCriteriaSchema.index({ academicTermId: 1, isActive: 1 });

const ThesisEvaluationCriteria = mongoose.model(
  "ThesisEvaluationCriteria",
  thesisEvaluationCriteriaSchema,
);

export default ThesisEvaluationCriteria;
