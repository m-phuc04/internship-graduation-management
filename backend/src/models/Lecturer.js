import mongoose from "mongoose";

const lecturerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giảng viên phải liên kết với tài khoản User"],
      unique: true,
    },

    lecturerCode: {
      type: String,
      required: [true, "Mã giảng viên là bắt buộc"],
      unique: true,
      trim: true,
      match: [/^\d{8}$/, "Mã giảng viên phải gồm 8 chữ số"],
    },

    academicTitle: {
      type: String,
      trim: true,
      default: null,
    },

    specialization: {
      type: String,
      trim: true,
      default: null,
    },

    maxSupervisedStudents: {
      type: Number,
      min: [1, "Số lượng sinh viên tối đa phải lớn hơn 0"],
      default: 10,
    },

    maxStudents: {
      type: Number,
      min: [1, "Số lượng sinh viên tối đa phải lớn hơn 0"],
      default: 10,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    permissions: {
      type: [String],
      enum: ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
      default: ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save document hook: maxSupervisedStudents is Source of Truth
lecturerSchema.pre("save", function (next) {
  const val =
    this.maxSupervisedStudents !== undefined && this.maxSupervisedStudents !== null
      ? this.maxSupervisedStudents
      : (this.maxStudents !== undefined && this.maxStudents !== null ? this.maxStudents : 10);

  this.maxSupervisedStudents = val;
  this.maxStudents = val;

  if (next && typeof next === "function") next();
});

// Pre-update query hook for findOneAndUpdate, updateOne, findByIdAndUpdate
function syncUpdateCapacity(next) {
  const update = this.getUpdate();
  if (!update) {
    if (next && typeof next === "function") return next();
    return;
  }

  let targetVal = undefined;
  if (update.maxSupervisedStudents !== undefined && update.maxSupervisedStudents !== null) {
    targetVal = update.maxSupervisedStudents;
  } else if (update.maxStudents !== undefined && update.maxStudents !== null) {
    targetVal = update.maxStudents;
  } else if (update.$set) {
    if (update.$set.maxSupervisedStudents !== undefined && update.$set.maxSupervisedStudents !== null) {
      targetVal = update.$set.maxSupervisedStudents;
    } else if (update.$set.maxStudents !== undefined && update.$set.maxStudents !== null) {
      targetVal = update.$set.maxStudents;
    }
  }

  if (targetVal !== undefined) {
    const num = Math.max(1, Number(targetVal) || 10);
    if (update.$set) {
      update.$set.maxSupervisedStudents = num;
      update.$set.maxStudents = num;
    } else {
      update.maxSupervisedStudents = num;
      update.maxStudents = num;
    }
  }

  if (next && typeof next === "function") next();
}

lecturerSchema.pre("updateOne", syncUpdateCapacity);
lecturerSchema.pre("findOneAndUpdate", syncUpdateCapacity);
lecturerSchema.pre("findByIdAndUpdate", syncUpdateCapacity);
lecturerSchema.pre("updateMany", syncUpdateCapacity);

const Lecturer = mongoose.model("Lecturer", lecturerSchema);

export default Lecturer;
