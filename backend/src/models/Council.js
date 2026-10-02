import mongoose from "mongoose";

const councilSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên phòng hội đồng là bắt buộc"],
      trim: true,
    },
    room: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["ORAL", "POSTER"],
      default: "ORAL",
    },
    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
    },
    reportDate: {
      type: Date,
      default: null,
    },
    reportStartTime: {
      type: String,
      default: "",
    },
    reportEndTime: {
      type: String,
      default: "",
    },
    reportTime: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    lecturers: [
      {
        lecturerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lecturer",
          required: true,
        },
        role: {
          type: String,
          default: "",
        },
        score: {
          type: Number,
          default: null,
        },
      },
    ],
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

councilSchema.index({ academicTermId: 1 });

const Council = mongoose.model("Council", councilSchema);

export default Council;
