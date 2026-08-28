import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [participantSchema],
      required: true,
      validate: [
        (val) => val.length >= 2,
        "Cuộc hội thoại phải có ít nhất 2 thành viên",
      ],
    },
    type: {
      type: String,
      enum: ["DIRECT", "INTERNSHIP", "THESIS", "GROUP"],
      default: "DIRECT",
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    lastMessage: {
      text: {
        type: String,
        default: "",
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
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

// Indexes for rapid lookups
conversationSchema.index({ "participants.user": 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;

