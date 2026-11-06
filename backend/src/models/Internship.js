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

    secondStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
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

    durationInWeeks: {
      type: Number,
      enum: [10, 12],
      default: null,
    },

    reportCycle: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
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

    isScorePublished: {
      type: Boolean,
      default: false,
    },

    scorePublishedAt: {
      type: Date,
      default: null,
    },

    scorePublishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // File báo cáo thực tập doanh nghiệp (Yêu cầu Prompt 2)
    reportFile: {
      originalName: {
        type: String,
        trim: true,
        default: null,
      },
      fileName: {
        type: String,
        trim: true,
        default: null,
      },
      fileUrl: {
        type: String,
        trim: true,
        default: null,
      },
      fileSize: {
        type: Number,
        default: 0,
      },
      fileType: {
        type: String,
        trim: true,
        default: null,
      },
      uploadedAt: {
        type: Date,
        default: null,
      },
    },

    // Trạng thái PASS PRETEST trước khi chấm điểm (Yêu cầu Prompt 2)
    pretest: {
      isPassed: {
        type: Boolean,
        default: false,
      },
      passedAt: {
        type: Date,
        default: null,
      },
      passedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      note: {
        type: String,
        trim: true,
        default: null,
      },
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
