import thesisProgressService from "../services/thesisProgressService.js";

// ====================
// Student Creates Progress
// ====================
const createProgress = async (req, res, next) => {
  try {
    let fileMeta = null;
    if (req.file) {
      fileMeta = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileUrl: `/uploads/thesis-progress/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
      };
    } else if (req.body.file && typeof req.body.file === "object") {
      fileMeta = req.body.file;
    }

    const progress = await thesisProgressService.createProgress({
      userId: req.user.userId,
      ...req.body,
      file: fileMeta,
    });

    res.status(201).json({
      success: true,
      message: "Tạo báo cáo tiến độ khóa luận thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Gets Own Progress
// ====================
const getMyThesisProgress = async (req, res, next) => {
  try {
    const result = await thesisProgressService.getMyThesisProgress(
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy tiến độ khóa luận của sinh viên thành công",
      data: result.progressList,
      thesis: result.thesis,
      student: result.student,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Submits Draft Progress
// ====================
const submitDraftProgress = async (req, res, next) => {
  try {
    const progress = await thesisProgressService.submitDraftProgress(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Nộp báo cáo tiến độ thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer Gets Supervised Theses Progress
// ====================
const getSupervisedThesesProgress = async (req, res, next) => {
  try {
    const result = await thesisProgressService.getSupervisedThesesProgress(
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách tiến độ các đề tài hướng dẫn thành công",
      data: result.theses,
      lecturer: result.lecturer,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lecturer Reviews / Grades / Approves / Rejects Progress
// ====================
const reviewProgress = async (req, res, next) => {
  try {
    const { lecturerScore, lecturerComment, status } = req.body;

    const progress = await thesisProgressService.reviewProgress(
      req.params.id,
      {
        lecturerScore,
        lecturerComment,
        status,
        userId: req.user.userId,
        userRole: req.user.role,
      },
    );

    res.status(200).json({
      success: true,
      message: "Đánh giá tiến độ khóa luận thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Progress by Thesis ID
// ====================
const getProgressByThesis = async (req, res, next) => {
  try {
    const progress = await thesisProgressService.getProgressByThesis(
      req.params.thesisId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy tiến độ đề tài khóa luận thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createProgress,
  getMyThesisProgress,
  submitDraftProgress,
  getSupervisedThesesProgress,
  reviewProgress,
  getProgressByThesis,
};
