import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import UserNameClickable from '../common/UserNameClickable';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import thesisProgressApi from '../../api/thesisProgressApi';
import thesisDocumentApi from '../../api/thesisDocumentApi';
import councilApi from '../../api/councilApi';
import getFileUrl from '../../utils/fileUrlHelper';
import { formatTopicTitle } from '../../utils/textUtils';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  Award,
  Lock,
  Ban,
  Users,
  Paperclip,
  ExternalLink,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  RefreshCw,
  MapPin,
  Building,
} from 'lucide-react';

/**
 * Unified Thesis Detail Modal
 * Restricted strictly to LECTURER, TBM, and ADMIN roles.
 * Students (/student/...) are strictly PROHIBITED from accessing this modal.
 */
const ThesisDetailModal = ({
  isOpen,
  onClose,
  thesis,
  council = null,
  councils = [],
  thesisCouncilMap = {},
  activeTab = null,
  canGradeStatus = null,
  onOpenProgress = null,
  onOpenGrade = null,
  onApprove = null,
  onReject = null,
  onApproveSupervisor = null,
  onRejectSupervisor = null,
  onCancelThesis = null,
  onTimelineUpdated = null,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Access Control: Strictly restrict to Lecturer, TBM, and Admin
  const isAuthorized = Boolean(
    user && ['LECTURER', 'TBM', 'HEAD_OF_DEPARTMENT', 'ADMIN'].includes(user.role)
  );

  const isTbmOrAdmin = Boolean(
    user && ['TBM', 'HEAD_OF_DEPARTMENT', 'ADMIN'].includes(user.role)
  );

  // GVHD role check: ONLY true for a lecturer who is the supervisor of this thesis
  const isGVHD = Boolean(
    user &&
      user.role === 'LECTURER' &&
      (activeTab === 'SUPERVISOR' ||
        String(thesis?.supervisorId?._id || thesis?.supervisorId?.id || thesis?.supervisorId) === String(user._id || user.id) ||
        String(thesis?.supervisorId?.userId?._id || thesis?.supervisorId?.userId) === String(user._id || user.id))
  );

  // Timeline State
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [savingTimeline, setSavingTimeline] = useState(false);

  // Submissions State
  const [detailSubmissions, setDetailSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Fetched council fallback state
  const [fetchedCouncil, setFetchedCouncil] = useState(null);

  // Sync timeline input when modal opens or thesis changes
  useEffect(() => {
    if (isOpen && thesis) {
      setEditingTimeline(false);
      const startVal = thesis.startDate || thesis.academicTermId?.startDate || '';
      const endVal = thesis.endDate || thesis.academicTermId?.endDate || '';
      setEditStartDate(
        startVal
          ? typeof startVal === 'string'
            ? startVal.split('T')[0]
            : new Date(startVal).toISOString().split('T')[0]
          : ''
      );
      setEditEndDate(
        endVal
          ? typeof endVal === 'string'
            ? endVal.split('T')[0]
            : new Date(endVal).toISOString().split('T')[0]
          : ''
      );
    }
  }, [isOpen, thesis]);

  // Fetch student submissions when modal opens
  useEffect(() => {
    if (isOpen && thesis?._id && isAuthorized) {
      setLoadingSubmissions(true);
      thesisDocumentApi
        .getLecturerSubmissions({ thesisId: thesis._id })
        .then((res) => {
          if (res?.success) {
            setDetailSubmissions(res.data || []);
          } else {
            setDetailSubmissions([]);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch submissions for thesis modal:', err);
          setDetailSubmissions([]);
        })
        .finally(() => {
          setLoadingSubmissions(false);
        });
    } else {
      setDetailSubmissions([]);
    }
  }, [isOpen, thesis?._id, isAuthorized]);

  // Resolve Assigned Council
  const assignedCouncil = useMemo(() => {
    if (council) return council;
    if (fetchedCouncil) return fetchedCouncil;

    const rawCouncilId =
      (thesisCouncilMap && thesisCouncilMap[thesis?._id]) ||
      (thesis?.councilId?._id ? thesis.councilId._id : thesis?.councilId) ||
      '';
    const cIdStr =
      typeof rawCouncilId === 'object' && rawCouncilId !== null
        ? String(rawCouncilId._id || rawCouncilId.id || '')
        : String(rawCouncilId || '');

    if (Array.isArray(councils) && councils.length > 0 && cIdStr) {
      const found = councils.find(
        (c) => (c.id && String(c.id) === cIdStr) || (c._id && String(c._id) === cIdStr)
      );
      if (found) return found;
    }

    if (thesis?.councilId && typeof thesis.councilId === 'object' && thesis.councilId.name) {
      return thesis.councilId;
    }

    try {
      const termId = thesis?.academicTermId?._id || thesis?.academicTermId || 'default';
      const storageKey = `tbm_councils_${termId}`;
      const raw = localStorage.getItem(storageKey) || localStorage.getItem('tbm_councils_default');
      if (raw && cIdStr) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const found = parsed.find(
            (c) => (c.id && String(c.id) === cIdStr) || (c._id && String(c._id) === cIdStr)
          );
          if (found) return found;
        }
      }
    } catch (_) {}

    return null;
  }, [council, councils, thesisCouncilMap, thesis, fetchedCouncil]);

  // Fallback API fetch for council if ID exists but not in memory
  useEffect(() => {
    if (!isOpen || !thesis || assignedCouncil) return;
    const rawCouncilId =
      (thesisCouncilMap && thesisCouncilMap[thesis._id]) ||
      (thesis.councilId?._id ? thesis.councilId._id : thesis.councilId) ||
      '';
    const cIdStr =
      typeof rawCouncilId === 'object' && rawCouncilId !== null
        ? String(rawCouncilId._id || rawCouncilId.id || '')
        : String(rawCouncilId || '');

    if (cIdStr && cIdStr !== 'default_council' && cIdStr !== '[object Object]') {
      councilApi
        .getById(cIdStr)
        .then((res) => {
          if (res?.success && res.data) {
            setFetchedCouncil(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, thesis, assignedCouncil, thesisCouncilMap]);

  // Format Helpers
  const formatDate = useCallback((d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  const formatDateTime = useCallback((d) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const getSubmissionFileIcon = useCallback((fileName) => {
    if (!fileName) return <FileText className="w-4 h-4 text-slate-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-600" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-blue-600" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileCode className="w-4 h-4 text-amber-600" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-4 h-4 text-purple-600" />;
    return <FileText className="w-4 h-4 text-slate-500" />;
  }, []);

  const handleDownloadSubmissionFile = (e, doc) => {
    e.stopPropagation();
    const fullUrl = getFileUrl(doc.fileUrl);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', doc.fileName || 'file-nop-khoa-luan');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewSubmissionFile = (doc) => {
    const fullUrl = getFileUrl(doc.fileUrl);
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveTimeline = async () => {
    if (!thesis?._id || !editStartDate || !editEndDate) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc', 'warning');
      return;
    }
    if (new Date(editStartDate) >= new Date(editEndDate)) {
      showToast('Ngày kết thúc phải diễn ra sau ngày bắt đầu', 'error');
      return;
    }

    setSavingTimeline(true);
    try {
      const res = await thesisProgressApi.updateTimeline(thesis._id, {
        startDate: editStartDate,
        endDate: editEndDate,
      });

      if (res?.success) {
        showToast('Cập nhật thời gian thực hiện KLTN thành công!', 'success');
        setEditingTimeline(false);
        if (onTimelineUpdated) {
          onTimelineUpdated({
            startDate: editStartDate,
            endDate: editEndDate,
          });
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật thời gian', 'error');
    } finally {
      setSavingTimeline(false);
    }
  };

  // Block rendering completely for unauthorized users
  if (!isAuthorized || !isOpen || !thesis) return null;

  const isCompleted = thesis.status === 'COMPLETED';
  const isPendingTbm = thesis.status === 'PENDING_TBM_APPROVAL';
  const isPendingSupervisor = thesis.status === 'PENDING_SUPERVISOR_APPROVAL';
  const isTwoStudents = Boolean(thesis.studentCount === 2 && thesis.secondStudentId);

  // Scoring Helpers
  const supervisorScoreVal = thesis.scores?.supervisorScore ?? thesis.scores?.student1SupervisorScore;
  const reviewer1ScoreVal = thesis.scores?.reviewer1Score ?? thesis.scores?.student1Reviewer1Score;
  const reviewer2ScoreVal = thesis.scores?.reviewer2Score ?? thesis.scores?.student1Reviewer2Score;
  const councilScoreVal = thesis.scores?.councilScore ?? thesis.scores?.student1CouncilScore;
  const finalScoreVal = thesis.scores?.finalScore ?? thesis.scores?.student1FinalScore;

  const isAssignedPB1 = Boolean(
    thesis.reviewer1Id ||
      (Array.isArray(thesis.reviewers) && thesis.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
  );
  const isAssignedPB2 = Boolean(
    thesis.reviewer2Id ||
      (Array.isArray(thesis.reviewers) && thesis.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
  );

  const pbKinCombinedScore = (() => {
    const has1 = reviewer1ScoreVal !== null && reviewer1ScoreVal !== undefined && reviewer1ScoreVal !== '';
    const has2 = reviewer2ScoreVal !== null && reviewer2ScoreVal !== undefined && reviewer2ScoreVal !== '';

    if (isAssignedPB1 && isAssignedPB2) {
      if (has1 && has2) {
        return `${((Number(reviewer1ScoreVal) + Number(reviewer2ScoreVal)) / 2).toFixed(1)}`;
      }
      return '—';
    }
    if (isAssignedPB1 && has1) return `${Number(reviewer1ScoreVal)}`;
    if (isAssignedPB2 && has2) return `${Number(reviewer2ScoreVal)}`;
    if (thesis.scores?.reviewerScore !== null && thesis.scores?.reviewerScore !== undefined) {
      return `${thesis.scores.reviewerScore}`;
    }
    return '—';
  })();

  const sc = thesis.scores;
  const hasVal = (v) => v !== null && v !== undefined && v !== '';
  const isGraded = Boolean(
    sc &&
      (hasVal(sc.student1SupervisorScore) ||
        hasVal(sc.student2SupervisorScore) ||
        hasVal(sc.supervisorScore) ||
        hasVal(sc.student1Reviewer1Score) ||
        hasVal(sc.student2Reviewer1Score) ||
        hasVal(sc.reviewer1Score) ||
        hasVal(sc.student1Reviewer2Score) ||
        hasVal(sc.student2Reviewer2Score) ||
        hasVal(sc.reviewer2Score) ||
        hasVal(sc.finalScore) ||
        hasVal(sc.student1FinalScore) ||
        hasVal(sc.student2FinalScore) ||
        (Array.isArray(sc.councilLecturerScores) &&
          sc.councilLecturerScores.some(
            (c) => hasVal(c.score) || hasVal(c.student1Score) || hasVal(c.student2Score)
          )))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CHI TIẾT ĐỀ TÀI KHÓA LUẬN"
      maxWidth="max-w-3xl"
    >
      {/* Content wrapper: No internal max-h or overflow-y to prevent double scrollbars */}
      <div className="space-y-4 text-xs">
        {/* ======================================================== */}
        {/* SECTION 1: HEADER / TITLE & MÔ TẢ TÓM TẮT                */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 via-blue-50/50 to-slate-50 border border-blue-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#123891] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-[#123891] uppercase tracking-wider block">
                  Tên đề tài khóa luận
                </span>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {formatTopicTitle(thesis.thesisTitle || thesis.topicName || thesis.title)}
                </h3>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500 font-medium">
                  <span className="font-semibold text-slate-700">
                    {thesis.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                  </span>
                  <span>•</span>
                  <span>Ngày gửi: {formatDate(thesis.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={thesis.status} size="sm" />
              {isCompleted && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Đã hoàn thành
                </span>
              )}
            </div>
          </div>

          {/* Mô tả tóm tắt (Mục tiêu & Sản phẩm dự kiến đã được loại bỏ theo yêu cầu) */}
          {thesis.description && (
            <div className="pt-2 border-t border-blue-100/80">
              <div className="bg-white/80 p-3 rounded-xl border border-blue-100/70">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Mô tả tóm tắt
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {thesis.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Lock Banner if Completed */}
        {isCompleted && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">Đề tài đã hoàn thành nghiệm thu</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Dữ liệu đánh giá, bảng điểm và phân công đã được khóa cố định. Chế độ chỉ xem (Read-only).
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 2: SINH VIÊN THỰC HIỆN                           */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#123891]" />
            <span>Sinh viên thực hiện</span>
          </div>

          {/* Single student box if 1 student, 2-column grid if 2 students */}
          <div className={`grid ${isTwoStudents ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {/* SV 1 Card */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#123891]" />
                  <span>{isTwoStudents ? '1. ' : ''}{thesis.studentId?.userId?.fullName || 'Sinh viên 1'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isTwoStudents && (
                    <span className="text-[10px] font-bold text-[#102d7d] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Trưởng nhóm
                    </span>
                  )}
                  {thesis.studentId && (
                    <UserNameClickable
                      user={thesis.studentId}
                      name="Xem hồ sơ ↗"
                      showAvatar={false}
                      className="text-[10px] font-bold text-[#123891] hover:underline"
                    />
                  )}
                </div>
              </div>
              <div className="text-slate-500 text-[11px] font-mono">
                MSSV: <strong className="text-slate-700">{thesis.studentId?.studentCode || '—'}</strong>
                {thesis.studentId?.className ? ` • Lớp: ${thesis.studentId.className}` : ''}
              </div>
              <div className="text-slate-500 text-[11px]">
                Ngành: <span className="text-slate-700">{thesis.studentId?.major || thesis.studentId?.department || '—'}</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                GPA: <strong className="text-slate-800">{thesis.studentId?.gpa ?? '—'}</strong> • Tín chỉ:{' '}
                <strong className="text-slate-800">{thesis.studentId?.creditsAccumulated ?? '—'}</strong>
              </div>
              <div className="text-slate-500 text-[11px] truncate">
                Email: <span className="text-slate-700">{thesis.studentId?.userId?.email || '—'}</span>
              </div>
            </div>

            {/* SV 2 Card (ONLY rendered if 2 students) */}
            {isTwoStudents && (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#123891]" />
                    <span>2. {thesis.secondStudentId?.userId?.fullName || 'Sinh viên 2'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#102d7d] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Thành viên
                    </span>
                    <UserNameClickable
                      user={thesis.secondStudentId}
                      name="Xem hồ sơ ↗"
                      showAvatar={false}
                      className="text-[10px] font-bold text-[#123891] hover:underline"
                    />
                  </div>
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  MSSV: <strong className="text-slate-700">{thesis.secondStudentId?.studentCode || '—'}</strong>
                  {thesis.secondStudentId?.className ? ` • Lớp: ${thesis.secondStudentId.className}` : ''}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Ngành: <span className="text-slate-700">{thesis.secondStudentId?.major || thesis.secondStudentId?.department || '—'}</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  GPA: <strong className="text-slate-800">{thesis.secondStudentId?.gpa ?? '—'}</strong> • Tín chỉ:{' '}
                  <strong className="text-slate-800">{thesis.secondStudentId?.creditsAccumulated ?? '—'}</strong>
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  Email: <span className="text-slate-700">{thesis.secondStudentId?.userId?.email || '—'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: THỜI GIAN THỰC HIỆN KLTN                      */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/90 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#123891]" />
              <span className="font-bold text-xs text-[#123891] uppercase tracking-wider">
                Thời Gian Thực Hiện KLTN
              </span>
            </div>

            {/* "Đổi thời gian" button: ONLY visible for GVHD (Lecturer Supervisor) */}
            {isGVHD && !isCompleted && !editingTimeline && (
              <button
                type="button"
                onClick={() => setEditingTimeline(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#123891] hover:text-[#0d2a75] hover:underline cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Đổi thời gian</span>
              </button>
            )}
          </div>

          {!editingTimeline ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-blue-100/80">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase">Ngày bắt đầu KLTN</div>
                <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                  {editStartDate ? formatDate(editStartDate) : '—'}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-blue-100/80">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase">Ngày kết thúc KLTN</div>
                <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                  {editEndDate ? formatDate(editEndDate) : '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-blue-200 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ngày bắt đầu KLTN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ngày kết thúc KLTN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
                  />
                </div>
              </div>

              {editStartDate && editEndDate && new Date(editStartDate) < new Date(editEndDate) && (
                <div className="text-[11px] text-[#102d7d] bg-blue-50 px-3 py-1.5 rounded-xl font-medium flex items-center justify-between">
                  <span>Tổng số tuần dự kiến:</span>
                  <strong className="font-mono font-bold text-xs text-[#0d2a75]">
                    {Math.ceil((new Date(editEndDate) - new Date(editStartDate)) / (1000 * 60 * 60 * 24 * 7))} tuần
                  </strong>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTimeline(false)}
                  disabled={savingTimeline}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimeline}
                  disabled={savingTimeline}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{savingTimeline ? 'Đang lưu...' : 'Lưu thời gian'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 4: FILE NỘP                                      */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[#123891]" />
              <span className="font-bold text-xs text-[#123891] uppercase tracking-wider">
                File Nộp ({detailSubmissions.length})
              </span>
            </div>

            {/* "Xem tại trang Tài liệu": ONLY visible for GVHD (Lecturer Supervisor) */}
            {isGVHD && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/lecturer/theses/documents');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123891] hover:text-[#0d2a75] hover:underline cursor-pointer"
                title="Chuyển đến trang Quản lý tài liệu khóa luận"
              >
                <span>Xem tại trang Tài liệu</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {loadingSubmissions ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-[#123891]" />
              <span>Đang tải danh sách file nộp...</span>
            </div>
          ) : detailSubmissions.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center">
              <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-medium text-slate-500">Chưa có file nào do sinh viên nộp cho đề tài này</p>
              <p className="text-[10.5px] text-slate-400 mt-0.5">
                Các file báo cáo, bản nháp hoặc sản phẩm do sinh viên nộp sẽ hiển thị trực tiếp tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {detailSubmissions.map((sub, sIdx) => {
                const studentName =
                  sub.studentId?.userId?.fullName || sub.uploadedBy?.fullName || 'Sinh viên';
                const studentCode = sub.studentId?.studentCode;
                return (
                  <div
                    key={sub._id || sIdx}
                    className="p-3 bg-white rounded-xl border border-slate-200/70 hover:border-blue-200 hover:shadow-2xs transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition">
                        {getSubmissionFileIcon(sub.fileName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-bold text-slate-800 hover:text-[#123891] truncate cursor-pointer transition"
                          onClick={() => handlePreviewSubmissionFile(sub)}
                          title={sub.fileName}
                        >
                          {sub.fileName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="font-mono text-slate-500">{formatFileSize(sub.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDateTime(sub.createdAt)}</span>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">
                            {studentName} {studentCode ? `(${studentCode})` : ''}
                          </span>
                        </div>
                        {sub.description && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1" title={sub.description}>
                            "{sub.description}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewSubmissionFile(sub)}
                        className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Xem / Mở file trong tab mới"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadSubmissionFile(e, sub)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Tải về file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 5: GV HƯỚNG DẪN & GIẢNG VIÊN PHẢN BIỆN           */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#123891]" />
            <span>Giảng viên hướng dẫn & Giảng viên phản biện</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* GVHD Box (Quyền: GVHD badge & Đổi GVHD button removed) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase">Giảng viên hướng dẫn</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#102d7d] font-bold text-[9.5px] border border-blue-100">
                  50%
                </span>
              </div>

              <div className="font-bold text-slate-900 text-xs">
                {thesis.supervisorId?.academicTitle ? `${thesis.supervisorId.academicTitle} ` : ''}
                {thesis.supervisorId?.userId?.fullName || thesis.supervisorId?.fullName || thesis.supervisorName || 'Chưa phân công'}
              </div>
              <div className="text-slate-500 text-[11px]">
                {thesis.supervisorId?.userId?.email || '—'}
              </div>
            </div>

            {/* Giảng viên phản biện (Phân công button removed) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase block">Giảng viên phản biện</span>

              {/* Subsection 1: Phản biện kín (30%) */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0d2a75]">Phản biện kín (30%):</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#102d7d] font-bold text-[9px]">
                    GVPB KÍN
                  </span>
                </div>

                {(() => {
                  if (thesis.reviewer1Id) {
                    return (
                      <div className="text-slate-900 font-medium">
                        {thesis.reviewer1Id.academicTitle ? `${thesis.reviewer1Id.academicTitle} ` : ''}
                        {thesis.reviewer1Id.userId?.fullName || thesis.reviewer1Id.fullName}
                      </div>
                    );
                  }
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
                              {title}{lec.userId?.fullName || lec.fullName || 'Giảng viên'}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return <span className="text-amber-600 italic">Chưa phân công</span>;
                })()}
              </div>

              {/* Subsection 2: Phản biện hội đồng (20%) (HỘI ĐỒNG BÁO CÁO tag removed) */}
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-[11px] space-y-1">
                <div className="font-bold text-amber-900">
                  Phản biện hội đồng (20%):
                </div>

                {assignedCouncil ? (
                  <div className="space-y-1 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <strong className="text-slate-900">
                        {(assignedCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}
                      </strong>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white border border-amber-200 text-amber-900">
                        {assignedCouncil.type === 'ORAL' ? 'Oral' : 'Poster'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-600">
                      {assignedCouncil.room && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          Phòng: {assignedCouncil.room}
                        </span>
                      )}
                      {(assignedCouncil.reportDate || assignedCouncil.reportTime) && (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {assignedCouncil.reportDate ? formatDate(assignedCouncil.reportDate) : ''}
                          {assignedCouncil.reportTime ? ` (${assignedCouncil.reportTime})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Council Lecturer Names */}
                    {Array.isArray(assignedCouncil.lecturers) && assignedCouncil.lecturers.length > 0 && (
                      <div className="pt-1 text-[10.5px] border-t border-amber-200/60">
                        <span className="font-semibold text-slate-600 block mb-0.5">Thành viên hội đồng:</span>
                        <div className="flex flex-wrap gap-1">
                          {assignedCouncil.lecturers.map((l, lIdx) => {
                            const name = l.fullName || l.lecturerId?.userId?.fullName || `GV ${lIdx + 1}`;
                            return (
                              <span
                                key={l.lecturerId?._id || l.lecturerId || lIdx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-white text-slate-700 border border-amber-200 text-[10px] font-medium"
                              >
                                {name} {l.role ? `(${l.role})` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {thesis.reviewer2Id ? (
                      <div className="text-slate-900 font-medium">
                        {thesis.reviewer2Id.academicTitle ? `${thesis.reviewer2Id.academicTitle} ` : ''}
                        {thesis.reviewer2Id.userId?.fullName || thesis.reviewer2Id.fullName}
                      </div>
                    ) : (
                      <span className="text-amber-600 italic">Chưa phân công phòng hội đồng</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 6: KẾT QUẢ KHÓA LUẬN (SCORING SUMMARY)          */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#123891]" />
            <span>Kết quả khóa luận</span>
          </div>

          {/* 4-column Score Breakdown Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">GVHD (50%)</div>
              <div className="text-base font-mono font-bold text-slate-900 mt-1">
                {supervisorScoreVal !== null && supervisorScoreVal !== undefined ? supervisorScoreVal : '—'}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">PB Kín (30%)</div>
              <div className="text-base font-mono font-bold text-[#102d7d] mt-1">
                {pbKinCombinedScore}
              </div>
              {(reviewer1ScoreVal !== null || reviewer2ScoreVal !== null) && (
                <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                  GVPB1: {reviewer1ScoreVal ?? '—'} | GVPB2: {reviewer2ScoreVal ?? '—'}
                </div>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Hội đồng (20%)</div>
              <div className="text-base font-mono font-bold text-amber-700 mt-1">
                {councilScoreVal !== null && councilScoreVal !== undefined ? councilScoreVal : '—'}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center shadow-2xs">
              <div className="text-[10px] text-emerald-700 font-bold uppercase">Tổng kết</div>
              <div className="text-base font-mono font-extrabold text-emerald-800 mt-1">
                {finalScoreVal !== null && finalScoreVal !== undefined ? `${finalScoreVal} / 10` : '—'}
              </div>
            </div>
          </div>

          {/* Detailed Comments Breakdown */}
          {(thesis.supervisorComment || thesis.reviewer1Comment || thesis.reviewer2Comment || thesis.councilComment) && (
            <div className="space-y-1.5 pt-1">
              {thesis.supervisorComment && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                  <span className="text-slate-400 font-semibold block mb-0.5">Nhận xét của GVHD:</span>
                  <span className="text-slate-800 leading-relaxed">{thesis.supervisorComment}</span>
                </div>
              )}
              {thesis.reviewer1Comment && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                  <span className="text-slate-400 font-semibold block mb-0.5">Nhận xét của GVPB 1:</span>
                  <span className="text-slate-800 leading-relaxed">{thesis.reviewer1Comment}</span>
                </div>
              )}
              {thesis.reviewer2Comment && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                  <span className="text-slate-400 font-semibold block mb-0.5">Nhận xét của GVPB 2:</span>
                  <span className="text-slate-800 leading-relaxed">{thesis.reviewer2Comment}</span>
                </div>
              )}
              {thesis.councilComment && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                  <span className="text-slate-400 font-semibold block mb-0.5">Nhận xét của Hội đồng:</span>
                  <span className="text-slate-800 leading-relaxed">{thesis.councilComment}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 7: ACTION BUTTONS (NHẬT KÝ & CONTEXTUAL ACTIONS) */}
        {/* ======================================================== */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút "Nhật ký" */}
            {thesis.status !== 'REJECTED' &&
              thesis.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
              thesis.status !== 'PENDING_TBM_APPROVAL' && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenProgress) {
                      onOpenProgress(thesis);
                    } else {
                      onClose();
                      navigate(`/lecturer/theses/progress?thesisId=${thesis._id}`);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#102d7d] border border-blue-200 cursor-pointer"
                  title="Xem nhật ký và tiến độ thực hiện của sinh viên"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#123891]" />
                  <span>Nhật ký</span>
                </button>
              )}

            {/* Supervisor Pending Actions */}
            {isPendingSupervisor && (isGVHD || isTbmOrAdmin) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onApproveSupervisor) onApproveSupervisor(thesis);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt đề tài</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onRejectSupervisor) onRejectSupervisor(thesis);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
              </div>
            )}

            {/* TBM Pending Actions */}
            {isPendingTbm && isTbmOrAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onReject) onReject(thesis);
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onApprove) onApprove(thesis);
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt đề tài</span>
                </button>
              </div>
            )}

            {/* Lecturer Chấm điểm action */}
            {onOpenGrade &&
              thesis.status !== 'REJECTED' &&
              thesis.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
              thesis.status !== 'PENDING_TBM_APPROVAL' && (
                <button
                  type="button"
                  disabled={canGradeStatus && !canGradeStatus.canGrade}
                  onClick={() => onOpenGrade(thesis)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                    !canGradeStatus || canGradeStatus.canGrade
                      ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                  title={canGradeStatus?.reason || 'Chấm điểm đề tài'}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Chấm điểm</span>
                </button>
              )}

            {/* TBM Hủy đề tài */}
            {isTbmOrAdmin &&
              !isCompleted &&
              thesis.status !== 'REJECTED' &&
              onCancelThesis && (
                <button
                  type="button"
                  disabled={isGraded}
                  onClick={() => {
                    if (isGraded) return;
                    onCancelThesis(thesis);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl border transition ${
                    isGraded
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                  }`}
                  title={
                    isGraded
                      ? 'Không thể hủy đề tài do đề tài đã có điểm đánh giá'
                      : 'Hủy đề tài và giải phóng đăng ký cho sinh viên'
                  }
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Hủy đề tài</span>
                </button>
              )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ThesisDetailModal;
