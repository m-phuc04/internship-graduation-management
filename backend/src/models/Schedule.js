import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề lịch là bắt buộc"],
      trim: true,
      maxlength: [200, "Tiêu đề không được quá 200 ký tự"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Mô tả không được quá 1000 ký tự"],
      default: null,
    },

    type: {
      type: String,
      enum: ["INTERNSHIP", "THESIS", "MEETING", "DEADLINE", "DEFENSE", "OTHER"],
      required: [true, "Loại lịch là bắt buộc"],
    },

    startTime: {
      type: Date,
      required: [true, "Thời gian bắt đầu là bắt buộc"],
    },

    endTime: {
      type: Date,
      default: null,
    },

    location: {
      type: String,
      trim: true,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người tạo lịch là bắt buộc"],
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceModel: {
      type: String,
      enum: [
        "Internship",
        "Thesis",
        "InternshipReport",
        "ThesisProgress",
        null,
      ],
      default: null,
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },

    reminderMinutes: {
      type: Number,
      min: 0,
      default: 60,
    },
  },
  {
    timestamps: true,
  },
);

scheduleSchema.pre("validate", function () {
  if (this.startTime && this.endTime && this.endTime < this.startTime) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
  }
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
