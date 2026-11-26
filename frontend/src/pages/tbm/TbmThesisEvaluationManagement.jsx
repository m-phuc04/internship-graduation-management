import React, { useState, useEffect, useCallback, useMemo } from 'react';
import thesisApi from '../../api/thesisApi';
import thesisDocumentApi from '../../api/thesisDocumentApi';
import getFileUrl from '../../utils/fileUrlHelper';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import PublishScoresModal from '../../components/thesis/PublishScoresModal';
import HideScoresModal from '../../components/thesis/HideScoresModal';
import ThesisDetailModal from '../../components/thesis/ThesisDetailModal';
import ThesisTimelineModal from '../../components/thesis/ThesisTimelineModal';

import {
  Award,
  GraduationCap,
  CheckCircle2,
  RotateCcw,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Check,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Send,
  AlertTriangle,
  Lock,
  CheckSquare,
  ShieldAlert,
  Paperclip,
  ExternalLink,
  Download,
  FileArchive,
  FileCode,
  BookOpen,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'PB_KIN', label: 'Phản biện kín' },
  { value: 'BC_HOIDONG', label: 'Báo cáo hội đồng' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
];

const TbmThesisEvaluationManagement = () => {
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const isTermActive = currentTerm?.status === 'ACTIVE';
  const { showToast } = useToast();

  // Active Main Tab: 'EVALUATIONS' | 'CRITERIA' | 'GRADING_PERIODS'
  const [mainTab, setMainTab] = useState('EVALUATIONS');

  // ==========================================
  // TAB 1: EVALUATIONS STATE
  // ==========================================
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Councils & Storage mapping for Council Rooms
  const [councilsMap, setCouncilsMap] = useState({});
  const [thesisCouncilMap, setThesisCouncilMap] = useState({});
  const [publishedScores, setPublishedScores] = useState({});

  // Complete Dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [thesisToComplete, setThesisToComplete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [thesisDetailModalOpen, setThesisDetailModalOpen] = useState(false);
  const [selectedThesisForDetail, setSelectedThesisForDetail] = useState(null);

  // Student Submissions State & Cache
  const [submissionCounts, setSubmissionCounts] = useState({});
  const [submissionCache, setSubmissionCache] = useState({});
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissionModalThesis, setSubmissionModalThesis] = useState(null);
  const [modalSubmissions, setModalSubmissions] = useState([]);
  const [loadingModalSubmissions, setLoadingModalSubmissions] = useState(false);

  // Publish Scores Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishTargetThesis, setPublishTargetThesis] = useState(null);

  // Hide Published Scores Modal
  const [hideScoresModalOpen, setHideScoresModalOpen] = useState(false);

  // ==========================================
  // TAB 2: CRITERIA STATE
  // ==========================================
  const [criteriaList, setCriteriaList] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [critForm, setCritForm] = useState({
    name: '',
    description: '',
    isRequired: true,
    isActive: true,
    order: 0,
  });

  // ==========================================
  // TAB 3: GRADING PERIODS STATE
  // ==========================================
  const [gradingPeriods, setGradingPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    notificationScope: 'LECTURER_ONLY',
    description: '',
  });
  const [processFailDialogOpen, setProcessFailDialogOpen] = useState(false);
  const [processingFail, setProcessingFail] = useState(false);

  const [unfailDialogOpen, setUnfailDialogOpen] = useState(false);
  const [unfailTarget, setUnfailTarget] = useState({ thesis: null, studentIndex: null, studentName: '' });
  const [unfailing, setUnfailing] = useState(false);

  const handleRequestUnfailStudent = (thesis, studentIndex, studentName) => {
    setUnfailTarget({ thesis, studentIndex, studentName });
    setUnfailDialogOpen(true);
  };

  const handleConfirmUnfailStudent = async () => {
    if (!unfailTarget.thesis || !unfailTarget.studentIndex) return;
    setUnfailing(true);
    try {
      const res = await thesisApi.unmarkStudentFail(unfailTarget.thesis._id, {
        studentIndex: unfailTarget.studentIndex,
      });
      if (res.success) {
        showToast(`Đã bỏ trạng thái rớt cho sinh viên ${unfailTarget.studentName} thành công!`, 'success');
        setUnfailDialogOpen(false);
        setUnfailTarget({ thesis: null, studentIndex: null, studentName: '' });
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.message || 'Thao tác bỏ đánh rớt thất bại', 'error');
    } finally {
      setUnfailing(false);
    }
  };

  // ==========================================
  // LOAD LOCAL STORAGE DATA (COUNCILS & PUBLISHED SCORES)
  // ==========================================
  const loadLocalMappings = useCallback(() => {
    try {
      const termId = currentTerm?._id || 'default';
      const cKey = `tbm_councils_${termId}`;
      const tcKey = `tbm_thesis_councils_${termId}`;
      const psKey = `tbm_published_scores_${termId}`;

      const savedCouncils = localStorage.getItem(cKey);
      if (savedCouncils) {
        const parsed = JSON.parse(savedCouncils);
        if (Array.isArray(parsed)) {
          const map = {};
          parsed.forEach((c) => {
            const cid = c.id || c._id;
            if (cid) map[cid] = c;
          });
          setCouncilsMap(map);
        }
      } else {
        setCouncilsMap({});
      }

      const savedThesisCouncils = localStorage.getItem(tcKey);
      if (savedThesisCouncils) {
        setThesisCouncilMap(JSON.parse(savedThesisCouncils));
      } else {
        setThesisCouncilMap({});
      }

      const savedPubScores = localStorage.getItem(psKey);
      if (savedPubScores) {
        setPublishedScores(JSON.parse(savedPubScores));
      } else {
        setPublishedScores({});
      }
    } catch (e) {
      console.warn('Error loading local council and publish mappings', e);
    }
  }, [currentTerm?._id]);

  useEffect(() => {
    loadLocalMappings();
  }, [loadLocalMappings]);

  // ==========================================
  // SCORE HELPER CALCULATION
  // ==========================================
  const getThesisScoreInfo = useCallback(
    (item, studentIndex = 1) => {
      const s = item.scores || {};

      // 1. GVHD (Supervisor) Score
      let scoreHD = null;
      if (studentIndex === 2) {
        scoreHD =
          s.student2SupervisorScore !== null && s.student2SupervisorScore !== undefined
            ? s.student2SupervisorScore
            : s.supervisorScore !== null && s.supervisorScore !== undefined
            ? s.supervisorScore
            : null;
      } else {
        scoreHD =
          s.student1SupervisorScore !== null && s.student1SupervisorScore !== undefined
            ? s.student1SupervisorScore
            : s.supervisorScore !== null && s.supervisorScore !== undefined
            ? s.supervisorScore
            : null;
      }

      // 2. Reviewer (PB kín) Scores
      const isAssignedPB1 = Boolean(
        item.reviewer1Id ||
        (Array.isArray(item.reviewers) && item.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
      );
      const isAssignedPB2 = Boolean(
        item.reviewer2Id ||
        (Array.isArray(item.reviewers) && item.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
      );

      let sPB1 = null;
      let sPB2 = null;

      if (studentIndex === 2) {
        sPB1 =
          s.student2Reviewer1Score !== null && s.student2Reviewer1Score !== undefined
            ? s.student2Reviewer1Score
            : s.reviewer1Score !== null && s.reviewer1Score !== undefined
            ? s.reviewer1Score
            : null;

        sPB2 =
          s.student2Reviewer2Score !== null && s.student2Reviewer2Score !== undefined
            ? s.student2Reviewer2Score
            : s.reviewer2Score !== null && s.reviewer2Score !== undefined
            ? s.reviewer2Score
            : null;
      } else {
        sPB1 =
          s.student1Reviewer1Score !== null && s.student1Reviewer1Score !== undefined
            ? s.student1Reviewer1Score
            : s.reviewer1Score !== null && s.reviewer1Score !== undefined
            ? s.reviewer1Score
            : null;

        sPB2 =
          s.student1Reviewer2Score !== null && s.student1Reviewer2Score !== undefined
            ? s.student1Reviewer2Score
            : s.reviewer2Score !== null && s.reviewer2Score !== undefined
            ? s.reviewer2Score
            : null;
      }

      const hasPB1 = sPB1 !== null && sPB1 !== undefined && !isNaN(sPB1);
      const hasPB2 = sPB2 !== null && sPB2 !== undefined && !isNaN(sPB2);

      let scorePB = null;
      if (isAssignedPB1 && isAssignedPB2) {
        if (hasPB1 && hasPB2) {
          scorePB = Number(((Number(sPB1) + Number(sPB2)) / 2).toFixed(2));
        }
      } else if (isAssignedPB1) {
        if (hasPB1) scorePB = Number(Number(sPB1).toFixed(2));
      } else if (isAssignedPB2) {
        if (hasPB2) scorePB = Number(Number(sPB2).toFixed(2));
      } else {
        const directPB = studentIndex === 2 ? (s.student2ReviewerScore ?? s.reviewerScore) : (s.student1ReviewerScore ?? s.reviewerScore);
        if (directPB !== null && directPB !== undefined && !isNaN(directPB)) {
          scorePB = Number(Number(directPB).toFixed(2));
        }
      }

      // 3. Council assignment & Individual Lecturer Scores
      const councilId = thesisCouncilMap ? thesisCouncilMap[item._id] : null;
      const assignedCouncil = councilId && councilsMap ? councilsMap[councilId] : null;

      const councilScores = Array.isArray(s.councilLecturerScores)
        ? s.councilLecturerScores.filter((e) => {
            if (!e) return false;
            if (studentIndex === 2) {
              return (e.student2Score !== null && e.student2Score !== undefined) || e.score !== null;
            }
            return (e.student1Score !== null && e.student1Score !== undefined) || e.score !== null;
          })
        : [];

      const getEntryScore = (entry) => {
        if (!entry) return null;
        if (studentIndex === 2) {
          return entry.student2Score !== null && entry.student2Score !== undefined
            ? entry.student2Score
            : entry.score ?? null;
        }
        return entry.student1Score !== null && entry.student1Score !== undefined
          ? entry.student1Score
          : entry.score ?? null;
      };

      let scoreGVHD1 = null;
      let scoreGVHD2 = null;

      if (assignedCouncil && Array.isArray(assignedCouncil.lecturers) && assignedCouncil.lecturers.length >= 2) {
        const lec1 = assignedCouncil.lecturers[0];
        const lec2 = assignedCouncil.lecturers[1];

        const entry1 = councilScores.find(
          (e) => (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === (lec1?.lecturerId || lec1?.userId) ||
                 (lec1?.name && e.lecturerName && e.lecturerName.trim().toLowerCase() === lec1.name.trim().toLowerCase())
        ) || councilScores[0];

        const entry2 = councilScores.find(
          (e) => (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === (lec2?.lecturerId || lec2?.userId) ||
                 (lec2?.name && e.lecturerName && e.lecturerName.trim().toLowerCase() === lec2.name.trim().toLowerCase())
        ) || (councilScores.length > 1 ? councilScores[1] : null);

        scoreGVHD1 = getEntryScore(entry1);
        scoreGVHD2 = entry2 && entry2 !== entry1 ? getEntryScore(entry2) : (councilScores.length > 1 ? getEntryScore(councilScores[1]) : null);
      } else {
        scoreGVHD1 = councilScores.length > 0 ? getEntryScore(councilScores[0]) : null;
        scoreGVHD2 = councilScores.length > 1 ? getEntryScore(councilScores[1]) : null;
      }

      // Điểm Hội Đồng (20%): Tính khi có đủ cả 2 giảng viên hội đồng
      let scoreCouncil = null;
      if (
        scoreGVHD1 !== null &&
        scoreGVHD1 !== undefined &&
        !isNaN(scoreGVHD1) &&
        scoreGVHD2 !== null &&
        scoreGVHD2 !== undefined &&
        !isNaN(scoreGVHD2)
      ) {
        scoreCouncil = Number(((Number(scoreGVHD1) + Number(scoreGVHD2)) / 2).toFixed(2));
      } else {
        const directCouncil = studentIndex === 2 ? (s.student2CouncilScore ?? s.councilScore) : (s.student1CouncilScore ?? s.councilScore);
        if (directCouncil !== null && directCouncil !== undefined && !isNaN(directCouncil)) {
          scoreCouncil = Number(Number(directCouncil).toFixed(2));
        } else {
          scoreCouncil = null;
        }
      }

      const isManuallyFailed = Boolean(studentIndex === 2 ? s.isStudent2Failed : s.isStudent1Failed);
      const manualFailReason = (studentIndex === 2 ? s.student2FailReason : s.student1FailReason) || 'Đã đánh dấu rớt (FAIL)';
      const failedStage = studentIndex === 2 ? s.student2FailedStage : s.student1FailedStage;
      const failedStages = (studentIndex === 2 ? s.student2FailedStages : s.student1FailedStages) || (failedStage ? [failedStage] : []);

      // Xác định chính xác vòng nào bị đánh dấu rớt để chỉ gán nhãn Rớt tại đúng vòng đó
      const isHDFailMarked = isManuallyFailed && (failedStages.includes('SUPERVISOR') || failedStage === 'SUPERVISOR' || (!failedStage && scoreHD === 0));
      const isPBFailMarked = isManuallyFailed && (failedStages.includes('REVIEWER_1') || failedStages.includes('REVIEWER_2') || failedStage === 'REVIEWER_1' || failedStage === 'REVIEWER_2' || (failedStage && failedStage.startsWith('REVIEWER')) || (!failedStage && scorePB === 0));
      const isCouncilFailMarked = isManuallyFailed && (failedStages.includes('COUNCIL') || failedStage === 'COUNCIL' || (!failedStage && scoreCouncil === 0));

      const hasHD = (scoreHD !== null && scoreHD !== undefined && !isNaN(scoreHD)) || isHDFailMarked;
      const isHDFailed = isHDFailMarked || (hasHD && Number(scoreHD) < 4.0);

      const hasPB = (scorePB !== null && scorePB !== undefined && !isNaN(scorePB)) || isPBFailMarked;
      const isPBFailed = isPBFailMarked || (hasPB && Number(scorePB) === 0);

      const hasCouncil = (scoreCouncil !== null && scoreCouncil !== undefined && !isNaN(scoreCouncil)) || isCouncilFailMarked;
      const isCouncilFailed = isCouncilFailMarked || (hasCouncil && Number(scoreCouncil) === 0);

      // 4. Điểm Tổng Kết (100%): GVHD (50%) + PB kín (30%) + Hội đồng (20%)
      let finalScore = null;
      const storedFinal = studentIndex === 2 ? s.student2FinalScore : s.student1FinalScore;
      if (storedFinal !== null && storedFinal !== undefined && !isNaN(storedFinal)) {
        finalScore = Number(Number(storedFinal).toFixed(2));
      } else if (isManuallyFailed) {
        finalScore = 0;
      } else if (hasHD && hasPB && hasCouncil && !isHDFailed && !isPBFailed && !isCouncilFailed) {
        finalScore = Number(
          (Number(scoreHD) * 0.5 + Number(scorePB) * 0.3 + Number(scoreCouncil) * 0.2).toFixed(2)
        );
      } else if (studentIndex === 1 && s.finalScore !== null && s.finalScore !== undefined && !isNaN(s.finalScore)) {
        finalScore = Number(Number(s.finalScore).toFixed(2));
      }

      // 5. Kết quả đánh giá
      let isFailed = false;
      let failReason = '';
      let isPassed = false;

      if (isManuallyFailed) {
        isFailed = true;
        failReason = manualFailReason;
        finalScore = 0;
      } else if (isHDFailed) {
        isFailed = true;
        failReason = 'Điểm GVHD < 4.0 (Không đạt)';
      } else if (isPBFailed) {
        isFailed = true;
        failReason = 'Điểm PB kín = 0 (Không đạt)';
      } else if (isCouncilFailed) {
        isFailed = true;
        failReason = 'Điểm Hội đồng = 0 (Không đạt)';
      } else if (finalScore !== null) {
        if (finalScore >= 5.0) {
          isPassed = true;
        } else {
          isFailed = true;
          failReason = 'Điểm tổng kết < 5.0 (Không đạt)';
        }
      }

      return {
        scoreHD: hasHD ? (isHDFailMarked ? 0 : Number(scoreHD)) : null,
        scorePB: hasPB ? (isPBFailMarked ? 0 : Number(scorePB)) : null,
        scorePB1: sPB1 !== null && sPB1 !== undefined ? Number(sPB1) : (isPBFailMarked ? 0 : null),
        scorePB2: sPB2 !== null && sPB2 !== undefined ? Number(sPB2) : null,
        scoreGVHD1: scoreGVHD1 !== null && scoreGVHD1 !== undefined ? Number(scoreGVHD1) : null,
        scoreGVHD2: scoreGVHD2 !== null && scoreGVHD2 !== undefined ? Number(scoreGVHD2) : null,
        scoreCouncil: hasCouncil ? (isCouncilFailMarked ? 0 : Number(scoreCouncil)) : null,
        finalScore: isFailed ? 0 : finalScore,
        hasHD,
        hasPB,
        hasPB1: hasPB,
        hasPB2,
        hasCouncil,
        assignedCouncil,
        hasTwoCouncilLecturers: Boolean(assignedCouncil?.lecturers?.length >= 2),
        isHDFailed,
        isPBFailed,
        isCouncilFailed,
        isHDFailMarked,
        isPBFailMarked,
        isCouncilFailMarked,
        isFailed,
        isPassed,
        failReason,
        isManuallyFailed,
      };
    },
    [thesisCouncilMap, councilsMap]
  );

  // ==========================================
  // FETCH METHODS
  // ==========================================
  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getEvaluations({
        search,
        status: 'ALL',
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setTheses(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đánh giá khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, currentTerm?._id, showToast]);

  const fetchCriteria = useCallback(async () => {
    setLoadingCriteria(true);
    try {
      const res = await thesisApi.getCriteria({
        academicTermId: currentTerm?._id || '',
        includeInactive: true,
      });
      if (res.success) {
        setCriteriaList(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tiêu chí', 'error');
    } finally {
      setLoadingCriteria(false);
    }
  }, [currentTerm?._id, showToast]);

  const fetchGradingPeriods = useCallback(async () => {
    setLoadingPeriods(true);
    try {
      const res = await thesisApi.getGradingPeriods({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setGradingPeriods(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đợt nhập điểm', 'error');
    } finally {
      setLoadingPeriods(false);
    }
  }, [currentTerm?._id, showToast]);

  useEffect(() => {
    if (mainTab === 'EVALUATIONS') {
      fetchEvaluations();
    } else if (mainTab === 'CRITERIA') {
      fetchCriteria();
    } else if (mainTab === 'GRADING_PERIODS') {
      fetchGradingPeriods();
    }
  }, [mainTab, fetchEvaluations, fetchCriteria, fetchGradingPeriods]);

  // ==========================================
  // STUDENT SUBMISSION FILES LOGIC & HELPERS
  // ==========================================
  const formatFileSize = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const formatDateTime = useCallback((d) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }, []);

  const getSubmissionFileIcon = useCallback((fileName) => {
    if (!fileName) return <FileText className="w-5 h-5 text-slate-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-600" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-5 h-5 text-blue-600" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileCode className="w-5 h-5 text-amber-600" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-5 h-5 text-purple-600" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  }, []);

  const handlePreviewSubmissionFile = useCallback((sub) => {
    if (!sub?.fileUrl) {
      showToast('Không tìm thấy đường dẫn tệp tài liệu', 'error');
      return;
    }
    const fullUrl = getFileUrl(sub.fileUrl);
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }, [showToast]);

  const handleDownloadSubmissionFile = useCallback((e, doc) => {
    e.stopPropagation();
    if (!doc?.fileUrl) {
      showToast('Không tìm thấy đường dẫn tệp tài liệu để tải về', 'error');
      return;
    }
    const fullUrl = getFileUrl(doc.fileUrl);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', doc.fileName || 'file-nop-khoa-luan');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [showToast]);

  const handleOpenSubmissionModal = useCallback(async (thesis) => {
    setSubmissionModalThesis(thesis);
    setSubmissionModalOpen(true);

    if (submissionCache[thesis._id]) {
      setModalSubmissions(submissionCache[thesis._id]);
    } else {
      setModalSubmissions([]);
    }

    setLoadingModalSubmissions(true);
    try {
      const res = await thesisDocumentApi.getLecturerSubmissions({ thesisId: thesis._id });
      if (res?.success && Array.isArray(res.data)) {
        setModalSubmissions(res.data);
        setSubmissionCache((prev) => ({ ...prev, [thesis._id]: res.data }));
        setSubmissionCounts((prev) => ({ ...prev, [thesis._id]: res.data.length }));
      } else {
        setModalSubmissions([]);
      }
    } catch (err) {
      console.warn('Error fetching submissions for modal:', err);
      showToast('Không thể tải danh sách file nộp', 'error');
    } finally {
      setLoadingModalSubmissions(false);
    }
  }, [submissionCache, showToast]);

  // Fetch file submission counts for all theses
  useEffect(() => {
    if (!theses || theses.length === 0) {
      setSubmissionCounts({});
      return;
    }

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const counts = {};
        const cache = {};
        await Promise.all(
          theses.map(async (t) => {
            try {
              const res = await thesisDocumentApi.getLecturerSubmissions({ thesisId: t._id });
              if (res?.success && Array.isArray(res.data)) {
                counts[t._id] = res.data.length;
                cache[t._id] = res.data;
              } else {
                counts[t._id] = 0;
                cache[t._id] = [];
              }
            } catch {
              counts[t._id] = 0;
              cache[t._id] = [];
            }
          })
        );
        if (isMounted) {
          setSubmissionCounts(counts);
          setSubmissionCache((prev) => ({ ...prev, ...cache }));
        }
      } catch (err) {
        console.warn('Could not load submission counts:', err);
      }
    };

    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [theses]);

  // ==========================================
  // FILTERED THESES (CLIENT FILTER TABS)
  // ==========================================
  const filteredTheses = useMemo(() => {
    return theses.filter((item) => {
      const info = getThesisScoreInfo(item);

      if (statusFilter === 'IN_PROGRESS') {
        // "Đang thực hiện": GVHD chưa chấm điểm và chưa bị FAIL
        if (info.hasHD) return false;
      } else if (statusFilter === 'PB_KIN') {
        // "Phản biện kín": Có điểm GVHD rồi (và GVHD >= 4.0), điểm PB kín chưa hoàn thành
        if (!info.hasHD || info.isHDFailed || info.hasPB) return false;
      } else if (statusFilter === 'BC_HOIDONG') {
        // "Báo cáo hội đồng": Đã có điểm PB kín (và không bị fail HD/PB), chưa có điểm hội đồng
        if (!info.hasPB || info.isHDFailed || info.isPBFailed || info.hasCouncil) return false;
      } else if (statusFilter === 'COMPLETED') {
        // "Hoàn tất": Các nhóm đã có tất cả các điểm đầy đủ hoặc trạng thái COMPLETED
        const isAllScored = info.hasHD && info.hasPB && info.hasCouncil;
        if (!isAllScored && item.status !== 'COMPLETED') return false;
      }

      return true;
    });
  }, [theses, statusFilter, getThesisScoreInfo]);


  // ==========================================
  // TAB 1 ACTIONS
  // ==========================================
  const handleConfirmComplete = async () => {
    if (!thesisToComplete) return;

    setActionLoading(true);
    try {
      const res = await thesisApi.completeEvaluation(thesisToComplete._id);
      if (res.success) {
        showToast('Đã hoàn tất đánh giá và xác nhận khóa luận tốt nghiệp!', 'success');
        setCompleteDialogOpen(false);
        setThesisToComplete(null);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.message || 'Hoàn tất đánh giá thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (item) => {
    setSelectedThesis(item);
    setDetailModalOpen(true);
  };

  // ==========================================
  // BATCH SCORE AVAILABILITY (Kiểm tra 100% đề tài có điểm mới cho phép công bố)
  // ==========================================
  const batchScoreAvailability = useMemo(() => {
    const list = theses;
    const total = list.length;
    if (total === 0) {
      return {
        totalTheses: 0,
        supervisorScore: { hasAll: false, count: 0, total: 0 },
        reviewer1Score: { hasAll: false, count: 0, total: 0 },
        councilScore: { hasAll: false, count: 0, total: 0 },
        finalScore: { hasAll: false, count: 0, total: 0 },
      };
    }

    let hdRequired = 0;
    let hdCount = 0;

    let pb1Required = 0;
    let pb1Count = 0;

    let councilRequired = 0;
    let councilCount = 0;

    let finalRequired = 0;
    let finalCount = 0;

    list.forEach((item) => {
      const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
      const info1 = getThesisScoreInfo(item, 1);
      const info2 = isGroup ? getThesisScoreInfo(item, 2) : null;

      // 1. GVHD (Supervisor)
      hdRequired++;
      const hd1Done = info1.hasHD || info1.isHDFailMarked || info1.isFailed;
      const hd2Done = !isGroup || (info2.hasHD || info2.isHDFailMarked || info2.isFailed);
      if (hd1Done && hd2Done) {
        hdCount++;
      }

      // 2. PB kín (Reviewer) - Bỏ qua ngoại lệ đề tài đã rớt trước vòng này
      const isEntirelyFailedAtHD = isGroup
        ? (info1.isHDFailMarked || (info1.isFailed && !info1.hasPB)) && (info2.isHDFailMarked || (info2.isFailed && !info2.hasPB))
        : (info1.isHDFailMarked || (info1.isFailed && !info1.hasPB));

      if (!isEntirelyFailedAtHD) {
        pb1Required++;
        const pb1Done = info1.hasPB || info1.isPBFailMarked || (info1.isFailed && !info1.hasPB);
        const pb2Done = !isGroup || info2.hasPB || info2.isPBFailMarked || (info2.isFailed && !info2.hasPB);
        if (pb1Done && pb2Done) {
          pb1Count++;
        }
      }

      // 3. Hội đồng (Council) - Bỏ qua ngoại lệ đề tài đã rớt trước vòng này
      const isEntirelyFailedBeforeCouncil = isGroup
        ? (info1.isFailed && !info1.hasCouncil) && (info2.isFailed && !info2.hasCouncil)
        : (info1.isFailed && !info1.hasCouncil);

      if (!isEntirelyFailedBeforeCouncil) {
        councilRequired++;
        const c1Done = info1.hasCouncil || info1.isCouncilFailMarked || (info1.isFailed && !info1.hasCouncil);
        const c2Done = !isGroup || info2.hasCouncil || info2.isCouncilFailMarked || (info2.isFailed && !info2.hasCouncil);
        if (c1Done && c2Done) {
          councilCount++;
        }
      }

      // 4. Final Score - Mọi đề tài có điểm tổng kết hợp lệ hoặc đã có kết quả FAIL
      finalRequired++;
      const f1Done = info1.finalScore !== null || info1.isFailed;
      const f2Done = !isGroup || (info2.finalScore !== null || info2.isFailed);
      if (f1Done && f2Done) {
        finalCount++;
      }
    });

    return {
      totalTheses: total,
      supervisorScore: {
        hasAll: hdRequired > 0 && hdCount === hdRequired,
        count: hdCount,
        total: hdRequired,
      },
      reviewer1Score: {
        hasAll: pb1Required > 0 && pb1Count === pb1Required,
        count: pb1Count,
        total: pb1Required,
      },
      councilScore: {
        hasAll: councilRequired > 0 && councilCount === councilRequired,
        count: councilCount,
        total: councilRequired,
      },
      finalScore: {
        hasAll: finalRequired > 0 && finalCount === finalRequired,
        count: finalCount,
        total: finalRequired,
      },
    };
  }, [theses, getThesisScoreInfo]);

  const handleOpenPublishAllModal = () => {
    setPublishTargetThesis(null);
    setPublishModalOpen(true);
  };

  const handleOpenPublishIndividualModal = (thesis) => {
    setPublishTargetThesis(thesis);
    setPublishModalOpen(true);
  };

  const handleSavePublishedScores = async (selectedScores, targetThesisIds = null) => {
    const termId = currentTerm?._id || 'default';
    const key = `tbm_published_scores_${termId}`;
    const updated = { ...publishedScores };

    if (Array.isArray(targetThesisIds)) {
      theses.forEach((t) => {
        if (targetThesisIds.includes(t._id)) {
          updated[t._id] = {
            ...(updated[t._id] || {}),
            ...selectedScores,
          };
        } else {
          // If this thesis was unselected, remove publication for the newly selected components
          const prev = updated[t._id] || {};
          const nextScores = { ...prev };
          Object.keys(selectedScores).forEach((k) => {
            if (selectedScores[k]) {
              nextScores[k] = false;
            }
          });
          updated[t._id] = nextScores;
        }
      });
    } else {
      theses.forEach((t) => {
        updated[t._id] = { ...selectedScores };
      });
      updated['GLOBAL_ALL'] = { ...selectedScores };
    }

    setPublishedScores(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem('tbm_published_scores_default', JSON.stringify(updated));
    localStorage.setItem('tbm_global_published_scores', JSON.stringify(selectedScores));
    localStorage.setItem('tbm_published_scores_global', JSON.stringify(selectedScores));
    window.dispatchEvent(new Event('storage'));

    try {
      await thesisApi.publishScores({
        academicTermId: currentTerm?._id || '',
        selectedScores,
        thesisIds: targetThesisIds,
      });
    } catch (err) {
      console.warn('Could not sync published scores to database:', err);
    }
  };

  // Batch Availability of currently published scores for the Hide Scores Modal
  const batchPublishedAvailability = useMemo(() => {
    let hdPublished = 0;
    let pb1Published = 0;
    let councilPublished = 0;
    let finalPublished = 0;

    theses.forEach((t) => {
      const pub = publishedScores[t._id] || t.publishedScores || {};
      if (pub.supervisorScore) hdPublished++;
      if (pub.reviewer1Score || pub.reviewerScore) pb1Published++;
      if (pub.councilScore) councilPublished++;
      if (pub.finalScore) finalPublished++;
    });

    const total = theses.length;
    return {
      totalTheses: total,
      supervisorScore: { count: hdPublished, total },
      reviewer1Score: { count: pb1Published, total },
      councilScore: { count: councilPublished, total },
      finalScore: { count: finalPublished, total },
    };
  }, [theses, publishedScores]);

  const handleOpenHideBulkModal = () => {
    setHideScoresModalOpen(true);
  };

  const handleHidePublishedScores = async (selectedScoresToHide, targetThesisIds) => {
    const termId = currentTerm?._id || 'default';
    const key = `tbm_published_scores_${termId}`;
    const updated = { ...publishedScores };

    if (Array.isArray(targetThesisIds) && targetThesisIds.length > 0) {
      theses.forEach((t) => {
        if (targetThesisIds.includes(t._id)) {
          const prev = updated[t._id] || {};
          const nextScores = { ...prev };
          Object.keys(selectedScoresToHide).forEach((k) => {
            if (selectedScoresToHide[k]) {
              nextScores[k] = false;
            }
          });
          updated[t._id] = nextScores;
        }
      });
    }

    setPublishedScores(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem('tbm_published_scores_default', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    try {
      const hidePayload = {};
      Object.keys(selectedScoresToHide).forEach((k) => {
        if (selectedScoresToHide[k]) {
          hidePayload[k] = false;
        }
      });
      await thesisApi.publishScores({
        academicTermId: currentTerm?._id || '',
        selectedScores: hidePayload,
        thesisIds: targetThesisIds,
      });
    } catch (err) {
      console.warn('Could not sync hidden scores to database:', err);
    }
  };

  // ==========================================
  // TAB 2: CRITERIA HANDLERS
  // ==========================================
  const handleOpenCriteriaModal = (criteria = null) => {
    if (criteria) {
      setEditingCriteria(criteria);
      setCritForm({
        name: criteria.name || '',
        description: criteria.description || '',
        isRequired: criteria.isRequired !== false,
        isActive: criteria.isActive !== false,
        order: criteria.order || 0,
      });
    } else {
      setEditingCriteria(null);
      setCritForm({
        name: '',
        description: '',
        isRequired: true,
        isActive: true,
        order: criteriaList.length + 1,
      });
    }
    setCriteriaModalOpen(true);
  };

  const handleSaveCriteria = async (e) => {
    if (e) e.preventDefault();
    if (!critForm.name.trim()) {
      showToast('Vui lòng nhập tên tiêu chí đánh giá', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (editingCriteria) {
        const res = await thesisApi.updateCriteria(editingCriteria._id, {
          ...critForm,
          academicTermId: currentTerm?._id || null,
        });
        if (res.success) {
          showToast('Cập nhật tiêu chí đánh giá thành công!', 'success');
          setCriteriaModalOpen(false);
          fetchCriteria();
        }
      } else {
        const res = await thesisApi.createCriteria({
          ...critForm,
          academicTermId: currentTerm?._id || null,
        });
        if (res.success) {
          showToast('Thêm tiêu chí đánh giá mới thành công!', 'success');
          setCriteriaModalOpen(false);
          fetchCriteria();
        }
      }
    } catch (err) {
      showToast(err.message || 'Lưu tiêu chí thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCriteriaActive = async (criteria) => {
    try {
      const res = await thesisApi.updateCriteria(criteria._id, {
        isActive: !criteria.isActive,
      });
      if (res.success) {
        showToast(
          `Đã ${criteria.isActive ? 'tắt' : 'bật'} tiêu chí "${criteria.name}"`,
          'success',
        );
        fetchCriteria();
      }
    } catch (err) {
      showToast(err.message || 'Thay đổi trạng thái tiêu chí thất bại', 'error');
    }
  };

  const handleDeleteCriteria = async (criteria) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tiêu chí "${criteria.name}"?`)) return;
    try {
      const res = await thesisApi.deleteCriteria(criteria._id);
      if (res.success) {
        showToast(res.message || 'Xóa tiêu chí thành công!', 'success');
        fetchCriteria();
      }
    } catch (err) {
      showToast(err.message || 'Xóa tiêu chí thất bại', 'error');
    }
  };

  // ==========================================
  // TAB 3: GRADING PERIODS HANDLERS
  // ==========================================
  const handleOpenPeriodModal = (period = null) => {
    if (period) {
      setEditingPeriod(period);
      const startIso = period.startDate
        ? new Date(period.startDate).toISOString().slice(0, 16)
        : '';
      const endIso = period.endDate
        ? new Date(period.endDate).toISOString().slice(0, 16)
        : '';
      setPeriodForm({
        name: period.name || '',
        startDate: startIso,
        endDate: endIso,
        notificationScope: period.notificationScope || 'LECTURER_ONLY',
        description: period.description || '',
      });
    } else {
      setEditingPeriod(null);
      const now = new Date();
      const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setPeriodForm({
        name: `Đợt nhập điểm KLTN - ${currentTerm?.name || 'Học kỳ'}`,
        startDate: now.toISOString().slice(0, 16),
        endDate: inOneWeek.toISOString().slice(0, 16),
        notificationScope: 'LECTURER_ONLY',
        description:
          'Thông báo mở đợt nhập điểm đánh giá Khóa luận Tốt nghiệp dành cho Giảng viên hướng dẫn.',
      });
    }
    setPeriodModalOpen(true);
  };

  const handleSavePeriod = async (e) => {
    if (e) e.preventDefault();
    if (!periodForm.name.trim()) {
      showToast('Vui lòng nhập tên đợt nhập điểm', 'error');
      return;
    }
    if (!periodForm.startDate || !periodForm.endDate) {
      showToast('Vui lòng chọn thời gian bắt đầu và kết thúc', 'error');
      return;
    }
    if (new Date(periodForm.endDate) <= new Date(periodForm.startDate)) {
      showToast('Thời gian kết thúc phải sau thời gian bắt đầu', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (editingPeriod) {
        const res = await thesisApi.updateGradingPeriod(editingPeriod._id, {
          ...periodForm,
          academicTermId: currentTerm?._id,
        });
        if (res.success) {
          showToast('Cập nhật đợt nhập điểm thành công!', 'success');
          setPeriodModalOpen(false);
          fetchGradingPeriods();
        }
      } else {
        const res = await thesisApi.createGradingPeriod({
          ...periodForm,
          academicTermId: currentTerm?._id,
        });
        if (res.success) {
          showToast(
            'Tạo đợt nhập điểm và phát thông báo đến đối tượng thành công!',
            'success',
          );
          setPeriodModalOpen(false);
          fetchGradingPeriods();
        }
      }
    } catch (err) {
      showToast(err.message || 'Lưu đợt nhập điểm thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePeriod = async (period) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đợt nhập điểm "${period.name}"?`)) return;
    try {
      const res = await thesisApi.deleteGradingPeriod(period._id);
      if (res.success) {
        showToast('Xóa đợt nhập điểm thành công!', 'success');
        fetchGradingPeriods();
      }
    } catch (err) {
      showToast(err.message || 'Xóa đợt nhập điểm thất bại', 'error');
    }
  };

  const handleProcessExpiredTheses = async () => {
    setProcessingFail(true);
    try {
      const res = await thesisApi.processExpiredGradingPeriods({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        showToast(
          res.message ||
            `Đã xử lý xong: ${res.data?.processedThesesCount || 0} đề tài bị đánh dấu FAIL do quá hạn.`,
          'success',
        );
        setProcessFailDialogOpen(false);
        fetchGradingPeriods();
        if (mainTab === 'EVALUATIONS') fetchEvaluations();
      }
    } catch (err) {
      showToast(err.message || 'Xử lý quá hạn thất bại', 'error');
    } finally {
      setProcessingFail(false);
    }
  };

  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  // Get KLTN Window Badge for current term
  const getThesisWindowBadge = () => {
    if (currentTerm?.thesis?.isRegistrationLocked) {
      return { text: 'Đã khóa', color: 'bg-rose-100 text-rose-800', isLocked: true };
    }
    if (!currentTerm?.thesis?.registrationStart && !currentTerm?.thesis?.registrationEnd) {
      return { text: 'Mở tự do', color: 'bg-slate-100 text-slate-700', isLocked: false };
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = currentTerm?.thesis?.registrationStart ? new Date(currentTerm.thesis.registrationStart) : null;
    const end = currentTerm?.thesis?.registrationEnd ? new Date(currentTerm.thesis.registrationEnd) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && now < start) {
      return { text: 'Sắp mở', color: 'bg-amber-100 text-amber-800', isLocked: false };
    }
    if (end && now > end) {
      return { text: 'Hết hạn', color: 'bg-rose-100 text-rose-800', isLocked: true };
    }
    return { text: 'Đang mở', color: 'bg-emerald-100 text-emerald-800', isLocked: false };
  };

  const windowBadge = getThesisWindowBadge();

  // Export table data (chỉ xuất các bản ghi đang hiển thị theo bộ lọc và từ khóa tìm kiếm)
  const [exportingData, setExportingData] = useState(false);

  const handleExportTableData = () => {
    // 1. Nếu đang ở Tab EVALUATIONS (Tổng hợp Đánh giá KLTN)
    if (mainTab === 'EVALUATIONS') {
      const listToExport = filteredTheses || [];
      if (!listToExport || listToExport.length === 0) {
        showToast('Không có dữ liệu đề tài phù hợp để xuất file', 'info');
        return;
      }

      try {
        setExportingData(true);
        const termCode = currentTerm?.code ? currentTerm.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'HocKy';
        const termName = currentTerm?.name ? `${currentTerm.name} - ${currentTerm.academicYear || ''}` : '';
        const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Tất cả';

        const escapeHtml = (str) => {
          if (!str) return '';
          return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        };

        let tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <style>
              table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
              th { background-color: #123891; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11pt; }
              td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; vertical-align: middle; }
              .text-center { text-align: center; }
              .text-left { text-align: left; }
              .header-title { font-size: 14pt; font-weight: bold; color: #123891; text-align: center; }
              .header-sub { font-size: 11pt; text-align: center; color: #475569; }
            </style>
          </head>
          <body>
            <table>
              <tr><td colspan="16" class="header-title">BẢNG TỔNG HỢP ĐÁNH GIÁ KHÓA LUẬN TỐT NGHIỆP</td></tr>
              ${termName ? `<tr><td colspan="16" class="header-sub">Học kỳ: ${escapeHtml(termName)}</td></tr>` : ''}
              <tr><td colspan="16" class="header-sub">Bộ lọc trạng thái: ${escapeHtml(statusLabel)}${search ? ` | Từ khóa tìm kiếm: "${escapeHtml(search.trim())}"` : ''} (Số lượng: ${listToExport.length} đề tài)</td></tr>
              <tr><td colspan="16"></td></tr>
              <thead>
                <tr>
                  <th style="width: 50px;">STT</th>
                  <th style="width: 320px;">Tên đề tài KLTN</th>
                  <th style="width: 120px;">Loại đề tài</th>
                  <th style="width: 180px;">Sinh viên 1</th>
                  <th style="width: 110px;">MSSV 1</th>
                  <th style="width: 180px;">Sinh viên 2</th>
                  <th style="width: 110px;">MSSV 2</th>
                  <th style="width: 180px;">GV Hướng Dẫn</th>
                  <th style="width: 160px;">GVPB 1</th>
                  <th style="width: 160px;">GVPB 2</th>
                  <th style="width: 160px;">Hội đồng</th>
                  <th style="width: 100px;">Điểm GVHD</th>
                  <th style="width: 100px;">Điểm PB kín</th>
                  <th style="width: 110px;">Điểm Hội đồng</th>
                  <th style="width: 100px;">Tổng điểm</th>
                  <th style="width: 120px;">Kết quả</th>
                </tr>
              </thead>
              <tbody>
        `;

        listToExport.forEach((item, idx) => {
          const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
          const s1 = getThesisScoreInfo(item, 1);
          const s2 = isGroup ? getThesisScoreInfo(item, 2) : null;

          const sv1Name = item.studentId?.userId?.fullName || item.studentId?.fullName || '-';
          const sv1Code = item.studentId?.studentCode || '-';
          const sv2Name = isGroup ? (item.secondStudentId?.userId?.fullName || item.secondStudentId?.fullName || '-') : '-';
          const sv2Code = isGroup ? (item.secondStudentId?.studentCode || '-') : '-';

          const supervisorName = item.supervisorId?.userId?.fullName || item.supervisorId?.fullName || '-';
          const rev1Name = item.reviewer1Id?.userId?.fullName || item.reviewer1Id?.fullName || 'Chưa phân công';
          const rev2Name = item.reviewer2Id?.userId?.fullName || item.reviewer2Id?.fullName || 'Chưa phân công';

          const council = councilsMap[item._id] || s1.assignedCouncil;
          const councilName = council ? (council.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim() : 'Chưa phân công';

          const formatColScore = (score1Val, score2Val) => {
            if (score1Val === null || score1Val === undefined) return '-';
            if (isGroup && score2Val !== null && score2Val !== undefined && score2Val !== score1Val) {
              return `SV1: ${score1Val} | SV2: ${score2Val}`;
            }
            return String(score1Val);
          };

          const gvhdScore = formatColScore(s1.scoreHD, s2?.scoreHD);
          const pbScore = formatColScore(s1.scorePB, s2?.scorePB);
          const hdScore = formatColScore(s1.scoreCouncil, s2?.scoreCouncil);
          const finalScore = formatColScore(s1.finalScore, s2?.finalScore);

          let resultText = 'Đang thực hiện';
          if (s1.isFailed || (s2 && s2.isFailed)) {
            resultText = 'Rớt (FAIL)';
          } else if (s1.isPassed) {
            resultText = 'Đạt';
          }

          tableHtml += `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="text-left">${escapeHtml(item.thesisTitle || '')}</td>
              <td class="text-center">${isGroup ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}</td>
              <td class="text-left">${escapeHtml(sv1Name)}</td>
              <td class="text-center">${escapeHtml(sv1Code)}</td>
              <td class="text-left">${escapeHtml(sv2Name)}</td>
              <td class="text-center">${escapeHtml(sv2Code)}</td>
              <td class="text-left">${escapeHtml(supervisorName)}</td>
              <td class="text-left">${escapeHtml(rev1Name)}</td>
              <td class="text-left">${escapeHtml(rev2Name)}</td>
              <td class="text-left">${escapeHtml(councilName)}</td>
              <td class="text-center">${escapeHtml(gvhdScore)}</td>
              <td class="text-center">${escapeHtml(pbScore)}</td>
              <td class="text-center">${escapeHtml(hdScore)}</td>
              <td class="text-center">${escapeHtml(finalScore)}</td>
              <td class="text-center">${escapeHtml(resultText)}</td>
            </tr>
          `;
        });

        tableHtml += `
              </tbody>
            </table>
          </body>
          </html>
        `;

        const blob = new Blob(['\uFEFF' + tableHtml], {
          type: 'application/vnd.ms-excel;charset=utf-8',
        });
        const filename = `Bang_tong_hop_danh_gia_KLTN_${termCode}.xls`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast(`Xuất bảng tổng hợp đánh giá thành công (${listToExport.length} đề tài)!`, 'success');
      } catch (err) {
        console.error('Export error:', err);
        showToast('Không thể xuất file. Vui lòng thử lại.', 'error');
      } finally {
        setExportingData(false);
      }
    } else if (mainTab === 'CRITERIA') {
      const listToExport = criteria || [];
      if (!listToExport || listToExport.length === 0) {
        showToast('Không có dữ liệu tiêu chí để xuất file', 'info');
        return;
      }
      try {
        setExportingData(true);
        const termCode = currentTerm?.code ? currentTerm.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'HocKy';
        let tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"></head><body>
          <table border="1">
            <thead>
              <tr style="background:#123891;color:#fff;">
                <th>STT</th>
                <th>Tên tiêu chí đánh giá</th>
                <th>Điểm tối đa</th>
                <th>Trọng số (%)</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
        `;
        listToExport.forEach((c, idx) => {
          tableHtml += `
            <tr>
              <td>${idx + 1}</td>
              <td>${c.name || ''}</td>
              <td>${c.maxScore ?? ''}</td>
              <td>${c.weight ? c.weight + '%' : ''}</td>
              <td>${c.order ?? ''}</td>
              <td>${c.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}</td>
            </tr>
          `;
        });
        tableHtml += `</tbody></table></body></html>`;
        const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const filename = `Danh_sach_tieu_chi_danh_gia_${termCode}.xls`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast('Xuất danh sách tiêu chí thành công!', 'success');
      } finally {
        setExportingData(false);
      }
    } else if (mainTab === 'GRADING_PERIODS') {
      const listToExport = gradingPeriods || [];
      if (!listToExport || listToExport.length === 0) {
        showToast('Không có dữ liệu đợt nhập điểm để xuất file', 'info');
        return;
      }
      try {
        setExportingData(true);
        const termCode = currentTerm?.code ? currentTerm.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'HocKy';
        let tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"></head><body>
          <table border="1">
            <thead>
              <tr style="background:#123891;color:#fff;">
                <th>STT</th>
                <th>Tên đợt nhập điểm</th>
                <th>Thời gian bắt đầu</th>
                <th>Thời gian kết thúc</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
        `;
        listToExport.forEach((p, idx) => {
          tableHtml += `
            <tr>
              <td>${idx + 1}</td>
              <td>${p.name || ''}</td>
              <td>${p.startDate ? new Date(p.startDate).toLocaleString('vi-VN') : ''}</td>
              <td>${p.endDate ? new Date(p.endDate).toLocaleString('vi-VN') : ''}</td>
              <td>${p.computedStatus === 'ACTIVE' ? 'Đang diễn ra' : (p.computedStatus === 'UPCOMING' ? 'Sắp diễn ra' : 'Đã kết thúc')}</td>
            </tr>
          `;
        });
        tableHtml += `</tbody></table></body></html>`;
        const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const filename = `Danh_sach_dot_nhap_diem_${termCode}.xls`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast('Xuất danh sách đợt nhập điểm thành công!', 'success');
      } finally {
        setExportingData(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#123891] text-white flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                Quản lý Khóa luận Tốt nghiệp (KLTN)
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center md:justify-end gap-2.5 w-full md:w-auto">
            {/* Configure KLTN Timeline Button */}
            <button
              type="button"
              disabled={!isTermActive}
              onClick={() => setTimelineModalOpen(true)}
              className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#102d7d] text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer shadow-2xs w-full sm:w-auto shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTermActive ? 'Học kỳ đã đóng, không thể cấu hình thời gian' : 'Cấu hình thời gian mở cổng đăng ký, phân công & bảo vệ KLTN'}
            >
              <Clock className="w-3.5 h-3.5 text-[#123891] shrink-0" />
              <span>Thời gian mở KLTN</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${windowBadge.color} shrink-0`}>
                {windowBadge.text}
              </span>
            </button>

            {/* Quick Switch to KLTN Grading Periods Management */}
            <button
              type="button"
              onClick={() => setMainTab('GRADING_PERIODS')}
              className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#123891] text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer shadow-2xs w-full sm:w-auto shrink-0"
              title="Quản lý đợt nhập điểm, tiêu chí đánh giá và bảng điểm KLTN"
            >
              <Award className="w-3.5 h-3.5 text-[#123891] shrink-0" />
              <span>Thời gian nhập điểm KLTN</span>
            </button>

            <button
              type="button"
              onClick={handleExportTableData}
              disabled={exportingData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0"
              title="Xuất file"
              aria-label="Xuất file danh sách đang hiển thị"
            >
              <FileSpreadsheet className={`w-4 h-4 shrink-0 ${exportingData ? 'animate-bounce text-[#123891]' : ''}`} />
              <span>Xuất file</span>
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 overflow-x-auto no-scrollbar scroll-smooth pb-1">
          <button
            type="button"
            onClick={() => setMainTab('EVALUATIONS')}
            className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
              mainTab === 'EVALUATIONS'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>1. Tổng hợp Đánh giá KLTN</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('CRITERIA')}
            className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
              mainTab === 'CRITERIA'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>2. Quản lý Tiêu chí Đánh giá (GVHD)</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('GRADING_PERIODS')}
            className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
              mainTab === 'GRADING_PERIODS'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>3. Quản lý Thời gian Nhập điểm</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: EVALUATIONS TABLE */}
      {/* ========================================== */}
      {mainTab === 'EVALUATIONS' && (
        <div className="space-y-4">
          {/* Search Bar, Action Buttons & Semester Filter */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input on the left */}
            <div className="w-full lg:w-80 xl:w-96 shrink-0">
              <SearchInput
                value={search}
                onChange={(val) => setSearch(val)}
                placeholder="Tìm MSSV SV1, SV2, Tên SV, Tên đề tài, GVHD, PB..."
              />
            </div>

            {/* Right side controls: Action buttons & Far-Right Semester Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end flex-wrap">
              {/* Nút Ẩn công bố điểm */}
              <button
                type="button"
                disabled={!isTermActive}
                onClick={handleOpenHideBulkModal}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isTermActive ? 'Học kỳ đã đóng, không thể thao tác' : 'Mở hộp thoại ẩn các điểm đã công bố cho sinh viên'}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ẩn điểm đã công bố</span>
              </button>

              {/* Nút Công bố điểm */}
              <button
                type="button"
                disabled={!isTermActive}
                onClick={handleOpenPublishAllModal}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isTermActive ? 'Học kỳ đã đóng, không thể thao tác' : 'Công bố điểm hướng dẫn, phản biện, hội đồng đồng loạt cho các đề tài'}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Công bố điểm</span>
              </button>

              {/* Semester Dropdown Filter (All the way to the far right side) */}
              <select
                value={currentTerm?._id || ''}
                onChange={(e) => {
                  if (setCurrentTerm && e.target.value) {
                    setCurrentTerm(e.target.value);
                  }
                }}
                className="w-full sm:w-auto min-w-[210px] py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer shrink-0"
              >
                {Array.isArray(terms) &&
                  terms.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : '• Đã đóng'}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Closed term notice banner */}
          {!isTermActive && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Học kỳ đã đóng ({currentTerm?.name || 'Học kỳ cũ'}):</strong> Dữ liệu đánh giá KLTN đã được khóa và chỉ cho phép xem chi tiết. Các thao tác công bố, ẩn điểm và sửa đổi đã bị vô hiệu hóa.
              </span>
            </div>
          )}

          {/* Cụm tab lọc trạng thái - 1 hàng cuộn ngang mượt mà */}
          <div className="w-full overflow-x-auto no-scrollbar scroll-smooth pb-1">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs shadow-2xs">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                    statusFilter === opt.value
                      ? 'bg-white text-[#123891] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={5} cols={6} />
              </div>
            ) : filteredTheses.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Không có đề tài nào phù hợp"
                  description="Hiện không có đề tài khóa luận nào khớp với bộ lọc hoặc từ khóa tìm kiếm đã chọn."
                />
              </div>
            ) : (
              <>
                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">STT</th>
                      <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                      <th className="py-3.5 px-4">Sinh viên thực hiện</th>
                      <th className="py-3.5 px-4">Điều kiện GVHD</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[130px]">File nộp</th>
                      <th className="py-3.5 px-4">Giảng viên Khóa Luận</th>
                      <th className="py-3.5 px-4">Bảng điểm thành phần</th>
                      <th className="py-3.5 px-4">Điểm Tổng Kết</th>
                      <th className="py-3.5 px-4 text-center">Kết quả</th>
                      <th className="py-3.5 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTheses.map((item, idx) => {
                      const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
                      const scoreInfo1 = getThesisScoreInfo(item, 1);
                      const scoreInfo2 = isGroup ? getThesisScoreInfo(item, 2) : null;
                      const scoreInfo = scoreInfo1;

                      const isFullyGraded = isGroup
                        ? (scoreInfo1.finalScore !== null || scoreInfo1.isFailed) && (scoreInfo2?.finalScore !== null || scoreInfo2?.isFailed)
                        : (scoreInfo.finalScore !== null || scoreInfo.isFailed);
                      const isCompleted = item.status === 'COMPLETED';

                      // Check if any score is currently published for this thesis
                      const pub = publishedScores[item._id] || {};
                      const hasAnyPublished = Object.values(pub).some(Boolean);

                      // Helper function to render a single student's component scores
                      const renderStudentComponentScores = (info, studentLabel, dotColor) => (
                        <div className="space-y-0.5 text-[11px] py-0.5">
                          {studentLabel && (
                            <div className="text-[10px] font-sans font-bold text-slate-600 flex items-center gap-1 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                              <span>{studentLabel}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 font-sans">GVHD (50%):</span>{' '}
                            {info.isHDFailMarked ? (
                              <span className="inline-flex items-center gap-1">
                                <strong className="text-rose-600 font-bold">0.0</strong>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                  Rớt
                                </span>
                              </span>
                            ) : (
                              <strong
                                className={
                                  info.hasHD
                                    ? 'text-[#123891]'
                                    : 'text-slate-400 font-normal font-sans'
                                }
                              >
                                {info.hasHD ? info.scoreHD : '—'}
                              </strong>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">PB kín (30%):</span>{' '}
                            {info.isPBFailMarked ? (
                              <span className="inline-flex items-center gap-1">
                                <strong className="text-rose-600 font-bold">0.0</strong>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                  Rớt
                                </span>
                              </span>
                            ) : (
                              <strong
                                className={
                                  info.hasPB
                                    ? 'text-[#123891]'
                                    : 'text-slate-400 font-normal font-sans'
                                }
                              >
                                {info.hasPB ? info.scorePB : '—'}
                              </strong>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10.5px]">
                            <span className="text-slate-400 font-sans">GVHĐ 1:</span>{' '}
                            <span className={info.scoreGVHD1 !== null ? 'text-slate-800 font-bold' : 'text-slate-400 font-sans'}>
                              {info.scoreGVHD1 !== null ? info.scoreGVHD1 : '—'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-400 font-sans">GVHĐ 2:</span>{' '}
                            <span className={info.scoreGVHD2 !== null ? 'text-slate-800 font-bold' : 'text-slate-400 font-sans'}>
                              {info.scoreGVHD2 !== null ? info.scoreGVHD2 : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">Điểm hội đồng (20%):</span>{' '}
                            {info.isCouncilFailMarked ? (
                              <span className="inline-flex items-center gap-1">
                                <strong className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  0.0
                                </strong>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                  Rớt
                                </span>
                              </span>
                            ) : info.hasCouncil ? (
                              <strong className="text-[#123891] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {info.scoreCouncil}
                              </strong>
                            ) : info.hasTwoCouncilLecturers && (info.scoreGVHD1 !== null || info.scoreGVHD2 !== null) ? (
                              <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-sans border border-amber-200" title="Chờ giảng viên còn lại trong hội đồng chấm điểm để tính trung bình">
                                Chờ GV còn lại
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal font-sans">—</span>
                            )}
                          </div>
                        </div>
                      );

                      // Helper function to render a single student's final score
                      const renderStudentFinalScore = (info, studentLabel, dotColor) => (
                        <div className="flex flex-col py-0.5">
                          {studentLabel && (
                            <span className="text-[10px] font-sans font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                              <span>{studentLabel}:</span>
                            </span>
                          )}
                          {info.isFailed ? (
                            <div className="inline-flex items-baseline gap-1">
                              <span className="text-base font-extrabold font-mono text-rose-600">
                                0.0
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                /10
                              </span>
                              <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                Rớt
                              </span>
                            </div>
                          ) : info.finalScore !== null ? (
                            <div className="inline-flex items-baseline gap-1">
                              <span
                                className={`text-base font-extrabold font-mono ${
                                  info.finalScore >= 5.0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {info.finalScore}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                /10
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal font-sans text-xs">—</span>
                          )}
                        </div>
                      );

                      // Helper function to render a single student's result badge
                      const renderStudentResult = (info, studentName, studentCode, studentLabel, studentIndex = 1) => (
                        <div className="py-0.5 flex flex-col items-center gap-1">
                          {studentLabel && (
                            <span className="text-[10px] font-sans font-bold text-slate-500 mb-0.5">
                              {studentLabel}:
                            </span>
                          )}
                          {info.isFailed ? (
                            <>
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                title={`${studentName || 'Sinh viên'} (${studentCode || ''}): ${info.failReason}`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>FAIL (K.Đạt)</span>
                              </span>
                              {!isCompleted && isTermActive && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestUnfailStudent(item, studentIndex, studentName || `Sinh viên ${studentIndex}`)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer shadow-2xs hover:shadow-xs mt-0.5"
                                  title={`Bỏ trạng thái rớt cho ${studentName || 'sinh viên'}`}
                                >
                                  <RotateCcw className="w-3 h-3 text-amber-600" />
                                  <span>Bỏ đánh rớt</span>
                                </button>
                              )}
                            </>
                          ) : info.isPassed ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title={`${studentName || 'Sinh viên'} (${studentCode || ''}): Đạt yêu cầu`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>PASS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Chưa có điểm</span>
                            </span>
                          )}
                        </div>
                      );

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition">
                          {/* STT */}
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Title */}
                          <td className="py-3.5 px-4 min-w-[220px] max-w-sm" title={item.thesisTitle}>
                            <strong
                              onClick={() => {
                                setSelectedThesisForDetail(item);
                                setThesisDetailModalOpen(true);
                              }}
                              className="text-slate-900 line-clamp-2 leading-snug hover:text-[#123891] cursor-pointer transition"
                            >
                              {item.thesisTitle}
                            </strong>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-1">
                              {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                            </span>
                          </td>

                          {/* Students */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isGroup ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                  <strong className="text-slate-900">
                                    {item.studentId?.userId?.fullName}
                                  </strong>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    ({item.studentId?.studentCode})
                                  </span>
                                </div>

                                <div className="border-t border-slate-100" />

                                <div className="flex items-center gap-1.5 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                                  <strong className="text-slate-900">
                                    {item.secondStudentId?.userId?.fullName}
                                  </strong>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    ({item.secondStudentId?.studentCode})
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                                <strong className="text-slate-900">
                                  {item.studentId?.userId?.fullName}
                                </strong>
                                <span className="text-[11px] font-mono text-slate-400">
                                  ({item.studentId?.studentCode})
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Condition Passed Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.isCriteriaPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đạt tiêu chí</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <Clock className="w-3 h-3" />
                                <span>Chưa đánh giá</span>
                              </span>
                            )}
                          </td>

                          {/* File nộp Column */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {submissionCounts[item._id] === undefined ? (
                              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                                <RefreshCw className="w-3 h-3 animate-spin text-[#123891]" />
                                <span>Đang tải...</span>
                              </div>
                            ) : submissionCounts[item._id] > 0 ? (
                              <span className="text-xs font-semibold text-slate-800">
                                Đã nộp <span className="font-bold text-[#123891]">{submissionCounts[item._id]}</span> file
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Chưa nộp file
                              </span>
                            )}
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenSubmissionModal(item)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#123891] hover:text-[#0d2a75] hover:underline cursor-pointer transition"
                                title="Xem chi tiết danh sách file nộp"
                              >
                                <span>Xem chi tiết</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Giảng viên Khóa Luận */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1 text-[11px]">
                              <div>
                                <span className="text-slate-400">GVHD:</span>{' '}
                                <span className="font-semibold text-slate-800">
                                  {item.supervisorId?.userId?.fullName || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">GVPB1:</span>{' '}
                                <span className="font-semibold text-slate-800">
                                  {item.reviewer1Id?.userId?.fullName ||
                                    (Array.isArray(item.reviewers) &&
                                      item.reviewers.find((r) => r.isPrivateReviewer)?.lecturerId?.userId?.fullName) ||
                                    '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">GVPB2:</span>{' '}
                                <span className="font-semibold text-slate-800">
                                  {item.reviewer2Id?.userId?.fullName ||
                                    (Array.isArray(item.reviewers) &&
                                      item.reviewers.find((r) => r.isCouncilReviewer)?.lecturerId?.userId?.fullName) ||
                                    '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Hội đồng:</span>{' '}
                                <span className="font-semibold text-[#123891]">
                                  {scoreInfo.assignedCouncil?.name || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Bảng điểm thành phần */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                            {isGroup ? (
                              <div className="space-y-2">
                                {renderStudentComponentScores(
                                  scoreInfo1,
                                  `SV1: ${item.studentId?.userId?.fullName || 'Sinh viên 1'}`,
                                  'bg-blue-600'
                                )}
                                <div className="border-t border-slate-100" />
                                {renderStudentComponentScores(
                                  scoreInfo2,
                                  `SV2: ${item.secondStudentId?.userId?.fullName || 'Sinh viên 2'}`,
                                  'bg-indigo-600'
                                )}
                              </div>
                            ) : (
                              renderStudentComponentScores(scoreInfo, null, 'bg-[#123891]')
                            )}
                          </td>

                          {/* Final Score */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isGroup ? (
                              <div className="space-y-2">
                                {renderStudentFinalScore(scoreInfo1, 'SV1', 'bg-blue-600')}
                                <div className="border-t border-slate-100" />
                                {renderStudentFinalScore(scoreInfo2, 'SV2', 'bg-indigo-600')}
                              </div>
                            ) : (
                              scoreInfo.finalScore !== null ? (
                                <div className="inline-flex flex-col">
                                  <span
                                    className={`text-base font-extrabold font-mono ${
                                      scoreInfo.finalScore >= 5.0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {scoreInfo.finalScore}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    Thang 10
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-normal font-sans text-sm">—</span>
                              )
                            )}
                          </td>

                          {/* Result (PASS / FAIL) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isGroup ? (
                              <div className="space-y-2 flex flex-col items-center">
                                {renderStudentResult(
                                  scoreInfo1,
                                  item.studentId?.userId?.fullName,
                                  item.studentId?.studentCode,
                                  'SV1',
                                  1
                                )}
                                <div className="border-t border-slate-100 w-full" />
                                {renderStudentResult(
                                  scoreInfo2,
                                  item.secondStudentId?.userId?.fullName,
                                  item.secondStudentId?.studentCode,
                                  'SV2',
                                  2
                                )}
                              </div>
                            ) : (
                              renderStudentResult(
                                scoreInfo,
                                item.studentId?.userId?.fullName,
                                item.studentId?.studentCode,
                                null,
                                1
                              )
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View detail button */}
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(item)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                                title="Xem chi tiết điểm & nhận xét"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

{/* Xác nhận hoàn tất button */}
                              {!isCompleted && isFullyGraded && isTermActive && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setThesisToComplete(item);
                                    setCompleteDialogOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                                  title="Hoàn tất đánh giá (Xác nhận)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Xác nhận</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {/* Mobile Card List (< 768px) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredTheses.map((item, idx) => {
                    const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
                    const scoreInfo1 = getThesisScoreInfo(item, 1);
                    const scoreInfo2 = isGroup ? getThesisScoreInfo(item, 2) : null;
                    const scoreInfo = scoreInfo1;

                    const isFullyGraded = isGroup
                      ? (scoreInfo1.finalScore !== null || scoreInfo1.isFailed) && (scoreInfo2?.finalScore !== null || scoreInfo2?.isFailed)
                      : (scoreInfo.finalScore !== null || scoreInfo.isFailed);
                    const isCompleted = item.status === 'COMPLETED';

                    // Helper function to render a single student's component scores for mobile card
                    const renderStudentComponentScores = (info, studentLabel, dotColor) => (
                      <div className="space-y-0.5 text-[11px] py-0.5">
                        {studentLabel && (
                          <div className="text-[10px] font-sans font-bold text-slate-600 flex items-center gap-1 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                            <span>{studentLabel}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 font-sans">GVHD (50%):</span>{' '}
                          {info.isHDFailMarked ? (
                            <span className="inline-flex items-center gap-1">
                              <strong className="text-rose-600 font-bold">0.0</strong>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                Rớt
                              </span>
                            </span>
                          ) : (
                            <strong
                              className={
                                info.hasHD
                                  ? 'text-[#123891]'
                                  : 'text-slate-400 font-normal font-sans'
                              }
                            >
                              {info.hasHD ? info.scoreHD : '—'}
                            </strong>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans">PB kín (30%):</span>{' '}
                          {info.isPBFailMarked ? (
                            <span className="inline-flex items-center gap-1">
                              <strong className="text-rose-600 font-bold">0.0</strong>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                Rớt
                              </span>
                            </span>
                          ) : (
                            <strong
                              className={
                                info.hasPB
                                  ? 'text-[#123891]'
                                  : 'text-slate-400 font-normal font-sans'
                              }
                            >
                              {info.hasPB ? info.scorePB : '—'}
                            </strong>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10.5px]">
                          <span className="text-slate-400 font-sans">GVHĐ 1:</span>{' '}
                          <span className={info.scoreGVHD1 !== null ? 'text-slate-800 font-bold' : 'text-slate-400 font-sans'}>
                            {info.scoreGVHD1 !== null ? info.scoreGVHD1 : '—'}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-400 font-sans">GVHĐ 2:</span>{' '}
                          <span className={info.scoreGVHD2 !== null ? 'text-slate-800 font-bold' : 'text-slate-400 font-sans'}>
                            {info.scoreGVHD2 !== null ? info.scoreGVHD2 : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans">Điểm hội đồng (20%):</span>{' '}
                          {info.isCouncilFailMarked ? (
                            <span className="inline-flex items-center gap-1">
                              <strong className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                0.0
                              </strong>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                Rớt
                              </span>
                            </span>
                          ) : info.hasCouncil ? (
                            <strong className="text-[#123891] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {info.scoreCouncil}
                            </strong>
                          ) : info.hasTwoCouncilLecturers && (info.scoreGVHD1 !== null || info.scoreGVHD2 !== null) ? (
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-sans border border-amber-200" title="Chờ giảng viên còn lại trong hội đồng chấm điểm để tính trung bình">
                              Chờ GV còn lại
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal font-sans">—</span>
                          )}
                        </div>
                      </div>
                    );

                    // Helper function to render a single student's final score for mobile card
                    const renderStudentFinalScore = (info, studentLabel, dotColor) => (
                      <div className="flex flex-col py-0.5">
                        {studentLabel && (
                          <span className="text-[10px] font-sans font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                            <span>{studentLabel}:</span>
                          </span>
                        )}
                        {info.isFailed ? (
                          <div className="inline-flex items-baseline gap-1">
                            <span className="text-base font-extrabold font-mono text-rose-600">
                              0.0
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              /10
                            </span>
                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                              Rớt
                            </span>
                          </div>
                        ) : info.finalScore !== null ? (
                          <div className="inline-flex items-baseline gap-1">
                            <span
                              className={`text-base font-extrabold font-mono ${
                                info.finalScore >= 5.0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {info.finalScore}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              /10
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal font-sans text-xs">—</span>
                        )}
                      </div>
                    );

                    // Helper function to render a single student's result badge for mobile card
                    const renderStudentResult = (info, studentName, studentCode, studentLabel, studentIndex = 1) => (
                      <div className="py-0.5 flex flex-col items-center gap-1">
                        {studentLabel && (
                          <span className="text-[10px] font-sans font-bold text-slate-500 mb-0.5">
                            {studentLabel}:
                          </span>
                        )}
                        {info.isFailed ? (
                          <>
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              title={`${studentName || 'Sinh viên'} (${studentCode || ''}): ${info.failReason}`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>FAIL (K.Đạt)</span>
                            </span>
                            {!isCompleted && isTermActive && (
                              <button
                                type="button"
                                onClick={() => handleRequestUnfailStudent(item, studentIndex, studentName || `Sinh viên ${studentIndex}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer shadow-2xs hover:shadow-xs mt-0.5"
                                title={`Bỏ trạng thái rớt cho ${studentName || 'sinh viên'}`}
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Bỏ đánh rớt</span>
                              </button>
                            )}
                          </>
                        ) : info.isPassed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title={`${studentName || 'Sinh viên'} (${studentCode || ''}): Đạt yêu cầu`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>PASS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Chưa có điểm</span>
                          </span>
                        )}
                      </div>
                    );

                    return (
                      <div
                        key={item._id}
                        className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition"
                      >
                        {/* Header: STT, Title, Group badge */}
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#123891] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <strong
                              onClick={() => {
                                setSelectedThesisForDetail(item);
                                setThesisDetailModalOpen(true);
                              }}
                              className="text-slate-900 line-clamp-2 leading-snug hover:text-[#123891] cursor-pointer transition text-sm font-bold"
                            >
                              {item.thesisTitle}
                            </strong>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                {isGroup ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                              </span>
                              {item.isCriteriaPassed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Đạt tiêu chí</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>Chưa đánh giá</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Students List */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs ml-8.5 space-y-1.5">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Sinh viên thực hiện:</div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            <strong className="text-slate-900">{item.studentId?.userId?.fullName}</strong>
                            <span className="text-[11px] font-mono text-slate-400">({item.studentId?.studentCode})</span>
                          </div>
                          {isGroup && item.secondStudentId && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                              <strong className="text-slate-900">{item.secondStudentId?.userId?.fullName}</strong>
                              <span className="text-[11px] font-mono text-slate-400">({item.secondStudentId?.studentCode})</span>
                            </div>
                          )}
                        </div>

                        {/* File nộp (Mobile) */}
                        <div className="ml-8.5 p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium uppercase">File nộp:</span>
                            {submissionCounts[item._id] === undefined ? (
                              <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#123891]" />
                                Đang tải...
                              </span>
                            ) : submissionCounts[item._id] > 0 ? (
                              <span className="font-semibold text-slate-800">
                                Đã nộp <strong className="text-[#123891]">{submissionCounts[item._id]}</strong> file
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Chưa nộp file</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenSubmissionModal(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123891] hover:underline cursor-pointer"
                          >
                            <span>Xem chi tiết</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Lecturers */}
                        <div className="grid grid-cols-2 gap-2 text-xs ml-8.5 p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">GVHD:</span>
                            <span className="font-semibold text-slate-800 text-[11px] truncate block">
                              {item.supervisorId?.userId?.fullName || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Hội đồng:</span>
                            <span className="font-semibold text-[#123891] text-[11px] truncate block">
                              {scoreInfo.assignedCouncil?.name || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Component Scores */}
                        <div className="ml-8.5 p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs font-mono">
                          <span className="text-[10px] text-slate-400 block font-bold font-sans uppercase mb-1">
                            Điểm thành phần:
                          </span>
                          {isGroup ? (
                            <div className="space-y-2">
                              {renderStudentComponentScores(
                                scoreInfo1,
                                `SV1: ${item.studentId?.userId?.fullName || 'Sinh viên 1'}`,
                                'bg-blue-600'
                              )}
                              <div className="border-t border-slate-200/60" />
                              {renderStudentComponentScores(
                                scoreInfo2,
                                `SV2: ${item.secondStudentId?.userId?.fullName || 'Sinh viên 2'}`,
                                'bg-indigo-600'
                              )}
                            </div>
                          ) : (
                            renderStudentComponentScores(scoreInfo, null, 'bg-[#123891]')
                          )}
                        </div>

                        {/* Final Score & Result */}
                        <div className="ml-8.5 p-2.5 bg-blue-50/40 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">
                              Điểm tổng kết:
                            </span>
                            {isGroup ? (
                              <div className="space-y-1">
                                {renderStudentFinalScore(scoreInfo1, 'SV1', 'bg-blue-600')}
                                {renderStudentFinalScore(scoreInfo2, 'SV2', 'bg-indigo-600')}
                              </div>
                            ) : (
                              renderStudentFinalScore(scoreInfo, null, 'bg-[#123891]')
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">
                              Kết quả:
                            </span>
                            {isGroup ? (
                              <div className="space-y-1">
                                {renderStudentResult(
                                  scoreInfo1,
                                  item.studentId?.userId?.fullName,
                                  item.studentId?.studentCode,
                                  'SV1',
                                  1
                                )}
                                {renderStudentResult(
                                  scoreInfo2,
                                  item.secondStudentId?.userId?.fullName,
                                  item.secondStudentId?.studentCode,
                                  'SV2',
                                  2
                                )}
                              </div>
                            ) : (
                              renderStudentResult(
                                scoreInfo,
                                item.studentId?.userId?.fullName,
                                item.studentId?.studentCode,
                                null,
                                1
                              )
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 pl-8.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>

                          {!isCompleted && isFullyGraded && isTermActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setThesisToComplete(item);
                                setCompleteDialogOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Xác nhận</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: CRITERIA MANAGEMENT */}
      {/* ========================================== */}
      {mainTab === 'CRITERIA' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Danh sách Tiêu chí Đánh giá Khóa luận (GVHD)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các tiêu chí điều kiện mà Giảng viên hướng dẫn bắt buộc phải tick đạt trước khi được phép nhập điểm KLTN.
              </p>
            </div>

            <button
              type="button"
              disabled={!isTermActive}
              onClick={() => handleOpenCriteriaModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-xs rounded-2xl shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTermActive ? 'Học kỳ đã đóng, không thể thêm tiêu chí' : 'Thêm tiêu chí mới'}
            >
              <Plus className="w-4 h-4" />
              <span>Thêm tiêu chí mới</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loadingCriteria ? (
              <div className="p-6">
                <LoadingSkeleton rows={4} cols={5} />
              </div>
            ) : criteriaList.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Chưa có tiêu chí nào"
                  description="Nhấn 'Thêm tiêu chí mới' để tạo tiêu chí đánh giá KLTN cho GVHD."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">Thứ tự</th>
                      <th className="py-3.5 px-4">Tên tiêu chí</th>
                      <th className="py-3.5 px-4">Mô tả / Ghi chú</th>
                      <th className="py-3.5 px-4">Tính chất</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criteriaList.map((crit, idx) => (
                      <tr key={crit._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600">
                          {crit.order || idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-slate-900 font-semibold text-xs">
                            {crit.name}
                          </strong>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs">
                          {crit.description || '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {crit.isRequired !== false ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Bắt buộc
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Tùy chọn
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={!isTermActive}
                            onClick={() => handleToggleCriteriaActive(crit)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition border ${
                              !isTermActive
                                ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-500 border-slate-200'
                                : crit.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 cursor-pointer'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                crit.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{crit.isActive ? 'Đang sử dụng' : 'Đã ẩn'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isTermActive ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenCriteriaModal(crit)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#123891] rounded-lg transition cursor-pointer"
                                title="Sửa tiêu chí"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCriteria(crit)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Xóa tiêu chí"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="p-1 text-slate-300" title="Học kỳ đã đóng">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: GRADING PERIODS MANAGEMENT */}
      {/* ========================================== */}
      {mainTab === 'GRADING_PERIODS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quản lý Thời gian Nhập điểm Khóa luận Tốt nghiệp
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập đợt mở/khóa quyền nhập điểm KLTN cho GVHD và tự động đánh dấu FAIL cho sinh viên quá hạn chưa có điểm.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isTermActive}
                onClick={() => setProcessFailDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl border border-rose-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isTermActive ? 'Học kỳ đã đóng, không thể xử lý' : 'Quét và đánh dấu FAIL cho sinh viên quá hạn'}
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Xử lý sinh viên quá hạn</span>
              </button>

              <button
                type="button"
                disabled={!isTermActive}
                onClick={() => handleOpenPeriodModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-xs rounded-2xl shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isTermActive ? 'Học kỳ đã đóng, không thể tạo đợt mới' : 'Tạo đợt nhập điểm mới'}
              >
                <Plus className="w-4 h-4" />
                <span>Tạo đợt nhập điểm mới</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loadingPeriods ? (
              <div className="p-6">
                <LoadingSkeleton rows={3} cols={5} />
              </div>
            ) : gradingPeriods.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Chưa có đợt nhập điểm nào"
                  description="Nhấn 'Tạo đợt nhập điểm mới' để mở khung thời gian cho Giảng viên nhập điểm KLTN."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Tên đợt nhập điểm</th>
                      <th className="py-3.5 px-4">Thời gian bắt đầu</th>
                      <th className="py-3.5 px-4">Thời gian kết thúc</th>
                      <th className="py-3.5 px-4">Phạm vi thông báo</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gradingPeriods.map((period) => {
                      const isUpcoming = period.computedStatus === 'UPCOMING';
                      const isActive = period.computedStatus === 'ACTIVE';
                      const isExpired = period.computedStatus === 'EXPIRED';

                      return (
                        <tr key={period._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <strong className="text-slate-900 font-semibold text-xs">
                              {period.name}
                            </strong>
                            {period.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {period.description}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                            {new Date(period.startDate).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                            {new Date(period.endDate).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {period.notificationScope === 'PUBLIC' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Đăng công khai
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200">
                                Chỉ thông báo đến GV
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isActive && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>Đang mở</span>
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>Sắp diễn ra</span>
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <Lock className="w-3 h-3" />
                                <span>Đã hết hạn</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {isTermActive ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPeriodModal(period)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#123891] rounded-lg transition cursor-pointer"
                                  title="Sửa đợt nhập điểm"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePeriod(period)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Xóa đợt nhập điểm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="p-1 text-slate-300" title="Học kỳ đã đóng">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PUBLISH SCORES */}
      {/* ========================================== */}
      <PublishScoresModal
        isOpen={publishModalOpen}
        onClose={() => {
          setPublishModalOpen(false);
          setPublishTargetThesis(null);
        }}
        isAll={!publishTargetThesis}
        theses={theses}
        thesesCount={theses.length}
        submissionCounts={submissionCounts}
        getThesisScoreInfo={getThesisScoreInfo}
        thesis={publishTargetThesis}
        scoreInfo={publishTargetThesis ? getThesisScoreInfo(publishTargetThesis) : null}
        batchScoreAvailability={batchScoreAvailability}
        publishedScores={publishedScores}
        onPublishScores={handleSavePublishedScores}
        onViewDetails={handleOpenSubmissionModal}
      />

      {/* ========================================== */}
      {/* MODAL: HIDE PUBLISHED SCORES */}
      {/* ========================================== */}
      <HideScoresModal
        isOpen={hideScoresModalOpen}
        onClose={() => setHideScoresModalOpen(false)}
        theses={theses}
        thesesCount={theses.length}
        submissionCounts={submissionCounts}
        getThesisScoreInfo={getThesisScoreInfo}
        batchPublishedAvailability={batchPublishedAvailability}
        publishedScores={publishedScores}
        onHideScores={handleHidePublishedScores}
        onViewDetails={handleOpenSubmissionModal}
      />

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT CRITERIA */}
      {/* ========================================== */}
      <Modal
        isOpen={criteriaModalOpen}
        onClose={() => setCriteriaModalOpen(false)}
        title={editingCriteria ? 'Chỉnh Sửa Tiêu Chí Đánh Giá KLTN' : 'Thêm Tiêu Chí Đánh Giá Mới'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCriteria} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên tiêu chí <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={critForm.name}
              onChange={(e) => setCritForm({ ...critForm, name: e.target.value })}
              placeholder="VD: Đã nộp code, Đủ báo cáo..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Mô tả / Hướng dẫn tiêu chí</label>
            <textarea
              rows={2}
              value={critForm.description}
              onChange={(e) => setCritForm({ ...critForm, description: e.target.value })}
              placeholder="VD: Sinh viên đã nộp source code và tài liệu hướng dẫn theo yêu cầu của GVHD."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Thứ tự hiển thị</label>
              <input
                type="number"
                min="0"
                value={critForm.order}
                onChange={(e) => setCritForm({ ...critForm, order: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={critForm.isRequired}
                  onChange={(e) => setCritForm({ ...critForm, isRequired: e.target.checked })}
                  className="w-4 h-4 text-[#123891] rounded border-slate-300 focus:ring-[#123891]"
                />
                <span className="font-bold text-slate-700 text-xs">Tiêu chí bắt buộc</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={critForm.isActive}
              onChange={(e) => setCritForm({ ...critForm, isActive: e.target.checked })}
              className="w-4 h-4 text-[#123891] rounded border-slate-300 focus:ring-[#123891]"
            />
            <span className="font-bold text-slate-700 text-xs">Kích hoạt tiêu chí ngay</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCriteriaModalOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Đang lưu...' : 'Lưu tiêu chí'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT GRADING PERIOD */}
      {/* ========================================== */}
      <Modal
        isOpen={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        title={editingPeriod ? 'Chỉnh Sửa Đợt Nhập Điểm KLTN' : 'Tạo Đợt Nhập Điểm KLTN Mới'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSavePeriod} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên đợt nhập điểm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={periodForm.name}
              onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
              placeholder="VD: Đợt nhập điểm KLTN Học kỳ 1 2026-2027"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Thời gian bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={periodForm.startDate}
                onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Thời gian kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={periodForm.endDate}
                onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs"
                required
              />
            </div>
          </div>

          {/* Notification Scope Radio Options */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Phạm vi phát thông báo <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                  periodForm.notificationScope === 'PUBLIC'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="notificationScope"
                  checked={periodForm.notificationScope === 'PUBLIC'}
                  onChange={() => setPeriodForm({ ...periodForm, notificationScope: 'PUBLIC' })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div>Đăng công khai</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Toàn hệ thống (GV & SV)
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                  periodForm.notificationScope === 'LECTURER_ONLY'
                    ? 'bg-blue-50 border-blue-300 text-[#0d2a75] font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="notificationScope"
                  checked={periodForm.notificationScope === 'LECTURER_ONLY'}
                  onChange={() =>
                    setPeriodForm({ ...periodForm, notificationScope: 'LECTURER_ONLY' })
                  }
                  className="w-4 h-4 text-[#123891] focus:ring-[#123891]"
                />
                <div>
                  <div>Chỉ thông báo đến GV</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Chỉ gửi GVHD liên quan
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nội dung thông báo chi tiết</label>
            <textarea
              rows={2}
              value={periodForm.description}
              onChange={(e) => setPeriodForm({ ...periodForm, description: e.target.value })}
              placeholder="Nội dung thông báo gửi đến giảng viên..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPeriodModalOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{actionLoading ? 'Đang lưu...' : 'Lưu & Phát thông báo'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================== */}
      {/* DIALOG: PROCESS EXPIRED (MARK FAIL) */}
      {/* ========================================== */}
      <ConfirmDialog
        isOpen={processFailDialogOpen}
        onClose={() => setProcessFailDialogOpen(false)}
        onConfirm={handleProcessExpiredTheses}
        title="Xử lý sinh viên quá hạn đánh giá KLTN"
        message="Hệ thống sẽ quét các đợt nhập điểm đã hết hạn trong học kỳ này và tự động chuyển trạng thái không đạt cho tất cả các đề tài chưa đạt tiêu chí hoặc chưa có điểm GVHD. Các đề tài này sẽ bị dừng quy trình và không được phân công GV phản biện. Bạn có chắc chắn muốn thực hiện?"
        confirmText="Xác nhận đánh dấu không đạt"
        cancelText="Hủy bỏ"
        type="danger"
        loading={processingFail}
      />

      {/* ========================================== */}
      {/* DIALOG: CONFIRM COMPLETE */}
      {/* ========================================== */}
      <ConfirmDialog
        isOpen={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        onConfirm={handleConfirmComplete}
        title="Xác nhận Hoàn tất Đánh giá KLTN"
        message={`Bạn có chắc chắn muốn xác nhận đề tài "${thesisToComplete?.thesisTitle}"? Đề tài sẽ chuyển sang trạng thái đã hoàn thành và khóa vĩnh viễn không thể chỉnh sửa điểm.`}
        confirmText="Xác nhận"
        cancelText="Hủy"
        type="primary"
        loading={actionLoading}
      />

      {/* DIALOG: CONFIRM UNMARK FAIL */}
      <ConfirmDialog
        isOpen={unfailDialogOpen}
        onClose={() => setUnfailDialogOpen(false)}
        onConfirm={handleConfirmUnfailStudent}
        title="Xác nhận bỏ trạng thái rớt"
        message={`Bạn có muốn bỏ trạng thái rớt cho sinh viên ${unfailTarget.studentName}? Sau khi xác nhận, sinh viên sẽ được đưa về trạng thái bình thường và cho phép giảng viên thực hiện chấm điểm lại.`}
        confirmText="Xác nhận"
        cancelText="Hủy bỏ"
        type="warning"
        loading={unfailing}
      />

      {/* ========================================== */}
      {/* MODAL: DETAIL SCORE & EVALUATION VIEW */}
      {/* ========================================== */}
      {selectedThesis && (() => {
        const modalScoreInfo = getThesisScoreInfo(selectedThesis);

        return (
          <Modal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedThesis(null);
            }}
            title="Bảng Điểm Chi Tiết & Nhận Xét Đề Tài KLTN"
            maxWidth="max-w-xl"
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs">{selectedThesis.thesisTitle}</div>
                <div className="text-[11px] text-slate-600 flex flex-wrap gap-3 pt-2 border-t border-blue-100">
                  <span>
                    <strong>SV1:</strong> {selectedThesis.studentId?.userId?.fullName} (
                    {selectedThesis.studentId?.studentCode})
                  </span>
                  {selectedThesis.secondStudentId && (
                    <span>
                      <strong>SV2:</strong> {selectedThesis.secondStudentId?.userId?.fullName} (
                      {selectedThesis.secondStudentId?.studentCode})
                    </span>
                  )}
                </div>
              </div>

              {/* Criteria Evaluation List */}
              {Array.isArray(selectedThesis.criteriaEvaluations) &&
                selectedThesis.criteriaEvaluations.length > 0 && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Kết quả đánh giá tiêu chí điều kiện của GVHD:</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {selectedThesis.criteriaEvaluations.map((ce, cidx) => (
                        <div
                          key={cidx}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                        >
                          <span className="text-slate-700">{ce.criteriaName}</span>
                          {ce.isPassed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đạt
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Không đạt
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Detailed Scores Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-200 text-center">
                  <div className="text-[10.5px] text-[#102d7d] font-bold">Điểm GVHD (50%)</div>
                  <div className="text-lg font-black font-mono text-[#123891] mt-1">
                    {modalScoreInfo.hasHD ? modalScoreInfo.scoreHD : '—'}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 truncate">
                    {selectedThesis.supervisorId?.userId?.fullName || 'Chưa có'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-200 text-center">
                  <div className="text-[10.5px] text-[#102d7d] font-bold">Điểm PB Kín (30%)</div>
                  <div className="text-lg font-black font-mono text-[#123891] mt-1">
                    {modalScoreInfo.hasPB1 ? modalScoreInfo.scorePB1 : '—'}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 truncate">
                    {selectedThesis.reviewer1Id?.userId?.fullName || 'GVPB Kín'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-200 text-center">
                  <div className="text-[10.5px] text-[#102d7d] font-bold">Điểm GVHĐ 1 & 2</div>
                  <div className="text-sm font-bold font-mono text-slate-800 mt-1.5 flex items-center justify-center gap-1.5">
                    <span>{modalScoreInfo.scoreGVHD1 !== null ? modalScoreInfo.scoreGVHD1 : '—'}</span>
                    <span className="text-slate-300">/</span>
                    <span>{modalScoreInfo.scoreGVHD2 !== null ? modalScoreInfo.scoreGVHD2 : '—'}</span>
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 truncate">
                    2 thành viên HĐ
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 text-center">
                  <div className="text-[10.5px] text-amber-700 font-bold">Điểm Hội đồng (20%)</div>
                  <div className="text-lg font-black font-mono text-amber-900 mt-1">
                    {modalScoreInfo.hasCouncil ? (
                      modalScoreInfo.scoreCouncil
                    ) : modalScoreInfo.hasTwoCouncilLecturers && (modalScoreInfo.scoreGVHD1 !== null || modalScoreInfo.scoreGVHD2 !== null) ? (
                      <span className="text-xs text-amber-600 font-sans block">Chờ GV còn lại</span>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 truncate">
                    {modalScoreInfo.assignedCouncil?.name || 'TB Hội đồng'}
                  </div>
                </div>
              </div>

              {/* Final Score & Result */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  modalScoreInfo.finalScore !== null
                    ? modalScoreInfo.finalScore >= 5.0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Điểm Tổng Kết Khóa Luận</span>
                    {modalScoreInfo.finalScore !== null &&
                      (modalScoreInfo.finalScore >= 5.0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PASS (Đạt)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          FAIL (Không đạt)
                        </span>
                      ))}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Công thức: (GVHD × 0.5) + (PB Kín × 0.3) + (Hội đồng × 0.2)
                  </div>
                </div>
                <div
                  className={`text-2xl font-black font-mono ${
                    modalScoreInfo.finalScore !== null
                      ? modalScoreInfo.finalScore >= 5.0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                      : 'text-slate-400'
                  }`}
                >
                  {modalScoreInfo.finalScore ?? '—'}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <div className="font-bold text-slate-800 text-[11px]">Nhận xét của GVHD:</div>
                  <p className="text-slate-600 mt-0.5 italic">
                    {selectedThesis.supervisorComment || 'Chưa có nhận xét.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl">
                  <div className="font-bold text-slate-800 text-[11px]">Nhận xét của PB Kín (GVPB1):</div>
                  <p className="text-slate-600 mt-0.5 italic">
                    {selectedThesis.reviewer1Comment || 'Chưa có nhận xét.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl">
                  <div className="font-bold text-slate-800 text-[11px]">Nhận xét của PB Hội đồng (GVPB2):</div>
                  <p className="text-slate-600 mt-0.5 italic">
                    {selectedThesis.reviewer2Comment || 'Chưa có nhận xét.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ========================================== */}
      {/* MODAL: SUBMITTED FILES DETAIL POPUP */}
      {/* ========================================== */}
      <Modal
        isOpen={submissionModalOpen}
        onClose={() => {
          setSubmissionModalOpen(false);
          setSubmissionModalThesis(null);
        }}
        title="Chi Tiết File Nộp Khóa Luận"
        maxWidth="max-w-2xl"
      >
        {submissionModalThesis && (
          <div className="space-y-4 text-xs">
            {/* Header Thesis Summary Card */}
            <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/80">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#123891]/10 flex items-center justify-center shrink-0 mt-0.5 text-[#123891]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#102d7d] uppercase tracking-wider">
                    Đề tài khóa luận
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">
                    {submissionModalThesis.thesisTitle}
                  </h4>
                  <div className="mt-2.5 pt-2 border-t border-blue-100/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Sinh viên:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {submissionModalThesis.studentId?.userId?.fullName || '—'}
                        {submissionModalThesis.studentId?.studentCode ? ` (${submissionModalThesis.studentId.studentCode})` : ''}
                      </span>
                      {submissionModalThesis.secondStudentId && (
                        <div className="text-slate-700 mt-0.5">
                          <span className="text-slate-400">SV2:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            {submissionModalThesis.secondStudentId?.userId?.fullName || '—'}
                            {submissionModalThesis.secondStudentId?.studentCode ? ` (${submissionModalThesis.secondStudentId.studentCode})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400">GVHD:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {submissionModalThesis.supervisorId?.userId?.fullName || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Scores Summary inside File Detail Modal */}
                  {(() => {
                    const info1 = getThesisScoreInfo(submissionModalThesis, 1);
                    const isGroup = submissionModalThesis.studentCount === 2 && Boolean(submissionModalThesis.secondStudentId);
                    const info2 = isGroup ? getThesisScoreInfo(submissionModalThesis, 2) : null;
                    return (
                      <div className="mt-2.5 pt-2 border-t border-blue-100/80">
                        <div className="text-[10px] font-bold text-[#102d7d] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#123891]" />
                          <span>Điểm số đánh giá</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                          <div className="p-2 rounded-xl bg-white/90 border border-blue-100 text-center shadow-2xs">
                            <span className="text-[10px] text-slate-400 block font-sans">GVHD (50%)</span>
                            <span className="font-bold text-[#123891] text-xs">
                              {isGroup ? `${info1?.scoreHD ?? '—'} / ${info2?.scoreHD ?? '—'}` : (info1?.scoreHD ?? '—')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/90 border border-blue-100 text-center shadow-2xs">
                            <span className="text-[10px] text-slate-400 block font-sans">PB Kín (30%)</span>
                            <span className="font-bold text-indigo-700 text-xs">
                              {isGroup ? `${info1?.scorePB ?? '—'} / ${info2?.scorePB ?? '—'}` : (info1?.scorePB ?? '—')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/90 border border-blue-100 text-center shadow-2xs">
                            <span className="text-[10px] text-slate-400 block font-sans">Hội đồng (20%)</span>
                            <span className="font-bold text-amber-700 text-xs">
                              {isGroup ? `${info1?.scoreCouncil ?? '—'} / ${info2?.scoreCouncil ?? '—'}` : (info1?.scoreCouncil ?? '—')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/90 border border-blue-100 text-center shadow-2xs">
                            <span className="text-[10px] text-slate-400 block font-sans">Tổng kết (100%)</span>
                            <span className="font-bold text-emerald-700 text-xs">
                              {isGroup ? `${info1?.finalScore ?? '—'} / ${info2?.finalScore ?? '—'}` : (info1?.finalScore ?? '—')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Submissions Section Header */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#123891]" />
                <span className="font-bold text-xs text-[#123891] uppercase tracking-wider">
                  Danh sách file đã nộp ({modalSubmissions.length})
                </span>
              </div>
            </div>

            {/* Submissions Content */}
            {loadingModalSubmissions ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-[#123891]" />
                <span>Đang tải danh sách file nộp...</span>
              </div>
            ) : modalSubmissions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center">
                <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Chưa có file nào do sinh viên nộp cho đề tài này</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Các tài liệu báo cáo, mã nguồn hoặc sản phẩm do sinh viên tải lên sẽ hiển thị tại đây khi hoàn thành nộp bài.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {modalSubmissions.map((sub, sIdx) => {
                  const studentName =
                    sub.studentId?.userId?.fullName || sub.uploadedBy?.fullName || 'Sinh viên';
                  const studentCode = sub.studentId?.studentCode;
                  return (
                    <div
                      key={sub._id || sIdx}
                      className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-blue-200 hover:shadow-2xs transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition">
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
                            <span className="font-mono text-slate-500 font-medium">{formatFileSize(sub.fileSize)}</span>
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
                          className="p-2 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Xem / Mở file trong tab mới"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadSubmissionFile(e, sub)}
                          className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
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

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSubmissionModalOpen(false);
                  setSubmissionModalThesis(null);
                }}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Unified Thesis Detail Modal */}
      <ThesisDetailModal
        isOpen={thesisDetailModalOpen}
        onClose={() => {
          setThesisDetailModalOpen(false);
          setSelectedThesisForDetail(null);
        }}
        thesis={selectedThesisForDetail}
      />

      {/* Thesis Timeline Configuration Modal */}
      <ThesisTimelineModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
      />
    </div>
  );
};

export default TbmThesisEvaluationManagement;
