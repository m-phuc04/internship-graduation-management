import mongoose from "mongoose";

const internshipDocumentSchema = new mongoose.Schema(
  {
    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
      index: true,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      default: null,
      index: true,
    },

    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      default: null,
      index: true,
    },

    documentType: {
      type: String,
      enum: ["DEPARTMENT", "GUIDE", "SUBMISSION"],
      default: "DEPARTMENT",
      index: true,
    },

    scope: {
      type: String,
      enum: ["ALL", "SPECIFIC"],
      default: "ALL",
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },

    category: {
      type: String,
      trim: true,
      default: "Tài liệu hướng dẫn",
    },

    status: {
      type: String,
      enum: ["SUBMITTED", "APPROVED", "REJECTED"],
      default: "SUBMITTED",
    },

    title: {
      type: String,
      trim: true,
      default: null,
    },

    fileName: {
      type: String,
      required: [true, "Tên file là bắt buộc"],
      trim: true,
    },

    fileUrl: {
      type: String,
      required: [true, "Đường dẫn file là bắt buộc"],
      trim: true,
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

    description: {
      type: String,
      trim: true,
      default: "",
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const InternshipDocument = mongoose.model(
  "InternshipDocument",
  internshipDocumentSchema,
);

export default InternshipDocument;

