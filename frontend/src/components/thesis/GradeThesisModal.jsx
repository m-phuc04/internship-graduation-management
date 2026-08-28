import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  User,
  Users,
  Percent,
  Lock,
  Eye,
} from 'lucide-react';

const GradeThesisModal = ({
  isOpen,
  onClose,
  thesis,
  currentLecturerId,
  defaultRoleType = null,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeRoleTab, setActiveRoleTab] = useState('SUPERVISOR');
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCompleted = thesis?.status === 'COMPLETED';

  // Determine current lecturer's role on this thesis
  const lecIdStr =
    currentLecturerId?.toString() ||
    user?._id?.toString() ||
    '';

  const isSupervisor =
    thesis?.supervisorId?._id?.toString() === lecIdStr ||
    thesis?.supervisorId?.toString() === lecIdStr;

  const isReviewer1 =
    thesis?.reviewer1Id?._id?.toString() === lecIdStr ||
    thesis?.reviewer1Id?.toString() === lecIdStr ||
    (Array.isArray(thesis?.reviewers) &&
      thesis.reviewers.some(
        (r) =>
          (r.lecturerId?._id?.toString() || r.lecturerId?.toString()) ===
            lecIdStr && r.isPrivateReviewer,
      ));

  const isReviewer2 =
    thesis?.reviewer2Id?._id?.toString() === lecIdStr ||
    thesis?.reviewer2Id?.toString() === lecIdStr ||
    (Array.isArray(thesis?.reviewers) &&
      thesis.reviewers.some(
        (r) =>
          (r.lecturerId?._id?.toString() || r.lecturerId?.toString()) ===
            lecIdStr && r.isCouncilReviewer,
      ));

  const isBothReviewers = isReviewer1 && isReviewer2;

  useEffect(() => {
    if (isOpen && thesis) {
      setError('');
      let initialTab = 'SUPERVISOR';
      if (defaultRoleType) {
        initialTab = defaultRoleType;
      } else if (isReviewer1 && !isSupervisor) {
        initialTab = 'REVIEWER1';
      } else if (isReviewer2 && !isSupervisor) {
        initialTab = 'REVIEWER2';
      } else if (isSupervisor) {
        initialTab = 'SUPERVISOR';
      }
      setActiveRoleTab(initialTab);
      loadRoleData(initialTab);
    }
  }, [isOpen, thesis, defaultRoleType, isSupervisor, isReviewer1, isReviewer2]);

  const loadRoleData = (role) => {
    if (role === 'SUPERVISOR') {
      setScore(thesis?.scores?.supervisorScore != null ? String(thesis.scores.supervisorScore) : '');
      setComment(thesis?.supervisorComment || '');
    } else if (role === 'REVIEWER1') {
      setScore(thesis?.scores?.reviewer1Score != null ? String(thesis.scores.reviewer1Score) : '');
      setComment(thesis?.reviewer1Comment || '');
    } else if (role === 'REVIEWER2') {
      setScore(thesis?.scores?.reviewer2Score != null ? String(thesis.scores.reviewer2Score) : '');
      setComment(thesis?.reviewer2Comment || '');
    }
  };

  const handleTabChange = (role) => {
    setActiveRoleTab(role);
    setError('');
    loadRoleData(role);
  };

  let roleTitle = 'Giảng viên đánh giá';
  let roleWeight = '30%';

  if (activeRoleTab === 'SUPERVISOR') {
    roleTitle = 'Đánh giá của Giảng viên Hướng dẫn (GVHD)';
    roleWeight = '40%';
  } else if (activeRoleTab === 'REVIEWER1') {
    roleTitle = 'Đánh giá của Giảng viên Phản biện Kín';
    roleWeight = '30%';
  } else if (activeRoleTab === 'REVIEWER2') {
    roleTitle = 'Đánh giá của Giảng viên Phản biện Hội đồng';
    roleWeight = '30%';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCompleted) return;

    setError('');

    if (score === '') {
      setError('Vui lòng nhập điểm số đánh giá');
      return;
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      setError('Điểm số phải từ 0 đến 10 (thang điểm 10)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await thesisApi.gradeThesis(thesis._id, {
        score: numScore,
        comment: comment.trim() || null,
        roleType: activeRoleTab,
      });

      if (res.success) {
        showToast('Chấm điểm và lưu đánh giá đề tài thành công!', 'success');
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Lưu điểm đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!thesis) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCompleted ? "Xem Điểm & Đánh Giá Đề Tài Khóa Luận (Đã hoàn thành)" : "Chấm Điểm & Đánh Giá Đề Tài Khóa Luận"}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Thesis Summary Card */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5 shadow-2xs">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="font-bold text-slate-900 text-xs leading-snug">{thesis.thesisTitle}</div>
          </div>
          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-100/80">
            <span>
              SV1: <strong>{thesis.studentId?.userId?.fullName}</strong> ({thesis.studentId?.studentCode})
            </span>
            {thesis.studentCount === 2 && thesis.secondStudentId && (
              <>
                <span>•</span>
                <span>
                  SV2: <strong>{thesis.secondStudentId?.userId?.fullName}</strong> ({thesis.secondStudentId?.studentCode})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Lock Notice if COMPLETED */}
        {isCompleted && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">Đánh giá đã hoàn thành (COMPLETED)</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Đề tài khóa luận này đã hoàn tất nghiệm thu và đánh giá. Không được phép chỉnh sửa điểm và nhận xét.
              </p>
            </div>
          </div>
        )}

        {/* Role Switching Tabs (If lecturer has multiple roles on this thesis) */}
        {isBothReviewers && (
          <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() => handleTabChange('REVIEWER1')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeRoleTab === 'REVIEWER1'
                  ? 'bg-white text-violet-700 shadow-2xs border border-violet-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Phản biện kín (30%)
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('REVIEWER2')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeRoleTab === 'REVIEWER2'
                  ? 'bg-white text-amber-700 shadow-2xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Phản biện Hội đồng (30%)
            </button>
          </div>
        )}

        {/* Current Role Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-xs">{roleTitle}</span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] border border-indigo-100 shadow-2xs">
            Trọng số: {roleWeight}
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Score Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Điểm đánh giá <span className="text-rose-500">*</span> (Thang điểm 10)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => {
                if (!isCompleted) {
                  setScore(e.target.value);
                  setError('');
                }
              }}
              placeholder={isCompleted ? "Chưa có điểm" : "VD: 8.5"}
              disabled={submitting || isCompleted}
              readOnly={isCompleted}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono font-bold transition ${
                isCompleted
                  ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
              required
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">/ 10</span>
          </div>
        </div>

        {/* Comment Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nhận xét & Đánh giá chi tiết <span className="text-slate-400 font-normal">{isCompleted ? '' : '(Tùy chọn)'}</span>
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => {
              if (!isCompleted) setComment(e.target.value);
            }}
            placeholder={isCompleted ? "Chưa có nhận xét." : "Nhập nhận xét về tính đúng đắn, phương pháp nghiên cứu, ưu điểm và hạn chế của đề tài..."}
            disabled={submitting || isCompleted}
            readOnly={isCompleted}
            className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition resize-none ${
              isCompleted
                ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {isCompleted ? 'Đóng' : 'Hủy'}
          </button>
          {!isCompleted && (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang lưu...' : 'Lưu kết quả đánh giá'}</span>
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default GradeThesisModal;
