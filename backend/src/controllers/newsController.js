import newsService from "../services/newsService.js";

// 1. GET /api/news (Public)
const getPublicNews = async (req, res, next) => {
  try {
    const result = await newsService.getPublicNews(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách tin tức thành công",
      data: result.news,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/news/:id (Public Detail)
const getNewsById = async (req, res, next) => {
  try {
    const news = await newsService.getNewsById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy chi tiết tin tức thành công",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

// 3. POST /api/news (Lecturer/TBM/Admin)
const createNews = async (req, res, next) => {
  try {
    const news = await newsService.createNews(req.user.userId, req.body);
    res.status(201).json({
      success: true,
      message: "Tạo tin tức thành công",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

// 4. GET /api/news/manage/my (Lecturer/TBM/Admin Management List)
const getMyNews = async (req, res, next) => {
  try {
    const result = await newsService.getLecturerNews(
      req.user.userId,
      req.user.role,
      req.query
    );
    res.status(200).json({
      success: true,
      message: "Lấy danh sách tin tức quản lý thành công",
      data: result.news,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// 5. PUT /api/news/:id (Lecturer/TBM/Admin)
const updateNews = async (req, res, next) => {
  try {
    const news = await newsService.updateNews(
      req.params.id,
      req.user.userId,
      req.user.role,
      req.body
    );
    res.status(200).json({
      success: true,
      message: "Cập nhật tin tức thành công",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

// 6. PATCH /api/news/:id/status (Toggle Status)
const togglePublishNews = async (req, res, next) => {
  try {
    const news = await newsService.togglePublishNews(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    res.status(200).json({
      success: true,
      message: `Đã ${news.isPublished ? "hiển thị" : "ẩn"} bài viết`,
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

// 7. DELETE /api/news/:id (Delete)
const deleteNews = async (req, res, next) => {
  try {
    const result = await newsService.deleteNews(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPublicNews,
  getNewsById,
  createNews,
  getMyNews,
  updateNews,
  togglePublishNews,
  deleteNews,
};
