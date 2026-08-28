import mongoose from "mongoose";

const messageAttachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      default: "",
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    attachments: {
      type: [messageAttachmentSchema],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;

