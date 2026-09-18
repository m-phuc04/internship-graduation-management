import mongoose from "mongoose";

const registeredGroupSchema = new mongoose.Schema(
  {
    groupOrder: {
      type: Number,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentCode: {
      type: String,
      required: true,
    },
    secondStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    secondStudentCode: {
      type: String,
      default: null,
    },
    thesisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thesis",
      default: null,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["REGISTERED", "APPROVED", "CANCELLED"],
      default: "REGISTERED",
    },
  },
  { _id: true }
);

const thesisTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tên đề tài là bắt buộc"],
      trim: true,
      maxlength: [300, "Tên đề tài không được quá 300 ký tự"],
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      required: [true, "Giảng viên hướng dẫn là bắt buộc"],
      index: true,
    },

    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
      index: true,
    },

    maxGroups: {
      type: Number,
      required: [true, "Số lượng nhóm tối đa là bắt buộc"],
      min: [1, "Số lượng nhóm phải từ 1 trở lên"],
      default: 1,
    },

    currentGroups: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [3000, "Mô tả không được quá 3000 ký tự"],
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    registeredGroups: [registeredGroupSchema],
  },
  {
    timestamps: true,
  }
);

thesisTopicSchema.index({ supervisorId: 1, status: 1 });
thesisTopicSchema.index({ academicTermId: 1, status: 1 });

const ThesisTopic = mongoose.model("ThesisTopic", thesisTopicSchema);

export default ThesisTopic;
