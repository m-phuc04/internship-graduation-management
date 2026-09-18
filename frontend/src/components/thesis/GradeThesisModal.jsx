import React, { useState, useEffect, useRef } from 'react';
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
  const [student1Score, setStudent1Score] = useState('');
  const [student2Score, setStudent2Score] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const input1Ref = useRef(null);
  const input2Ref = useRef(null);
  const commentRef = useRef(null);

  const isCompleted = thesis?.status === 'COMPLETED';
  const isTwoStudents = thesis?.studentCount === 2 && thesis?.secondStudentId;

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

      // Auto-focus first input
      setTimeout(() => {
        input1Ref.current?.focus();
      }, 100);
    }
  }, [isOpen, thesis, defaultRoleType, isSupervisor, isReviewer1, isReviewer2]);

  const isRoleScoreLocked =
    (activeRoleTab === 'SUPERVISOR' && thesis?.scores?.isSupervisorScoreLocked) ||
    (activeRoleTab === 'REVIEWER1' && thesis?.scores?.isReviewer1ScoreLocked) ||
    (activeRoleTab === 'REVIEWER2' && thesis?.scores?.isReviewer2ScoreLocked);

  const isFormLocked = isCompleted || isRoleScoreLocked;

  const loadRoleData = (role) => {
    const isTwo = thesis?.studentCount === 2 && thesis?.secondStudentId;
    if (role === 'SUPERVISOR') {
      const s1 = thesis?.scores?.student1SupervisorScore ?? (!isTwo ? thesis?.scores?.supervisorScore : null);
      const s2 = thesis?.scores?.student2SupervisorScore;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(thesis?.supervisorComment || '');
    } else if (role === 'REVIEWER1') {
      const s1 = thesis?.scores?.student1Reviewer1Score ?? (!isTwo ? thesis?.scores?.reviewer1Score : null);
      const s2 = thesis?.scores?.student2Reviewer1Score;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(thesis?.reviewer1Comment || '');
    } else if (role === 'REVIEWER2') {
      const s1 = thesis?.scores?.student1Reviewer2Score ?? (!isTwo ? thesis?.scores?.reviewer2Score : null);
      const s2 = thesis?.scores?.student2Reviewer2Score;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
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
    if (e) e.preventDefault();
    if (isCompleted) return;

    setError('');

    if (student1Score === '' && (!isTwoStudents || student2Score === '')) {
      setError('Vui lòng nhập điểm số đánh giá');
      return;
    }

    const num1 = student1Score !== '' ? Number(student1Score) : null;
    const num2 = isTwoStudents && student2Score !== '' ? Number(student2Score) : null;

    if (num1 !== null && (isNaN(num1) || num1 < 0 || num1 > 10)) {
      setError('Điểm số Sinh viên 1 phải từ 0 đến 10');
      return;
    }
    if (num2 !== null && (isNaN(num2) || num2 < 0 || num2 > 10)) {
      setError('Điểm số Sinh viên 2 phải từ 0 đến 10');
      return;
    }

    const avg = num1 !== null && num2 !== null ? Number(((num1 + num2) / 2).toFixed(2)) : (num1 ?? num2);

    setSubmitting(true);
    try {
      const res = await thesisApi.gradeThesis(thesis._id, {
        score: avg,
        student1Score: num1,
        student2Score: num2,
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
            <span className="font-semibold text-indigo-900">
              SV1: {thesis.studentId?.userId?.fullName} ({thesis.studentId?.studentCode})
            </span>
            {isTwoStudents && (
              <>
                <span>•</span>
                <span className="font-semibold text-violet-900">
                  SV2: {thesis.secondStudentId?.userId?.fullName} ({thesis.secondStudentId?.studentCode})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Lock Notice if COMPLETED or Role Score Locked */}
        {isCompleted ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">Đánh giá đã hoàn thành (COMPLETED)</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Đề tài khóa luận này đã hoàn tất nghiệm thu và đánh giá. Không được phép chỉnh sửa điểm và nhận xét.
              </p>
            </div>
          </div>
        ) : isRoleScoreLocked ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <div>
              <div className="font-bold">Điểm của vai trò này đang bị khóa</div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Vui lòng mở khóa trên danh sách đề tài nếu bạn cần chỉnh sửa điểm hoặc nhận xét.
              </p>
            </div>
          </div>
        ) : null}

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
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Score Inputs (Student 1 and Student 2) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nhập Điểm Đánh Giá <span className="text-rose-500">*</span> (Thang điểm 10)
            </label>
            {!isFormLocked && (
              <span className="text-[11px] text-slate-400 font-normal">
                Nhấn <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-700 font-mono font-bold">Enter</kbd> để chuyển ô
              </span>
            )}
          </div>

          <div className={`grid ${isTwoStudents ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {/* Student 1 Box */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  SV 1: {thesis.studentId?.userId?.fullName}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {thesis.studentId?.studentCode}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={input1Ref}
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={student1Score}
                  onChange={(e) => {
                    if (!isFormLocked) {
                      setStudent1Score(e.target.value);
                      setError('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isTwoStudents && input2Ref.current) {
                        input2Ref.current.focus();
                        input2Ref.current.select();
                      } else {
                        commentRef.current?.focus();
                      }
                    }
                  }}
                  placeholder={isFormLocked ? "—" : "0.0"}
                  disabled={submitting || isFormLocked}
                  readOnly={isFormLocked}
                  className={`w-20 h-12 text-center border-2 rounded-xl text-lg font-mono font-extrabold transition ${
                    isFormLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'bg-indigo-50/40 border-indigo-200 text-indigo-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600'
                  }`}
                  required
                />
                <div className="text-[11px] text-slate-500">
                  Điểm số / 10
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {isTwoStudents ? 'Nhập điểm SV1 rồi ấn Enter qua SV2' : 'Nhập điểm rồi ấn Enter'}
                  </span>
                </div>
              </div>
            </div>

            {/* Student 2 Box (if applicable) */}
            {isTwoStudents && (
              <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-300 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-violet-900 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-600" />
                    SV 2: {thesis.secondStudentId?.userId?.fullName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {thesis.secondStudentId?.studentCode}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={input2Ref}
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={student2Score}
                    onChange={(e) => {
                      if (!isFormLocked) {
                        setStudent2Score(e.target.value);
                        setError('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (commentRef.current) {
                          commentRef.current.focus();
                        } else {
                          handleSubmit(e);
                        }
                      }
                    }}
                    placeholder={isFormLocked ? "—" : "0.0"}
                    disabled={submitting || isFormLocked}
                    readOnly={isFormLocked}
                    className={`w-20 h-12 text-center border-2 rounded-xl text-lg font-mono font-extrabold transition ${
                      isFormLocked
                        ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                        : 'bg-violet-50/40 border-violet-200 text-violet-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-600'
                    }`}
                  />
                  <div className="text-[11px] text-slate-500">
                    Điểm số / 10
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Nhập điểm SV2 rồi ấn Enter để lưu
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nhận xét & Đánh giá chi tiết <span className="text-slate-400 font-normal">{isFormLocked ? '' : '(Tùy chọn)'}</span>
          </label>
          <textarea
            ref={commentRef}
            rows={3}
            value={comment}
            onChange={(e) => {
              if (!isFormLocked) setComment(e.target.value);
            }}
            placeholder={isFormLocked ? "Chưa có nhận xét." : "Nhập nhận xét về tính đúng đắn, phương pháp nghiên cứu, ưu điểm và hạn chế của đề tài..."}
            disabled={submitting || isFormLocked}
            readOnly={isFormLocked}
            className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition resize-none ${
              isFormLocked
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
            {isFormLocked ? 'Đóng' : 'Hủy'}
          </button>
          {!isFormLocked && (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang lưu...' : 'Lưu kết quả đánh giá (Enter)'}</span>
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default GradeThesisModal;
