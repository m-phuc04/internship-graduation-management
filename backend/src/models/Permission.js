import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId là bắt buộc"],
    },

    permission: {
      type: String,
      enum: ["GVHD", "GVPB_KIN", "GVPB_HOIDONG"],
      required: [true, "Quyền nghiệp vụ (permission) là bắt buộc"],
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

// Compound Unique Index: Enforce 1 record per (userId, permission) pair
permissionSchema.index({ userId: 1, permission: 1 }, { unique: true });
permissionSchema.index({ userId: 1, isActive: 1 });

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
