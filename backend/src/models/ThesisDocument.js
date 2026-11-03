import mongoose from "mongoose";

const thesisDocumentSchema = new mongoose.Schema(
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

    thesisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thesis",
      default: null,
      index: true,
    },

    documentType: {
      type: String,
      enum: ["GUIDE", "SUBMISSION"],
      default: "GUIDE",
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
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const ThesisDocument = mongoose.model("ThesisDocument", thesisDocumentSchema);

export default ThesisDocument;
