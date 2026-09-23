import mongoose from "mongoose";

const thesisSchema = new mongoose.Schema(
  {
    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
      index: true,
    },

    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ThesisTopic",
      default: null,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Sinh viên 1 là bắt buộc"],
    },

    secondStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    studentCount: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },

    thesisTitle: {
      type: String,
      required: [true, "Tên đề tài là bắt buộc"],
      trim: true,
      maxlength: [300, "Tên đề tài không được quá 300 ký tự"],
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      required: [true, "Giảng viên hướng dẫn là bắt buộc"],
    },

    reviewer1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      default: null,
    },

    reviewer2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      default: null,
    },

    reviewers: [
      {
        lecturerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lecturer",
        },
        isPrivateReviewer: {
          type: Boolean,
          default: false,
        },
        isCouncilReviewer: {
          type: Boolean,
          default: false,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "PENDING_SUPERVISOR_APPROVAL",
        "PENDING_TBM_APPROVAL",
        "PENDING_SUPERVISOR_ACCEPTANCE",
        "APPROVED",
        "ASSIGNED_REVIEWERS",
        "IN_PROGRESS",
        "SUBMITTED",
        "GRADED",
        "REJECTED",
        "COMPLETED",
      ],
      default: "PENDING_SUPERVISOR_APPROVAL",
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Mô tả không được quá 2000 ký tự"],
      default: null,
    },

    objectives: {
      type: String,
      trim: true,
      maxlength: [2000, "Mục tiêu không được quá 2000 ký tự"],
      default: null,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    scores: {
      supervisorScore: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
      },

      reviewer1Score: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
      },

      reviewer2Score: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
      },

      finalScore: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
      },

      student1SupervisorScore: { type: Number, min: 0, max: 10, default: null },
      student2SupervisorScore: { type: Number, min: 0, max: 10, default: null },
      student1Reviewer1Score: { type: Number, min: 0, max: 10, default: null },
      student2Reviewer1Score: { type: Number, min: 0, max: 10, default: null },
      student1Reviewer2Score: { type: Number, min: 0, max: 10, default: null },
      student2Reviewer2Score: { type: Number, min: 0, max: 10, default: null },
      student1FinalScore: { type: Number, min: 0, max: 10, default: null },
      student2FinalScore: { type: Number, min: 0, max: 10, default: null },
      isSupervisorScoreLocked: { type: Boolean, default: false },
      isReviewer1ScoreLocked: { type: Boolean, default: false },
      isReviewer2ScoreLocked: { type: Boolean, default: false },
    },

    criteriaEvaluations: [
      {
        criteriaId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ThesisEvaluationCriteria",
        },
        criteriaName: { type: String, trim: true },
        isPassed: { type: Boolean, default: false },
        evaluatedAt: { type: Date, default: Date.now },
      },
    ],

    isCriteriaPassed: {
      type: Boolean,
      default: false,
    },

    supervisorComment: {
      type: String,
      trim: true,
      default: null,
    },

    reviewer1Comment: {
      type: String,
      trim: true,
      default: null,
    },

    reviewer2Comment: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

thesisSchema.index({ studentId: 1 });
thesisSchema.index({ secondStudentId: 1 });
thesisSchema.index({ supervisorId: 1 });
thesisSchema.index({ reviewer1Id: 1 });
thesisSchema.index({ reviewer2Id: 1 });
thesisSchema.index({ status: 1 });

const Thesis = mongoose.model("Thesis", thesisSchema);

export default Thesis;
