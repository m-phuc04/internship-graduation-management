import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import thesisProgressApi from '../../api/thesisProgressApi';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import getFileUrl from '../../utils/fileUrlHelper';

import {
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Send,
  BookOpen,
  Calendar,
  Paperclip,
  Eye,
  Download,
  Upload,
  Trash2,
  FileCheck,
  ExternalLink,
  Printer,
  Edit3,
  Check,
  X,
  AlertTriangle,
  ArrowUpDown,
  Clock,
} from 'lucide-react';


const StudentThesisProgressPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [thesis, setThesis] = useState(null);
  const [student, setStudent] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [progressList, setProgressList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    waitingStudent2: 0,
    needsRevision: 0,
    totalWeeks: 0,
  });
  const [loading, setLoading] = useState(true);

  // Sorting state: Put weeks needing action first, and submitted/completed weeks to bottom
  const [sortByPendingFirst, setSortByPendingFirst] = useState(true);

  // Detail Modal
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);


  // Create / Edit Modal
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [editingProgressId, setEditingProgressId] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFile, setExistingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // SV2 Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [progressToConfirm, setProgressToConfirm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Export Diary Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const fileInputRef = useRef(null);


  const [allWeeks, setAllWeeks] = useState([]);

  // Helper to generate weeks from start & end date
  const generateWeeks = (startDate, endDate, pList = []) => {
    if (!startDate || !endDate) return { generatedWeeks: [], allGeneratedWeeks: [] };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return { generatedWeeks: [], allGeneratedWeeks: [] };
    }

    // Calculate highest reported week
    let highestReportedWeek = 0;
    pList.forEach((p) => {
      if (p.progressType === 'WEEKLY' && p.weekNumber && p.weekNumber > highestReportedWeek) {
        highestReportedWeek = p.weekNumber;
      }
    });
    const maxUnlockedWeek = Math.max(1, highestReportedWeek + 1);

    const all = [];
    let currentStart = new Date(start);
    let weekNum = 1;

    while (currentStart < end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6);
      const actualEnd = currentEnd > end ? new Date(end) : currentEnd;

      const foundP = pList.find(
        (p) => p.progressType === 'WEEKLY' && p.weekNumber === weekNum,
      );

      // Only unlock up to the single next week to be completed
      const isUnlocked = weekNum <= maxUnlockedWeek;

      all.push({
        weekNumber: weekNum,
        startDate: new Date(currentStart).toISOString(),
        endDate: actualEnd.toISOString(),
        label: `Tuần ${weekNum}`,
        isUnlocked,
        progress: foundP || null,
      });

      const nextStart = new Date(currentStart);
      nextStart.setDate(nextStart.getDate() + 7);
      currentStart = nextStart;
      weekNum++;
    }

    // Only show unlocked weeks (previous completed weeks + 1 next active week)
    const unlocked = all.filter((w) => w.isUnlocked);
    return { generatedWeeks: unlocked, allGeneratedWeeks: all };
  };

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisProgressApi.getMyProgress();
      if (res.success) {
        const fetchedThesis = res.thesis || null;
        setThesis(fetchedThesis);
        setStudent(res.student || null);
        const pList = res.data || [];
        setProgressList(pList);

        const sDate =
          fetchedThesis?.startDate ||
          fetchedThesis?.academicTermId?.thesis?.assignmentStart ||
          fetchedThesis?.academicTermId?.startDate;
        const eDate =
          fetchedThesis?.endDate ||
          fetchedThesis?.academicTermId?.thesis?.defenseEnd ||
          fetchedThesis?.academicTermId?.endDate;

        let finalAllWeeks = res.allWeeks && res.allWeeks.length > 0 ? res.allWeeks : [];
        let finalWeeks = res.weeks && res.weeks.length > 0 ? res.weeks : [];

        // Always calculate all weeks from timeline if allWeeks is missing or has only 1 week while duration is longer
        if (sDate && eDate && (finalAllWeeks.length <= 1 || finalWeeks.length === 0)) {
          const { generatedWeeks, allGeneratedWeeks } = generateWeeks(sDate, eDate, pList);
          if (allGeneratedWeeks.length > finalAllWeeks.length) {
            finalAllWeeks = allGeneratedWeeks;
            finalWeeks = generatedWeeks;
          }
        }

        setWeeks(finalWeeks);
        setAllWeeks(finalAllWeeks.length > 0 ? finalAllWeeks : finalWeeks);
        if (res.stats) {
          setStats({
            ...res.stats,
            waitingStudent2: res.stats.waitingStudent2 || 0,
            pending: res.stats.pending || 0,
            approved: res.stats.approved || 0,
            totalWeeks: finalAllWeeks.length || res.stats.totalWeeks || finalWeeks.length,
          });
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải nhật ký khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);


  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Determine if current student is SV2
  const isStudent2 =
    thesis?.secondStudentId &&
    (student?._id === thesis.secondStudentId._id ||
      student?._id === thesis.secondStudentId ||
      user?.studentCode === thesis.secondStudentId?.studentCode);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast('Kích thước file không được vượt quá 20MB', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExistingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Open Write / Edit Modal for a specific week
  const handleOpenWriteModal = (weekObj) => {
    setCurrentWeek(weekObj);
    setFormError('');

    if (weekObj.progress) {
      // Editing existing progress (DRAFT or NEEDS_REVISION)
      setEditingProgressId(weekObj.progress._id);
      setTitle(weekObj.progress.title || `Nhật ký ${weekObj.label}`);
      setDescription(weekObj.progress.description || '');
      setCompletionPercentage(weekObj.progress.completionPercentage || 0);
      setExistingFile(weekObj.progress.file || null);
      setSelectedFile(null);
    } else {
      // Writing new diary
      setEditingProgressId(null);
      setTitle(`Nhật ký ${weekObj.label}`);
      setDescription('');
      setCompletionPercentage(Math.min(100, Math.round((weekObj.weekNumber / (weeks.length || 1)) * 100)));
      setExistingFile(null);
      setSelectedFile(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setWriteModalOpen(true);
  };

  const handleOpenUploadModal = (weekObj) => {
    handleOpenWriteModal(weekObj);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 200);
  };

  // Submit / Save Diary
  const handleSaveDiary = async (statusToSet) => {
    setFormError('');

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề nhật ký');
      return;
    }

    if (!description.trim() && !selectedFile && !existingFile) {
      setFormError('Vui lòng nhập nội dung nhật ký hoặc đính kèm tệp tài liệu');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('thesisId', thesis?._id);
      formData.append('progressType', 'WEEKLY');
      formData.append('weekNumber', String(currentWeek?.weekNumber || 1));
      if (currentWeek?.startDate) formData.append('weekStartDate', currentWeek.startDate);
      if (currentWeek?.endDate) formData.append('weekEndDate', currentWeek.endDate);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('completionPercentage', String(completionPercentage));
      formData.append('status', statusToSet);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      let res;
      if (editingProgressId) {
        res = await thesisProgressApi.update(editingProgressId, formData);
      } else {
        res = await thesisProgressApi.create(formData);
      }

      if (res.success) {
        const has2Students = !!thesis?.secondStudentId;
        if (statusToSet === 'DRAFT') {
          showToast('Đã lưu bản nháp nhật ký!', 'success');
        } else if (has2Students) {
          showToast('Đã gửi nhật ký! Đang chờ thành viên nhóm xác nhận.', 'success');
        } else {
          showToast('Đã gửi nhật ký đến Giảng viên hướng dẫn!', 'success');
        }

        setWriteModalOpen(false);
        fetchProgress();
      }
    } catch (err) {
      setFormError(err.message || 'Không thể lưu nhật ký');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Confirm Modal for SV2

  const handleOpenConfirmModal = (progress) => {
    setProgressToConfirm(progress);
    setRejectReason('');
    setIsRejecting(false);
    setConfirmModalOpen(true);
  };

  // Handle SV2 Confirm / Reject
  const handleConfirmByStudent2 = async (action) => {
    if (action === 'REJECT' && !rejectReason.trim()) {
      showToast('Vui lòng nhập lý do yêu cầu SV1 chỉnh sửa', 'error');
      return;
    }

    setConfirming(true);
    try {
      const res = await thesisProgressApi.confirmStudent2(progressToConfirm._id, {
        action,
        reason: rejectReason.trim(),
      });

      if (res.success) {
        if (action === 'CONFIRM') {
          showToast('Đã xác nhận nhật ký! Nhật ký đã được chuyển tới GVHD.', 'success');
        } else {
          showToast('Đã gửi yêu cầu chỉnh sửa tới SV1.', 'info');
        }
        setConfirmModalOpen(false);
        fetchProgress();
      }
    } catch (err) {
      showToast(err.message || 'Thao tác xác nhận thất bại', 'error');
    } finally {
      setConfirming(false);
    }
  };

  // Printable Export Function
  const handlePrintDiary = () => {
    window.print();
  };

  // Dynamic sorting: When sortByPendingFirst is true, submitted weeks move to the bottom
  const displayedWeeks = useMemo(() => {
    if (!sortByPendingFirst) return weeks;
    return [...weeks].sort((a, b) => {
      const isDoneA =
        a.progress &&
        ['SUBMITTED', 'REVIEWING', 'APPROVED'].includes(a.progress.status);
      const isDoneB =
        b.progress &&
        ['SUBMITTED', 'REVIEWING', 'APPROVED'].includes(b.progress.status);

      // If A is submitted and B is NOT submitted -> A moves down
      if (isDoneA && !isDoneB) return 1;
      // If B is submitted and A is NOT submitted -> B moves down
      if (!isDoneA && isDoneB) return -1;

      // Same status: keep weekNumber order
      return a.weekNumber - b.weekNumber;
    });
  }, [weeks, sortByPendingFirst]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={5} cols={2} />
      </div>
    );
  }

  // Thesis time calculations (Explicit GVHD date has highest priority):
  const thesisStartDate =
    thesis?.startDate ||
    thesis?.approvedAt ||
    thesis?.acceptedAt ||
    thesis?.assignedAt ||
    thesis?.academicTermId?.thesis?.assignmentStart ||
    thesis?.academicTermId?.startDate ||
    thesis?.createdAt;

  const thesisEndDate =
    thesis?.endDate ||
    thesis?.academicTermId?.thesis?.defenseEnd ||
    thesis?.academicTermId?.thesis?.defenseStart ||
    thesis?.academicTermId?.endDate;

  const totalWeeksCount = allWeeks.length || stats.totalWeeks || weeks.length || 1;
  const latestReport = progressList && progressList.length > 0 ? progressList[progressList.length - 1] : null;
  const overallPercentage =
    stats.avgPercentage !== undefined && stats.avgPercentage !== null && stats.avgPercentage > 0
      ? stats.avgPercentage
      : latestReport?.completionPercentage !== undefined && latestReport?.completionPercentage !== null
      ? latestReport.completionPercentage
      : Math.round(((stats.approved || 0) / totalWeeksCount) * 100);

  return (
    <div className="space-y-6">
      {/* 1. Header Information Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0d2a75] to-[#153898] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-200 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Nhật Ký Khóa Luận Tốt Nghiệp
                </h2>
                {thesis && <StatusBadge status={thesis.status} size="md" />}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Theo dõi, viết nhật ký và nộp tệp báo cáo hàng tuần theo tiến độ thực hiện Khóa luận tốt nghiệp (KLTN).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchProgress}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {thesis && (
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Xuất nhật ký</span>
              </button>
            )}
          </div>
        </div>

        {/* Thesis Details Card */}
        {thesis && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Thesis Title */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/80 md:col-span-2">
                <div className="text-[10.5px] font-bold text-[#102d7d] uppercase tracking-wider mb-1">
                  Đề tài Khóa luận
                </div>
                <div className="font-bold text-slate-900 text-sm line-clamp-2">
                  {thesis.thesisTitle}
                </div>
                {thesis.topicCode && (
                  <div className="text-[11px] text-[#153898] font-mono mt-1">
                    Mã đề tài: {thesis.topicCode}
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Sinh viên thực hiện
                </div>
                <div className="text-slate-900 font-semibold truncate">
                  1. {thesis.studentId?.userId?.fullName || 'Sinh viên 1'}
                  <span className="text-slate-500 font-mono text-[11px] ml-1">
                    ({thesis.studentId?.studentCode})
                  </span>
                </div>
                {thesis.secondStudentId ? (
                  <div className="text-slate-900 font-semibold truncate">
                    2. {thesis.secondStudentId?.userId?.fullName || 'Sinh viên 2'}
                    <span className="text-slate-500 font-mono text-[11px] ml-1">
                      ({thesis.secondStudentId?.studentCode})
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-[11px]">Nhóm 1 sinh viên</div>
                )}
              </div>

              {/* Supervisor & Time */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  GVHD & Thời gian
                </div>
                <div className="text-slate-900 font-semibold truncate">
                  {thesis.supervisorId
                    ? `${thesis.supervisorId.academicTitle || 'ThS.'} ${thesis.supervisorId.userId?.fullName || ''}`
                    : 'Chưa phân công'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {formatDate(thesisStartDate)} - {formatDate(thesisEndDate)}
                </div>
              </div>

            </div>

            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-medium">Tổng số tuần KLTN</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                  {allWeeks.length || stats.totalWeeks || weeks.length} tuần
                </div>
                <div className="text-[10.5px] text-[#153898] font-semibold mt-0.5">
                  Đã mở: Tuần 1 → Tuần {weeks.length}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <div className="text-[11px] text-emerald-700 font-medium">Đã hoàn thành / Duyệt</div>
                <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                  {stats.approved || 0} / {allWeeks.length || stats.totalWeeks || weeks.length}
                </div>
                <div className="text-[10.5px] text-emerald-600 font-medium mt-0.5">
                  tuần được duyệt
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <div className="text-[11px] text-amber-700 font-medium">
                  {isStudent2 ? 'Cần SV2 xác nhận' : 'Đang chờ xác nhận / chấm'}
                </div>
                <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">
                  {(stats.waitingStudent2 || 0) + (stats.pending || 0)}
                </div>
                <div className="text-[10.5px] text-amber-600 font-medium mt-0.5">
                  bản ghi
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80">
                <div className="text-[11px] text-[#102d7d] font-medium">Tiến độ tổng thể</div>
                <div className="text-lg font-bold text-[#102d7d] font-mono mt-0.5">
                  {overallPercentage}%
                </div>
                <div className="text-[10.5px] text-[#153898] font-medium mt-0.5">
                  {stats.approved > 0 ? `Đã duyệt ${stats.approved}/${totalWeeksCount} tuần` : 'ước tính theo báo cáo'}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* No Thesis Notice */}
      {!thesis ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
          <EmptyState
            title="Bạn chưa có đề tài Khóa luận tốt nghiệp"
            description="Hãy đăng ký đề tài KLTN và chờ Trưởng Bộ Môn phê duyệt để hệ thống tự động thiết lập nhật ký các tuần."
          />
          <div className="text-center mt-4">
            <Link
              to="/student/thesis/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#153898] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-200 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Đăng ký đề tài Khóa luận</span>
            </Link>
          </div>
        </div>
      ) : (
        /* 2. List of Generated Weeks */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#153898]" />
                <span>
                  Danh sách nhật ký theo tiến độ (Đã mở: {weeks.length} / {allWeeks.length || stats.totalWeeks || weeks.length} tuần)
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mỗi tuần sẽ tự động mở khóa khi đến hạn theo thời gian thực hiện KLTN.
              </p>
            </div>

            {/* Sorting Toggle */}
            <button
              type="button"
              onClick={() => setSortByPendingFirst(!sortByPendingFirst)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                sortByPendingFirst
                  ? 'bg-blue-50 border-blue-200 text-[#102d7d]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {sortByPendingFirst
                  ? 'Ưu tiên tuần cần làm lên đầu (Tuần đã submit ở cuối)'
                  : 'Sắp xếp theo thứ tự tuần (1 → N)'}
              </span>
            </button>
          </div>

          <div className="space-y-3.5">
            {displayedWeeks.map((week) => {
              const p = week.progress;
              const hasProgress = !!p;
              const isWaitingStudent2 = p?.status === 'WAITING_STUDENT_2';
              const isNeedsRevision = p?.status === 'NEEDS_REVISION';
              const isDraft = p?.status === 'DRAFT';
              const isApproved = p?.status === 'APPROVED';
              const isRejected = p?.status === 'REJECTED';
              const isSubmitted = p?.status === 'SUBMITTED' || p?.status === 'REVIEWING';
              const hasFile = p?.file && (p.file.fileUrl || p.file.fileName);

              // Check if current user is the author of this progress report
              const pAuthorStudentId = p?.studentId?._id || p?.studentId;
              const isAuthor =
                !!p?.studentId &&
                (String(student?._id || '') === String(pAuthorStudentId || '') ||
                  String(user?._id || '') === String(p?.studentId?.userId?._id || p?.studentId?.userId || '') ||
                  (user?.studentCode && user?.studentCode === p?.studentId?.studentCode));

              // Check if current user is the partner (the OTHER student in a 2-student group)
              const isPartner =
                !!thesis?.secondStudentId &&
                !isAuthor &&
                (String(student?._id || '') === String(thesis.studentId?._id || thesis.studentId || '') ||
                  String(student?._id || '') === String(thesis.secondStudentId?._id || thesis.secondStudentId || '') ||
                  (user?.studentCode &&
                    (user.studentCode === thesis.studentId?.studentCode ||
                      user.studentCode === thesis.secondStudentId?.studentCode)));

              return (
                <div
                  key={week.weekNumber}
                  className={`p-5 rounded-3xl bg-white border transition-all shadow-2xs ${
                    isWaitingStudent2
                      ? 'border-amber-300 ring-2 ring-amber-100'
                      : isNeedsRevision
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : isApproved
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : hasProgress
                      ? 'border-slate-200/90 hover:border-blue-200'
                      : 'border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  {/* Card Header: Week Title & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                          hasProgress
                            ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {week.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 font-mono">
                        {formatDate(week.startDate)} - {formatDate(week.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasProgress ? (
                        <>
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            Tiến độ: {p.completionPercentage}%
                          </span>
                          <StatusBadge status={p.status} size="sm" />
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Chưa nộp
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="py-2.5 space-y-2.5">
                    {hasProgress ? (
                      <>
                        <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
                        {p.description ? (
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                            {p.description}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            (Không có nội dung mô tả, xem tệp đính kèm)
                          </p>
                        )}

                        {/* File Attachment */}
                        {hasFile && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#102d7d] bg-blue-50/60 px-3.5 py-2 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="w-4 h-4 shrink-0 text-[#153898]" />
                              <span className="truncate font-semibold">
                                {p.file.originalName || p.file.fileName}
                              </span>
                              {p.file.size && (
                                <span className="text-[11px] text-[#153898] font-mono">
                                  ({formatFileSize(p.file.size)})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={getFileUrl(p.file.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#153898] hover:text-white border border-blue-200 rounded-lg text-xs font-semibold text-[#102d7d] transition"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Xem file</span>
                              </a>
                              <a
                                href={getFileUrl(p.file.fileUrl)}
                                download={p.file.originalName || p.file.fileName}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#153898] hover:bg-[#102d7d] text-white rounded-lg text-xs font-semibold transition"
                              >
                                <Download className="w-3 h-3" />
                                <span>Tải về</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* SV2 Rejection Notice Alert */}
                        {isNeedsRevision && p.student2RejectedReason && (
                          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-700">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Lý do SV2 yêu cầu chỉnh sửa:</span>
                            </div>
                            <p className="leading-relaxed pl-5 font-medium">
                              "{p.student2RejectedReason}"
                            </p>
                          </div>
                        )}

                        {/* SV2 Confirmation Info */}
                        {p.student2Status === 'CONFIRMED' && (
                          <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50/50 px-2.5 py-1 rounded-xl border border-emerald-100 w-fit">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Thành viên nhóm (SV2) đã xác nhận lúc {formatDate(p.student2ConfirmedAt)}
                            </span>
                          </div>
                        )}

                        {/* Lecturer Comment & Score */}
                        {(p.lecturerComment || p.lecturerScore !== null) && (
                          <div
                            className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                              isApproved
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : isRejected
                                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider">
                              <span>Đánh giá từ GVHD ({formatDate(p.reviewedAt)})</span>
                              {p.lecturerScore !== null && (
                                <span className="font-mono text-xs text-emerald-700 font-extrabold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                                  Điểm: {p.lecturerScore}/10
                                </span>
                              )}
                            </div>
                            {p.lecturerComment && (
                              <p className="leading-relaxed mt-1 text-[11px]">
                                Nhận xét: {p.lecturerComment}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-2 text-xs text-slate-400 italic">
                        Chưa có nhật ký cho tuần này. Nhấn "Viết nhật ký" để cập nhật nội dung công việc thực hiện.
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                    <div>
                      {hasProgress && (
                        <span>
                          Người thực hiện:{' '}
                          <strong>{p.studentId?.userId?.fullName || student?.userId?.fullName}</strong> •{' '}
                          {formatDate(p.submittedAt || p.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Action 1: Write diary / Upload report file (when no progress yet) */}
                      {!hasProgress && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenUploadModal(week)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#102d7d] font-bold rounded-xl border border-blue-200 transition"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-[#153898]" />
                            <span>Tải lên tệp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWriteModal(week)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-xs transition"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Viết nhật ký</span>
                          </button>
                        </div>
                      )}

                      {/* Action 2: Edit diary (for author when DRAFT or NEEDS_REVISION) */}
                      {hasProgress && (isDraft || isNeedsRevision) && isAuthor && (
                        <button
                          type="button"
                          onClick={() => handleOpenWriteModal(week)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa & Gửi lại</span>
                        </button>
                      )}

                      {/* Action 3: Partner Check & Confirm (when status is WAITING_STUDENT_2 and user is the Partner, NOT the Author) */}
                      {hasProgress && isWaitingStudent2 && isPartner && (
                        <button
                          type="button"
                          onClick={() => handleOpenConfirmModal(p)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition animate-pulse"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Kiểm tra & Xác nhận</span>
                        </button>
                      )}

                      {/* Notice for author when waiting for partner */}
                      {hasProgress && isWaitingStudent2 && isAuthor && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 font-semibold rounded-xl border border-amber-200 text-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Đang chờ thành viên nhóm xác nhận</span>
                        </div>
                      )}

                      {/* Action 4: View Details Modal */}
                      {hasProgress && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgress(p);
                            setDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Detail Modal */}
      {detailModalOpen && selectedProgress && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Chi Tiết Nhật Ký Khóa Luận"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-[#153898] text-white font-bold text-xs">
                    Tuần {selectedProgress.weekNumber}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedProgress.title}
                  </h3>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Đề tài: <strong>{thesis?.thesisTitle}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={selectedProgress.status} size="md" />
                <span className="font-mono font-bold text-[#102d7d] bg-white px-2.5 py-1 rounded-xl border border-blue-200">
                  {selectedProgress.completionPercentage}%
                </span>
              </div>
            </div>

            {/* Student & Time info */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Người thực hiện</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5">
                  {selectedProgress.studentId?.userId?.fullName || student?.userId?.fullName}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  MSSV: {selectedProgress.studentId?.studentCode || student?.studentCode}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Thời gian nộp & duyệt</div>
                <div className="text-slate-700 text-xs mt-0.5">
                  Ngày nộp: {formatDate(selectedProgress.submittedAt || selectedProgress.createdAt)}
                </div>
                {selectedProgress.student2ConfirmedAt && (
                  <div className="text-emerald-600 text-[11px]">
                    SV2 xác nhận: {formatDate(selectedProgress.student2ConfirmedAt)}
                  </div>
                )}
                {selectedProgress.reviewedAt && (
                  <div className="text-slate-500 text-[11px]">
                    GVHD duyệt: {formatDate(selectedProgress.reviewedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Nội dung công việc thực hiện
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed whitespace-pre-wrap text-xs">
                {selectedProgress.description || 'Không có mô tả chi tiết'}
              </div>
            </div>

            {/* File Attachment */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Tệp tài liệu đính kèm
              </div>
              {selectedProgress.file && (selectedProgress.file.fileUrl || selectedProgress.file.fileName) ? (
                <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#153898] text-white flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {selectedProgress.file.originalName || selectedProgress.file.fileName}
                      </div>
                      <div className="text-slate-500 text-[10px] font-mono">
                        {selectedProgress.file.mimeType || 'Document'} • {formatFileSize(selectedProgress.file.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getFileUrl(selectedProgress.file.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#153898] hover:text-white border border-blue-200 text-[#102d7d] rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem file</span>
                    </a>
                    <a
                      href={getFileUrl(selectedProgress.file.fileUrl)}
                      download={selectedProgress.file.originalName || selectedProgress.file.fileName}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#153898] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 italic">
                  Không có tài liệu đính kèm cho tuần này
                </div>
              )}
            </div>

            {/* Lecturer Review details */}
            {(selectedProgress.lecturerComment || selectedProgress.lecturerScore !== null) && (
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Đánh giá từ Giảng viên hướng dẫn
                </div>
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    selectedProgress.status === 'APPROVED'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : selectedProgress.status === 'REJECTED'
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-800">
                      GVHD: {thesis?.supervisorId?.academicTitle} {thesis?.supervisorId?.userId?.fullName}
                    </span>
                    {selectedProgress.lecturerScore !== null && (
                      <span className="font-mono text-sm text-emerald-700 font-extrabold bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                        Điểm: {selectedProgress.lecturerScore} / 10
                      </span>
                    )}
                  </div>
                  {selectedProgress.lecturerComment && (
                    <div className="text-slate-800 leading-relaxed text-xs">
                      <strong>Nhận xét:</strong> {selectedProgress.lecturerComment}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Write / Edit Diary Modal */}
      <Modal
        isOpen={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
        title={
          editingProgressId
            ? `Chỉnh Sửa ${currentWeek?.label || 'Nhật Ký'}`
            : `Viết ${currentWeek?.label || 'Nhật Ký'}`
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Week Info header */}
          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-[#0B1E48] text-sm">
                {currentWeek?.label}
              </span>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Thời gian: {formatDate(currentWeek?.startDate)} - {formatDate(currentWeek?.endDate)}
              </div>
            </div>
            {thesis?.secondStudentId && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-[#102d7d] rounded-md">
                Nhóm 2 sinh viên (Cần SV2 xác nhận)
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề nhật ký <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Nhật ký Tuần 1 - Tìm hiểu tài liệu và xây dựng SRS"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] transition"
            />
          </div>

          {/* Completion Percentage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Tỷ lệ hoàn thành khối lượng KLTN ước tính
              </label>
              <span className="font-mono font-bold text-[#102d7d] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {completionPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={completionPercentage}
              onChange={(e) => setCompletionPercentage(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung nhật ký công việc <span className="text-slate-400 font-normal">(Trực tiếp hoặc tải file bên dưới)</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả các nội dung đã nghiên cứu, các module đã lập trình, kết quả đạt được trong tuần..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] transition resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tệp tài liệu / Báo cáo đính kèm (PDF, DOCX, ZIP tối đa 20MB)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
              className="hidden"
            />

            {!selectedFile && !existingFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-[#153898]/60 hover:bg-blue-50/50 rounded-2xl text-center text-slate-500 transition flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-[#153898]" />
                <span className="font-semibold text-xs text-slate-700">
                  Nhấn để chọn tệp tài liệu nhật ký
                </span>
                <span className="text-[11px] text-slate-400">
                  Hỗ trợ file .pdf, .docx, .doc, .zip, .rar
                </span>
              </button>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#153898] text-white flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {selectedFile ? selectedFile.name : existingFile?.originalName || existingFile?.fileName}
                    </div>
                    <div className="text-[11px] text-[#153898] font-mono">
                      {selectedFile ? formatFileSize(selectedFile.size) : formatFileSize(existingFile?.size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    Chọn file khác
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                    title="Xóa file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setWriteModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={() => handleSaveDiary('DRAFT')}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
            >
              Lưu bản nháp
            </button>

            <button
              type="button"
              onClick={() => handleSaveDiary(thesis?.secondStudentId ? 'WAITING_STUDENT_2' : 'SUBMITTED')}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-md shadow-blue-200 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang gửi...' : 'Gửi nhật ký ngay'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. SV2 Confirmation Modal */}
      {confirmModalOpen && progressToConfirm && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Kiểm Tra & Xác Nhận Nhật Ký Khóa Luận"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="font-bold text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Quy trình xác nhận nhóm 2 sinh viên</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Thành viên nhóm đã gửi nhật ký Tuần {progressToConfirm.weekNumber}. Bạn vui lòng kiểm tra nội dung và file đính kèm. Sau khi bạn <strong>Xác nhận</strong>, nhật ký sẽ được chuyển đến Giảng viên hướng dẫn.
              </p>
            </div>

            {/* Diary Content Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {progressToConfirm.title}
                </span>
                <span className="font-mono font-bold text-[#102d7d] bg-white px-2 py-0.5 rounded border border-blue-100">
                  {progressToConfirm.completionPercentage}%
                </span>
              </div>

              <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs pt-1">
                {progressToConfirm.description || '(Không có nội dung mô tả)'}
              </div>

              {progressToConfirm.file && (progressToConfirm.file.fileUrl || progressToConfirm.file.fileName) && (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-blue-100 mt-2">
                  <div className="flex items-center gap-2 text-[#102d7d] font-semibold truncate">
                    <Paperclip className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {progressToConfirm.file.originalName || progressToConfirm.file.fileName}
                    </span>
                  </div>
                  <a
                    href={getFileUrl(progressToConfirm.file.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#153898] hover:text-[#0d2a75] font-bold shrink-0 ml-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Xem file</span>
                  </a>
                </div>
              )}
            </div>

            {/* Reject Reason Form if Rejecting */}
            {isRejecting && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-rose-700">
                  Lý do yêu cầu chỉnh sửa <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập cụ thể các nội dung cần sửa đổi, bổ sung..."
                  className="w-full px-3.5 py-2 bg-rose-50/50 border border-rose-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={confirming}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {!isRejecting ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      disabled={confirming}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition"
                    >
                      Yêu cầu chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmByStudent2('CONFIRM')}
                      disabled={confirming}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>{confirming ? 'Đang xác nhận...' : 'Xác nhận nhật ký'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmByStudent2('REJECT')}
                      disabled={confirming}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-200 transition"
                    >
                      <X className="w-4 h-4" />
                      <span>{confirming ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Export Diary Modal (Printable Academic Layout) */}

      {exportModalOpen && (
        <Modal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          title="Toàn Bộ Nhật Ký Khóa Luận Tốt Nghiệp"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 text-slate-900 font-serif p-4" id="printable-thesis-diary">
            {/* Academic Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div className="text-center font-bold text-xs uppercase tracking-wider space-y-0.5">
                <div>BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
                <div className="font-extrabold text-slate-900">
                  TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH
                </div>
                <div className="text-[11px] font-normal italic">KHOA CÔNG NGHỆ THÔNG TIN</div>
              </div>

              <div className="text-center font-bold text-xs uppercase tracking-wider space-y-0.5">
                <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="text-[11px] font-normal">Độc lập - Tự do - Hạnh phúc</div>
                <div className="border-b border-slate-400 w-24 mx-auto pt-1"></div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 font-sans">
                NHẬT KÝ THEO DÕI KHÓA LUẬN TỐT NGHIỆP
              </h2>
              <div className="text-xs text-slate-600 italic">
                (Dành cho sinh viên thực hiện và Giảng viên hướng dẫn theo dõi tiến độ)
              </div>
            </div>

            {/* Thesis & Students Info Box */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/60 font-sans text-xs space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-600">Tên đề tài: </span>
                  <strong className="text-slate-900">{thesis?.thesisTitle}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Mã đề tài: </span>
                  <span className="font-mono font-bold text-slate-800">
                    {thesis?.topicCode || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Giảng viên hướng dẫn: </span>
                  <strong className="text-slate-900">
                    {thesis?.supervisorId?.academicTitle} {thesis?.supervisorId?.userId?.fullName}
                  </strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Thời gian thực hiện: </span>
                  <span className="font-mono">
                    {formatDate(thesisStartDate)} - {formatDate(thesisEndDate)} ({weeks.length} tuần)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-600">Sinh viên 1: </span>
                  <strong>{thesis?.studentId?.userId?.fullName}</strong>{' '}
                  <span className="font-mono text-slate-600">
                    (MSSV: {thesis?.studentId?.studentCode} - Lớp: {thesis?.studentId?.className})
                  </span>
                </div>
                {thesis?.secondStudentId && (
                  <div>
                    <span className="font-semibold text-slate-600">Sinh viên 2: </span>
                    <strong>{thesis.secondStudentId.userId?.fullName}</strong>{' '}
                    <span className="font-mono text-slate-600">
                      (MSSV: {thesis.secondStudentId.studentCode} - Lớp: {thesis.secondStudentId.className})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Full Weeks Diary Table */}
            <div className="space-y-4 font-sans text-xs">
              <div className="font-bold text-sm uppercase text-slate-800 border-b border-slate-200 pb-1">
                Nội dung nhật ký từng tuần
              </div>

              <div className="space-y-3">
                {(allWeeks.length > 0 ? allWeeks : weeks).map((w) => {
                  const p = w.progress;
                  const hasP = !!p;

                  return (
                    <div
                      key={w.weekNumber}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold">
                        <span className="text-[#0B1E48]">
                          {w.label} ({formatDate(w.startDate)} - {formatDate(w.endDate)})
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {hasP ? `Trạng thái: ${p.status}` : 'Chưa có nhật ký'}
                        </span>
                      </div>

                      {hasP ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            Tiêu đề: {p.title} (Tiến độ: {p.completionPercentage}%)
                          </div>
                          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[11.5px]">
                            {p.description || '(Nội dung trong tệp đính kèm)'}
                          </div>
                          {p.file && (
                            <div className="text-[11px] text-[#153898] font-mono">
                              File: {p.file.originalName || p.file.fileName}
                            </div>
                          )}
                          {(p.lecturerComment || p.lecturerScore !== null) && (
                            <div className="mt-1 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-800 border border-slate-200">
                              <strong>GVHD nhận xét:</strong> {p.lecturerComment || '—'}{' '}
                              {p.lecturerScore !== null && <span>(Điểm: {p.lecturerScore}/10)</span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11.5px]">
                          Chưa có nhật ký
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature Box */}
            <div className="pt-6 grid grid-cols-2 text-center font-sans text-xs">
              <div className="space-y-16">
                <div className="font-bold uppercase">Sinh viên thực hiện</div>
                <div className="font-semibold text-slate-800">
                  {thesis?.studentId?.userId?.fullName}
                  {thesis?.secondStudentId && ` & ${thesis.secondStudentId.userId?.fullName}`}
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="italic text-slate-500 text-[11px]">
                    TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </div>
                  <div className="font-bold uppercase mt-1">Giảng viên hướng dẫn</div>
                </div>
                <div className="font-semibold text-slate-800">
                  {thesis?.supervisorId?.academicTitle} {thesis?.supervisorId?.userId?.fullName}
                </div>
              </div>
            </div>

            {/* Modal Print Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 font-sans">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handlePrintDiary}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-md transition text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>In / Lưu PDF</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentThesisProgressPage;
