import thesisService from "../services/thesisService.js";
import exportService from "../services/exportService.js";

// ====================
// Student Registers Thesis
// ====================
const createThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.createThesis({
      userId: req.user.userId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký đề tài khóa luận tốt nghiệp thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Lookup Student by MSSV
// ====================
const lookupStudent = async (req, res, next) => {
  try {
    const { studentCode } = req.params;
    const result = await thesisService.lookupStudentByCode(
      studentCode,
      req.user?.userId,
    );

    res.status(200).json({
      success: true,
      message: "Tra cứu thông tin sinh viên thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Search Students for Group Partner Selection
// ====================
const searchStudents = async (req, res, next) => {
  try {
    const { query } = req.query;
    const result = await thesisService.searchStudentsForGroup(
      query,
      req.user?.userId,
    );

    res.status(200).json({
      success: true,
      message: "Tìm kiếm sinh viên thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Available Supervisors
// ====================
const getAvailableSupervisors = async (req, res, next) => {
  try {
    const supervisors = await thesisService.getAvailableSupervisors();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách giảng viên hướng dẫn khả dụng thành công",
      data: supervisors,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Current Student's Thesis
// ====================
const getMyThesis = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const result = await thesisService.getMyThesis(
      req.user.userId,
      academicTermId,
    );

    res.status(200).json({
      success: true,
      message: "Lấy hồ sơ khóa luận của sinh viên thành công",
      data: result.thesis,
      student: result.student,
      canRegisterNew: result.canRegisterNew,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Thesis By Student ID
// ====================
const getThesisByStudent = async (req, res, next) => {
  try {
    const thesis = await thesisService.getThesisByStudent(req.params.studentId);

    res.status(200).json({
      success: true,
      message: "Lấy thông tin khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Get Thesis By ID
// ====================
const getThesisById = async (req, res, next) => {
  try {
    const thesis = await thesisService.getThesisById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy thông tin chi tiết đề tài khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PHASE 9: TBM THESIS CONTROLLERS
// ==========================================

// ====================
// TBM: Get All Theses with Search & Filter
// ====================
const getAllThesesForTbm = async (req, res, next) => {
  try {
    const { page, limit, search, status, academicTermId } = req.query;

    const result = await thesisService.getAllThesesForTbm({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || "",
      status: status || "",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài khóa luận thành công",
      data: result.data,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Approve Thesis
// ====================
const approveThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.approveThesis(req.params.id, {
      supervisorId: req.body?.supervisorId || null,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Phê duyệt đề tài khóa luận tốt nghiệp thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Reject Thesis
// ====================
const rejectThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.rejectThesis(req.params.id, {
      reason: req.body?.reason || null,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Đã từ chối đề tài khóa luận và cho phép sinh viên đăng ký lại",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Assign Supervisor
// ====================
const assignSupervisor = async (req, res, next) => {
  try {
    const thesis = await thesisService.assignSupervisor(req.params.id, {
      supervisorId: req.body?.supervisorId,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Phân công giảng viên hướng dẫn thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Assign Reviewers (Reviewer 1 & 2)
// ====================
const assignReviewers = async (req, res, next) => {
  try {
    const thesis = await thesisService.assignReviewers(req.params.id, {
      reviewer1Id: req.body?.reviewer1Id,
      reviewer2Id: req.body?.reviewer2Id,
      reviewers: req.body?.reviewers,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Phân công giảng viên phản biện thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM: Auto Assign Reviewers By Field
// ====================
const autoAssignReviewersByField = async (req, res, next) => {
  try {
    const result = await thesisService.autoAssignReviewersByField({
      academicTermId: req.body?.academicTermId || req.query?.academicTermId,
      tbmUserId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Bộ điều khiển Giảng viên / Cán bộ phản biện
// ==========================================

// ====================
// Giảng viên: Lấy tất cả đề tài được phân công (GVHD / PB1 / PB2)
// ====================
const getAssignedThesesForLecturer = async (req, res, next) => {
  try {
    const { roleType, search, academicTermId } = req.query;

    const result = await thesisService.getThesesForLecturerRole(
      req.user.userId,
      {
        roleType: roleType || "ALL",
        search: search || "",
        academicTermId: academicTermId || "",
      },
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài khóa luận phân công thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên: Chấm điểm đề tài theo vai trò
// ====================
const gradeThesisByLecturer = async (req, res, next) => {
  try {
    const { score, student1Score, student2Score, comment, roleType, role, checkedCriteriaIds, criteriaEvaluations } = req.body;

    const thesis = await thesisService.gradeThesisByLecturer(req.params.id, {
      score,
      student1Score,
      student2Score,
      comment,
      checkedCriteriaIds,
      criteriaEvaluations,
      roleType: roleType || role,
      role: role || roleType,
      userId: req.user.userId || req.user._id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Chấm điểm và lưu đánh giá đề tài khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên / TBM / Admin: Đánh dấu sinh viên không đạt độc lập
// ====================
const markStudentFail = async (req, res, next) => {
  try {
    const { studentIndex, reason, stage, role } = req.body;
    const thesis = await thesisService.markStudentFail(req.params.id, {
      studentIndex: Number(studentIndex),
      failReason: reason,
      stage: stage || role,
      role: role || stage,
      requestingUserId: req.user.userId || req.user._id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu rớt cho sinh viên ${Number(studentIndex) === 2 ? '2' : '1'} thành công`,
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên / TBM / Admin: Bỏ đánh dấu không đạt cho sinh viên
// ====================
const unmarkStudentFail = async (req, res, next) => {
  try {
    const { studentIndex } = req.body;
    const thesis = await thesisService.unmarkStudentFail(req.params.id, {
      studentIndex: Number(studentIndex),
      requestingUserId: req.user.userId || req.user._id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: `Đã bỏ trạng thái rớt cho sinh viên ${Number(studentIndex) === 2 ? '2' : '1'} thành công`,
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên hướng dẫn: Đánh giá tiêu chí điều kiện
// ====================
const evaluateThesisCriteriaBySupervisor = async (req, res, next) => {
  try {
    const { checkedCriteriaIds, criteriaEvaluations } = req.body;

    const thesis = await thesisService.evaluateCriteriaBySupervisor(req.params.id, {
      checkedCriteriaIds,
      criteriaEvaluations,
      userId: req.user.userId || req.user._id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Đánh giá điều kiện thực hiện KLTN thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên: Khóa / Mở khóa điểm một đề tài
// ====================
const toggleThesisScoreLock = async (req, res, next) => {
  try {
    const { roleType, isLocked } = req.body;
    const thesis = await thesisService.toggleThesisScoreLock(req.params.id, {
      roleType,
      isLocked,
      userId: req.user.userId || req.user._id,
    });

    res.status(200).json({
      success: true,
      message: isLocked ? "Đã khóa điểm đề tài thành công" : "Đã mở khóa điểm đề tài thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên: Khóa / Mở khóa điểm tất cả đề tài được phân công
// ====================
const toggleAllThesisScoresLock = async (req, res, next) => {
  try {
    const { academicTermId, roleType, isLocked } = req.body;
    const result = await thesisService.toggleAllThesisScoresLock({
      academicTermId,
      roleType,
      isLocked,
      userId: req.user.userId || req.user._id,
    });

    res.status(200).json({
      success: true,
      message: isLocked ? "Đã khóa toàn bộ điểm đề tài" : "Đã mở khóa toàn bộ điểm đề tài",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Bộ điều khiển Đánh giá Khóa luận tốt nghiệp
// ==========================================

// ====================
// Lấy danh sách đề tài để đánh giá
// ====================
const getThesesForEvaluation = async (req, res, next) => {
  try {
    const { search, status, academicTermId } = req.query;

    const result = await thesisService.getThesesForEvaluation({
      search: search || "",
      status: status || "ALL",
      academicTermId: academicTermId || "",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đánh giá khóa luận thành công",
      data: result.theses,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TBM hoàn tất đánh giá khóa luận (COMPLETED)
// ====================
const completeThesisEvaluation = async (req, res, next) => {
  try {
    const thesis = await thesisService.completeThesisEvaluation(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Hoàn tất đánh giá khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên tiếp nhận hướng dẫn đề tài
// ====================
const supervisorAcceptThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.supervisorAcceptThesis(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Đã chấp nhận hướng dẫn đề tài khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên từ chối hướng dẫn đề tài
// ====================
const supervisorRejectThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.supervisorRejectThesis(
      req.params.id,
      req.user,
      { reason: req.body?.reason },
    );

    res.status(200).json({
      success: true,
      message: "Đã từ chối hướng dẫn đề tài khóa luận",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Giảng viên / Người hướng dẫn hủy đề tài
// ====================
const supervisorCancelThesis = async (req, res, next) => {
  try {
    const thesis = await thesisService.supervisorCancelThesis(
      req.params.id,
      req.user,
      { reason: req.body?.reason },
    );

    res.status(200).json({
      success: true,
      message: "Đã hủy đề tài khóa luận thành công",
      data: thesis,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Xuất danh sách đề tài ra Excel
// ====================
const exportTheses = async (req, res, next) => {
  try {
    const { academicTermId, status, search, lecturerId } = req.query;

    const { buffer, filename } = await exportService.exportTheses({
      academicTermId: academicTermId || "",
      status: status || "",
      search: search || "",
      lecturerId: lecturerId || "",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ====================
// KLTN Topic Management Controllers (GV -> TBM -> SV FIFO)
// ====================

// GV: Tạo nhiều đề tài KLTN
const batchCreateTopics = async (req, res, next) => {
  try {
    const createdTopics = await thesisService.batchCreateTopicsByLecturer({
      userId: req.user.userId || req.user._id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: `Tạo thành công ${createdTopics.length} đề tài KLTN (trạng thái Chờ duyệt)`,
      data: createdTopics,
    });
  } catch (error) {
    next(error);
  }
};

// GV: Xem danh sách đề tài do mình tạo
const getMyCreatedTopics = async (req, res, next) => {
  try {
    const { academicTermId, status } = req.query;
    const topics = await thesisService.getMyCreatedTopics({
      userId: req.user.userId || req.user._id,
      academicTermId,
      status,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài đã đề xuất thành công",
      data: topics,
    });
  } catch (error) {
    next(error);
  }
};

// TBM: Xem tất cả đề tài do các GV gửi lên
const getTopicsForTbm = async (req, res, next) => {
  try {
    const { status, academicTermId, search, supervisorId } = req.query;
    const topics = await thesisService.getTopicsForTbm({
      status,
      academicTermId,
      search,
      supervisorId,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài KLTN cho TBM thành công",
      data: topics,
    });
  } catch (error) {
    next(error);
  }
};

// TBM: Duyệt đề tài
const approveTopicByTbm = async (req, res, next) => {
  try {
    const topic = await thesisService.approveTopicByTbm(
      req.params.id,
      req.user.userId || req.user._id
    );

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt đề tài "${topic.title}" thành công`,
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// TBM: Từ chối đề tài
const rejectTopicByTbm = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const topic = await thesisService.rejectTopicByTbm(
      req.params.id,
      req.user.userId || req.user._id,
      reason
    );

    res.status(200).json({
      success: true,
      message: `Đã từ chối đề tài "${topic.title}"`,
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật thông tin đề tài trực tiếp (TBM / ADMIN)
const updateTopic = async (req, res, next) => {
  try {
    const topic = await thesisService.updateTopic(
      req.params.id,
      req.user.userId || req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: `Đã cập nhật đề tài "${topic.title}" thành công`,
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// GV gửi yêu cầu chỉnh sửa đề tài đến TBM
const requestEditTopic = async (req, res, next) => {
  try {
    const topic = await thesisService.requestEditTopicByLecturer(
      req.params.id,
      req.user.userId || req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Đã gửi yêu cầu chỉnh sửa đề tài đến Trưởng Bộ Môn để xét duyệt",
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// GV gửi yêu cầu xóa đề tài đến TBM
const requestDeleteTopic = async (req, res, next) => {
  try {
    const topic = await thesisService.requestDeleteTopicByLecturer(
      req.params.id,
      req.user.userId || req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Đã gửi yêu cầu xóa đề tài đến Trưởng Bộ Môn để xét duyệt",
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// TBM duyệt yêu cầu chỉnh sửa đề tài
const approveEditTopic = async (req, res, next) => {
  try {
    const topic = await thesisService.approveEditTopicByTbm(
      req.params.id,
      req.user.userId || req.user._id
    );

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt yêu cầu chỉnh sửa đề tài "${topic.title}"`,
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// TBM từ chối yêu cầu chỉnh sửa đề tài
const rejectEditTopic = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const topic = await thesisService.rejectEditTopicByTbm(
      req.params.id,
      req.user.userId || req.user._id,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Đã từ chối yêu cầu chỉnh sửa đề tài",
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// TBM duyệt yêu cầu xóa đề tài
const approveDeleteTopic = async (req, res, next) => {
  try {
    const result = await thesisService.approveDeleteTopicByTbm(
      req.params.id,
      req.user.userId || req.user._id
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// TBM từ chối yêu cầu xóa đề tài
const rejectDeleteTopic = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const topic = await thesisService.rejectDeleteTopicByTbm(
      req.params.id,
      req.user.userId || req.user._id,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Đã từ chối yêu cầu xóa đề tài",
      data: topic,
    });
  } catch (error) {
    next(error);
  }
};

// Xóa đề tài trực tiếp (TBM / GV)
const deleteTopic = async (req, res, next) => {
  try {
    const result = await thesisService.deleteTopic(
      req.params.id,
      req.user.userId || req.user._id
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// SV: Lấy danh sách đề tài APPROVED
const getApprovedTopicsForStudent = async (req, res, next) => {
  try {
    const { academicTermId, search } = req.query;
    const topics = await thesisService.getApprovedTopicsForStudent({
      academicTermId,
      search,
      userId: req.user?.userId || req.user?._id,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đề tài KLTN khả dụng thành công",
      data: topics,
    });
  } catch (error) {
    next(error);
  }
};

// SV: Đăng ký chọn đề tài (FIFO)
const registerTopicByStudent = async (req, res, next) => {
  try {
    const result = await thesisService.registerTopicByStudent({
      userId: req.user.userId || req.user._id,
      topicId: req.params.id,
      studentCount: req.body.studentCount || 1,
      secondStudentCode: req.body.secondStudentCode || null,
      secondStudentId: req.body.secondStudentId || null,
    });

    res.status(201).json({
      success: true,
      message: `Đăng ký đề tài "${result.topic.title}" thành công`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Bộ điều khiển Tiêu chí đánh giá Khóa luận tốt nghiệp
// ====================
const getThesisEvaluationCriteria = async (req, res, next) => {
  try {
    const { academicTermId, includeInactive } = req.query;
    const criteria = await thesisService.getThesisEvaluationCriteria({
      academicTermId,
      includeInactive: includeInactive === "true",
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách tiêu chí đánh giá KLTN thành công",
      data: criteria,
    });
  } catch (error) {
    next(error);
  }
};

const createThesisEvaluationCriteria = async (req, res, next) => {
  try {
    const criteria = await thesisService.createThesisEvaluationCriteria({
      ...req.body,
      userId: req.user.userId || req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Tạo tiêu chí đánh giá KLTN thành công",
      data: criteria,
    });
  } catch (error) {
    next(error);
  }
};

const updateThesisEvaluationCriteria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const criteria = await thesisService.updateThesisEvaluationCriteria(id, req.body);

    res.status(200).json({
      success: true,
      message: "Cập nhật tiêu chí đánh giá thành công",
      data: criteria,
    });
  } catch (error) {
    next(error);
  }
};

const deleteThesisEvaluationCriteria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await thesisService.deleteThesisEvaluationCriteria(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Bộ điều khiển Đợt chấm điểm Khóa luận tốt nghiệp
// ====================
const getThesisGradingPeriods = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const periods = await thesisService.getThesisGradingPeriods({ academicTermId });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đợt nhập điểm KLTN thành công",
      data: periods,
    });
  } catch (error) {
    next(error);
  }
};

const createThesisGradingPeriod = async (req, res, next) => {
  try {
    const period = await thesisService.createThesisGradingPeriod({
      ...req.body,
      userId: req.user.userId || req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Tạo đợt nhập điểm KLTN thành công",
      data: period,
    });
  } catch (error) {
    next(error);
  }
};

const updateThesisGradingPeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const period = await thesisService.updateThesisGradingPeriod(
      id,
      req.body,
      req.user.userId || req.user._id,
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật đợt nhập điểm KLTN thành công",
      data: period,
    });
  } catch (error) {
    next(error);
  }
};

const deleteThesisGradingPeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await thesisService.deleteThesisGradingPeriod(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const processExpiredGradingPeriods = async (req, res, next) => {
  try {
    const { academicTermId } = req.body;
    const result = await thesisService.processExpiredGradingPeriods(academicTermId);

    res.status(200).json({
      success: true,
      message: `Xử lý quá hạn thành công. Đã đánh dấu FAIL cho ${result.processedThesesCount} đề tài chưa hoàn tất đánh giá/điểm GVHD.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Công bố điểm (TBM)
// ====================
const publishScores = async (req, res, next) => {
  try {
    const { academicTermId, selectedScores } = req.body;
    const result = await thesisService.publishScores({
      academicTermId,
      selectedScores,
    });

    res.status(200).json({
      success: true,
      message: "Cập nhật công bố điểm cho các đề tài thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 2: Trả lời lời mời vào nhóm (ACCEPT / REJECT)
// ====================
const respondStudent2Invitation = async (req, res, next) => {
  try {
    const { action } = req.body;
    const result = await thesisService.respondStudent2Invitation(
      req.params.id,
      req.user.userId,
      action,
    );

    res.status(200).json({
      success: true,
      message: action === "ACCEPT" ? "Đã xác nhận tham gia nhóm đề tài" : "Đã từ chối tham gia nhóm đề tài",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 1: Gửi yêu cầu đăng ký đề tài tới Giảng viên hướng dẫn
// ====================
const sendSupervisorRequest = async (req, res, next) => {
  try {
    const result = await thesisService.sendSupervisorRequest(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Đã gửi yêu cầu đăng ký đề tài đến Giảng viên hướng dẫn",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 1: Mời sinh viên 2 vào nhóm
// ====================
const inviteStudent2 = async (req, res, next) => {
  try {
    const { secondStudentId, secondStudentCode } = req.body;
    const result = await thesisService.inviteStudent2(
      req.params.id,
      req.user.userId,
      { secondStudentId, secondStudentCode },
    );

    res.status(200).json({
      success: true,
      message: "Đã gửi lời mời tham gia nhóm đến sinh viên thứ hai",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 1: Hủy lời mời gửi sinh viên 2
// ====================
const cancelStudent2Invite = async (req, res, next) => {
  try {
    const result = await thesisService.cancelStudent2Invite(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Đã hủy lời mời tham gia nhóm",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 2: Rút khỏi nhóm đề tài (trước khi GVHD phê duyệt)
// ====================
const cancelParticipationByStudent2 = async (req, res, next) => {
  try {
    const result = await thesisService.cancelGroupParticipationByStudent2(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Đã hủy tham gia nhóm làm đề tài khóa luận thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 1: Hủy đăng ký nhóm đề tài (trước khi GVHD phê duyệt)
// ====================
const cancelGroupRegistrationByStudent1 = async (req, res, next) => {
  try {
    const result = await thesisService.cancelGroupRegistrationByStudent1(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Đã hủy đăng ký nhóm đề tài khóa luận thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên: Hủy đăng ký nhóm đề tài đã hết hạn (quá hạn 60 phút)
// ====================
const cancelExpiredThesis = async (req, res, next) => {
  try {
    const result = await thesisService.cancelExpiredThesisByStudent(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: result.message || "Đã hủy đề tài nhóm do hết hạn 60 phút thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// Sinh viên 1: Xóa sinh viên 2 khỏi nhóm (trước khi GVHD phê duyệt)
// ====================
const removeStudent2ByStudent1 = async (req, res, next) => {
  try {
    const result = await thesisService.removeStudent2ByStudent1(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: "Đã rút thành viên thứ hai khỏi nhóm đề tài",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createThesis,
  lookupStudent,
  searchStudents,
  getAvailableSupervisors,
  getMyThesis,
  getThesisByStudent,
  getThesisById,
  getAllThesesForTbm,
  approveThesis,
  rejectThesis,
  assignSupervisor,
  assignReviewers,
  autoAssignReviewersByField,
  supervisorAcceptThesis,
  supervisorRejectThesis,
  supervisorCancelThesis,
  getAssignedThesesForLecturer,
  gradeThesisByLecturer,
  markStudentFail,
  unmarkStudentFail,
  evaluateThesisCriteriaBySupervisor,
  toggleThesisScoreLock,
  toggleAllThesisScoresLock,
  getThesesForEvaluation,
  completeThesisEvaluation,
  publishScores,
  exportTheses,
  // Invitation & Request Flow
  respondStudent2Invitation,
  sendSupervisorRequest,
  inviteStudent2,
  cancelStudent2Invite,
  cancelParticipationByStudent2,
  cancelGroupRegistrationByStudent1,
  cancelExpiredThesis,
  removeStudent2ByStudent1,
  // Criteria & Grading Period Management
  getThesisEvaluationCriteria,
  createThesisEvaluationCriteria,
  updateThesisEvaluationCriteria,
  deleteThesisEvaluationCriteria,
  getThesisGradingPeriods,
  createThesisGradingPeriod,
  updateThesisGradingPeriod,
  deleteThesisGradingPeriod,
  processExpiredGradingPeriods,
  // Topic Management
  batchCreateTopics,
  getMyCreatedTopics,
  getTopicsForTbm,
  approveTopicByTbm,
  rejectTopicByTbm,
  updateTopic,
  deleteTopic,
  requestEditTopic,
  requestDeleteTopic,
  approveEditTopic,
  rejectEditTopic,
  approveDeleteTopic,
  rejectDeleteTopic,
  getApprovedTopicsForStudent,
  registerTopicByStudent,
};
