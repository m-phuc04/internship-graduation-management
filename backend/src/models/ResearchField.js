import mongoose from "mongoose";

const researchFieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên lĩnh vực là bắt buộc"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

researchFieldSchema.index({ name: 1 }, { unique: true });

const ResearchField = mongoose.model("ResearchField", researchFieldSchema);

export default ResearchField;
