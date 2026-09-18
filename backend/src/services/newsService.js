import News from "../models/News.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Get Public News (Homepage)
// ====================
const getPublicNews = async ({
  page = 1,
  limit = 10,
  category = "",
  search = "",
} = {}) => {
  const query = { isPublished: true };

  if (category && category.trim() && category !== "ALL") {
    query.category = category.trim().toUpperCase();
  }

  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { summary: { $regex: search.trim(), $options: "i" } },
      { content: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [newsList, total] = await Promise.all([
    News.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("authorId", "fullName role avatar")
      .lean(),
    News.countDocuments(query),
  ]);

  return {
    news: newsList,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// 2. Get News by ID (Public Detail & increment views)
// ====================
const getNewsById = async (id) => {
  const news = await News.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate("authorId", "fullName role avatar");

  if (!news) {
    throw new AppError("Không tìm thấy tin tức", 404);
  }

  return news;
};

// ====================
// 3. Create News (Lecturer / TBM / Admin)
// ====================
const createNews = async (
  userId,
  { title, summary, content, category, thumbnail, isPublished, publishedAt }
) => {
  if (!title || !title.trim()) {
    throw new AppError("Vui lòng nhập tiêu đề tin tức", 400);
  }

  if (!content || !content.trim()) {
    throw new AppError("Vui lòng nhập nội dung tin tức", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Không tìm thấy thông tin người dùng", 404);
  }

  const authorName = user.fullName || "Khoa CNTT";

  const news = await News.create({
    title: title.trim(),
    summary: (summary || "").trim() || (content.replace(/<[^>]*>?/gm, "").substring(0, 180) + "..."),
    content: content.trim(),
    category: category || "THONG_BAO",
    thumbnail: thumbnail || null,
    authorId: user._id,
    authorName,
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
  });

  return news;
};

// ====================
// 4. Get Lecturer / TBM News List (Management)
// ====================
const getLecturerNews = async (
  userId,
  userRole,
  { page = 1, limit = 20, search = "", category = "", status = "" } = {}
) => {
  const query = {};

  // If LECTURER -> only show their own news, TBM/ADMIN -> show all
  if (userRole === "LECTURER") {
    query.authorId = userId;
  }

  if (category && category.trim() && category !== "ALL") {
    query.category = category.trim().toUpperCase();
  }

  if (status === "PUBLISHED") {
    query.isPublished = true;
  } else if (status === "HIDDEN") {
    query.isPublished = false;
  }

  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { summary: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [newsList, total] = await Promise.all([
    News.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("authorId", "fullName role avatar")
      .lean(),
    News.countDocuments(query),
  ]);

  return {
    news: newsList,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ====================
// 5. Update News
// ====================
const updateNews = async (
  id,
  userId,
  userRole,
  { title, summary, content, category, thumbnail, isPublished, publishedAt }
) => {
  const news = await News.findById(id);
  if (!news) {
    throw new AppError("Không tìm thấy tin tức cần cập nhật", 404);
  }

  // Permission check: only author, TBM or ADMIN
  if (
    userRole !== "ADMIN" &&
    userRole !== "TBM" &&
    news.authorId.toString() !== userId.toString()
  ) {
    throw new AppError("Bạn không có quyền chỉnh sửa bài viết này", 403);
  }

  if (title !== undefined) news.title = title.trim();
  if (summary !== undefined) news.summary = summary.trim();
  if (content !== undefined) news.content = content.trim();
  if (category !== undefined) news.category = category;
  if (thumbnail !== undefined) news.thumbnail = thumbnail;
  if (isPublished !== undefined) news.isPublished = Boolean(isPublished);
  if (publishedAt !== undefined) news.publishedAt = new Date(publishedAt);

  await news.save();
  return news;
};

// ====================
// 6. Toggle Publish Status
// ====================
const togglePublishNews = async (id, userId, userRole) => {
  const news = await News.findById(id);
  if (!news) {
    throw new AppError("Không tìm thấy tin tức", 404);
  }

  if (
    userRole !== "ADMIN" &&
    userRole !== "TBM" &&
    news.authorId.toString() !== userId.toString()
  ) {
    throw new AppError("Bạn không có quyền thay đổi trạng thái bài viết này", 403);
  }

  news.isPublished = !news.isPublished;
  if (news.isPublished && !news.publishedAt) {
    news.publishedAt = new Date();
  }

  await news.save();
  return news;
};

// ====================
// 7. Delete News
// ====================
const deleteNews = async (id, userId, userRole) => {
  const news = await News.findById(id);
  if (!news) {
    throw new AppError("Không tìm thấy tin tức cần xóa", 404);
  }

  if (
    userRole !== "ADMIN" &&
    userRole !== "TBM" &&
    news.authorId.toString() !== userId.toString()
  ) {
    throw new AppError("Bạn không có quyền xóa bài viết này", 403);
  }

  await News.findByIdAndDelete(id);
  return { message: "Đã xóa tin tức thành công" };
};

export default {
  getPublicNews,
  getNewsById,
  createNews,
  getLecturerNews,
  updateNews,
  togglePublishNews,
  deleteNews,
};
