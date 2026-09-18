import thesisProgressService from "../services/thesisProgressService.js";

// ====================
// Student Creates Progress / Diary
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
      message:
        progress.status === "DRAFT"
          ? "Lưu bản nháp nhật ký khóa luận thành công"
          : progress.status === "WAITING_STUDENT_2"
          ? "Đã gửi nhật ký, đang chờ Sinh viên 2 xác nhận"
          : "Nộp nhật ký khóa luận thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student Updates Progress / Diary (Draft or Needs Revision)
// ====================
const updateProgress = async (req, res, next) => {
  try {
    let fileMeta = undefined;
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

    const progress = await thesisProgressService.updateProgress({
      progressId: req.params.id,
      userId: req.user.userId,
      ...req.body,
      file: fileMeta,
    });

    res.status(200).json({
      success: true,
      message:
        progress.status === "DRAFT"
          ? "Lưu bản nháp thành công"
          : progress.status === "WAITING_STUDENT_2"
          ? "Đã cập nhật nhật ký, đang chờ Sinh viên 2 xác nhận"
          : "Cập nhật và nộp nhật ký khóa luận thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Student 2 Confirms or Rejects Progress
// ====================
const confirmStudent2 = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    const progress = await thesisProgressService.confirmProgressByStudent2(
      req.params.id,
      req.user.userId,
      { action, rejectionReason },
    );

    res.status(200).json({
      success: true,
      message:
        action === "CONFIRM"
          ? "Đã xác nhận nhật ký khóa luận và chuyển tới Giảng viên hướng dẫn"
          : "Đã yêu cầu Sinh viên 1 chỉnh sửa lại nhật ký",
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
      message: "Lấy nhật ký tiến độ khóa luận của sinh viên thành công",
      data: result.progressList,
      weeks: result.weeks,
      allWeeks: result.allWeeks,
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
      message: "Nộp nhật ký tiến độ thành công",
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
      message: "Lấy danh sách nhật ký tiến độ các đề tài hướng dẫn thành công",
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
      message: "Đánh giá nhật ký khóa luận thành công",
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
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Lấy nhật ký tiến độ đề tài khóa luận thành công",
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Update Timeline by Thesis ID
// ====================
const updateTimeline = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    const thesis = await thesisProgressService.updateThesisTimeline(
      req.params.thesisId,
      { startDate, endDate },
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật thời gian thực hiện khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createProgress,
  updateProgress,
  confirmStudent2,
  getMyThesisProgress,
  submitDraftProgress,
  getSupervisedThesesProgress,
  reviewProgress,
  getProgressByThesis,
  updateTimeline,
};

