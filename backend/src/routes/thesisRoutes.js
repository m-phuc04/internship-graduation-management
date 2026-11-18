import express from "express";
import thesisController from "../controllers/thesisController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ==========================================
// 1. KLTN Topic Management Routes (GV -> TBM -> SV FIFO)
// ==========================================

// GV: Tạo danh sách đề tài KLTN hàng loạt
router.post(
  "/topics/batch",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  thesisController.batchCreateTopics,
);

// GV: Xem danh sách đề tài do mình đề xuất
router.get(
  "/topics/my-created",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM"),
  thesisController.getMyCreatedTopics,
);

// TBM: Xem tất cả đề tài GV gửi lên
router.get(
  "/topics/tbm",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.getTopicsForTbm,
);

// TBM: Duyệt đề tài
router.patch(
  "/topics/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.approveTopicByTbm,
);

// TBM: Từ chối đề tài
router.patch(
  "/topics/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectTopicByTbm,
);

// TBM / ADMIN: Chỉnh sửa đề tài trực tiếp
router.put(
  "/topics/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  thesisController.updateTopic,
);

// TBM / ADMIN: Xóa đề tài trực tiếp (Tự động gửi thông báo cho GVHD)
router.delete(
  "/topics/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN", "LECTURER"),
  thesisController.deleteTopic,
);

// GV: Gửi yêu cầu chỉnh sửa đề tài đến TBM
router.post(
  "/topics/:id/request-edit",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.requestEditTopic,
);

// GV: Gửi yêu cầu xóa đề tài đến TBM
router.post(
  "/topics/:id/request-delete",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.requestDeleteTopic,
);

// TBM: Duyệt yêu cầu chỉnh sửa đề tài
router.patch(
  "/topics/:id/approve-edit",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.approveEditTopic,
);

// TBM: Từ chối yêu cầu chỉnh sửa đề tài
router.patch(
  "/topics/:id/reject-edit",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectEditTopic,
);

// TBM: Duyệt yêu cầu xóa đề tài
router.patch(
  "/topics/:id/approve-delete",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.approveDeleteTopic,
);

// TBM: Từ chối yêu cầu xóa đề tài
router.patch(
  "/topics/:id/reject-delete",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectDeleteTopic,
);

// SV: Xem danh sách đề tài APPROVED
router.get(
  "/topics/approved",
  authMiddleware,
  thesisController.getApprovedTopicsForStudent,
);

// SV: Đăng ký chọn đề tài (FIFO)
router.post(
  "/topics/:id/register",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.registerTopicByStudent,
);

// ==========================================
// 2. Tuyến đường Đăng ký và Hồ sơ KLTN của Sinh viên
// ==========================================

// Sinh viên: Đăng ký đề tài KLTN mới (1 hoặc 2 sinh viên)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.createThesis,
);

// Sinh viên: Lấy thông tin đề tài của mình
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.getMyThesis,
);

// Sinh viên 2: Trả lời lời mời vào nhóm (ĐỒNG Ý / TỪ CHỐI)
router.patch(
  "/:id/respond-invitation",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.respondStudent2Invitation,
);

// Sinh viên 1: Gửi yêu cầu đăng ký đề tài tới Giảng viên hướng dẫn
router.patch(
  "/:id/send-supervisor-request",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.sendSupervisorRequest,
);

// Sinh viên 1: Mời sinh viên 2 vào nhóm
router.patch(
  "/:id/invite-student2",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.inviteStudent2,
);

// Sinh viên 1: Hủy lời mời gửi tới sinh viên 2
router.patch(
  "/:id/cancel-student2-invite",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.cancelStudent2Invite,
);

// Sinh viên 2: Rút khỏi nhóm (trước khi GVHD phê duyệt)
router.patch(
  "/:id/cancel-participation",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.cancelParticipationByStudent2,
);

// Sinh viên 1: Hủy đăng ký nhóm / hủy đề tài (trước khi GVHD phê duyệt)
router.patch(
  "/:id/cancel-group",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.cancelGroupRegistrationByStudent1,
);

// Sinh viên: Hủy đăng ký nhóm đã hết hạn (quá hạn 60 phút)
router.post(
  "/:id/cancel-expired",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.cancelExpiredThesis,
);
router.patch(
  "/:id/cancel-expired",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.cancelExpiredThesis,
);

// Sinh viên 1: Xóa sinh viên 2 khỏi nhóm (trước khi GVHD phê duyệt)
router.patch(
  "/:id/remove-student2",
  authMiddleware,
  authorizeRoles("STUDENT"),
  thesisController.removeStudent2ByStudent1,
);

// ==========================================
// 3. Tiện ích dùng chung (Tra cứu GVHD và Sinh viên)
// ==========================================

// Lấy danh sách GVHD khả dụng kèm thống kê số lượng hướng dẫn
router.get(
  "/available-supervisors",
  authMiddleware,
  thesisController.getAvailableSupervisors,
);

// Tìm kiếm sinh viên theo mã số hoặc họ tên để chọn vào nhóm
router.get(
  "/search-students",
  authMiddleware,
  thesisController.searchStudents,
);

// Tra cứu thông tin sinh viên theo MSSV
router.get(
  "/lookup-student/:studentCode",
  authMiddleware,
  thesisController.lookupStudent,
);

// ==========================================
// 4. Tiêu chí đánh giá Khóa luận tốt nghiệp
// ==========================================

// Lấy danh sách tiêu chí đánh giá đang hoạt động (cho mọi người dùng đã đăng nhập)
router.get(
  "/criteria",
  authMiddleware,
  thesisController.getThesisEvaluationCriteria,
);

