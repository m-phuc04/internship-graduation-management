import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import {
  GraduationCap,
  Users,
  User,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  Award,
  Lock,
} from 'lucide-react';

const TbmThesisDetailModal = ({
  isOpen,
  onClose,
  thesis,
  onApprove,
  onReject,
  onOpenAssignReviewers,
  onOpenAssignSupervisor,
}) => {
  if (!thesis) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isPending = thesis.status === 'PENDING_TBM_APPROVAL';
  const isCompleted = thesis.status === 'COMPLETED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi Tiết Hồ Sơ Đề Tài Khóa Luận Tốt Nghiệp"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Title & Status */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {thesis.thesisTitle}
              </h3>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                <span>Hình thức: <strong>{thesis.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}</strong></span>
                <span>•</span>
                <span>Ngày gửi: {formatDate(thesis.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={thesis.status} size="md" />
              {isCompleted && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Đã hoàn thành — Chỉ xem
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lock Banner if Completed */}
        {isCompleted && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">Đề tài đã hoàn thành nghiệm thu (COMPLETED)</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Dữ liệu đánh giá, bảng điểm và phân công đã được khóa cố định. Chế độ chỉ xem (Read-only).
              </p>
            </div>
          </div>
        )}

        {/* Student Members */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Sinh viên thực hiện đề tài
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* SV1 */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <strong className="text-slate-900">1. {thesis.studentId?.userId?.fullName}</strong>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  Trưởng nhóm
                </span>
              </div>
              <div className="text-slate-500 text-[11px] font-mono">
                MSSV: {thesis.studentId?.studentCode} • {thesis.studentId?.className}
              </div>
              <div className="text-slate-500 text-[11px]">
                GPA: <strong>{thesis.studentId?.gpa || '—'}</strong> • Tín chỉ: <strong>{thesis.studentId?.creditsAccumulated || '—'}</strong>
              </div>
              <div className="text-slate-500 text-[11px] truncate">
                {thesis.studentId?.userId?.email}
              </div>
            </div>

            {/* SV2 if exists */}
            {thesis.studentCount === 2 && thesis.secondStudentId ? (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-900">2. {thesis.secondStudentId?.userId?.fullName}</strong>
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                    Thành viên
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  MSSV: {thesis.secondStudentId?.studentCode} • {thesis.secondStudentId?.className}
                </div>
                <div className="text-slate-500 text-[11px]">
                  GPA: <strong>{thesis.secondStudentId?.gpa || '—'}</strong> • Tín chỉ: <strong>{thesis.secondStudentId?.creditsAccumulated || '—'}</strong>
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  {thesis.secondStudentId?.userId?.email}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100/60 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 italic">
                Đề tài cá nhân (1 Sinh viên)
              </div>
            )}
          </div>
        </div>

        {/* Supervisors & Reviewers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Supervisor Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase">GVHD</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[9.5px] border border-indigo-100">
                  40%
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold text-[9.5px]">
                  Quyền: GVHD
                </span>
              </div>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => onOpenAssignSupervisor(thesis)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Đổi GVHD
                </button>
              )}
            </div>
            <div className="font-bold text-slate-900 text-xs">
              {thesis.supervisorId?.academicTitle ? `${thesis.supervisorId.academicTitle} ` : ''}
              {thesis.supervisorId?.userId?.fullName}
            </div>
            <div className="text-slate-500 text-[11px] font-mono">
              Mã GV: {thesis.supervisorId?.lecturerCode} • {thesis.supervisorId?.specialization || 'CNTT'}
            </div>
            <div className="text-slate-500 text-[11px]">{thesis.supervisorId?.userId?.email}</div>
          </div>

          {/* Reviewers Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Giảng viên Phản biện</span>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => onOpenAssignReviewers(thesis)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Phân công
                </button>
              )}
            </div>

            {/* PB KÍN */}
            <div className="p-2 rounded-xl bg-violet-50/50 border border-violet-100 text-[11px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-violet-800">PB KÍN (30%):</span>
                <span className="px-1.5 py-0.2 rounded bg-violet-100 text-violet-700 font-bold text-[9px]">
                  GVPB KÍN
                </span>
              </div>
              {(() => {
                let list = [];
                if (Array.isArray(thesis.reviewers) && thesis.reviewers.length > 0) {
                  list = thesis.reviewers.filter((r) => r.isPrivateReviewer && r.lecturerId);
                }
                if (list.length > 0) {
                  return (
                    <div className="space-y-0.5">
                      {list.map((r, i) => {
                        const lec = r.lecturerId;
                        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                        return (
                          <div key={i} className="text-slate-900 font-medium">
                            {title}{lec.userId?.fullName || 'Giảng viên'} ({lec.lecturerCode})
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                if (thesis.reviewer1Id) {
                  return (
                    <div className="text-slate-900 font-medium">
                      {thesis.reviewer1Id.academicTitle ? `${thesis.reviewer1Id.academicTitle} ` : ''}
                      {thesis.reviewer1Id.userId?.fullName} ({thesis.reviewer1Id.lecturerCode})
                    </div>
                  );
                }
                return <span className="text-amber-600 italic">Chưa có</span>;
              })()}
            </div>

            {/* PB HỘI ĐỒNG */}
            <div className="p-2 rounded-xl bg-amber-50/50 border border-amber-100 text-[11px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800">PB HỘI ĐỒNG (30%):</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 font-bold text-[9px]">
                  GVPB HỘI ĐỒNG
                </span>
              </div>
              {(() => {
                let list = [];
                if (Array.isArray(thesis.reviewers) && thesis.reviewers.length > 0) {
                  list = thesis.reviewers.filter((r) => r.isCouncilReviewer && r.lecturerId);
                }
                if (list.length > 0) {
                  return (
                    <div className="space-y-0.5">
                      {list.map((r, i) => {
                        const lec = r.lecturerId;
                        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                        return (
                          <div key={i} className="text-slate-900 font-medium">
                            {title}{lec.userId?.fullName || 'Giảng viên'} ({lec.lecturerCode})
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                if (thesis.reviewer2Id) {
                  return (
                    <div className="text-slate-900 font-medium">
                      {thesis.reviewer2Id.academicTitle ? `${thesis.reviewer2Id.academicTitle} ` : ''}
                      {thesis.reviewer2Id.userId?.fullName} ({thesis.reviewer2Id.lecturerCode})
                    </div>
                  );
                }
                return <span className="text-amber-600 italic">Chưa có</span>;
              })()}
            </div>
          </div>
        </div>

        {/* Scores Card (If available or Completed) */}
        {thesis.scores && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2.5">
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              Kết quả đánh giá & Bảng điểm khóa luận
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">GVHD (40%)</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                  {thesis.scores.supervisorScore !== null ? `${thesis.scores.supervisorScore}` : '—'}
                </div>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">PB Kín (30%)</div>
                <div className="text-sm font-mono font-bold text-violet-700 mt-0.5">
                  {thesis.scores.reviewer1Score !== null ? `${thesis.scores.reviewer1Score}` : '—'}
                </div>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">PB Hội đồng (30%)</div>
                <div className="text-sm font-mono font-bold text-amber-700 mt-0.5">
                  {thesis.scores.reviewer2Score !== null ? `${thesis.scores.reviewer2Score}` : '—'}
                </div>
              </div>
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">Tổng kết</div>
                <div className="text-sm font-mono font-extrabold text-emerald-800 mt-0.5">
                  {thesis.scores.finalScore !== null ? `${thesis.scores.finalScore} / 10` : '—'}
                </div>
              </div>
            </div>

            {/* Comments breakdown */}
            {(thesis.supervisorComment || thesis.reviewer1Comment || thesis.reviewer2Comment) && (
              <div className="space-y-1.5 pt-1">
                {thesis.supervisorComment && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                    <span className="text-slate-400 font-medium block">Nhận xét của GVHD:</span>
                    <span className="text-slate-800">{thesis.supervisorComment}</span>
                  </div>
                )}
                {thesis.reviewer1Comment && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                    <span className="text-slate-400 font-medium block">Nhận xét của GVPB Kín:</span>
                    <span className="text-slate-800">{thesis.reviewer1Comment}</span>
                  </div>
                )}
                {thesis.reviewer2Comment && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                    <span className="text-slate-400 font-medium block">Nhận xét của GVPB Hội đồng:</span>
                    <span className="text-slate-800">{thesis.reviewer2Comment}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content & Objectives */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Mô tả tóm tắt:</span>
            <p className="text-slate-800 text-xs mt-0.5 leading-relaxed whitespace-pre-wrap">
              {thesis.description || 'Chưa có mô tả.'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Mục tiêu & Sản phẩm:</span>
            <p className="text-slate-800 text-xs mt-0.5 leading-relaxed whitespace-pre-wrap">
              {thesis.objectives || 'Chưa có mục tiêu.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {!isCompleted && !isPending && thesis.status !== 'REJECTED' && (
              <button
                type="button"
                onClick={() => onOpenAssignReviewers(thesis)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Phân công phản biện</span>
              </button>
            )}

            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => onReject(thesis)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(thesis)}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt đề tài</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TbmThesisDetailModal;
