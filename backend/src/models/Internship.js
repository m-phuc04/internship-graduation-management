import mongoose from "mongoose";

const internshipSchema = new mongoose.Schema(
  {
    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Sinh viên là bắt buộc"],
    },

    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      default: null,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Doanh nghiệp là bắt buộc"],
    },

    position: {
      type: String,
      required: [true, "Vị trí thực tập là bắt buộc"],
      trim: true,
    },

    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu thực tập là bắt buộc"],
    },

    endDate: {
      type: Date,
      required: [true, "Ngày kết thúc thực tập là bắt buộc"],
    },

    mentorName: {
      type: String,
      trim: true,
      default: null,
    },

    mentorPosition: {
      type: String,
      trim: true,
      default: null,
    },

    mentorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    mentorPhone: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "REJECTED",
        "INTERNING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    registrationNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Ghi chú không được quá 1000 ký tự"],
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Lý do từ chối không được quá 1000 ký tự"],
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acceptedAt: {
      type: Date,
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

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Ngày kết thúc phải sau ngày bắt đầu
internshipSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
  }
});

const Internship = mongoose.model("Internship", internshipSchema);

export default Internship;