// TBM / ADMIN: Tạo mới tiêu chí đánh giá
router.post(
  "/criteria",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.createThesisEvaluationCriteria,
);

// TBM / ADMIN: Cập nhật tiêu chí đánh giá
router.patch(
  "/criteria/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.updateThesisEvaluationCriteria,
);

// TBM / ADMIN: Xóa tiêu chí đánh giá
router.delete(
  "/criteria/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.deleteThesisEvaluationCriteria,
);

// ==========================================
// 5. Đợt chấm điểm Khóa luận tốt nghiệp
// ==========================================

// Lấy tất cả các đợt chấm điểm
router.get(
  "/grading-periods",
  authMiddleware,
  thesisController.getThesisGradingPeriods,
);

// TBM / ADMIN: Tạo mới đợt chấm điểm
router.post(
  "/grading-periods",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.createThesisGradingPeriod,
);

// TBM / ADMIN: Cập nhật đợt chấm điểm
router.patch(
  "/grading-periods/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.updateThesisGradingPeriod,
);

// TBM / ADMIN: Xóa đợt chấm điểm
router.delete(
  "/grading-periods/:id",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.deleteThesisGradingPeriod,
);

// TBM / ADMIN: Xử lý các đợt chấm điểm hết hạn (Đánh dấu KHÔNG ĐẠT các đề tài chưa nộp)
router.post(
  "/grading-periods/process-expired",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.processExpiredGradingPeriods,
);

// ==========================================
// 6. Đánh giá Khóa luận tốt nghiệp
// ==========================================

// TBM, Giảng viên, ADMIN: Lấy danh sách đề tài để đánh giá kèm thống kê
router.get(
  "/evaluations",
  authMiddleware,
  authorizeRoles("TBM", "LECTURER", "ADMIN"),
  thesisController.getThesesForEvaluation,
);

// TBM / ADMIN: Công bố các cột điểm cho toàn bộ đề tài trong học kỳ
router.post(
  "/publish-scores",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.publishScores,
);

// ==========================================
// 7. Giảng viên / Phản biện / Admin: Giám sát và Chấm điểm
// ==========================================

// Giảng viên / Admin: Lấy tất cả đề tài được phân công (GVHD / Phản biện 1 / Phản biện 2)
router.get(
  "/lecturer/assigned",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.getAssignedThesesForLecturer,
);

// Giảng viên / TBM / Admin: Đánh dấu sinh viên không đạt độc lập (KLTN)
router.patch(
  "/:id/fail-student",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.markStudentFail,
);

// Giảng viên / TBM / Admin: Hủy đánh dấu không đạt cho sinh viên
router.patch(
  "/:id/unfail-student",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.unmarkStudentFail,
);

// Giảng viên / Admin: Chấm điểm đề tài theo vai trò độc lập
router.patch(
  "/:id/grade",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.gradeThesisByLecturer,
);

// Giảng viên (GVHD) / Admin: Đánh giá điều kiện tiêu chí cho đề tài
router.patch(
  "/:id/evaluate-criteria",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.evaluateThesisCriteriaBySupervisor,
);

// Giảng viên / Admin: Khóa / Mở khóa điểm của một đề tài cụ thể
router.patch(
  "/:id/score-lock",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.toggleThesisScoreLock,
);

// Giảng viên / Admin: Khóa / Mở khóa tất cả điểm các đề tài được phân công
router.patch(
  "/lecturer/score-lock-all",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.toggleAllThesisScoresLock,
);

// Giảng viên / Admin: Phê duyệt hướng dẫn đề tài
router.patch(
  "/:id/supervisor-accept",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorAcceptThesis,
);

router.patch(
  "/:id/supervisor-approve",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorAcceptThesis,
);

// Giảng viên / Admin: Từ chối hướng dẫn đề tài
router.patch(
  "/:id/supervisor-reject",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorRejectThesis,
);

// Giảng viên / Admin: Hủy hướng dẫn đề tài
router.patch(
  "/:id/supervisor-cancel",
  authMiddleware,
  authorizeRoles("LECTURER", "TBM", "ADMIN"),
  thesisController.supervisorCancelThesis,
);

// TBM & ADMIN: Xuất danh sách đề tài ra Excel
router.get(
  "/export",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.exportTheses,
);

// TBM: Tự động phân công cán bộ phản biện theo hướng nghiên cứu
router.post(
  "/auto-assign-reviewers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.autoAssignReviewersByField,
);

// TBM: Lấy tất cả đề tài kèm tìm kiếm và lọc
router.get(
  "/",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.getAllThesesForTbm,
);

// TBM: Phê duyệt đề tài
router.patch(
  "/:id/approve",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.approveThesis,
);

// TBM: Từ chối / Hủy đề tài
router.patch(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectThesis,
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.rejectThesis,
);

// TBM: Phân công / Thay đổi GVHD
router.patch(
  "/:id/assign-supervisor",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.assignSupervisor,
);

// TBM: Phân công cán bộ phản biện (Phản biện 1 & 2)
router.patch(
  "/:id/assign-reviewers",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.assignReviewers,
);

// TBM: Hoàn thành đánh giá đề tài (COMPLETED)
router.patch(
  "/:id/complete",
  authMiddleware,
  authorizeRoles("TBM", "ADMIN"),
  thesisController.completeThesisEvaluation,
);

// ==========================================
// 8. Chi tiết theo ID sinh viên
// ==========================================

// Lấy thông tin đề tài theo ID sinh viên
router.get(
  "/student/:studentId",
  authMiddleware,
  thesisController.getThesisByStudent,
);

// Lấy thông tin đề tài theo ID
router.get(
  "/:id",
  authMiddleware,
  thesisController.getThesisById,
);

export default router;
