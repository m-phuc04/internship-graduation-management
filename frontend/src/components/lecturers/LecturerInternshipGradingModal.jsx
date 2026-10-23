import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import internshipApi from '../../api/internshipApi';
import { formatDateVN } from '../../utils/dateUtils';
import {
  Award,
  Calendar,
  CheckCircle2,
  Building2,
  Clock,
  Lock,
} from 'lucide-react';

const LecturerInternshipGradingModal = ({
  isOpen,
  onClose,
  internship,
  onGraded,
}) => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Determine grading window status
  const internshipTerm = internship?.academicTermId || currentTerm;
  const gradingStartRaw = internshipTerm?.internship?.gradingStart;
  const gradingEndRaw = internshipTerm?.internship?.gradingEnd;

  const isGradingAllowed = () => {
    if (!gradingStartRaw && !gradingEndRaw) {
      return true;
    }
    const now = new Date();
    const start = gradingStartRaw ? new Date(gradingStartRaw) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = gradingEndRaw ? new Date(gradingEndRaw) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  // Populate existing evaluation if present
  useEffect(() => {
    if (internship?.evaluation) {
      const ev = internship.evaluation;
      setScore(ev.score !== undefined && ev.score !== null ? String(ev.score) : '');
      setComments(ev.comments || '');
    } else {
      setScore('');
      setComments('');
    }
    setError('');
  }, [internship, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isGradingAllowed()) {
      showToast('Chưa tới thời gian chấm điểm', 'error');
      return;
    }

    const numScore = Number(score);
    if (isNaN(numScore) || score === '' || numScore < 0 || numScore > 10) {
      setError('Vui lòng nhập điểm số hợp lệ từ 0 đến 10');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        score: numScore,
        comments: comments.trim() || undefined,
      };

      await internshipApi.grade(internship._id, payload);
      showToast('Đã lưu kết quả chấm điểm thực tập thành công!', 'success');
      if (onGraded) onGraded();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi lưu điểm đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chấm điểm Thực tập Doanh nghiệp (Giảng viên Giám sát)"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Student & Enterprise Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#123891] font-bold text-lg flex items-center justify-center shadow-2xs shrink-0">
            {internship.studentId?.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate">
              {internship.studentId?.userId?.fullName}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
              <span className="font-bold text-[#123891]">MSSV: {internship.studentId?.studentCode}</span>
              <span>•</span>
              <span>Lớp: {internship.studentId?.className}</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                DN: <strong>{internship.companyId?.name || internship.companyId?.companyName}</strong> • Vị trí: <strong>{internship.position}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Score & Comments Section */}
        <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div>
            <label className="block font-bold text-slate-800 text-xs mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#123891]" />
                <span>Điểm số (*):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Thang điểm 10 (0.0 — 10.0)</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => {
                setScore(e.target.value);
                if (error) setError('');
              }}
              disabled={submitting}
              placeholder="Nhập điểm số (Ví dụ: 8.5)..."
              className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              autoFocus
            />
            {error && <p className="text-rose-500 text-xs font-semibold mt-1">{error}</p>}
          </div>

          <div>
            <label className="block font-bold text-slate-800 text-xs mb-1.5 flex items-center justify-between">
              <span>Nhận xét của Giảng viên Giám sát:</span>
              <span className="text-[11px] text-slate-400 font-normal">Không bắt buộc</span>
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={submitting}
              placeholder="Nhập nhận xét về tinh thần làm việc, kết quả thực tập và tiến độ của sinh viên (tùy chọn)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 font-bold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Xác nhận</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LecturerInternshipGradingModal;
