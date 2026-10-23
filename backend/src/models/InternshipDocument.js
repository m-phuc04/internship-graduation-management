import mongoose from "mongoose";

const internshipDocumentSchema = new mongoose.Schema(
  {
    academicTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
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

