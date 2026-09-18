import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề tin tức là bắt buộc"],
      trim: true,
      maxlength: [300, "Tiêu đề không được quá 300 ký tự"],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [600, "Tóm tắt không được quá 600 ký tự"],
      default: "",
    },
    content: {
      type: String,
      required: [true, "Nội dung chi tiết là bắt buộc"],
    },
    category: {
      type: String,
      enum: ["TIN_TUC", "SU_KIEN", "THONG_BAO"],
      default: "THONG_BAO",
    },
    thumbnail: {
      type: String,
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người đăng là bắt buộc"],
    },
    authorName: {
      type: String,
      trim: true,
      default: "Khoa CNTT",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

newsSchema.index({ isPublished: 1, publishedAt: -1 });
newsSchema.index({ category: 1, isPublished: 1 });

const News = mongoose.model("News", newsSchema);
export default News;
