import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sinh viên phải liên kết với tài khoản User"],
      unique: true,
    },

    studentCode: {
      type: String,
      required: [true, "Mã sinh viên là bắt buộc"],
      unique: true,
      trim: true,
      match: [/^\d{8}$/, "Mã sinh viên phải gồm 8 chữ số"],
    },

    className: {
      type: String,
      required: [true, "Lớp là bắt buộc"],
      trim: true,
    },

    gpa: {
      type: Number,
      min: [0, "GPA không được nhỏ hơn 0"],
      max: [4, "GPA không được lớn hơn 4"],
      default: 0,
    },

    accumulatedCredits: {
      type: Number,
      min: [0, "Số tín chỉ không được âm"],
      default: 0,
    },

    prerequisiteCompleted: {
      type: Boolean,
      default: false,
    },

    internshipRegistered: {
      type: Boolean,
      default: false,
    },

    thesisRegistered: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Student = mongoose.model("Student", studentSchema);

export default Student;
