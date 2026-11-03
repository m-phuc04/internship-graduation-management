import mongoose from "mongoose";

const fieldChangeRequestSchema = new mongoose.Schema(
  {
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentFields: {
      type: [String],
      default: [],
    },
    requestedFields: {
      type: [String],
      default: [],
    },
    proposedNewTags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

fieldChangeRequestSchema.index({ lecturerId: 1, status: 1 });

const FieldChangeRequest = mongoose.model("FieldChangeRequest", fieldChangeRequestSchema);

export default FieldChangeRequest;
