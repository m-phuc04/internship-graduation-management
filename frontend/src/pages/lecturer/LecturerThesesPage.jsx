import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import thesisProgressApi from '../../api/thesisProgressApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import GradeThesisModal from '../../components/thesis/GradeThesisModal';
import UserNameClickable from '../../components/common/UserNameClickable';

import {
  Award,
  BookOpen,
  Users,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Eye,
  Shield,
  Layers,
  Lock,
  Unlock,
  Calendar,
  Paperclip,
  ExternalLink,
  Download,
  Check,
  FileText,
  Save,
  FileCheck,
  MessageSquare,
  X,
  XCircle,
  CheckCheck,
} from 'lucide-react';

const LecturerThesesPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();
  const location = useLocation();
  const navigate = useNavigate();

  // Read initial tab from search query
  const getInitialTab = () => {
    if (location.search.includes('tab=topics')) return 'MY_TOPICS';
    if (location.search.includes('tab=reviewer2')) return 'REVIEWER_2';
    if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1')) return 'REVIEWER_1';
    return 'SUPERVISOR';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab); // 'MY_TOPICS', 'SUPERVISOR', 'REVIEWER_1', 'REVIEWER_2'
  const [search, setSearch] = useState('');

  const isTbmOrAdmin = user?.role === 'TBM' || user?.role === 'ADMIN' || user?.role === 'LECTURER';

  // Proposed Topics (KLTN Topic Management)
  const [proposedTopics, setProposedTopics] = useState([]);
  const [loadingProposedTopics, setLoadingProposedTopics] = useState(false);
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [batchTitleInput, setBatchTitleInput] = useState('');
  const [batchMaxGroups, setBatchMaxGroups] = useState(1);
  const [batchDescription, setBatchDescription] = useState('');
  const [createTopicLoading, setCreateTopicLoading] = useState(false);
  const [selectedTopicDetail, setSelectedTopicDetail] = useState(null);

  // Reject Topic Modal State (for TBM / Lecturer)
  const [rejectTopicModalOpen, setRejectTopicModalOpen] = useState(false);
  const [targetTopicForReject, setTargetTopicForReject] = useState(null);
  const [topicRejectReason, setTopicRejectReason] = useState('');

  // Thesis Progress Diary Modal state
  const [diaryModalOpen, setDiaryModalOpen] = useState(false);
  const [diaryThesis, setDiaryThesis] = useState(null);
  const [diaryReports, setDiaryReports] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryEdits, setDiaryEdits] = useState({});
  const [savingDiaryId, setSavingDiaryId] = useState(null);
  const [savingAllDiary, setSavingAllDiary] = useState(false);

  useEffect(() => {
    if (location.search.includes('tab=topics') || location.state?.tab === 'topics') {
      setActiveTab('MY_TOPICS');
    } else if (location.search.includes('tab=reviewer2')) {
      setActiveTab('REVIEWER_2');
    } else if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1')) {
      setActiveTab('REVIEWER_1');
    } else if (location.search.includes('tab=supervisor') || !location.search) {
      setActiveTab('SUPERVISOR');
    }
  }, [location.search, location.state]);

  const [data, setData] = useState({
    supervisedTheses: [],
    reviewer1Theses: [],
    reviewer2Theses: [],
    allTheses: [],
    stats: {
      supervisedCount: 0,
      reviewer1Count: 0,
      reviewer2Count: 0,
      totalAssigned: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  // Grade Modal
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);

  // Accept & Reject Modals
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [targetThesis, setTargetThesis] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [inlineScores, setInlineScores] = useState({});
  const [savingThesisId, setSavingThesisId] = useState(null);
  const [lockingRowId, setLockingRowId] = useState(null);
  const [lockingAll, setLockingAll] = useState(false);
  const [gradingPeriods, setGradingPeriods] = useState([]);

  const fetchAssignedTheses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [thesesRes, periodsRes] = await Promise.all([
        thesisApi.getAssignedThesesForLecturer({
          roleType: 'ALL',
          search,
          academicTermId: currentTerm?._id || '',
        }),
        thesisApi.getGradingPeriods({
          academicTermId: currentTerm?._id || '',
        }).catch(() => ({ success: false, data: [] })),
      ]);

      if (thesesRes.success) {
        setData(thesesRes.data);
      }
      if (periodsRes.success) {
        setGradingPeriods(periodsRes.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đề tài khóa luận', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, currentTerm?._id, showToast]);

  // Check if grading period is currently active
  const isGradingPeriodOpen = useCallback(() => {
    if (!gradingPeriods || gradingPeriods.length === 0) return true;
    const now = new Date();
    return gradingPeriods.some((p) => {
      const s = new Date(p.startDate);
      const e = new Date(p.endDate);
      return now >= s && now <= e;
    });
  }, [gradingPeriods]);

  const fetchProposedTopics = useCallback(async () => {
    setLoadingProposedTopics(true);
    try {
      let res = await thesisApi.getTopicsForTbm({
        academicTermId: currentTerm?._id || '',
      }).catch(() => null);

      if (!res || !res.success) {
        res = await thesisApi.getMyCreatedTopics({
          academicTermId: currentTerm?._id || '',
        });
      }

      if (res && res.success) {
        setProposedTopics(res.data || []);
      }
    } catch (err) {
      console.warn('Cannot load proposed topics:', err.message);
    } finally {
      setLoadingProposedTopics(false);
    }
  }, [currentTerm?._id]);

  useEffect(() => {
    fetchAssignedTheses();
    fetchProposedTopics();
  }, [fetchAssignedTheses, fetchProposedTopics, location.key, location.state?.refreshedAt]);

  const handleBatchCreateTopics = async (e) => {
    if (e) e.preventDefault();
    if (!batchTitleInput.trim()) {
      showToast('Vui lòng nhập ít nhất một tên đề tài', 'error');
      return;
    }

    setCreateTopicLoading(true);
    try {
      const res = await thesisApi.batchCreateTopics({
        topicListRaw: batchTitleInput.trim(),
        defaultMaxGroups: Number(batchMaxGroups) || 1,
        defaultDescription: batchDescription.trim() || '',
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        showToast(res.message || 'Thêm danh sách đề tài KLTN thành công!', 'success');
        setCreateTopicModalOpen(false);
        setBatchTitleInput('');
        setBatchMaxGroups(1);
        setBatchDescription('');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Thêm đề tài thất bại', 'error');
    } finally {
      setCreateTopicLoading(false);
    }
  };

  const handleApproveTopic = async (topic) => {
    setActionLoading(true);
    try {
      const res = await thesisApi.approveTopic(topic._id);
      if (res.success) {
        showToast(`Đã phê duyệt đề tài "${topic.title}" thành công!`, 'success');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Không thể phê duyệt đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAllPending = async () => {
    const pendingList = proposedTopics.filter((t) => t.status === 'PENDING');
    if (pendingList.length === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(pendingList.map((t) => thesisApi.approveTopic(t._id)));
      showToast(`Đã phê duyệt tất cả ${pendingList.length} đề tài đang chờ!`, 'success');
      fetchProposedTopics();
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra khi phê duyệt đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRejectTopic = async (e) => {
    if (e) e.preventDefault();
    if (!targetTopicForReject) return;
    if (!topicRejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối đề tài', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await thesisApi.rejectTopic(targetTopicForReject._id, {
        reason: topicRejectReason.trim(),
      });
      if (res.success) {
        showToast(`Đã từ chối đề tài "${targetTopicForReject.title}"`, 'info');
        setRejectTopicModalOpen(false);
        setTargetTopicForReject(null);
        setTopicRejectReason('');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Từ chối đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== DIARY MODAL HANDLERS ====================
  const handleOpenDiaryModal = async (thesis) => {
    setDiaryThesis(thesis);
    setDiaryModalOpen(true);
    setDiaryLoading(true);
    setDiaryReports([]);
    setDiaryEdits({});

    try {
      const res = await thesisProgressApi.getByThesisId(thesis._id);
      if (res.success && res.data) {
        const reports = Array.isArray(res.data) ? res.data : [res.data];
        setDiaryReports(reports);

        // Pre-fill edits map
        const initialEdits = {};
        reports.forEach((r) => {
          initialEdits[r._id] = {
            lecturerScore: r.lecturerScore !== null && r.lecturerScore !== undefined ? String(r.lecturerScore) : '',
            status: r.status && r.status !== 'DRAFT' && r.status !== 'WAITING_STUDENT_2' ? r.status : 'APPROVED',
            lecturerComment: r.lecturerComment || '',
          };
        });
        setDiaryEdits(initialEdits);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải nhật ký tiến độ của sinh viên', 'error');
    } finally {
      setDiaryLoading(false);
    }
  };

  const handleDiaryEditChange = (reportId, field, value) => {
    setDiaryEdits((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveDiaryRow = async (reportId) => {
    const edit = diaryEdits[reportId];
    if (!edit) return;

    const scoreNum = edit.lecturerScore !== '' && edit.lecturerScore !== null && edit.lecturerScore !== undefined
      ? Number(edit.lecturerScore)
      : null;

    if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
      showToast('Điểm đánh giá phải từ 0 đến 10', 'warning');
      return;
    }

    setSavingDiaryId(reportId);
    try {
      const res = await thesisProgressApi.reviewProgress(reportId, {
        lecturerScore: scoreNum !== null ? scoreNum : undefined,
        lecturerComment: edit.lecturerComment || '',
        status: edit.status || 'APPROVED',
      });

      if (res.success) {
        showToast('Đã lưu đánh giá và điểm nhật ký thành công!', 'success');
        // Update local state
        setDiaryReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, ...res.data } : r))
        );
      }
    } catch (err) {
      showToast(err.message || 'Lưu đánh giá thất bại', 'error');
    } finally {
      setSavingDiaryId(null);
    }
  };

  const handleSaveAllDiaryRows = async () => {
    if (diaryReports.length === 0) return;

    // Validate all scores first
    for (const report of diaryReports) {
      const edit = diaryEdits[report._id];
      if (edit && edit.lecturerScore !== '' && edit.lecturerScore !== null && edit.lecturerScore !== undefined) {
        const num = Number(edit.lecturerScore);
        if (isNaN(num) || num < 0 || num > 10) {
          showToast(`Điểm tuần ${report.weekNumber || ''} không hợp lệ (0-10)`, 'warning');
          return;
        }
      }
    }

    setSavingAllDiary(true);
    try {
      const promises = diaryReports.map((report) => {
        const edit = diaryEdits[report._id] || {};
        const scoreNum = edit.lecturerScore !== '' && edit.lecturerScore !== null && edit.lecturerScore !== undefined
          ? Number(edit.lecturerScore)
          : undefined;

        return thesisProgressApi.reviewProgress(report._id, {
          lecturerScore: scoreNum,
          lecturerComment: edit.lecturerComment || '',
          status: edit.status || 'APPROVED',
        });
      });

      await Promise.all(promises);
      showToast('Đã lưu tất cả đánh giá nhật ký khóa luận!', 'success');

      // Refresh reports
      const res = await thesisProgressApi.getByThesisId(diaryThesis._id);
      if (res.success && res.data) {
        const reports = Array.isArray(res.data) ? res.data : [res.data];
        setDiaryReports(reports);
      }
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra khi lưu đánh giá', 'error');
    } finally {
      setSavingAllDiary(false);
    }
  };

  // Current list based on active tab with resilient fallback
  const supervisedTheses = data?.supervisedTheses || (data?.theses || []).filter((t) => t.isSupervisor) || [];
  const reviewer1Theses = data?.reviewer1Theses || (data?.theses || []).filter((t) => t.isReviewer1) || [];
  const reviewer2Theses = data?.reviewer2Theses || (data?.theses || []).filter((t) => t.isReviewer2) || [];

  const stats = {
    supervisedCount: data?.stats?.supervisedCount ?? supervisedTheses.length,
    reviewer1Count: data?.stats?.reviewer1Count ?? reviewer1Theses.length,
    reviewer2Count: data?.stats?.reviewer2Count ?? reviewer2Theses.length,
    totalAssigned: data?.stats?.totalAssigned ?? (data?.theses?.length || 0),
  };

  let currentList = [];
  if (activeTab === 'SUPERVISOR') {
    currentList = supervisedTheses;
  } else if (activeTab === 'REVIEWER_1') {
    currentList = reviewer1Theses;
  } else if (activeTab === 'REVIEWER_2') {
    currentList = reviewer2Theses;
  }

  const handleOpenGrade = (thesis) => {
    navigate(`/lecturer/theses/${thesis._id}/evaluate`);
  };

  const handleOpenAccept = (thesis) => {
    setTargetThesis(thesis);
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!targetThesis) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.supervisorAccept(targetThesis._id);
      if (res.success) {
        showToast('Đã chấp nhận hướng dẫn đề tài khóa luận thành công!', 'success');
        setAcceptModalOpen(false);
        setTargetThesis(null);
        fetchAssignedTheses();
      }
    } catch (err) {
      showToast(err.message || 'Không thể chấp nhận hướng dẫn đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (thesis) => {
    setTargetThesis(thesis);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason || !rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối hướng dẫn', 'warning');
      return;
    }
    if (!targetThesis) return;

    setActionLoading(true);
    try {
      const res = await thesisApi.supervisorReject(targetThesis._id, {
        reason: rejectReason.trim(),
      });
      if (res.success) {
        showToast('Đã từ chối hướng dẫn đề tài', 'info');
        setRejectModalOpen(false);
        setTargetThesis(null);
        setRejectReason('');
        fetchAssignedTheses();
      }
    } catch (err) {
      showToast(err.message || 'Không thể từ chối đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const [editingTimeline, setEditingTimeline] = useState(false);
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [savingDetailTimeline, setSavingDetailTimeline] = useState(false);

  const handleOpenDetail = (thesis) => {
    setTargetThesis(thesis);
    setDetailStartDate(thesis.startDate ? new Date(thesis.startDate).toISOString().split('T')[0] : '');
    setDetailEndDate(thesis.endDate ? new Date(thesis.endDate).toISOString().split('T')[0] : '');
    setEditingTimeline(false);
    setDetailModalOpen(true);
  };

  const handleSaveDetailTimeline = async () => {
    if (!targetThesis?._id || !detailStartDate || !detailEndDate) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc', 'warning');
      return;
    }
    if (new Date(detailStartDate) >= new Date(detailEndDate)) {
      showToast('Ngày kết thúc phải diễn ra sau ngày bắt đầu', 'error');
      return;
    }

    setSavingDetailTimeline(true);
    try {
      const res = await thesisProgressApi.updateTimeline(targetThesis._id, {
        startDate: detailStartDate,
        endDate: detailEndDate,
      });

      if (res.success) {
        showToast('Cập nhật thời gian thực hiện KLTN thành công!', 'success');
        setEditingTimeline(false);
        setTargetThesis((prev) => ({
          ...prev,
          startDate: detailStartDate,
          endDate: detailEndDate,
        }));
        fetchAssignedTheses(true);
      }
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật thời gian', 'error');
    } finally {
      setSavingDetailTimeline(false);
    }
  };

  // Sync inlineScores from backend data
  useEffect(() => {
    const initial = {};
    const all = [
      ...(data?.supervisedTheses || []),
      ...(data?.reviewer1Theses || []),
      ...(data?.reviewer2Theses || []),
      ...(data?.theses || []),
    ];
    all.forEach((item) => {
      let s1 = '';
      let s2 = '';
      const isTwo = item.studentCount === 2 && item.secondStudentId;
      if (activeTab === 'SUPERVISOR') {
        s1 = item.scores?.student1SupervisorScore !== null && item.scores?.student1SupervisorScore !== undefined
          ? item.scores.student1SupervisorScore
          : !isTwo && item.scores?.supervisorScore !== null && item.scores?.supervisorScore !== undefined
            ? item.scores.supervisorScore
            : '';
        s2 = item.scores?.student2SupervisorScore !== null && item.scores?.student2SupervisorScore !== undefined
          ? item.scores.student2SupervisorScore
          : '';
      } else if (activeTab === 'REVIEWER_1') {
        s1 = item.scores?.student1Reviewer1Score !== null && item.scores?.student1Reviewer1Score !== undefined
          ? item.scores.student1Reviewer1Score
          : !isTwo && item.scores?.reviewer1Score !== null && item.scores?.reviewer1Score !== undefined
            ? item.scores.reviewer1Score
            : '';
        s2 = item.scores?.student2Reviewer1Score !== null && item.scores?.student2Reviewer1Score !== undefined
          ? item.scores.student2Reviewer1Score
          : '';
      } else if (activeTab === 'REVIEWER_2') {
        s1 = item.scores?.student1Reviewer2Score !== null && item.scores?.student1Reviewer2Score !== undefined
          ? item.scores.student1Reviewer2Score
          : !isTwo && item.scores?.reviewer2Score !== null && item.scores?.reviewer2Score !== undefined
            ? item.scores.reviewer2Score
            : '';
        s2 = item.scores?.student2Reviewer2Score !== null && item.scores?.student2Reviewer2Score !== undefined
          ? item.scores.student2Reviewer2Score
          : '';
      }
      initial[item._id] = {
        s1: s1 !== null && s1 !== undefined && s1 !== '' ? String(s1) : '',
        s2: s2 !== null && s2 !== undefined && s2 !== '' ? String(s2) : '',
      };
    });
    setInlineScores(initial);
  }, [data, activeTab]);

  const handleInlineScoreChange = (thesisId, studentKey, value) => {
    setInlineScores((prev) => ({
      ...prev,
      [thesisId]: {
        ...(prev[thesisId] || {}),
        [studentKey]: value,
      },
    }));
  };

  const handleSaveInlineScore = async (thesis) => {
    const current = inlineScores[thesis._id] || {};
    const val1 = current.s1 !== undefined && current.s1 !== '' ? Number(current.s1) : null;
    const val2 = thesis.studentCount === 2 && current.s2 !== undefined && current.s2 !== '' ? Number(current.s2) : null;

    if (val1 === null && val2 === null) return;

    if (val1 !== null && (isNaN(val1) || val1 < 0 || val1 > 10)) {
      showToast('Điểm số SV1 phải từ 0 đến 10', 'warning');
      return;
    }
    if (val2 !== null && (isNaN(val2) || val2 < 0 || val2 > 10)) {
      showToast('Điểm số SV2 phải từ 0 đến 10', 'warning');
      return;
    }

    const avg = val1 !== null && val2 !== null ? Number(((val1 + val2) / 2).toFixed(2)) : (val1 ?? val2);
    const roleType = activeTab === 'REVIEWER_1' ? 'REVIEWER1' : activeTab === 'REVIEWER_2' ? 'REVIEWER2' : 'SUPERVISOR';

    setSavingThesisId(thesis._id);
    try {
      const res = await thesisApi.gradeThesis(thesis._id, {
        score: avg,
        student1Score: val1,
        student2Score: val2,
        roleType,
      });
      if (res.success) {
        showToast(`Đã lưu điểm cho ${thesis.thesisTitle}!`, 'success');
        fetchAssignedTheses(true); // Silent refresh to keep DOM and focus intact!
      }
    } catch (err) {
      showToast(err.message || 'Lưu điểm thất bại', 'error');
    } finally {
      setSavingThesisId(null);
    }
  };

  const handleInlineKeyDown = (thesis, currentStudentKey, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // 1. Move to next input box in sequence FIRST
      const allInputs = Array.from(document.querySelectorAll('.thesis-inline-grade-input'));
      const currentIndex = allInputs.indexOf(e.target);
      if (currentIndex !== -1 && currentIndex + 1 < allInputs.length) {
        const nextInput = allInputs[currentIndex + 1];
        nextInput.focus();
        nextInput.select();
      }

      // 2. Save in background
      handleSaveInlineScore(thesis);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const allInputs = Array.from(document.querySelectorAll(`.thesis-inline-grade-input-${currentStudentKey}`));
      const currentIndex = allInputs.indexOf(e.target);
      if (currentIndex !== -1 && currentIndex + 1 < allInputs.length) {
        allInputs[currentIndex + 1].focus();
        allInputs[currentIndex + 1].select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const allInputs = Array.from(document.querySelectorAll(`.thesis-inline-grade-input-${currentStudentKey}`));
      const currentIndex = allInputs.indexOf(e.target);
      if (currentIndex > 0) {
        allInputs[currentIndex - 1].focus();
        allInputs[currentIndex - 1].select();
      }
    }
  };

  const getRoleLockStatus = (thesis) => {
    if (!thesis) return false;
    if (thesis.status === 'COMPLETED') return true;
    if (activeTab === 'SUPERVISOR') return Boolean(thesis.scores?.isSupervisorScoreLocked);
    if (activeTab === 'REVIEWER_1') return Boolean(thesis.scores?.isReviewer1ScoreLocked);
    if (activeTab === 'REVIEWER_2') return Boolean(thesis.scores?.isReviewer2ScoreLocked);
    return false;
  };

  const handleToggleRowLock = async (thesis) => {
    if (thesis.status === 'COMPLETED') return;
    const isCurrentlyLocked = getRoleLockStatus(thesis);
    const newLockState = !isCurrentlyLocked;
    const roleType = activeTab === 'REVIEWER_1' ? 'REVIEWER1' : activeTab === 'REVIEWER_2' ? 'REVIEWER2' : 'SUPERVISOR';

    setLockingRowId(thesis._id);
    try {
      const res = await thesisApi.toggleScoreLock(thesis._id, {
        roleType,
        isLocked: newLockState,
      });
      if (res.success) {
        showToast(
          newLockState ? `Đã khóa điểm cho ${thesis.thesisTitle}` : `Đã mở khóa điểm cho ${thesis.thesisTitle}`,
          'info'
        );
        fetchAssignedTheses(true);
      }
    } catch (err) {
      showToast(err.message || 'Không thể thay đổi trạng thái khóa điểm', 'error');
    } finally {
      setLockingRowId(null);
    }
  };

  const handleToggleAllLock = async (currentListToLock) => {
    const gradables = (currentListToLock || []).filter(
      (t) => t.status !== 'REJECTED' && t.status !== 'PENDING_SUPERVISOR_APPROVAL' && t.status !== 'PENDING_TBM_APPROVAL' && t.status !== 'COMPLETED'
    );
    if (gradables.length === 0) return;

    const allCurrentlyLocked = gradables.every((t) => getRoleLockStatus(t));
    const newLockState = !allCurrentlyLocked;
    const roleType = activeTab === 'REVIEWER_1' ? 'REVIEWER1' : activeTab === 'REVIEWER_2' ? 'REVIEWER2' : 'SUPERVISOR';

    setLockingAll(true);
    try {
      const res = await thesisApi.toggleAllScoresLock({
        academicTermId: currentTerm?._id || '',
        roleType,
        isLocked: newLockState,
      });
      if (res.success) {
        showToast(
          newLockState ? 'Đã khóa toàn bộ điểm trong danh mục này!' : 'Đã mở khóa toàn bộ điểm trong danh mục này!',
          'info'
        );
        fetchAssignedTheses(true);
      }
    } catch (err) {
      showToast(err.message || 'Không thể thay đổi trạng thái khóa toàn bộ điểm', 'error');
    } finally {
      setLockingAll(false);
    }
  };

  const formatLecturerDisplay = (lecturer) => {
    if (!lecturer) return 'Chưa phân công';
    const name = lecturer.userId?.fullName || lecturer.fullName || lecturer.name || 'Giảng viên';
    const title = lecturer.academicTitle || '';
    if (title && !name.toLowerCase().startsWith(title.toLowerCase())) {
      return `${title} ${name}`;
    }
    return name;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isTopicsView = activeTab === 'MY_TOPICS' || location.search.includes('tab=topics');
  const isReviewView =
    activeTab === 'REVIEWER_1' ||
    activeTab === 'REVIEWER_2' ||
    location.search.includes('tab=review') ||
    location.search.includes('tab=reviewer1') ||
    location.search.includes('tab=reviewer2');
  const isEvaluationView = location.search.includes('view=evaluation');

  // Topic filter state for Topics view
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'

  const filteredTopics = proposedTopics.filter((t) => {
    if (topicStatusFilter !== 'ALL' && t.status !== topicStatusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchLec =
        t.supervisorId?.userId?.fullName?.toLowerCase().includes(q) ||
        t.supervisorId?.lecturerCode?.toLowerCase().includes(q);
      const matchStudent = t.registeredGroups?.some(
        (g) =>
          g.studentCode?.toLowerCase().includes(q) ||
          g.studentId?.userId?.fullName?.toLowerCase().includes(q) ||
          g.secondStudentCode?.toLowerCase().includes(q) ||
          g.secondStudentId?.userId?.fullName?.toLowerCase().includes(q)
      );
      return matchTitle || matchDesc || matchLec || matchStudent;
    }
    return true;
  });

  const topicStats = {
    total: proposedTopics.length,
    pending: proposedTopics.filter((t) => t.status === 'PENDING').length,
    approved: proposedTopics.filter((t) => t.status === 'APPROVED').length,
    rejected: proposedTopics.filter((t) => t.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Context-aware redesign */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md shrink-0 text-white ${
                isTopicsView
                  ? 'bg-[#123891]'
                  : isReviewView
                    ? 'bg-gradient-to-tr from-purple-600 to-violet-600 shadow-purple-200'
                    : isEvaluationView
                      ? 'bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-amber-200'
                      : 'bg-[#123891]'
              }`}
            >
              {isTopicsView ? (
                <BookOpen className="w-7 h-7" />
              ) : isReviewView ? (
                <Shield className="w-7 h-7" />
              ) : isEvaluationView ? (
                <Award className="w-7 h-7" />
              ) : (
                <Users className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {isTopicsView
                    ? (isTbmOrAdmin ? 'Quản Lý & Duyệt Đề Tài Khóa Luận (TBM)' : 'Danh Sách Đề Tài Khóa Luận Tốt Nghiệp')
                    : isReviewView
                      ? 'Chấm Điểm Phản Biện Khóa Luận (GVPB)'
                      : isEvaluationView
                        ? 'Đánh Giá Khóa Luận Tốt Nghiệp (GVHD - 40%)'
                        : 'Quản Lý Đề Tài & Sinh Viên Hướng Dẫn'}
                </h2>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    isTopicsView
                      ? 'bg-blue-50 text-[#123891] border-blue-200'
                      : isReviewView
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : isEvaluationView
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-[#123891] border-blue-200'
                  }`}
                >
                  {isTopicsView
                    ? (isTbmOrAdmin ? 'DUYỆT ĐỀ TÀI TBM' : 'DANH SÁCH ĐỀ TÀI')
                    : isReviewView
                      ? 'PHẢN BIỆN (30%)'
                      : isEvaluationView
                        ? 'ĐÁNH GIÁ (40%)'
                        : 'HƯỚNG DẪN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isTopicsView
                  ? (isTbmOrAdmin
                      ? 'Xét duyệt trực tiếp các đề tài do giảng viên gửi lên để mở cho sinh viên đăng ký theo thứ tự FIFO.'
                      : 'Tạo và nộp danh sách đề tài Khóa luận Tốt nghiệp gửi Trưởng Bộ Môn (TBM) xét duyệt để mở cho sinh viên đăng ký.')
                  : isReviewView
                    ? 'Chấm điểm độc lập theo phân công Phản biện kín (30%) và Phản biện hội đồng (30%).'
                    : isEvaluationView
                      ? 'Theo dõi và thực hiện đánh giá điểm số hướng dẫn chính (40%) cho sinh viên khóa luận.'
                      : 'Theo dõi danh sách các nhóm sinh viên và đề tài bạn phụ trách hướng dẫn chính trong học kỳ.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isTopicsView && (
              <>
                {topicStats.pending > 0 && (
                  <button
                    type="button"
                    onClick={handleApproveAllPending}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Duyệt tất cả ({topicStats.pending})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCreateTopicModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#123891] hover:bg-[#0e2c73] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/20 transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>+ Thêm đề tài</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                fetchAssignedTheses();
                fetchMyTopics();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Dynamic Context Tabs */}
        {isTopicsView ? (
          /* ================= TABS FOR PROPOSED TOPICS ================= */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTopicStatusFilter('ALL')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                topicStatusFilter === 'ALL'
                  ? 'bg-blue-50/80 border-[#123891]/50 ring-2 ring-[#123891]/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Tất cả đề tài</span>
                <span className="text-xs font-mono font-extrabold text-[#123891] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {topicStats.total}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Tổng số đề tài đã nộp</p>
            </button>

            <button
              type="button"
              onClick={() => setTopicStatusFilter('PENDING')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                topicStatusFilter === 'PENDING'
                  ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Chờ TBM duyệt
                </span>
                <span className="text-xs font-mono font-extrabold text-amber-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                  {topicStats.pending}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Đề tài đang chờ xét duyệt</p>
            </button>

            <button
              type="button"
              onClick={() => setTopicStatusFilter('APPROVED')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                topicStatusFilter === 'APPROVED'
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đã duyệt (Mở ĐK)
                </span>
                <span className="text-xs font-mono font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {topicStats.approved}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">SV được phép đăng ký</p>
            </button>

            <button
              type="button"
              onClick={() => setTopicStatusFilter('REJECTED')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                topicStatusFilter === 'REJECTED'
                  ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">Bị từ chối</span>
                <span className="text-xs font-mono font-extrabold text-rose-700 bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                  {topicStats.rejected}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Cần chỉnh sửa & nộp lại</p>
            </button>
          </div>
        ) : (
          /* ================= TABS FOR SUPERVISED & REVIEWER ROLES (ALWAYS VISIBLE) ================= */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
            {/* Tab 1: Supervised (GVHD) */}
            <button
              type="button"
              onClick={() => setActiveTab('SUPERVISOR')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'SUPERVISOR'
                  ? 'bg-blue-50/80 border-[#123891]/60 ring-2 ring-[#123891]/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123891] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#123891]" />
                  Đề tài hướng dẫn (GVHD - 40%)
                </span>
                <span className="text-xs font-mono font-extrabold text-[#123891] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {stats.supervisedCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Đề tài bạn phụ trách hướng dẫn chính trong học kỳ.
              </p>
            </button>

            {/* Tab 2: Reviewer 1 (PB Kín) */}
            <button
              type="button"
              onClick={() => setActiveTab('REVIEWER_1')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'REVIEWER_1'
                  ? 'bg-blue-50/80 border-[#123891]/60 ring-2 ring-[#123891]/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123891] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#123891]" />
                  Phản biện kín (GVPB Kín - 30%)
                </span>
                <span className="text-xs font-mono font-extrabold text-[#123891] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {stats.reviewer1Count}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Phản biện độc lập trước hội đồng bảo vệ.
              </p>
            </button>

            {/* Tab 3: Reviewer 2 (PB Hội đồng) */}
            <button
              type="button"
              onClick={() => setActiveTab('REVIEWER_2')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'REVIEWER_2'
                  ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" />
                  Phản biện hội đồng (30%)
                </span>
                <span className="text-xs font-mono font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                  {stats.reviewer2Count}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Đánh giá tại phiên bảo vệ hội đồng khóa luận.
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Action & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-96">
          <SearchInput
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder={
              isTopicsView
                ? 'Tìm tên đề tài, mô tả, MSSV đăng ký...'
                : 'Tìm MSSV, Tên SV, Tên đề tài...'
            }
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <strong>{isTopicsView ? filteredTopics.length : currentList.length}</strong> đề tài
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      {isTopicsView ? (
        /* ================= BẢNG ĐỀ TÀI DO GIẢNG VIÊN ĐỀ XUẤT ================= */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loadingProposedTopics ? (
            <div className="p-6">
              <LoadingSkeleton rows={4} cols={6} />
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700">
                {proposedTopics.length === 0
                  ? 'Chưa có đề tài nào trong danh sách'
                  : 'Không tìm thấy đề tài phù hợp với bộ lọc'}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {proposedTopics.length === 0
                  ? 'Bấm vào nút "+ Thêm đề tài" bên dưới để tạo danh sách đề tài KLTN gửi xét duyệt.'
                  : 'Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.'}
              </p>
              {proposedTopics.length === 0 && (
                <button
                  type="button"
                  onClick={() => setCreateTopicModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#123891] hover:bg-[#0e2c73] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>+ Thêm đề tài ngay</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                    <th className="py-3.5 px-4">GV Đề xuất</th>
                    <th className="py-3.5 px-4 text-center">Số nhóm nhận</th>
                    <th className="py-3.5 px-4">Mô tả tóm tắt</th>
                    <th className="py-3.5 px-4">Trạng thái duyệt</th>
                    <th className="py-3.5 px-4">Nhóm SV đăng ký (FIFO)</th>
                    <th className="py-3.5 px-4 text-right">Thao tác & Phê duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTopics.map((topic) => {
                    const isFull = topic.currentGroups >= topic.maxGroups;
                    return (
                      <tr key={topic._id} className="hover:bg-slate-50/80 transition">
                        {/* Title & Description */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <button
                            type="button"
                            onClick={() => setSelectedTopicDetail(topic)}
                            className="text-left group cursor-pointer block"
                            title="Bấm để xem chi tiết đề tài và danh sách nhóm"
                          >
                            <span className="text-slate-900 group-hover:text-[#123891] font-bold block leading-snug transition">
                              {topic.title}
                            </span>
                          </button>
                          {topic.rejectionReason && topic.status === 'REJECTED' && (
                            <span className="text-[11px] text-rose-600 block mt-1 font-medium bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                              Lý do từ chối: {topic.rejectionReason}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            Ngày tạo: {formatDate(topic.createdAt)}
                          </div>
                        </td>

                        {/* Lecturer info */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {topic.supervisorId?.userId?.fullName || 'Giảng viên'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {topic.supervisorId?.lecturerCode || ''}
                          </div>
                        </td>

                        {/* Capacity */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold font-mono border ${
                              isFull
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-[#123891] border-blue-200'
                            }`}
                          >
                            {topic.currentGroups}/{topic.maxGroups} nhóm
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                          {topic.description || <span className="italic text-slate-400">Không có mô tả</span>}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {topic.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã duyệt (Mở ĐK)</span>
                            </span>
                          )}
                          {topic.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>Chờ TBM duyệt</span>
                            </span>
                          )}
                          {topic.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>Bị từ chối</span>
                            </span>
                          )}
                        </td>

                        {/* Registered Groups (FIFO) */}
                        <td className="py-3.5 px-4">
                          {topic.registeredGroups?.length > 0 ? (
                            <div className="space-y-1.5">
                              {topic.registeredGroups.map((g) => (
                                <button
                                  key={g._id}
                                  type="button"
                                  onClick={() => setSelectedTopicDetail(topic)}
                                  className="w-full text-left text-[11px] text-slate-700 font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 transition cursor-pointer group shadow-2xs"
                                  title="Bấm để xem thông tin chi tiết sinh viên"
                                >
                                  <span className="font-bold text-[#123891] shrink-0 bg-blue-100/70 px-1.5 py-0.5 rounded-md text-[10px]">
                                    Nhóm {g.groupOrder}:
                                  </span>
                                  <span className="truncate group-hover:text-blue-900">
                                    {g.studentId?.userId?.fullName || g.studentCode}
                                    <span className="text-slate-400 font-mono ml-0.5">({g.studentCode || g.studentId?.studentCode})</span>
                                    {g.secondStudentId && (
                                      <span className="text-slate-500 font-normal">
                                        {' '}+ {g.secondStudentId?.userId?.fullName || g.secondStudentCode}
                                        <span className="text-slate-400 font-mono ml-0.5">({g.secondStudentCode || g.secondStudentId?.studentCode})</span>
                                      </span>
                                    )}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa có nhóm ĐK</span>
                          )}
                        </td>

                        {/* Actions & Direct Approval */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Direct Approval Controls */}
                            {topic.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveTopic(topic)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                                  title="Phê duyệt đề tài này để mở cho sinh viên đăng ký"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Duyệt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetTopicForReject(topic);
                                    setTopicRejectReason('');
                                    setRejectTopicModalOpen(true);
                                  }}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold rounded-xl text-xs border border-rose-200 hover:border-rose-600 transition cursor-pointer disabled:opacity-50"
                                  title="Từ chối đề tài này"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Từ chối</span>
                                </button>
                              </>
                            )}

                            {/* View Detail Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedTopicDetail(topic)}
                              className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              title="Xem chi tiết đề tài và danh sách nhóm SV"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================= BẢNG ĐỀ TÀI PHÂN CÔNG (SUPERVISOR, REVIEWER 1, REVIEWER 2) ================= */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={4} cols={5} />
            </div>
          ) : currentList.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Không có đề tài nào trong danh mục này"
                description="Bạn chưa được phân công đề tài tương ứng với vai trò này hoặc chưa có kết quả tìm kiếm."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">STT</th>
                    <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                    <th className="py-3.5 px-4">Sinh viên thực hiện</th>
                    {activeTab !== 'SUPERVISOR' && (
                      <th className="py-3.5 px-4">GV Hướng Dẫn</th>
                    )}
                    <th className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Chấm Điểm</span>
                        <span className="text-[9px] lowercase font-normal text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                          (Enter ↵)
                        </span>
                        {/* Master Lock (Ổ khóa tổng) */}
                        {currentList.some(
                          (t) =>
                            t.status !== 'REJECTED' &&
                            t.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                            t.status !== 'PENDING_TBM_APPROVAL' &&
                            t.status !== 'COMPLETED'
                        ) && (
                          <button
                            type="button"
                            onClick={() => handleToggleAllLock(currentList)}
                            disabled={lockingAll}
                            title={
                              currentList
                                .filter(
                                  (t) =>
                                    t.status !== 'REJECTED' &&
                                    t.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                                    t.status !== 'PENDING_TBM_APPROVAL' &&
                                    t.status !== 'COMPLETED'
                                )
                                .every((t) => getRoleLockStatus(t))
                                ? 'Mở khóa toàn bộ điểm'
                                : 'Khóa toàn bộ điểm'
                            }
                            className={`p-1 rounded-md border transition cursor-pointer flex items-center justify-center ${
                              currentList
                                .filter(
                                  (t) =>
                                    t.status !== 'REJECTED' &&
                                    t.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                                    t.status !== 'PENDING_TBM_APPROVAL' &&
                                    t.status !== 'COMPLETED'
                                )
                                .every((t) => getRoleLockStatus(t))
                                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                : 'bg-white text-slate-400 border-slate-300 hover:text-[#123891] hover:border-blue-300'
                            }`}
                          >
                            {lockingAll ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#123891]" />
                            ) : currentList
                              .filter(
                                (t) =>
                                  t.status !== 'REJECTED' &&
                                  t.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                                  t.status !== 'PENDING_TBM_APPROVAL' &&
                                  t.status !== 'COMPLETED'
                              )
                              .every((t) => getRoleLockStatus(t)) ? (
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentList.map((item, index) => {
                    const isGradable =
                      item.status !== 'REJECTED' &&
                      item.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                      item.status !== 'PENDING_TBM_APPROVAL';
                    const isLocked = getRoleLockStatus(item);

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                          {index + 1}
                        </td>

                        {/* Title - Clickable to open Detail */}
                        <td className="py-3.5 px-4 min-w-[240px] max-w-sm">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="text-left block group cursor-pointer"
                            title="Bấm để xem toàn bộ thông tin đề tài & phân công phản biện"
                          >
                            <strong className="text-slate-900 group-hover:text-[#123891] line-clamp-2 leading-snug transition">
                              {item.thesisTitle}
                            </strong>
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                              {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                            </span>
                            {item.scores?.finalScore !== null && item.scores?.finalScore !== undefined && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Tổng: {item.scores.finalScore}/10
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Students */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2 min-w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                                SV1
                              </span>
                              <UserNameClickable
                                user={item.studentId}
                                name={item.studentId?.userId?.fullName}
                                subtitle={item.studentId?.studentCode ? `MSSV: ${item.studentId.studentCode}` : ''}
                                avatarSize="w-6 h-6"
                              />
                            </div>
                            {item.studentCount === 2 && item.secondStudentId && (
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                                <span className="text-[9px] font-bold text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                                  SV2
                                </span>
                                <UserNameClickable
                                  user={item.secondStudentId}
                                  name={item.secondStudentId?.userId?.fullName}
                                  subtitle={item.secondStudentId?.studentCode ? `MSSV: ${item.secondStudentId.studentCode}` : ''}
                                  avatarSize="w-6 h-6"
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Supervisor (shown only in Reviewer tabs) */}
                        {activeTab !== 'SUPERVISOR' && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <UserNameClickable
                              user={item.supervisorId}
                              name={formatLecturerDisplay(item.supervisorId)}
                              subtitle={item.supervisorId?.specialization || item.supervisorId?.department}
                              avatarSize="w-6 h-6"
                            />
                          </td>
                        )}

                        {/* Square Inline Score Inputs with Row Lock Button */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {isGradable ? (
                            item.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-mono text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>{item.scores?.finalScore ?? item.scores?.supervisorScore ?? '—'} / 10</span>
                              </span>
                            ) : activeTab === 'SUPERVISOR' && !item.isCriteriaPassed ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/lecturer/theses/${item._id}/evaluate`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer group"
                                title="Chưa tick đủ điều kiện KLTN. Bấm để mở trang chi tiết xem báo cáo & tick tiêu chí."
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition shrink-0" />
                                <span>Chưa tick điều kiện</span>
                              </button>
                            ) : activeTab === 'SUPERVISOR' && !isGradingPeriodOpen() ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/lecturer/theses/${item._id}/evaluate`)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                title="Hiện chưa tới hoặc đã hết đợt nhập điểm. Bấm để xem chi tiết."
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Ngoài đợt chấm</span>
                              </button>
                            ) : item.studentCount === 2 && item.secondStudentId ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex flex-col gap-2 items-center justify-center">
                                  {/* SV1 Box - Aligned with SV1 */}
                                  <div className="flex items-center gap-1.5" title={`SV1: ${item.studentId?.userId?.fullName} (${item.studentId?.studentCode})`}>
                                    <span className="text-[10px] font-bold text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">SV1</span>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="10"
                                      value={inlineScores[item._id]?.s1 ?? ''}
                                      onChange={(e) => !isLocked && handleInlineScoreChange(item._id, 's1', e.target.value)}
                                      onKeyDown={(e) => !isLocked && handleInlineKeyDown(item, 's1', e)}
                                      onBlur={() => !isLocked && handleSaveInlineScore(item)}
                                      placeholder="—"
                                      readOnly={isLocked}
                                      disabled={isLocked}
                                      className={`thesis-inline-grade-input thesis-inline-grade-input-s1 w-14 h-7 text-center font-mono font-bold text-xs rounded-lg shadow-2xs transition outline-none ${
                                        isLocked
                                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                          : 'bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#123891] focus:ring-2 focus:ring-blue-100'
                                      }`}
                                    />
                                  </div>
                                  {/* SV2 Box - Aligned with SV2 */}
                                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 w-full justify-center" title={`SV2: ${item.secondStudentId?.userId?.fullName} (${item.secondStudentId?.studentCode})`}>
                                    <span className="text-[10px] font-bold text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">SV2</span>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="10"
                                      value={inlineScores[item._id]?.s2 ?? ''}
                                      onChange={(e) => !isLocked && handleInlineScoreChange(item._id, 's2', e.target.value)}
                                      onKeyDown={(e) => !isLocked && handleInlineKeyDown(item, 's2', e)}
                                      onBlur={() => !isLocked && handleSaveInlineScore(item)}
                                      placeholder="—"
                                      readOnly={isLocked}
                                      disabled={isLocked}
                                      className={`thesis-inline-grade-input thesis-inline-grade-input-s2 w-14 h-7 text-center font-mono font-bold text-xs rounded-lg shadow-2xs transition outline-none ${
                                        isLocked
                                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                          : 'bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#123891] focus:ring-2 focus:ring-blue-100'
                                      }`}
                                    />
                                  </div>
                                </div>
                                {/* Row Lock Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleRowLock(item)}
                                  disabled={lockingRowId === item._id}
                                  title={isLocked ? 'Điểm đang khóa (Bấm để mở khóa)' : 'Điểm đang mở (Bấm để khóa)'}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer self-center ${
                                    isLocked
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-[#123891] hover:border-blue-300'
                                  }`}
                                >
                                  {lockingRowId === item._id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#123891]" />
                                  ) : isLocked ? (
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <div className="inline-flex items-center gap-1.5 justify-center" title={`Nhập điểm cho ${item.studentId?.userId?.fullName}, ấn Enter để lưu`}>
                                  <span className="text-[10px] font-bold text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">SV1</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={inlineScores[item._id]?.s1 ?? ''}
                                    onChange={(e) => !isLocked && handleInlineScoreChange(item._id, 's1', e.target.value)}
                                    onKeyDown={(e) => !isLocked && handleInlineKeyDown(item, 's1', e)}
                                    onBlur={() => !isLocked && handleSaveInlineScore(item)}
                                    placeholder="—"
                                    readOnly={isLocked}
                                    disabled={isLocked}
                                    className={`thesis-inline-grade-input thesis-inline-grade-input-s1 w-14 h-7 text-center font-mono font-bold text-xs rounded-lg shadow-2xs transition outline-none ${
                                      isLocked
                                        ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                        : 'bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#123891] focus:ring-2 focus:ring-blue-100'
                                    }`}
                                  />
                                </div>
                                {/* Row Lock Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleRowLock(item)}
                                  disabled={lockingRowId === item._id}
                                  title={isLocked ? 'Điểm đang khóa (Bấm để mở khóa)' : 'Điểm đang mở (Bấm để khóa)'}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer self-center ${
                                    isLocked
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-[#123891] hover:border-blue-300'
                                  }`}
                                >
                                  {lockingRowId === item._id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#123891]" />
                                  ) : isLocked ? (
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            )
                          ) : item.status === 'PENDING_SUPERVISOR_APPROVAL' ? (
                            <span className="text-[11px] text-amber-600 italic">Chờ duyệt ĐT</span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa mở chấm</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Supervisor specific actions */}
                            {activeTab === 'SUPERVISOR' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDiaryModal(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123891] hover:bg-[#0e2c73] text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                                title="Xem và đánh giá nhật ký khóa luận của sinh viên"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Xem Nhật ký</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                              title="Xem thông tin chi tiết sinh viên & đề tài"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </button>

                            {activeTab === 'SUPERVISOR' &&
                              item.status === 'PENDING_SUPERVISOR_APPROVAL' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAccept(item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Duyệt</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenReject(item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition cursor-pointer"
                                  >
                                    <span>Từ chối</span>
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: NHẬT KÝ KHÓA LUẬN & ĐÁNH GIÁ TIẾN ĐỘ ================= */}
      {diaryModalOpen && diaryThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-6xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#123891] flex items-center justify-center font-bold shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      Nhật Ký Khóa Luận & Đánh Giá Tiến Độ
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-[#123891] border border-blue-200 rounded-full">
                      GVHD Đánh giá
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    <strong>Đề tài:</strong> {diaryThesis.thesisTitle} • <strong>SV1:</strong>{' '}
                    {diaryThesis.studentId?.userId?.fullName} ({diaryThesis.studentId?.studentCode})
                    {diaryThesis.secondStudentId && (
                      <span>
                        {' '}• <strong>SV2:</strong> {diaryThesis.secondStudentId?.userId?.fullName} ({diaryThesis.secondStudentId?.studentCode})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {diaryReports.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAllDiaryRows}
                    disabled={savingAllDiary}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#0e2c73] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {savingAllDiary ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{savingAllDiary ? 'Đang lưu...' : 'Lưu tất cả đánh giá'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDiaryModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {diaryLoading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={4} cols={6} />
                </div>
              ) : diaryReports.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-12 h-12 mx-auto text-slate-300" />
                  <div className="text-sm font-bold text-slate-700">
                    Sinh viên chưa nộp nhật ký khóa luận nào
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Các đợt báo cáo tiến độ và nhật ký tuần do sinh viên thực hiện sẽ được hiển thị đầy đủ tại đây để bạn chấm điểm, nhận xét và đánh giá.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                        <th className="py-3 px-3 w-20 text-center">Tuần</th>
                        <th className="py-3 px-3 w-28 whitespace-nowrap">Ngày nộp</th>
                        <th className="py-3 px-3 min-w-[200px]">Nội dung & Báo cáo</th>
                        <th className="py-3 px-3 w-24 text-center">Tiến độ</th>
                        <th className="py-3 px-3 w-32">Tài liệu</th>
                        <th className="py-3 px-3 w-28 text-center bg-blue-50/40">Điểm (0-10)</th>
                        <th className="py-3 px-3 w-36 bg-blue-50/40">Đánh giá</th>
                        <th className="py-3 px-3 min-w-[220px] bg-blue-50/40">Nhận xét của GVHD</th>
                        <th className="py-3 px-3 w-20 text-center">Lưu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diaryReports.map((report, idx) => {
                        const edit = diaryEdits[report._id] || {
                          lecturerScore: report.lecturerScore !== null && report.lecturerScore !== undefined ? String(report.lecturerScore) : '',
                          status: report.status || 'APPROVED',
                          lecturerComment: report.lecturerComment || '',
                        };
                        const isRowSaving = savingDiaryId === report._id;
                        const fileObj = report.file || (report.fileUrl ? { fileUrl: report.fileUrl, originalName: 'Tài liệu đính kèm' } : null);

                        return (
                          <tr key={report._id} className="hover:bg-slate-50/60 transition">
                            {/* Tuần */}
                            <td className="py-3 px-3 text-center align-top">
                              <span className="font-bold text-[#123891] bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg text-xs font-mono block">
                                {report.weekNumber ? `Tuần ${report.weekNumber}` : `Đợt ${idx + 1}`}
                              </span>
                              {report.weekStartDate && report.weekEndDate && (
                                <span className="text-[9.5px] text-slate-400 block mt-1 leading-tight">
                                  {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
                                </span>
                              )}
                            </td>

                            {/* Ngày nộp */}
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px] align-top whitespace-nowrap">
                              {formatDate(report.submittedAt || report.createdAt)}
                            </td>

                            {/* Nội dung công việc & Báo cáo */}
                            <td className="py-3 px-3 align-top">
                              <div className="font-bold text-slate-900 text-xs mb-1">
                                {report.title || 'Báo cáo tiến độ tuần'}
                              </div>
                              {report.description ? (
                                <p className="text-slate-600 text-[11.5px] leading-relaxed whitespace-pre-line bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 max-h-36 overflow-y-auto custom-scrollbar">
                                  {report.description}
                                </p>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Không có mô tả chi tiết</span>
                              )}
                            </td>

                            {/* Tiến độ (%) */}
                            <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-extrabold font-mono text-xs text-[#123891]">
                                  {report.completionPercentage ?? 0}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <div
                                    className="h-full bg-[#123891] rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, report.completionPercentage ?? 0))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Tài liệu đính kèm */}
                            <td className="py-3 px-3 align-top">
                              {fileObj?.fileUrl ? (
                                <a
                                  href={fileObj.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#123891] border border-blue-200 rounded-xl text-[11px] font-semibold transition group max-w-full truncate"
                                  title={fileObj.originalName || 'Tải file đính kèm'}
                                >
                                  <Paperclip className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition" />
                                  <span className="truncate">{fileObj.originalName || 'Xem tài liệu'}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Không có</span>
                              )}
                            </td>

                            {/* Điểm (0-10) - Tự điền */}
                            <td className="py-3 px-3 text-center align-top bg-blue-50/20">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={edit.lecturerScore ?? ''}
                                onChange={(e) => handleDiaryEditChange(report._id, 'lecturerScore', e.target.value)}
                                placeholder="0 - 10"
                                className="w-20 h-8 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-xl focus:border-[#123891] focus:ring-2 focus:ring-blue-100 outline-none shadow-2xs transition"
                              />
                            </td>

                            {/* Đánh giá - Tự chọn */}
                            <td className="py-3 px-3 align-top bg-blue-50/20">
                              <select
                                value={edit.status || 'APPROVED'}
                                onChange={(e) => handleDiaryEditChange(report._id, 'status', e.target.value)}
                                className="w-full h-8 text-xs font-semibold bg-white border border-slate-300 rounded-xl px-2 focus:border-[#123891] focus:ring-2 focus:ring-blue-100 outline-none shadow-2xs transition cursor-pointer"
                              >
                                <option value="APPROVED">✓ Đạt (Duyệt)</option>
                                <option value="REVIEWING">⏳ Đang xem xét</option>
                                <option value="NEEDS_REVISION">✎ Cần chỉnh sửa</option>
                                <option value="REJECTED">✕ Không đạt</option>
                              </select>
                            </td>

                            {/* Nhận xét - Tự điền */}
                            <td className="py-3 px-3 align-top bg-blue-50/20">
                              <textarea
                                rows={2}
                                value={edit.lecturerComment || ''}
                                onChange={(e) => handleDiaryEditChange(report._id, 'lecturerComment', e.target.value)}
                                placeholder="Nhập nhận xét, hướng dẫn..."
                                className="w-full text-[11.5px] p-2 bg-white border border-slate-300 rounded-xl focus:border-[#123891] focus:ring-2 focus:ring-blue-100 outline-none shadow-2xs transition resize-none"
                              />
                            </td>

                            {/* Lưu từng dòng */}
                            <td className="py-3 px-3 text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleSaveDiaryRow(report._id)}
                                disabled={isRowSaving}
                                className="p-2 bg-[#123891] hover:bg-[#0e2c73] text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                                title="Lưu dòng này"
                              >
                                {isRowSaving ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 shrink-0">
              <div className="text-xs text-slate-500">
                Tổng cộng: <strong>{diaryReports.length}</strong> báo cáo nhật ký tiến độ
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiaryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
                {diaryReports.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAllDiaryRows}
                    disabled={savingAllDiary}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#0e2c73] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {savingAllDiary ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{savingAllDiary ? 'Đang lưu...' : 'Lưu tất cả'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      <GradeThesisModal
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        thesis={selectedThesis}
        currentLecturerId={data?.lecturer?._id}
        defaultRoleType={
          activeTab === 'REVIEWER_1'
            ? 'REVIEWER1'
            : activeTab === 'REVIEWER_2'
              ? 'REVIEWER2'
              : 'SUPERVISOR'
        }
        onSuccess={() => {
          fetchAssignedTheses();
        }}
      />

      {/* Accept / Approve Confirmation Modal */}
      {acceptModalOpen && targetThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Duyệt Đề Tài</h3>
                <p className="text-xs text-slate-500">Phê duyệt đề tài khóa luận của sinh viên</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
              <div>
                <span className="text-slate-400">Tên đề tài:</span>
                <strong className="block text-slate-900 mt-0.5">{targetThesis.thesisTitle}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400">Sinh viên 1:</span>
                  <div className="font-semibold text-slate-800">
                    {targetThesis.studentId?.userId?.fullName} ({targetThesis.studentId?.studentCode})
                  </div>
                </div>
                {targetThesis.secondStudentId && (
                  <div>
                    <span className="text-slate-400">Sinh viên 2:</span>
                    <div className="font-semibold text-slate-800">
                      {targetThesis.secondStudentId?.userId?.fullName} ({targetThesis.secondStudentId?.studentCode})
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn duyệt đề tài này không? Sau khi duyệt, đề tài sẽ được chuyển sang trạng thái <strong>Đã phê duyệt (APPROVED)</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Đang xử lý...' : 'Đồng ý duyệt đề tài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && targetThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleConfirmReject} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ Chối Hướng Dẫn Đề Tài</h3>
                <p className="text-xs text-slate-500">Vui lòng cung cấp lý do từ chối cụ thể</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
              <span className="text-slate-400">Đề tài:</span>
              <strong className="block text-slate-900 mt-0.5">{targetThesis.thesisTitle}</strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (ví dụ: Trùng hướng nghiên cứu, quá tải chuyên môn, đề tài chưa phù hợp...)"
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-hidden transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comprehensive Detail Modal */}
      {detailModalOpen && targetThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#123891] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Đề Tài Khóa Luận</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={targetThesis.status} size="sm" />
                    <span className="text-[11px] text-slate-400 font-mono">
                      {targetThesis.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Ngày tạo: {formatDate(targetThesis.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Topic Info */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên đề tài</label>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{targetThesis.thesisTitle}</div>
              </div>

              {targetThesis.description && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mô tả tóm tắt</label>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">
                    {targetThesis.description}
                  </p>
                </div>
              )}

              {targetThesis.objectives && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mục tiêu & Yêu cầu đề tài</label>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">
                    {targetThesis.objectives}
                  </p>
                </div>
              )}
            </div>

            {/* Students Info */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Sinh viên thực hiện
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
                  <div className="font-bold text-[#123891] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#123891]" />
                      <span>Sinh viên 1 (Trưởng nhóm)</span>
                    </div>
                    <UserNameClickable
                      user={targetThesis.studentId}
                      name="Xem hồ sơ ↗"
                      showAvatar={false}
                      className="text-[11px] font-bold text-[#123891] hover:underline"
                    />
                  </div>
                  <div><strong>Họ tên:</strong> {targetThesis.studentId?.userId?.fullName}</div>
                  <div><strong>MSSV:</strong> {targetThesis.studentId?.studentCode}</div>
                  <div><strong>Lớp:</strong> {targetThesis.studentId?.className || '—'}</div>
                  <div><strong>Ngành:</strong> {targetThesis.studentId?.major || targetThesis.studentId?.department || '—'}</div>
                  <div><strong>GPA:</strong> {targetThesis.studentId?.gpa ?? '—'} • <strong>Tín chỉ:</strong> {targetThesis.studentId?.creditsAccumulated ?? '—'}</div>
                  <div><strong>Email:</strong> {targetThesis.studentId?.userId?.email || '—'}</div>
                </div>

                {targetThesis.secondStudentId ? (
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
                    <div className="font-bold text-[#123891] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#123891]" />
                        <span>Sinh viên 2</span>
                      </div>
                      <UserNameClickable
                        user={targetThesis.secondStudentId}
                        name="Xem hồ sơ ↗"
                        showAvatar={false}
                        className="text-[11px] font-bold text-[#123891] hover:underline"
                      />
                    </div>
                    <div><strong>Họ tên:</strong> {targetThesis.secondStudentId?.userId?.fullName}</div>
                    <div><strong>MSSV:</strong> {targetThesis.secondStudentId?.studentCode}</div>
                    <div><strong>Lớp:</strong> {targetThesis.secondStudentId?.className || '—'}</div>
                    <div><strong>Ngành:</strong> {targetThesis.secondStudentId?.major || targetThesis.secondStudentId?.department || '—'}</div>
                    <div><strong>GPA:</strong> {targetThesis.secondStudentId?.gpa ?? '—'} • <strong>Tín chỉ:</strong> {targetThesis.secondStudentId?.creditsAccumulated ?? '—'}</div>
                    <div><strong>Email:</strong> {targetThesis.secondStudentId?.userId?.email || '—'}</div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs flex items-center justify-center text-slate-400">
                    Đề tài thực hiện cá nhân (1 sinh viên)
                  </div>
                )}
              </div>
            </div>

            {/* Thời gian thực hiện KLTN */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#123891]" />
                  <span className="font-bold text-xs text-[#123891] uppercase tracking-wider">
                    Thời Gian Thực Hiện KLTN
                  </span>
                  {targetThesis.startDate ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-[#123891] rounded-md">
                      Đã sửa đổi bởi GVHD
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      Mặc định
                    </span>
                  )}
                </div>

                {activeTab === 'SUPERVISOR' && !editingTimeline && (
                  <button
                    type="button"
                    onClick={() => setEditingTimeline(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#123891] hover:text-[#0e2c73] hover:underline cursor-pointer"
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
                      {detailStartDate ? new Date(detailStartDate).toLocaleDateString('vi-VN') : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {targetThesis.startDate ? '• Thời gian GVHD tùy chỉnh' : '• Mặc định: Ngày GVHD duyệt đề tài'}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100/80">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">Ngày kết thúc KLTN</div>
                    <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                      {detailEndDate ? new Date(detailEndDate).toLocaleDateString('vi-VN') : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {targetThesis.endDate ? '• Thời gian GVHD tùy chỉnh' : '• Mặc định: Mốc báo cáo KLTN của học kỳ'}
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
                        value={detailStartDate}
                        onChange={(e) => setDetailStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ngày kết thúc KLTN <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={detailEndDate}
                        onChange={(e) => setDetailEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
                      />
                    </div>
                  </div>

                  {detailStartDate && detailEndDate && new Date(detailStartDate) < new Date(detailEndDate) && (
                    <div className="text-[11px] text-[#123891] bg-blue-50 px-3 py-1.5 rounded-xl font-medium flex items-center justify-between">
                      <span>Tổng số tuần dự kiến sinh ra:</span>
                      <strong className="font-mono font-bold text-xs text-[#123891]">
                        {Math.ceil((new Date(detailEndDate) - new Date(detailStartDate)) / (1000 * 60 * 60 * 24 * 7))} tuần
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingTimeline(false)}
                      disabled={savingDetailTimeline}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDetailTimeline}
                      disabled={savingDetailTimeline}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#123891] hover:bg-[#0e2c73] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{savingDetailTimeline ? 'Đang lưu...' : 'Lưu thời gian'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lecturers & Evaluation Breakdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Hội Đồng & Kết Quả Đánh Giá
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Supervisor */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#123891] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#123891]" />
                      GV Hướng Dẫn (40%)
                    </span>
                    {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV1">
                          SV1: {targetThesis.scores?.student1SupervisorScore ?? '—'}
                        </span>
                        <span className="text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV2">
                          SV2: {targetThesis.scores?.student2SupervisorScore ?? '—'}
                        </span>
                      </div>
                    ) : targetThesis.scores?.supervisorScore !== null && targetThesis.scores?.supervisorScore !== undefined ? (
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {targetThesis.scores.supervisorScore}/10
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa chấm</span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {formatLecturerDisplay(targetThesis.supervisorId)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {targetThesis.supervisorId?.specialization || targetThesis.supervisorId?.department || '—'}
                  </div>
                </div>

                {/* Reviewer 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#123891] flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#123891]" />
                      PB Kín (30%)
                    </span>
                    {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV1">
                          SV1: {targetThesis.scores?.student1Reviewer1Score ?? '—'}
                        </span>
                        <span className="text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV2">
                          SV2: {targetThesis.scores?.student2Reviewer1Score ?? '—'}
                        </span>
                      </div>
                    ) : targetThesis.scores?.reviewer1Score !== null && targetThesis.scores?.reviewer1Score !== undefined ? (
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {targetThesis.scores.reviewer1Score}/10
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa chấm</span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {targetThesis.reviewer1Id ? formatLecturerDisplay(targetThesis.reviewer1Id) : <span className="text-amber-600 italic">Chưa phân công</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {targetThesis.reviewer1Id?.specialization || targetThesis.reviewer1Id?.department || '—'}
                  </div>
                </div>

                {/* Reviewer 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      PB Hội Đồng (30%)
                    </span>
                    {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV1">
                          SV1: {targetThesis.scores?.student1Reviewer2Score ?? '—'}
                        </span>
                        <span className="text-[#123891] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV2">
                          SV2: {targetThesis.scores?.student2Reviewer2Score ?? '—'}
                        </span>
                      </div>
                    ) : targetThesis.scores?.reviewer2Score !== null && targetThesis.scores?.reviewer2Score !== undefined ? (
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {targetThesis.scores.reviewer2Score}/10
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa chấm</span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {targetThesis.reviewer2Id ? formatLecturerDisplay(targetThesis.reviewer2Id) : <span className="text-amber-600 italic">Chưa phân công</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {targetThesis.reviewer2Id?.specialization || targetThesis.reviewer2Id?.department || '—'}
                  </div>
                </div>
              </div>

              {/* Final Score Banner */}
              {targetThesis.scores?.finalScore !== null && targetThesis.scores?.finalScore !== undefined && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between text-xs gap-2">
                  <span className="font-bold text-emerald-900">Điểm tổng kết khóa luận (Thang 10):</span>
                  {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[#123891] font-bold font-mono">
                        SV1: {targetThesis.scores?.student1FinalScore ?? targetThesis.scores.finalScore}/10
                      </span>
                      <span className="text-[#123891] font-bold font-mono">
                        SV2: {targetThesis.scores?.student2FinalScore ?? targetThesis.scores.finalScore}/10
                      </span>
                      <span className="font-mono font-extrabold text-sm text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-300">
                        TB: {targetThesis.scores.finalScore}/10
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono font-extrabold text-sm text-emerald-700">
                      {targetThesis.scores.finalScore} / 10
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions inside Detail Modal */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {targetThesis.status === 'PENDING_SUPERVISOR_APPROVAL' && activeTab === 'SUPERVISOR' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenAccept(targetThesis);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Duyệt đề tài</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenReject(targetThesis);
                      }}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Từ chối</span>
                    </button>
                  </>
                )}

                {activeTab === 'SUPERVISOR' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      handleOpenDiaryModal(targetThesis);
                    }}
                    className="px-4 py-2 bg-[#123891] hover:bg-[#0e2c73] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Xem Nhật ký</span>
                  </button>
                )}

                {targetThesis.status !== 'REJECTED' &&
                  targetThesis.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                  targetThesis.status !== 'PENDING_TBM_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenGrade(targetThesis);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{targetThesis.status === 'COMPLETED' ? 'Xem điểm & nhận xét' : 'Trang chấm điểm'}</span>
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Thêm đề tài KLTN */}
      {createTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#123891] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thêm Đề Tài Khóa Luận Tốt Nghiệp</h3>
                  <p className="text-xs text-slate-500">Nhập đề tài để gửi Trưởng Bộ Môn (TBM) xét duyệt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateTopicModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchCreateTopics} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Danh sách tên đề tài (Mỗi đề tài 1 dòng hoặc cách nhau bằng dấu phẩy) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#123891] font-semibold bg-blue-50 px-2 py-0.5 rounded">
                    Thêm đề tài
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={batchTitleInput}
                  onChange={(e) => setBatchTitleInput(e.target.value)}
                  placeholder={`Ví dụ:\nXây dựng hệ thống quản lý thực tập doanh nghiệp,\nXây dựng hệ thống quản lý khóa luận tốt nghiệp,\nỨng dụng Trí tuệ nhân tạo nhận diện biển số xe`}
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#123891] focus:ring-2 focus:ring-blue-100 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống sẽ tự động tách từng dòng hoặc theo dấu phẩy để tạo các đề tài độc lập gửi TBM duyệt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số lượng nhóm tối đa nhận cho mỗi đề tài <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={batchMaxGroups}
                    onChange={(e) => setBatchMaxGroups(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#123891] focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Khi số nhóm SV đăng ký đạt mức này, đề tài sẽ tự động đóng (FIFO).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giảng viên hướng dẫn
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{user?.fullName} {user?.lecturerCode ? `(${user.lecturerCode})` : user?.username ? `(${user.username})` : ''}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả / Yêu cầu chung cho các đề tài
                </label>
                <textarea
                  rows={3}
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Yêu cầu công nghệ, mục tiêu nghiên cứu..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#123891] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateTopicModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createTopicLoading}
                  className="px-5 py-2.5 bg-[#123891] hover:bg-[#0e2c73] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {createTopicLoading ? 'Đang gửi...' : 'Gửi Trưởng Bộ Môn duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết đề tài đề xuất & Danh sách nhóm đăng ký */}
      {selectedTopicDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#123891] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Đề Tài Đề Xuất</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-500">
                      Số nhóm: {selectedTopicDetail.currentGroups}/{selectedTopicDetail.maxGroups}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopicDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên đề tài</label>
                <div className="text-sm font-bold text-slate-900 mt-1">{selectedTopicDetail.title}</div>
              </div>

              {selectedTopicDetail.description && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mô tả đề tài</label>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 whitespace-pre-line">
                    {selectedTopicDetail.description}
                  </p>
                </div>
              )}

              {/* Registered Groups List (FIFO) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Danh sách nhóm sinh viên đăng ký (Thứ tự FIFO)
                </label>
                {selectedTopicDetail.registeredGroups?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTopicDetail.registeredGroups.map((group) => (
                      <div
                        key={group._id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs"
                      >
                        {/* Group Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#123891] text-white font-bold text-[10px]">
                              Nhóm #{group.groupOrder}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {group.secondStudentId ? 'Nhóm 2 sinh viên' : 'Cá nhân (1 SV)'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ĐK lúc: {new Date(group.registeredAt).toLocaleString('vi-VN')}
                          </div>
                        </div>

                        {/* Students Grid */}
                        <div className={`grid ${group.secondStudentId ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
                          {/* Student 1 */}
                          <div className="p-3 bg-white rounded-xl border border-blue-100 space-y-1">
                            <div className="font-bold text-[#123891] flex items-center gap-1.5 mb-1">
                              <span className="w-2 h-2 rounded-full bg-[#123891]" />
                              <span>SV1 (Trưởng nhóm)</span>
                            </div>
                            <div>
                              <strong className="text-slate-700">Họ tên:</strong> {group.studentId?.userId?.fullName || group.studentCode}
                            </div>
                            <div>
                              <strong className="text-slate-700">MSSV:</strong> {group.studentCode || group.studentId?.studentCode}
                            </div>
                            <div>
                              <strong className="text-slate-700">Lớp:</strong> {group.studentId?.className || '—'}
                            </div>
                            <div>
                              <strong className="text-slate-700">Email:</strong> {group.studentId?.userId?.email || '—'}
                            </div>
                            {group.studentId?.userId?.phone && (
                              <div>
                                <strong className="text-slate-700">SĐT:</strong> {group.studentId.userId.phone}
                              </div>
                            )}
                          </div>

                          {/* Student 2 (if applicable) */}
                          {group.secondStudentId && (
                            <div className="p-3 bg-white rounded-xl border border-blue-100 space-y-1">
                              <div className="font-bold text-[#123891] flex items-center gap-1.5 mb-1">
                                <span className="w-2 h-2 rounded-full bg-[#123891]" />
                                <span>SV2</span>
                              </div>
                              <div>
                                <strong className="text-slate-700">Họ tên:</strong> {group.secondStudentId?.userId?.fullName || group.secondStudentCode}
                              </div>
                              <div>
                                <strong className="text-slate-700">MSSV:</strong> {group.secondStudentCode || group.secondStudentId?.studentCode}
                              </div>
                              <div>
                                <strong className="text-slate-700">Lớp:</strong> {group.secondStudentId?.className || '—'}
                              </div>
                              <div>
                                <strong className="text-slate-700">Email:</strong> {group.secondStudentId?.userId?.email || '—'}
                              </div>
                              {group.secondStudentId?.userId?.phone && (
                                <div>
                                  <strong className="text-slate-700">SĐT:</strong> {group.secondStudentId.userId.phone}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic">
                    Chưa có nhóm sinh viên nào đăng ký đề tài này
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTopicDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Từ chối đề tài */}
      {rejectTopicModalOpen && targetTopicForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm">
                <div className="p-2 bg-rose-50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <span>Từ chối đề tài KLTN</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectTopicModalOpen(false);
                  setTargetTopicForReject(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đang từ chối đề tài: <strong className="text-slate-900 font-bold">"{targetTopicForReject.title}"</strong> của giảng viên{' '}
              <strong className="text-[#123891]">
                {targetTopicForReject.supervisorId?.userId?.fullName || 'Giảng viên'}
              </strong>
              . Vui lòng nhập lý do để giảng viên biết và chỉnh sửa:
            </p>

            <form onSubmit={handleConfirmRejectTopic} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={topicRejectReason}
                  onChange={(e) => setTopicRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối hoặc góp ý chỉnh sửa cho đề tài này..."
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTopicModalOpen(false);
                    setTargetTopicForReject(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerThesesPage;
