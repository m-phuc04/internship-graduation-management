import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import internshipApi from '../../api/internshipApi';
import thesisProgressApi from '../../api/thesisProgressApi';
import councilApi from '../../api/councilApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import UserNameClickable from '../../components/common/UserNameClickable';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import {
  Award,
  BookOpen,
  Building,
  MapPin,
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
  Check,
  X,
  Edit2,
  Edit3,
  FileText,
  ExternalLink,
  Ban,
  Trash2,
} from 'lucide-react';

const LecturerThesesPage = () => {
  const { user } = useAuth();
  const [lecturerInfo, setLecturerInfo] = useState(null);
  const { showToast } = useToast();
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLecturerProfile = async () => {
      try {
        const res = await internshipApi.getSupervised({ limit: 1 });
        if (res.success && res.lecturer) {
          setLecturerInfo(res.lecturer);
        }
      } catch (err) {
        // Fallback silently to auth context user
      }
    };
    fetchLecturerProfile();
  }, []);

  // Read initial tab from search query
  const getInitialTab = () => {
    if (location.search.includes('tab=topics')) return 'MY_TOPICS';
    if (location.search.includes('tab=council')) return 'COUNCIL';
    if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1') || location.search.includes('tab=reviewer2')) return 'REVIEW_BLIND';
    return 'SUPERVISOR';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab); // 'MY_TOPICS', 'SUPERVISOR', 'REVIEW_BLIND', 'COUNCIL'
  const [topicsSubTab, setTopicsSubTab] = useState('MY_PROPOSALS'); // 'MY_PROPOSALS' | 'APPROVED_BANK'
  const [search, setSearch] = useState('');

  // Proposed Topics (KLTN Topic Management)
  const [myTopics, setMyTopics] = useState([]);
  const [loadingMyTopics, setLoadingMyTopics] = useState(false);
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [selectedTermForCreation, setSelectedTermForCreation] = useState('');
  const [batchTitleInput, setBatchTitleInput] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [createTopicLoading, setCreateTopicLoading] = useState(false);
  const [selectedTopicDetail, setSelectedTopicDetail] = useState(null);

  // Edit & Delete Topic States (Lecturer requests -> TBM approves)
  const [editTopicModalOpen, setEditTopicModalOpen] = useState(false);
  const [selectedTopicForEdit, setSelectedTopicForEdit] = useState(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicDescription, setEditTopicDescription] = useState('');
  const [confirmEditTopicDialogOpen, setConfirmEditTopicDialogOpen] = useState(false);
  const [deleteTopicDialogOpen, setDeleteTopicDialogOpen] = useState(false);
  const [selectedTopicForDelete, setSelectedTopicForDelete] = useState(null);

  // Approved topics for registration list
  const [approvedTopics, setApprovedTopics] = useState([]);
  const [loadingApprovedTopics, setLoadingApprovedTopics] = useState(false);
  const [onlyMyApprovedTopics, setOnlyMyApprovedTopics] = useState(false);

  useEffect(() => {
    if (location.search.includes('tab=topics')) {
      setActiveTab('MY_TOPICS');
    } else if (location.search.includes('tab=council')) {
      setActiveTab('COUNCIL');
    } else if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1') || location.search.includes('tab=reviewer2')) {
      setActiveTab('REVIEW_BLIND');
    } else if (location.search.includes('tab=supervisor') || !location.search) {
      setActiveTab('SUPERVISOR');
    }
  }, [location.search]);

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

  // Accept & Reject Modals
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelThesisReason, setCancelThesisReason] = useState('');
  const [cancelThesisTarget, setCancelThesisTarget] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [targetThesis, setTargetThesis] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Dedicated Grade Box Modal State
  const [gradeBoxOpen, setGradeBoxOpen] = useState(false);
  const [gradeBoxThesis, setGradeBoxThesis] = useState(null);
  const [gradeBoxRole, setGradeBoxRole] = useState('SUPERVISOR'); // 'SUPERVISOR', 'REVIEWER1', 'REVIEWER2'
  const [gradeSv1, setGradeSv1] = useState('');
  const [gradeSv2, setGradeSv2] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [gradeSaving, setGradeSaving] = useState(false);

  // Grading Period State
  const [gradingPeriodStatus, setGradingPeriodStatus] = useState({
    canGrade: false,
    statusText: 'Chưa tạo thời gian nhập điểm KLTN. Không thể chấm điểm.',
  });

  // Council Room Data for Reviewer 2 (Phản biện hội đồng)
  const [councils, setCouncils] = useState([]);
  const [councilsMap, setCouncilsMap] = useState({});
  const [thesisCouncilMap, setThesisCouncilMap] = useState({});
  const [publishedScores, setPublishedScores] = useState({});
  const [selectedCouncilId, setSelectedCouncilId] = useState(null);

  // Council Detail Modal State (For clicking on Council in any thesis row)
  const [councilDetailModalOpen, setCouncilDetailModalOpen] = useState(false);
  const [selectedCouncilDetail, setSelectedCouncilDetail] = useState(null);

  const handleOpenCouncilDetail = (council) => {
    if (!council) return;
    const cId = council.id || council._id;
    const fullCouncil =
      (Array.isArray(councils) &&
        councils.find(
          (c) =>
            (c.id && String(c.id) === String(cId)) ||
            (c._id && String(c._id) === String(cId)),
        )) ||
      council;
    setSelectedCouncilDetail(fullCouncil);
    setCouncilDetailModalOpen(true);
  };

  const loadCouncilData = useCallback(async () => {
    try {
      const termId = currentTerm?._id || 'default';
      const storageKey = `tbm_councils_${termId}`;

      let loadedCouncils = [];
      let apiSuccess = false;

      // 1. Fetch directly from MongoDB councils collection
      try {
        const res = await councilApi.getAll({ academicTermId: currentTerm?._id || '' });
        if (res.success && Array.isArray(res.data)) {
          apiSuccess = true;
          loadedCouncils = res.data.map((c) => ({
            ...c,
            id: c._id || c.id,
            name: (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim(),
            lecturers: Array.isArray(c.lecturers)
              ? c.lecturers.map((l) => ({
                  ...l,
                  lecturerId: l.lecturerId?._id || l.lecturerId?.id || l.lecturerId,
                  id: l.lecturerId?._id || l.lecturerId?.id || l.lecturerId || l.id,
                  _id: l.lecturerId?._id || l.lecturerId?.id || l.lecturerId || l._id,
                  userId: l.lecturerId?.userId?._id || l.lecturerId?.userId || l.userId,
                  fullName: l.lecturerId?.userId?.fullName || l.fullName || 'Giảng viên',
                  academicTitle: l.lecturerId?.academicTitle || l.academicTitle || 'ThS.',
                  lecturerCode: l.lecturerId?.lecturerCode || l.lecturerCode || '',
                  email: l.lecturerId?.userId?.email || l.email || '',
                }))
              : [],
          }));

          // Always synchronize local cache with authoritative MongoDB councils data
          try {
            localStorage.setItem(storageKey, JSON.stringify(loadedCouncils));
            localStorage.setItem('tbm_councils_default', JSON.stringify(loadedCouncils));
          } catch {}
        }
      } catch (apiErr) {
        console.warn('API council fetch failed, checking offline storage:', apiErr.message);
      }

      // 2. Only use storage fallback if API call failed completely (e.g. offline)
      if (!apiSuccess) {
        const tryParseCouncils = (raw) => {
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed.map((c) => ({
                ...c,
                name: (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim(),
                lecturers: Array.isArray(c.lecturers) ? c.lecturers : [],
              }));
            }
          } catch {}
          return null;
        };

        loadedCouncils =
          tryParseCouncils(localStorage.getItem(storageKey)) ||
          tryParseCouncils(localStorage.getItem('tbm_councils_default')) ||
          [];
      }

      const finalCouncils = loadedCouncils;

      const map = {};
      finalCouncils.forEach((c) => {
        const cid = c.id || c._id;
        if (cid) map[cid] = c;
      });

      setCouncils(finalCouncils);
      setCouncilsMap(map);

      // 3. Load thesis-council mappings
      let mergedThesisCouncils = {};
      try {
        const defaultTc = JSON.parse(localStorage.getItem('tbm_thesis_councils_default') || '{}');
        if (defaultTc && typeof defaultTc === 'object') {
          mergedThesisCouncils = { ...defaultTc };
        }
      } catch (e) {}
      try {
        const exactTc = JSON.parse(localStorage.getItem(`tbm_thesis_councils_${termId}`) || '{}');
        if (exactTc && typeof exactTc === 'object') {
          mergedThesisCouncils = { ...mergedThesisCouncils, ...exactTc };
        }
      } catch (e) {}
      setThesisCouncilMap(mergedThesisCouncils);

      // 4. Load published scores
      let mergedPub = {};
      try {
        const savedPub = JSON.parse(localStorage.getItem(`tbm_published_scores_${termId}`) || '{}');
        if (savedPub && typeof savedPub === 'object') {
          mergedPub = { ...savedPub };
        }
      } catch (e) {}
      setPublishedScores(mergedPub);
    } catch (e) {
      console.warn('Error loading council data in Lecturer page', e);
    }
  }, [currentTerm?._id]);

  useEffect(() => {
    const handleStorage = () => {
      loadCouncilData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
    };
  }, [loadCouncilData]);

  useEffect(() => {
    loadCouncilData();
  }, [location.search, activeTab, loadCouncilData]);

  // Timeline edit in detail modal
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [savingDetailTimeline, setSavingDetailTimeline] = useState(false);

  const fetchAssignedTheses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [thesesRes, periodRes] = await Promise.all([
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

      if (periodRes.success) {
        const periods = periodRes.data || [];
        if (periods.length === 0) {
          setGradingPeriodStatus({
            canGrade: false,
            statusText: 'Chưa tạo thời gian nhập điểm KLTN. Không thể chấm điểm.',
          });
        } else {
          const active = periods.find((p) => p.computedStatus === 'ACTIVE');
          const upcoming = periods.find((p) => p.computedStatus === 'UPCOMING');
          const expired = periods.filter((p) => p.computedStatus === 'EXPIRED');

          if (active) {
            setGradingPeriodStatus({
              canGrade: true,
              statusText: `Đang trong đợt nhập điểm "${active.name}" (đến ${new Date(active.endDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })})`,
            });
          } else if (upcoming) {
            setGradingPeriodStatus({
              canGrade: false,
              statusText: `Đợt nhập điểm "${upcoming.name}" chưa bắt đầu (bắt đầu lúc ${new Date(upcoming.startDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })})`,
            });
          } else if (expired.length > 0) {
            setGradingPeriodStatus({
              canGrade: false,
              statusText: 'Đã hết thời gian nhập điểm KLTN. Không thể chấm điểm.',
            });
          } else {
            setGradingPeriodStatus({
              canGrade: false,
              statusText: 'Chưa tạo thời gian nhập điểm KLTN. Không thể chấm điểm.',
            });
          }
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đề tài khóa luận', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, currentTerm?._id, showToast]);

  const fetchMyTopics = useCallback(async () => {
    setLoadingMyTopics(true);
    try {
      const res = await thesisApi.getMyCreatedTopics({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setMyTopics(res.data || []);
      }
    } catch (err) {
      console.warn('Cannot load created topics:', err.message);
    } finally {
      setLoadingMyTopics(false);
    }
  }, [currentTerm?._id]);

  const fetchApprovedTopics = useCallback(async () => {
    setLoadingApprovedTopics(true);
    try {
      const res = await thesisApi.getApprovedTopics({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setApprovedTopics(res.data || []);
      }
    } catch (err) {
      console.warn('Cannot load approved topics:', err.message);
    } finally {
      setLoadingApprovedTopics(false);
    }
  }, [currentTerm?._id]);

  useEffect(() => {
    fetchAssignedTheses();
    fetchMyTopics();
    fetchApprovedTopics();
    loadCouncilData();
  }, [fetchAssignedTheses, fetchMyTopics, fetchApprovedTopics, loadCouncilData]);

  const handleBatchCreateTopics = async (e) => {
    if (e) e.preventDefault();
    if (!batchTitleInput.trim()) {
      showToast('Vui lòng nhập ít nhất một tên đề tài', 'error');
      return;
    }

    const targetTermId = selectedTermForCreation || currentTerm?._id || '';
    if (!targetTermId) {
      showToast('Vui lòng chọn học kỳ áp dụng cho đề tài', 'error');
      return;
    }

    setCreateTopicLoading(true);
    try {
      const res = await thesisApi.batchCreateTopics({
        topicListRaw: batchTitleInput.trim(),
        defaultDescription: batchDescription.trim() || '',
        academicTermId: targetTermId,
      });

      if (res.success) {
        showToast(res.message || 'Tạo danh sách đề tài KLTN thành công!', 'success');
        setCreateTopicModalOpen(false);
        setBatchTitleInput('');
        setBatchDescription('');
        fetchMyTopics();
      }
    } catch (err) {
      showToast(err.message || 'Tạo đề tài thất bại', 'error');
    } finally {
      setCreateTopicLoading(false);
    }
  };

  const handleOpenEditTopic = (topic) => {
    setSelectedTopicForEdit(topic);
    setEditTopicTitle(topic.title || '');
    setEditTopicDescription(topic.description || '');
    setEditTopicModalOpen(true);
  };

  const handleSubmitEditTopicForm = (e) => {
    if (e) e.preventDefault();
    if (!editTopicTitle.trim()) {
      showToast('Vui lòng nhập tên đề tài', 'warning');
      return;
    }
    setConfirmEditTopicDialogOpen(true);
  };

  const handleConfirmSaveEditTopic = async () => {
    if (!selectedTopicForEdit) return;
    try {
      setActionLoading(true);
      const res = await thesisApi.requestEditTopic(selectedTopicForEdit._id, {
        title: editTopicTitle.trim(),
        description: editTopicDescription.trim(),
      });
      if (res.success) {
        showToast('Đã gửi yêu cầu chỉnh sửa đề tài đến Trưởng Bộ Môn để xét duyệt!', 'success');
        setConfirmEditTopicDialogOpen(false);
        setEditTopicModalOpen(false);
        setSelectedTopicForEdit(null);
        fetchMyTopics();
      }
    } catch (err) {
      showToast(err.message || 'Gửi yêu cầu chỉnh sửa đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteTopic = (topic) => {
    setSelectedTopicForDelete(topic);
    setDeleteTopicDialogOpen(true);
  };

  const handleConfirmDeleteTopic = async () => {
    if (!selectedTopicForDelete) return;
    try {
      setActionLoading(true);
      const res = await thesisApi.requestDeleteTopic(selectedTopicForDelete._id, {
        reason: 'Giảng viên đề xuất yêu cầu xóa đề tài',
      });
      if (res.success) {
        showToast('Đã gửi yêu cầu xóa đề tài đến Trưởng Bộ Môn để xét duyệt!', 'success');
        setDeleteTopicDialogOpen(false);
        setSelectedTopicForDelete(null);
        fetchMyTopics();
      }
    } catch (err) {
      showToast(err.message || 'Gửi yêu cầu xóa đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Current list based on active tab with resilient fallback
  const supervisedTheses = (data?.supervisedTheses || (data?.theses || []).filter((t) => t.isSupervisor) || []).filter((t) => t.status !== 'REJECTED');
  const reviewer1Theses = (data?.reviewer1Theses || (data?.theses || []).filter((t) => t.isReviewer1) || []).filter((t) => t.status !== 'REJECTED');

  // Helper to find assigned council
  const getAssignedCouncil = useCallback((item) => {
    if (!item?._id) return null;
    const rawCouncilId =
      thesisCouncilMap?.[item._id] ||
      thesisCouncilMap?.[String(item._id)] ||
      (item.councilId?._id ? item.councilId._id : item.councilId) ||
      (item.council?._id || item.council?.id);

    if (!rawCouncilId) return null;

    const councilId = typeof rawCouncilId === 'object' && rawCouncilId !== null
      ? String(rawCouncilId._id || rawCouncilId.id || '')
      : String(rawCouncilId || '');

    if (!councilId || councilId === 'default_council' || councilId === '[object Object]') return null;

    if (Array.isArray(councils)) {
      const found = councils.find((c) => (c.id && String(c.id) === councilId) || (c._id && String(c._id) === councilId));
      if (found) return found;
    }
    if (item.councilId && typeof item.councilId === 'object' && item.councilId.name) {
      return item.councilId;
    }
    return null;
  }, [councils, thesisCouncilMap]);

  const cleanTitle = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/(ths\.|ts\.|pgs\.ts\.|gs\.ts\.|thạc sĩ|tiến sĩ|giáo sư|pgs\.|gs\.)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Helper to normalize strings for robust comparison (handles accents, titles, whitespace, punctuation)
  const normalizeLecturerStr = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^(ths\b\.?|ts\b\.?|pgs\b\.?\s*ts\b\.?|gs\b\.?\s*ts\b\.?|thac si|tien si|giao su|pho giao su|ncs\b\.?)\s*/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  // Helper to check if a council lecturer entry matches a user / lecturer
  const isSameLecturer = useCallback((lecObj, u, lecturerData) => {
    if (!lecObj) return false;
    const myIds = [
      u?._id,
      u?.userId,
      u?.lecturerId,
      u?.id,
      lecturerData?._id,
      lecturerData?.userId?._id,
      lecturerData?.userId,
      lecturerData?.id,
    ]
      .filter(Boolean)
      .map((id) => String(id).trim());

    const myCodes = [
      u?.lecturerCode,
      u?.code,
      u?.userCode,
      u?.username,
      lecturerData?.lecturerCode,
      lecturerData?.code,
    ]
      .filter(Boolean)
      .map((c) => String(c).trim().toLowerCase());

    const myNames = [
      u?.fullName,
      u?.name,
      u?.username,
      lecturerData?.fullName,
      lecturerData?.name,
      lecturerData?.userId?.fullName,
      lecturerData?.userId?.name,
    ]
      .filter(Boolean)
      .map(normalizeLecturerStr);

    const myEmails = [
      u?.email,
      lecturerData?.email,
      lecturerData?.userId?.email,
    ]
      .filter(Boolean)
      .map((e) => String(e).trim().toLowerCase());

    if (typeof lecObj === 'string') {
      const trimmed = lecObj.trim();
      if (!trimmed) return false;
      const normTrimmed = normalizeLecturerStr(trimmed);
      return (
        myIds.includes(trimmed) ||
        myCodes.includes(trimmed.toLowerCase()) ||
        (normTrimmed && normTrimmed !== 'giangvien' && myNames.some((mn) => mn && mn === normTrimmed))
      );
    }

    const lecIds = [
      lecObj.lecturerId?._id,
      lecObj.lecturerId?.id,
      lecObj.lecturerId,
      lecObj.userId?._id,
      lecObj.userId?.id,
      lecObj.userId,
      lecObj.id,
      lecObj._id,
    ]
      .filter(Boolean)
      .map((id) => String(id).trim());

    if (lecIds.length > 0 && lecIds.some((id) => myIds.includes(id))) return true;

    const lecCode = (lecObj.lecturerCode || lecObj.code || lecObj.userCode || '').trim().toLowerCase();
    if (lecCode && myCodes.includes(lecCode)) return true;

    const lecEmail = (lecObj.email || '').trim().toLowerCase();
    if (lecEmail && myEmails.includes(lecEmail)) return true;

    const rawLecName = lecObj.fullName || lecObj.name || lecObj.lecturerName || lecObj.userId?.fullName;
    const lecName = normalizeLecturerStr(rawLecName);
    if (lecName && lecName !== 'giangvien' && lecName !== 'chuaphancong') {
      for (const mn of myNames) {
        if (mn && mn !== 'giangvien' && mn === lecName) {
          return true;
        }
      }
    }

    return false;
  }, []);

  const matchTwoLecturers = useCallback((lecA, lecB) => {
    if (!lecA || !lecB) return false;
    const aIds = [
      lecA.lecturerId?._id,
      lecA.lecturerId?.id,
      lecA.lecturerId,
      lecA.userId?._id,
      lecA.userId?.id,
      lecA.userId,
      lecA.id,
      lecA._id,
    ].filter(Boolean).map((id) => String(id).trim());

    const bIds = [
      lecB.lecturerId?._id,
      lecB.lecturerId?.id,
      lecB.lecturerId,
      lecB.userId?._id,
      lecB.userId?.id,
      lecB.userId,
      lecB.id,
      lecB._id,
    ].filter(Boolean).map((id) => String(id).trim());

    if (aIds.length > 0 && bIds.length > 0 && aIds.some((id) => bIds.includes(id))) return true;

    const aCode = (lecA.lecturerCode || lecA.code || lecA.userCode || '').trim().toLowerCase();
    const bCode = (lecB.lecturerCode || lecB.code || lecB.userCode || '').trim().toLowerCase();
    if (aCode && bCode && aCode === bCode) return true;

    const aName = normalizeLecturerStr(lecA.fullName || lecA.name || lecA.lecturerName || lecA.userId?.fullName);
    const bName = normalizeLecturerStr(lecB.fullName || lecB.name || lecB.lecturerName || lecB.userId?.fullName);
    if (aName && bName && aName !== 'giangvien' && bName !== 'giangvien' && aName === bName) return true;

    return false;
  }, []);

  // Helper to check if logged-in lecturer is in a council
  const isLecturerInCouncil = useCallback(
    (council) => {
      if (!council || !Array.isArray(council.lecturers) || council.lecturers.length === 0) return false;
      return council.lecturers.some((l) => isSameLecturer(l, user, data?.lecturer));
    },
    [user, data?.lecturer, isSameLecturer]
  );

  // Computations for Council Rooms - Councils containing this lecturer
  const myCouncils = useMemo(() => {
    if (!councils || councils.length === 0) return [];
    return councils.filter((c) => isLecturerInCouncil(c));
  }, [councils, isLecturerInCouncil]);

  const activeCouncil = useMemo(() => {
    if (selectedCouncilId) {
      const found = myCouncils.find((c) => (c.id || c._id) === selectedCouncilId || String(c.id || c._id) === String(selectedCouncilId));
      if (found) return found;
    }
    return myCouncils[0] || null;
  }, [myCouncils, selectedCouncilId]);

  // Reviewer 2 Theses (DB reviewer 2 assignments)
  const reviewer2Theses = useMemo(() => {
    const rawRev2 = data?.reviewer2Theses || (data?.theses || []).filter((t) => t.isReviewer2) || [];
    return rawRev2.filter((t) => t.status !== 'REJECTED');
  }, [data]);

  const effectiveActiveCouncil = activeCouncil;

  const councilTheses = useMemo(() => {
    const allThesesPool = (data?.allTheses && data.allTheses.length > 0) ? data.allTheses : (data?.theses || []);
    if (!allThesesPool || allThesesPool.length === 0) return [];

    const targetCouncil = effectiveActiveCouncil;
    if (!targetCouncil) {
      return [];
    }

    const targetCouncilIds = [
      targetCouncil.id,
      targetCouncil._id,
      targetCouncil.councilId,
    ].filter(Boolean).map((id) => String(id).trim().toLowerCase());

    let list = allThesesPool.filter((t) => {
      if (t.status === 'REJECTED') return false;
      const tid = String(t._id || t.id || '');
      const rawCouncilId =
        thesisCouncilMap[tid] ||
        thesisCouncilMap[t._id] ||
        thesisCouncilMap[t.id] ||
        thesisCouncilMap[String(t._id)] ||
        thesisCouncilMap[String(t.id)] ||
        (t.councilId?._id ? t.councilId._id : t.councilId) ||
        t.council?._id ||
        t.council?.id;

      if (!rawCouncilId) return false;

      const normMappedId = String(
        typeof rawCouncilId === 'object' && rawCouncilId !== null
          ? (rawCouncilId._id || rawCouncilId.id || '')
          : rawCouncilId
      ).trim().toLowerCase();

      if (!normMappedId || normMappedId === '[object object]') return false;

      return targetCouncilIds.some((tcId) => normMappedId === tcId || tcId === `council-${normMappedId}` || normMappedId === `council-${tcId}`);
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      return list.filter(
        (t) =>
          t.thesisTitle?.toLowerCase().includes(q) ||
          t.studentId?.userId?.fullName?.toLowerCase().includes(q) ||
          t.studentId?.studentCode?.toLowerCase().includes(q) ||
          t.secondStudentId?.userId?.fullName?.toLowerCase().includes(q) ||
          t.secondStudentId?.studentCode?.toLowerCase().includes(q) ||
          t.supervisorId?.userId?.fullName?.toLowerCase().includes(q) ||
          t.reviewer1Id?.userId?.fullName?.toLowerCase().includes(q) ||
          t.reviewer2Id?.userId?.fullName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [effectiveActiveCouncil, data, thesisCouncilMap, search]);

  const stats = {
    supervisedCount: data?.stats?.supervisedCount ?? supervisedTheses.length,
    reviewer1Count: data?.stats?.reviewer1Count ?? reviewer1Theses.length,
    reviewer2Count: councilTheses.length || data?.stats?.reviewer2Count || reviewer2Theses.length,
    totalAssigned: data?.stats?.totalAssigned ?? (data?.theses?.length || 0),
  };

  const filterBySearch = useCallback(
    (list) => {
      if (!search || !search.trim()) return list;
      const q = search.trim().toLowerCase();
      return (list || []).filter(
        (t) =>
          t.thesisTitle?.toLowerCase().includes(q) ||
          t.studentId?.userId?.fullName?.toLowerCase().includes(q) ||
          t.studentId?.studentCode?.toLowerCase().includes(q) ||
          t.secondStudentId?.userId?.fullName?.toLowerCase().includes(q) ||
          t.secondStudentId?.studentCode?.toLowerCase().includes(q) ||
          t.supervisorId?.userId?.fullName?.toLowerCase().includes(q) ||
          t.reviewer1Id?.userId?.fullName?.toLowerCase().includes(q) ||
          t.reviewer2Id?.userId?.fullName?.toLowerCase().includes(q)
      );
    },
    [search]
  );

  const filteredSupervisedTheses = useMemo(
    () => filterBySearch(supervisedTheses),
    [supervisedTheses, filterBySearch]
  );
  const filteredReviewer1Theses = useMemo(
    () => filterBySearch(reviewer1Theses),
    [reviewer1Theses, filterBySearch]
  );
  const filteredReviewer2Theses = useMemo(
    () => filterBySearch(reviewer2Theses),
    [reviewer2Theses, filterBySearch]
  );

  let currentList = [];
  if (activeTab === 'SUPERVISOR') {
    currentList = filteredSupervisedTheses;
  } else if (activeTab === 'REVIEWER_1') {
    currentList = filteredReviewer1Theses;
  } else if (activeTab === 'REVIEWER_2') {
    currentList = filteredReviewer2Theses;
  } else if (activeTab === 'COUNCIL' || location.search.includes('tab=council')) {
    currentList = councilTheses;
  } else if (activeTab === 'REVIEW_BLIND' || location.search.includes('tab=review')) {
    currentList = [...filteredReviewer1Theses, ...filteredReviewer2Theses];
  }

  // Helper to determine if a thesis can be graded for a specific role
  const isActiveTerm = currentTerm?.status === 'ACTIVE';
  const isPastTerm = !isActiveTerm;

  const getGradingStatusForThesis = (item, role = 'SUPERVISOR') => {
    if (!item) return { canGrade: false, reason: '' };

    if (!isActiveTerm || isPastTerm || item?.academicTermId?.status !== 'ACTIVE') {
      return {
        canGrade: false,
        reason: 'Học kỳ này không ở trạng thái đang diễn ra (ACTIVE). Bạn đang ở chế độ xem lại lịch sử, không thể chỉnh sửa hoặc chấm điểm.',
      };
    }

    if (!gradingPeriodStatus.canGrade) {
      return {
        canGrade: false,
        reason: gradingPeriodStatus.statusText || 'Hiện không nằm trong thời gian nhập điểm',
      };
    }

    if (item.status === 'COMPLETED') {
      return {
        canGrade: false,
        reason: 'Đề tài đã hoàn thành nghiệm thu. Không thể chỉnh sửa điểm.',
      };
    }

    if (item.status === 'REJECTED') {
      return {
        canGrade: false,
        reason: 'Đề tài đã bị từ chối / không đạt. Không thể nhập điểm.',
      };
    }

    const isPBKAssigned = Boolean(
      item.reviewer1Id ||
      item.reviewer2Id ||
      (Array.isArray(item.reviewers) && item.reviewers.length > 0) ||
      item.status === 'ASSIGNED_REVIEWERS' ||
      item.status === 'DEFENSE' ||
      item.status === 'COMPLETED'
    );

    const hasSupervisorGraded = Boolean(
      item.scores?.supervisorScore != null || item.scores?.student1SupervisorScore != null
    );

    const hasReviewer1Graded = Boolean(
      item.scores?.reviewer1Score != null || item.scores?.student1Reviewer1Score != null
    );
    const hasReviewer2Graded = Boolean(
      item.scores?.reviewer2Score != null || item.scores?.student1Reviewer2Score != null
    );
    const hasBothReviewersGraded = hasReviewer1Graded && hasReviewer2Graded;

    if (role === 'SUPERVISOR' || role === 'GVHD') {
      if (isPBKAssigned) {
        return {
          canGrade: false,
          reason: 'Đề tài đã được phân công phản biện khóa luận (PBK). Giảng viên hướng dẫn không thể chỉnh sửa điểm.',
        };
      }
      return {
        canGrade: true,
        reason: 'Bấm để nhập điểm và đánh giá đề tài',
      };
    }

    if (role === 'REVIEWER1' || role === 'REVIEWER_1' || role === 'GVPB_KIN') {
      if (!hasSupervisorGraded) {
        return {
          canGrade: false,
          reason: 'Giảng viên hướng dẫn chưa hoàn thành chấm điểm. Chưa thể chấm điểm phản biện.',
        };
      }
      return {
        canGrade: true,
        reason: 'Chấm điểm Giảng viên phản biện 1',
      };
    }

    if (role === 'REVIEWER2' || role === 'REVIEWER_2' || role === 'GVPB_HOIDONG') {
      if (!hasSupervisorGraded) {
        return {
          canGrade: false,
          reason: 'Giảng viên hướng dẫn chưa hoàn thành chấm điểm. Chưa thể chấm điểm phản biện.',
        };
      }
      return {
        canGrade: true,
        reason: 'Chấm điểm Giảng viên phản biện 2',
      };
    }

    if (role === 'COUNCIL' || role === 'HOIDONG') {
      if (!hasBothReviewersGraded) {
        return {
          canGrade: false,
          reason: 'Chưa thể chấm điểm hội đồng do các giảng viên phản biện chưa hoàn tất chấm điểm.',
        };
      }
      return {
        canGrade: true,
        reason: 'Chấm điểm Hội đồng',
      };
    }

    return {
      canGrade: true,
      reason: 'Chấm điểm',
    };
  };

  // Open Grade Box Modal
  const handleOpenGradeBox = (thesis, targetRole = null) => {
    const role =
      targetRole ||
      (activeTab === 'REVIEWER_1' || activeTab === 'REVIEW_BLIND'
        ? 'REVIEWER1'
        : activeTab === 'COUNCIL'
          ? 'COUNCIL'
          : activeTab === 'REVIEWER_2'
            ? 'REVIEWER2'
            : 'SUPERVISOR');

    const gradeStatus = getGradingStatusForThesis(thesis, role);
    if (!gradeStatus.canGrade) {
      showToast(gradeStatus.reason || 'Chưa thể chấm điểm ở giai đoạn này', 'warning');
      return;
    }

    if (activeTab === 'SUPERVISOR' && !targetRole) {
      navigate(`/lecturer/theses/${thesis._id}/evaluate`);
      return;
    }
    setGradeBoxThesis(thesis);
    setGradeBoxRole(role);

    const isTwo = thesis.studentCount === 2 && thesis.secondStudentId;
    let s1 = '';
    let s2 = '';
    let c = '';

    if (role === 'SUPERVISOR') {
      s1 = thesis.scores?.student1SupervisorScore !== null && thesis.scores?.student1SupervisorScore !== undefined
        ? thesis.scores.student1SupervisorScore
        : !isTwo && thesis.scores?.supervisorScore !== null && thesis.scores?.supervisorScore !== undefined
          ? thesis.scores.supervisorScore
          : '';
      s2 = thesis.scores?.student2SupervisorScore !== null && thesis.scores?.student2SupervisorScore !== undefined
        ? thesis.scores.student2SupervisorScore
        : '';
      c = thesis.scores?.supervisorComment || '';
    } else if (role === 'REVIEWER1') {
      s1 = thesis.scores?.student1Reviewer1Score !== null && thesis.scores?.student1Reviewer1Score !== undefined
        ? thesis.scores.student1Reviewer1Score
        : !isTwo && thesis.scores?.reviewer1Score !== null && thesis.scores?.reviewer1Score !== undefined
          ? thesis.scores.reviewer1Score
          : '';
      s2 = thesis.scores?.student2Reviewer1Score !== null && thesis.scores?.student2Reviewer1Score !== undefined
        ? thesis.scores.student2Reviewer1Score
        : '';
      c = thesis.scores?.reviewer1Comment || '';
    } else if (role === 'REVIEWER2') {
      s1 = thesis.scores?.student1Reviewer2Score !== null && thesis.scores?.student1Reviewer2Score !== undefined
        ? thesis.scores.student1Reviewer2Score
        : !isTwo && thesis.scores?.reviewer2Score !== null && thesis.scores?.reviewer2Score !== undefined
          ? thesis.scores.reviewer2Score
          : '';
      s2 = thesis.scores?.student2Reviewer2Score !== null && thesis.scores?.student2Reviewer2Score !== undefined
        ? thesis.scores.student2Reviewer2Score
        : '';
      c = thesis.scores?.reviewer2Comment || '';
    } else if (role === 'COUNCIL' || role === 'COUNCIL_MEMBER') {
      const myEntry = Array.isArray(thesis.scores?.councilLecturerScores)
        ? thesis.scores.councilLecturerScores.find((e) => isSameLecturer(e, user, data?.lecturer))
        : null;
      s1 = myEntry?.student1Score !== null && myEntry?.student1Score !== undefined
        ? myEntry.student1Score
        : !isTwo && myEntry?.score !== null && myEntry?.score !== undefined
          ? myEntry.score
          : '';
      s2 = myEntry?.student2Score !== null && myEntry?.student2Score !== undefined
        ? myEntry.student2Score
        : '';
      c = myEntry?.comment || '';
    }

    setGradeSv1(s1 !== '' && s1 !== null && s1 !== undefined ? String(s1) : '');
    setGradeSv2(s2 !== '' && s2 !== null && s2 !== undefined ? String(s2) : '');
    setGradeComment(c || '');
    setGradeBoxOpen(true);
  };

  const handleConfirmGradeBox = async (e) => {
    if (e) e.preventDefault();
    if (!gradeBoxThesis) return;
    if (!gradingPeriodStatus.canGrade) {
      showToast(gradingPeriodStatus.statusText || 'Hiện không nằm trong thời gian nhập điểm', 'error');
      return;
    }

    const isTwo = gradeBoxThesis.studentCount === 2 && gradeBoxThesis.secondStudentId;

    // Validation: SV1 score is strictly required
    if (gradeSv1 === '' || gradeSv1 === null || gradeSv1 === undefined) {
      showToast('Vui lòng nhập điểm cho Sinh viên 1 (SV1)!', 'warning');
      return;
    }
    const val1 = Number(gradeSv1);
    if (isNaN(val1) || val1 < 0 || val1 > 10) {
      showToast('Điểm số SV1 phải là số hợp lệ từ 0 đến 10', 'warning');
      return;
    }

    // Validation: SV2 score is strictly required if 2 students
    let val2 = null;
    if (isTwo) {
      if (gradeSv2 === '' || gradeSv2 === null || gradeSv2 === undefined) {
        showToast('Vui lòng nhập điểm cho Sinh viên 2 (SV2)!', 'warning');
        return;
      }
      val2 = Number(gradeSv2);
      if (isNaN(val2) || val2 < 0 || val2 > 10) {
        showToast('Điểm số SV2 phải là số hợp lệ từ 0 đến 10', 'warning');
        return;
      }
    }

    const avgScore = isTwo && val2 !== null ? Number(((val1 + val2) / 2).toFixed(2)) : val1;

    setGradeSaving(true);
    try {
      const res = await thesisApi.gradeThesis(gradeBoxThesis._id, {
        score: avgScore,
        student1Score: val1,
        student2Score: val2,
        comment: gradeComment.trim(),
        roleType: gradeBoxRole,
      });

      if (res.success) {
        showToast(`Đã lưu điểm thành công cho đề tài "${gradeBoxThesis.thesisTitle}"!`, 'success');
        setGradeBoxOpen(false);
        setGradeBoxThesis(null);
        fetchAssignedTheses(true);
      }
    } catch (err) {
      showToast(err.message || 'Lưu điểm thất bại', 'error');
    } finally {
      setGradeSaving(false);
    }
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
    if (e) e.preventDefault();
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

  const handleOpenCancel = (thesis) => {
    setCancelThesisTarget(thesis);
    setCancelThesisReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e) => {
    if (e) e.preventDefault();
    if (!cancelThesisReason || !cancelThesisReason.trim()) {
      showToast('Vui lòng nhập lý do hủy đề tài', 'warning');
      return;
    }
    if (!cancelThesisTarget) return;

    setActionLoading(true);
    try {
      const res = await thesisApi.supervisorCancel(cancelThesisTarget._id, {
        reason: cancelThesisReason.trim(),
      });
      if (res.success) {
        showToast(res.message || 'Đã hủy đề tài và giải phóng trạng thái đăng ký của sinh viên', 'success');
        setCancelModalOpen(false);
        setCancelThesisTarget(null);
        setCancelThesisReason('');
        fetchAssignedTheses();
      }
    } catch (err) {
      showToast(err.message || 'Không thể hủy đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (thesis) => {
    setTargetThesis(thesis);
    const startVal = thesis.startDate || thesis.academicTermId?.startDate || '';
    const endVal = thesis.endDate || thesis.academicTermId?.endDate || '';
    setDetailStartDate(startVal ? (typeof startVal === 'string' ? startVal.split('T')[0] : new Date(startVal).toISOString().split('T')[0]) : '');
    setDetailEndDate(endVal ? (typeof endVal === 'string' ? endVal.split('T')[0] : new Date(endVal).toISOString().split('T')[0]) : '');
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

  const formatLecturerDisplay = (lecturer) => {
    if (!lecturer) return 'Chưa phân công';
    return lecturer.userId?.fullName || lecturer.fullName || lecturer.name || 'Giảng viên';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Reviewer 1 Display Name
  const getReviewer1Display = (item) => {
    if (!item) return 'Chưa phân công';
    if (item.reviewer1Id) {
      return item.reviewer1Id.userId?.fullName || item.reviewer1Id.fullName || 'Giảng viên';
    }
    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      const priv = item.reviewers.find((r) => r.isPrivateReviewer && r.lecturerId);
      if (priv) {
        const lec = priv.lecturerId;
        return lec.userId?.fullName || lec.fullName || 'Giảng viên';
      }
    }
    return 'Chưa phân công';
  };

  // Reviewer 2 Display Name
  const getReviewer2Display = (item) => {
    if (!item) return 'Chưa phân công';
    if (item.reviewer2Id) {
      return item.reviewer2Id.userId?.fullName || item.reviewer2Id.fullName || 'Giảng viên';
    }
    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      const coun = item.reviewers.find((r) => r.isCouncilReviewer && r.lecturerId);
      if (coun) {
        const lec = coun.lecturerId;
        return lec.userId?.fullName || lec.fullName || 'Giảng viên';
      }
    }
    return 'Chưa phân công';
  };



  // 4. Tổng điểm: Hiển thị khi đã công bố đầy đủ hoặc hoàn tất chấm
  const renderFinalScore = (item) => {
    const globalPub = publishedScores['GLOBAL_ALL'] || {};
    const thesisPub = publishedScores[item._id] || {};
    const isFinalPublished = !!(thesisPub.finalScore || globalPub.finalScore);
    const isPB1Published = !!(
      thesisPub.reviewer1Score ||
      thesisPub.reviewerScore ||
      thesisPub.reviewer2Score ||
      globalPub.reviewer1Score ||
      globalPub.reviewerScore ||
      globalPub.reviewer2Score
    );
    const isCouncilPublished = !!(thesisPub.councilScore || globalPub.councilScore);

    // Không làm lộ điểm nếu các thành phần chưa công bố
    if (!isFinalPublished && (!isPB1Published || !isCouncilPublished)) {
      return (
        <span
          className="text-amber-700 bg-amber-50 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-200 inline-block"
          title="Tổng điểm chưa được công bố"
        >
          Chưa công bố
        </span>
      );
    }

    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1 = item.scores?.student1FinalScore ?? item.scores?.finalScore;
    const s2 = item.scores?.student2FinalScore;

    if (s1 !== null && s1 !== undefined && s1 !== '') {
      if (isTwo && s2 !== null && s2 !== undefined && s2 !== '') {
        return (
          <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
            <span className="text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded font-bold" title="Tổng điểm SV1">
              SV1: {s1}
            </span>
            <span className="text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded font-bold" title="Tổng điểm SV2">
              SV2: {s2}
            </span>
          </div>
        );
      }
      return (
        <span className="font-extrabold text-emerald-800 font-mono text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
          {s1}
        </span>
      );
    }

    return <span className="text-slate-400 italic text-[11px]">Chưa hoàn tất</span>;
  };

  // 1. Điểm GVHD: Ghi nhận trực tiếp khi chấm xong
  const renderSupervisorScore = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1 = item.scores?.student1SupervisorScore ?? item.scores?.supervisorScore;
    const s2 = item.scores?.student2SupervisorScore;

    if (s1 === null || s1 === undefined || s1 === '') {
      return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
    }

    if (isTwo && s2 !== null && s2 !== undefined && s2 !== '') {
      return (
        <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV1">
            SV1: {s1}
          </span>
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV2">
            SV2: {s2}
          </span>
        </div>
      );
    }

    return (
      <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
        {s1}
      </span>
    );
  };

  // 2. Điểm Phản biện 1 (GVPB 1)
  const renderReviewer1Score = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1 = item.scores?.student1Reviewer1Score ?? item.scores?.reviewer1Score;
    const s2 = item.scores?.student2Reviewer1Score;

    if (s1 === null || s1 === undefined || s1 === '') {
      return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
    }

    if (isTwo && s2 !== null && s2 !== undefined && s2 !== '') {
      return (
        <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV1">
            SV1: {s1}
          </span>
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV2">
            SV2: {s2}
          </span>
        </div>
      );
    }

    return (
      <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
        {s1}
      </span>
    );
  };

  // 2b. Điểm Phản biện 2 (GVPB 2)
  const renderReviewer2Score = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1 = item.scores?.student1Reviewer2Score ?? item.scores?.reviewer2Score;
    const s2 = item.scores?.student2Reviewer2Score;

    if (s1 === null || s1 === undefined || s1 === '') {
      return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
    }

    if (isTwo && s2 !== null && s2 !== undefined && s2 !== '') {
      return (
        <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV1">
            SV1: {s1}
          </span>
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV2">
            SV2: {s2}
          </span>
        </div>
      );
    }

    return (
      <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
        {s1}
      </span>
    );
  };

  // 2c. Điểm phản biện kín tổng hợp (Trung bình cộng của GVPB 1 và GVPB 2 nếu có 2 người chấm, hoặc lấy trực tiếp điểm 1 người không cần chia)
  const renderCombinedReviewerScore = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1_pb1 = item.scores?.student1Reviewer1Score ?? item.scores?.reviewer1Score;
    const s1_pb2 = item.scores?.student1Reviewer2Score ?? item.scores?.reviewer2Score;
    const s2_pb1 = item.scores?.student2Reviewer1Score;
    const s2_pb2 = item.scores?.student2Reviewer2Score;

    const calcCombined = (pb1, pb2) => {
      const has1 = pb1 !== null && pb1 !== undefined && pb1 !== '' && !isNaN(Number(pb1));
      const has2 = pb2 !== null && pb2 !== undefined && pb2 !== '' && !isNaN(Number(pb2));

      if (has1 && has2) {
        return Number(((Number(pb1) + Number(pb2)) / 2).toFixed(2));
      }
      if (has1) {
        return Number(Number(pb1).toFixed(2));
      }
      if (has2) {
        return Number(Number(pb2).toFixed(2));
      }
      return null;
    };

    const c1 = calcCombined(s1_pb1, s1_pb2);
    const c2 = isTwo ? calcCombined(s2_pb1, s2_pb2) : null;

    if (c1 !== null) {
      if (isTwo && c2 !== null) {
        return (
          <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
            <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm PB kín SV1">
              SV1: {c1}
            </span>
            <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm PB kín SV2">
              SV2: {c2}
            </span>
          </div>
        );
      }
      return (
        <span className="font-extrabold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
          {c1}
        </span>
      );
    }

    return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
  };

  // Helper lấy thông tin điểm của Giảng viên Hội đồng theo vị trí (lecIndex: 0 hoặc 1)
  const getCouncilLecturerScoreInfo = (item, lecIndex) => {
    const council = activeCouncil || effectiveActiveCouncil || getAssignedCouncil(item);
    const targetLec = Array.isArray(council?.lecturers) ? council.lecturers[lecIndex] : null;

    const councilScores = Array.isArray(item.scores?.councilLecturerScores)
      ? item.scores.councilLecturerScores.filter((e) => e && (e.score !== null || e.student1Score !== null || e.student2Score !== null))
      : [];

    let entry = null;

    if (targetLec) {
      // Tìm bài chấm khớp chính xác targetLec
      entry = councilScores.find((e) => matchTwoLecturers(targetLec, e));
    }

    let s1 = null;
    let s2 = null;

    if (entry) {
      s1 = entry.student1Score !== null && entry.student1Score !== undefined && entry.student1Score !== ''
        ? Number(entry.student1Score)
        : (entry.score !== null && entry.score !== undefined && entry.score !== '' ? Number(entry.score) : null);
      s2 = entry.student2Score !== null && entry.student2Score !== undefined && entry.student2Score !== ''
        ? Number(entry.student2Score)
        : null;
    }

    const hasScore = s1 !== null && !isNaN(s1);
    return { entry, s1, s2, hasScore };
  };

  // 3a. Điểm của từng Giảng viên Hội đồng (GVHĐ 1 - index 0, GVHĐ 2 - index 1)
  const renderCouncilLecturerScore = (item, lecIndex) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const { s1, s2, hasScore } = getCouncilLecturerScoreInfo(item, lecIndex);

    if (!hasScore) {
      return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
    }

    if (isTwo && s2 !== null && !isNaN(s2)) {
      return (
        <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV1">
            SV1: {s1}
          </span>
          <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV2">
            SV2: {s2}
          </span>
        </div>
      );
    }

    return (
      <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
        {s1}
      </span>
    );
  };

  // 3b. Điểm Hội đồng tổng hợp (Tính trung bình cộng của 2 GV Hội Đồng khi cả 2 GV đã chấm)
  const renderCouncilAverageScore = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const gv1 = getCouncilLecturerScoreInfo(item, 0);
    const gv2 = getCouncilLecturerScoreInfo(item, 1);

    const hasGV1 = gv1.hasScore && (!isTwo || (gv1.s2 !== null && !isNaN(gv1.s2)));
    const hasGV2 = gv2.hasScore && (!isTwo || (gv2.s2 !== null && !isNaN(gv2.s2)));

    // Khi CẢ 2 GV HỘI ĐỒNG đã chấm điểm -> Điểm hội đồng = TRUNG BÌNH CỘNG của 2 GV
    if (hasGV1 && hasGV2) {
      const avgSv1 = Number(((gv1.s1 + gv2.s1) / 2).toFixed(2));
      if (isTwo) {
        const avgSv2 = Number(((gv1.s2 + gv2.s2) / 2).toFixed(2));
        return (
          <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
            <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm HĐ SV1">
              SV1: {avgSv1}
            </span>
            <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm HĐ SV2">
              SV2: {avgSv2}
            </span>
          </div>
        );
      }
      return (
        <span className="font-extrabold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
          {avgSv1}
        </span>
      );
    }

    // Nếu chỉ mới 1 GV chấm điểm
    if (hasGV1 || hasGV2) {
      return (
        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-medium border border-amber-200" title="Chờ giảng viên còn lại trong hội đồng chấm điểm để tính điểm hội đồng">
          Chờ GV còn lại
        </span>
      );
    }

    // Chưa GV nào chấm điểm
    return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
  };

  // Legacy/Fallback aliases
  const renderCouncilScore = renderCouncilAverageScore;
  const renderMyCouncilScore = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const myEntry = Array.isArray(item.scores?.councilLecturerScores)
      ? item.scores.councilLecturerScores.find((e) => isSameLecturer(e, user, data?.lecturer))
      : null;

    if (myEntry) {
      const s1 = myEntry.student1Score !== null && myEntry.student1Score !== undefined ? myEntry.student1Score : myEntry.score;
      const s2 = myEntry.student2Score;
      if (isTwo && s2 !== null && s2 !== undefined && s2 !== '') {
        return (
          <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
            <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV1">
              SV1: {s1}
            </span>
            <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Điểm SV2">
              SV2: {s2}
            </span>
          </div>
        );
      }
      return (
        <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
          {s1}
        </span>
      );
    }

    return <span className="text-slate-400 italic text-[11px]">Chưa chấm</span>;
  };

  const isTopicsView = activeTab === 'MY_TOPICS' || location.search.includes('tab=topics');
  const isCouncilTab = activeTab === 'COUNCIL' || location.search.includes('tab=council');
  const isReviewView =
    activeTab === 'REVIEW_BLIND' ||
    activeTab === 'REVIEWER_1' ||
    activeTab === 'REVIEWER_2' ||
    activeTab === 'COUNCIL' ||
    location.search.includes('tab=review') ||
    location.search.includes('tab=reviewer1') ||
    location.search.includes('tab=reviewer2') ||
    location.search.includes('tab=council');
  const isEvaluationView = location.search.includes('view=evaluation');

  const filteredApprovedTopics = approvedTopics.filter((topic) => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return true;
    return (
      topic.title?.toLowerCase().includes(q) ||
      topic.description?.toLowerCase().includes(q) ||
      topic.supervisor?.fullName?.toLowerCase().includes(q) ||
      topic.supervisor?.lecturerCode?.toLowerCase().includes(q)
    );
  });

  const filteredMyTopics = myTopics.filter((topic) => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return true;
    return (
      topic.title?.toLowerCase().includes(q) ||
      topic.description?.toLowerCase().includes(q) ||
      topic.rejectionReason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md shrink-0 text-white ${
                isTopicsView
                  ? 'bg-gradient-to-tr from-[#123891] to-[#1B4DA1] shadow-blue-200'
                  : isReviewView
                    ? 'bg-gradient-to-tr from-[#0d2a75] to-[#123891] shadow-blue-200'
                    : isEvaluationView
                      ? 'bg-gradient-to-tr from-amber-500 to-[#123891] shadow-amber-200'
                      : 'bg-gradient-to-tr from-[#0d2a75] to-[#123891] shadow-blue-200'
              }`}
            >
              {isTopicsView ? (
                <BookOpen className="w-7 h-7" />
              ) : isReviewView ? (
                isCouncilTab ? <Award className="w-7 h-7" /> : <Shield className="w-7 h-7" />
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
                    ? 'Danh Sách Đề Tài Khóa Luận Tốt Nghiệp'
                    : isReviewView
                      ? isCouncilTab
                        ? 'Chấm Điểm Phản Biện Hội Đồng (20%)'
                        : 'Chấm Điểm Phản Biện Khóa Luận (GVPB - 30%)'
                      : isEvaluationView
                        ? 'Đánh Giá Khóa Luận Tốt Nghiệp (GVHD - 50%)'
                        : 'Đề tài hướng dẫn'}
                </h2>
                {!isTopicsView && (
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      isReviewView
                        ? isCouncilTab
                          ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                          : 'bg-blue-50 text-[#102d7d] border-blue-200'
                        : isEvaluationView
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-[#102d7d] border-blue-200'
                    }`}
                  >
                    {isReviewView
                      ? isCouncilTab
                        ? 'PHẢN BIỆN HỘI ĐỒNG (20%)'
                        : 'PHẢN BIỆN KÍN (GVPB 1 & GVPB 2 - 30%)'
                      : isEvaluationView
                        ? 'ĐÁNH GIÁ (50%)'
                        : 'HƯỚNG DẪN (50%)'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>
                  Giảng viên:{' '}
                  <strong className="text-slate-800">
                    {lecturerInfo?.academicTitle ? `${lecturerInfo.academicTitle} ` : ''}
                    {lecturerInfo?.userId?.fullName || user?.fullName}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Mã GV:{' '}
                  <strong className="font-mono text-[#102d7d]">
                    {lecturerInfo?.lecturerCode || user?.username}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isTopicsView && isActiveTerm && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTermForCreation(currentTerm?._id || (terms && terms[0]?._id) || '');
                  setCreateTopicModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 cursor-pointer"
                title="Đề xuất đề tài KLTN"
              >
                <BookOpen className="w-4 h-4" />
                <span>+ Đề xuất đề tài KLTN</span>
              </button>
            )}

            <button
              onClick={() => {
                fetchAssignedTheses();
                fetchMyTopics();
                fetchApprovedTopics();
              }}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Past/Non-active Term Notification Banner */}
        {!isActiveTerm && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-900 text-xs shadow-2xs mt-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Đang xem học kỳ ({currentTerm?.name || 'Học kỳ'} • {currentTerm?.academicYear || ''}):</span>
              <span className="ml-1 text-amber-800">
                Học kỳ này không ở trạng thái đang diễn ra.
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sub-Tabs for Topics View */}
        {isTopicsView && (
          <div className="flex items-center gap-2 border-b border-slate-200 mt-6 pt-2">
            <button
              type="button"
              onClick={() => setTopicsSubTab('MY_PROPOSALS')}
              className={`flex items-center gap-2.5 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
                topicsSubTab === 'MY_PROPOSALS'
                  ? 'border-[#123891] text-[#123891] bg-blue-50/70 rounded-t-2xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-2xl'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Đề tài tôi đã đề xuất</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                topicsSubTab === 'MY_PROPOSALS' ? 'bg-[#123891] text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {myTopics.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTopicsSubTab('APPROVED_BANK')}
              className={`flex items-center gap-2.5 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
                topicsSubTab === 'APPROVED_BANK'
                  ? 'border-[#123891] text-[#123891] bg-blue-50/70 rounded-t-2xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-2xl'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Tất cả đề tài</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                topicsSubTab === 'APPROVED_BANK' ? 'bg-[#123891] text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {approvedTopics.length}
              </span>
            </button>
          </div>
        )}

        {/* Navigation Tabs for Review Section */}
        {isReviewView && (
          <div className="flex items-center gap-2 border-b border-slate-200 mt-6 pt-2">
            <button
              type="button"
              onClick={() => navigate('/lecturer/theses?tab=review')}
              className={`flex items-center gap-2.5 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
                !isCouncilTab
                  ? 'border-[#123891] text-[#123891] bg-blue-50/70 rounded-t-2xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-2xl'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Phản biện kín (GVPB 1 & GVPB 2)</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                !isCouncilTab ? 'bg-[#123891] text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {filteredReviewer1Theses.length + filteredReviewer2Theses.length} đề tài
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/lecturer/theses?tab=council')}
              className={`flex items-center gap-2.5 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
                isCouncilTab
                  ? 'border-[#123891] text-[#123891] bg-blue-50/70 rounded-t-2xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-2xl'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Phản biện Hội đồng</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                isCouncilTab ? 'bg-[#123891] text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {councilTheses.length} đề tài
              </span>
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
                ? 'Tìm tên đề tài, giảng viên, mô tả...'
                : 'Tìm MSSV, Tên SV, Tên đề tài...'
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Academic Term Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">Học kỳ:</span>
            <select
              value={currentTerm?._id || ''}
              onChange={(e) => {
                if (setCurrentTerm && e.target.value) {
                  setCurrentTerm(e.target.value);
                }
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
            >
              {Array.isArray(terms) && terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : '• Đã đóng'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      {isTopicsView ? (
        topicsSubTab === 'MY_PROPOSALS' ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loadingMyTopics ? (
              <div className="p-6">
                <LoadingSkeleton rows={5} cols={7} />
              </div>
            ) : filteredMyTopics.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-700">
                  {myTopics.length === 0
                    ? 'Bạn chưa đề xuất đề tài nào trong học kỳ này'
                    : 'Không tìm thấy đề tài phù hợp với từ khóa'}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {myTopics.length === 0
                    ? isActiveTerm
                      ? 'Bấm nút "+ Đề xuất đề tài KLTN" ở trên để tạo đề tài mới gửi Trưởng Bộ Môn xét duyệt.'
                      : 'Học kỳ này không có đề tài đề xuất nào.'
                    : 'Thử thay đổi từ khóa tìm kiếm để tìm đề tài mong muốn.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 text-center w-12">STT</th>
                      <th className="py-3.5 px-4 min-w-[240px]">Tên đề tài KLTN</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Học kỳ</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-center">Trạng thái duyệt</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Mô tả / Phản hồi</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-center">Ngày tạo</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMyTopics.map((topic, idx) => {
                      const termName = topic.academicTermId?.name || currentTerm?.name || 'Học kỳ';
                      const isPendingEdit = topic.editRequest?.status === 'PENDING';
                      const isPendingDelete = topic.deleteRequest?.status === 'PENDING';

                      return (
                        <tr key={topic._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedTopicDetail(topic)}
                              className="text-left group cursor-pointer"
                              title="Bấm để xem chi tiết đề tài"
                            >
                              <span className="text-slate-900 group-hover:text-[#123891] font-bold block leading-snug transition">
                                {topic.title}
                              </span>
                            </button>
                            {isPendingEdit && (
                              <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Đang yêu cầu đổi tên: <strong>"{topic.editRequest?.newTitle}"</strong> (Chờ TBM duyệt)</span>
                              </div>
                            )}
                            {isPendingDelete && (
                              <div className="mt-1 text-[11px] text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Đang yêu cầu xóa đề tài (Chờ TBM duyệt)</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200">
                              {termName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              {topic.status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã duyệt</span>
                                </span>
                              ) : topic.status === 'REJECTED' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-[#c5221f] border border-rose-200">
                                  <X className="w-3.5 h-3.5" />
                                  <span>Từ chối</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Chờ TBM duyệt</span>
                                </span>
                              )}
                              {isPendingEdit && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                  Chờ duyệt sửa
                                </span>
                              )}
                              {isPendingDelete && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  Chờ duyệt xóa
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs text-slate-600">
                            {topic.status === 'REJECTED' && topic.rejectionReason ? (
                              <div className="text-rose-600 text-xs font-medium bg-rose-50 p-2 rounded-lg border border-rose-100">
                                <strong>Lý do từ chối:</strong> {topic.rejectionReason}
                              </div>
                            ) : topic.editRequest?.status === 'REJECTED' && topic.editRequest?.rejectReason ? (
                              <div className="text-amber-700 text-[11px] font-medium bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                                <strong>Yêu cầu sửa bị từ chối:</strong> {topic.editRequest.rejectReason}
                              </div>
                            ) : topic.deleteRequest?.status === 'REJECTED' && topic.deleteRequest?.rejectReason ? (
                              <div className="text-rose-700 text-[11px] font-medium bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                <strong>Yêu cầu xóa bị từ chối:</strong> {topic.deleteRequest.rejectReason}
                              </div>
                            ) : (
                              <span className="truncate block">{topic.description || <span className="italic text-slate-400">Không có mô tả</span>}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center text-slate-500 font-mono text-[11px]">
                            {formatDate(topic.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedTopicDetail(topic)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Xem chi tiết đề tài"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditTopic(topic)}
                                disabled={isPendingEdit || isPendingDelete}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isPendingEdit ? 'Đang chờ TBM duyệt yêu cầu sửa' : 'Chỉnh sửa đề tài'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteTopic(topic)}
                                disabled={isPendingDelete || isPendingEdit}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isPendingDelete ? 'Đang chờ TBM duyệt yêu cầu xóa' : 'Xóa đề tài'}
                              >
                                <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loadingApprovedTopics ? (
              <div className="p-6">
                <LoadingSkeleton rows={5} cols={6} />
              </div>
            ) : filteredApprovedTopics.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-700">
                  {approvedTopics.length === 0
                    ? 'Chưa có đề tài nào được duyệt trong học kỳ này'
                    : 'Không tìm thấy đề tài phù hợp với bộ lọc'}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {approvedTopics.length === 0
                    ? isActiveTerm
                    : 'Bấm nút "+ Đề xuất đề tài KLTN" ở trên để tạo đề tài mới gửi Trưởng Bộ Môn xét duyệt.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 text-center w-12">STT</th>
                      <th className="py-3.5 px-4 min-w-[240px]">Tên đề tài KLTN</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Giảng viên</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Mô tả tóm tắt</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-center">Ngày tạo</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApprovedTopics.map((topic, idx) => {
                      const currentCount = topic.currentGroups || topic.registeredGroups?.length || 0;
                      const maxCount = topic.maxGroups || 1;
                      const isLocked = topic.isFull || currentCount >= maxCount || (topic.registeredGroups && topic.registeredGroups.length > 0);
                      const lecturerName = topic.supervisor?.fullName || topic.supervisorId?.userId?.fullName || (user?._id === topic.supervisorId ? user?.fullName : '—');
                      const lecturerCode = topic.supervisor?.lecturerCode || topic.supervisorId?.lecturerCode;

                      return (
                        <tr key={topic._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedTopicDetail(topic)}
                              className="text-left group cursor-pointer"
                              title="Bấm để xem chi tiết đề tài"
                            >
                              <span className="text-slate-900 group-hover:text-[#123891] font-bold block leading-snug transition">
                                {topic.title}
                              </span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {lecturerName}
                            </div>
                            {lecturerCode && (
                              <span className="text-slate-400 font-mono text-[11px]">
                                {lecturerCode}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                            {topic.description || <span className="italic text-slate-400">Không có mô tả</span>}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center text-slate-500 font-mono text-[11px]">
                            {formatDate(topic.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Đã khóa</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Cho phép đăng ký</span>
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
        )
      ) : isReviewView ? (
        isCouncilTab ? (
          !effectiveActiveCouncil ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-12 text-center space-y-3">
              <Award className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700">
                {councils.length === 0
                  ? 'Chưa có phòng hội đồng nào trong học kỳ này'
                  : 'Bạn chưa được phân công vào phòng hội đồng nào trong học kỳ này'}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {councils.length === 0
                  ? 'Hiện tại chưa có phòng hội đồng đánh giá khóa luận nào được thiết lập.'
                  : 'Khi Trưởng Bộ Môn phân công bạn vào hội đồng và gán các đề tài bảo vệ, danh sách đề tài sẽ xuất hiện tại đây để bạn chấm điểm.'}
              </p>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Council Selector Pills (if multiple councils exist for user) */}
            {myCouncils.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#123891]" />
                  Chọn phòng hội đồng:
                </span>
                {myCouncils.map((c, idx) => {
                  const cId = c.id || c._id;
                  const isActive = (effectiveActiveCouncil?.id || effectiveActiveCouncil?._id) === cId;
                  return (
                    <button
                      key={cId || idx}
                      type="button"
                      onClick={() => setSelectedCouncilId(cId)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                        isActive
                          ? 'bg-[#123891] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{c.name || `Hội đồng ${idx + 1}`}</span>
                      {c.room && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}>
                          P.{c.room}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Council Information Card */}
            {effectiveActiveCouncil && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-50/90 via-blue-50/50 to-white border border-blue-200/80 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {effectiveActiveCouncil.name || 'Hội đồng Đánh giá Khóa Luận Tốt Nghiệp'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                        {effectiveActiveCouncil.room && (
                          <span className="flex items-center gap-1 font-semibold text-[#123891]">
                            <MapPin className="w-3.5 h-3.5 text-[#123891]" />
                            Phòng: <span className="font-bold">{effectiveActiveCouncil.room}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {effectiveActiveCouncil.reportDate ? new Date(effectiveActiveCouncil.reportDate).toLocaleDateString('vi-VN') : 'Lịch theo thông báo khoa'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-100/80 text-[#102d7d] border border-blue-200">
                          {effectiveActiveCouncil.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Oral / Hội đồng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 rounded-full bg-white text-[#102d7d] font-extrabold text-xs font-mono border border-blue-200 shadow-2xs">
                      {councilTheses.length} đề tài trong hội đồng
                    </span>
                  </div>
                </div>

                {/* Council Lecturers List */}
                {Array.isArray(effectiveActiveCouncil.lecturers) && effectiveActiveCouncil.lecturers.length > 0 && (
                  <div className="pt-2 border-t border-blue-100/70 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#123891]" />
                      Thành viên hội đồng:
                    </span>
                    {effectiveActiveCouncil.lecturers.map((lec, lIdx) => {
                      const isMe = isSameLecturer(lec, user, data?.lecturer);
                      return (
                        <span
                          key={lIdx}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${
                            isMe
                              ? 'bg-[#123891] text-white font-bold border-[#123891] shadow-2xs'
                              : 'bg-white/80 text-slate-700 font-medium border-blue-100'
                          }`}
                        >
                          <span>{lec.name || lec.fullName || `GV ${lIdx + 1}`}</span>
                          {lec.role && <span className="opacity-75 text-[10px]">({lec.role})</span>}
                          {isMe && <span className="text-[10px] bg-white/20 px-1 rounded ml-0.5 font-bold">Bạn</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Table: Đề tài Hội đồng */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50/90 to-blue-50/40 border-b border-blue-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Danh Sách Đề Tài Phản Biện Hội Đồng</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Nhập điểm đánh giá bảo vệ trực tiếp trước Hội đồng cho từng đề tài
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white text-[#102d7d] font-bold text-xs font-mono border border-blue-200 shadow-2xs">
                  {councilTheses.length} đề tài
                </span>
              </div>

              {loading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={4} cols={10} />
                </div>
              ) : councilTheses.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="Chưa có đề tài nào trong hội đồng này"
                    description="Hiện tại chưa có đề tài khóa luận nào được phân công vào hội đồng bạn phụ trách hoặc chưa khớp từ khóa tìm kiếm."
                  />
                </div>
              ) : (
                (() => {
                  const lec1 = Array.isArray(effectiveActiveCouncil?.lecturers) ? effectiveActiveCouncil.lecturers[0] : null;
                  const lec2 = Array.isArray(effectiveActiveCouncil?.lecturers) ? effectiveActiveCouncil.lecturers[1] : null;

                  const isLec1Me = isSameLecturer(lec1, user, data?.lecturer);
                  const isLec2Me = isSameLecturer(lec2, user, data?.lecturer);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                            <th className="py-3.5 px-4 w-12 text-center">STT</th>
                            <th className="py-3.5 px-4 min-w-[220px]">Tên đề tài KLTN</th>
                            <th className="py-3.5 px-4 min-w-[180px]">Sinh viên</th>
                            <th className="py-3.5 px-4 min-w-[150px]">GV Hướng Dẫn</th>
                            <th className="py-3.5 px-4 min-w-[130px]">GVPB 1</th>
                            <th className="py-3.5 px-4 min-w-[130px]">GVPB 2</th>
                            <th className="py-3.5 px-4 min-w-[140px]">Hội đồng</th>
                            <th className={`py-3.5 px-4 text-center whitespace-nowrap min-w-[120px] ${isLec1Me ? 'bg-blue-50/70 text-[#102d7d]' : ''}`}>
                              <div>Điểm GVHĐ 1</div>
                              {(lec1?.name || lec1?.fullName) && (
                                <div className="text-[9px] font-normal normal-case opacity-80 truncate max-w-[110px] mx-auto">
                                  {lec1.name || lec1.fullName} {isLec1Me && <span className="font-bold text-[#123891]">(Bạn)</span>}
                                </div>
                              )}
                            </th>
                            <th className={`py-3.5 px-4 text-center whitespace-nowrap min-w-[120px] ${isLec2Me ? 'bg-blue-50/70 text-[#102d7d]' : ''}`}>
                              <div>Điểm GVHĐ 2</div>
                              {(lec2?.name || lec2?.fullName) && (
                                <div className="text-[9px] font-normal normal-case opacity-80 truncate max-w-[110px] mx-auto">
                                  {lec2.name || lec2.fullName} {isLec2Me && <span className="font-bold text-[#123891]">(Bạn)</span>}
                                </div>
                              )}
                            </th>
                            <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[120px] bg-blue-50/70 text-[#102d7d]">
                              <div>Điểm Hội Đồng</div>
                            </th>
                            <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[130px]">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {councilTheses.map((item, index) => {
                            return (
                              <tr key={item._id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                                  {index + 1}
                                </td>
                                <td className="py-3.5 px-4 max-w-sm">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetail(item)}
                                    className="text-left block group cursor-pointer"
                                    title="Bấm để xem toàn bộ thông tin đề tài"
                                  >
                                    <strong className="text-slate-900 group-hover:text-[#123891] line-clamp-2 leading-snug transition">
                                      {item.thesisTitle}
                                    </strong>
                                  </button>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono mt-1">
                                    {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex flex-col gap-1.5 min-w-[170px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                        <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800">
                                    {formatLecturerDisplay(item.supervisorId)}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {getReviewer1Display(item) !== 'Chưa phân công' ? (
                                    <span className="font-semibold text-slate-800">
                                      {getReviewer1Display(item)}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {getReviewer2Display(item) !== 'Chưa phân công' ? (
                                    <span className="font-semibold text-slate-800">
                                      {getReviewer2Display(item)}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800">
                                    {effectiveActiveCouncil?.name || getAssignedCouncil(item)?.name || 'Hội đồng KLTN'}
                                  </div>
                                  {(effectiveActiveCouncil?.room || getAssignedCouncil(item)?.room) && (
                                    <span className="text-[10px] font-mono text-[#123891] bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-blue-100 font-semibold">
                                      Phòng: {effectiveActiveCouncil?.room || getAssignedCouncil(item)?.room}
                                    </span>
                                  )}
                                </td>
                                <td className={`py-3.5 px-4 whitespace-nowrap text-center ${isLec1Me ? 'bg-blue-50/30 font-bold' : ''}`}>
                                  {renderCouncilLecturerScore(item, 0)}
                                </td>
                                <td className={`py-3.5 px-4 whitespace-nowrap text-center ${isLec2Me ? 'bg-blue-50/30 font-bold' : ''}`}>
                                  {renderCouncilLecturerScore(item, 1)}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap text-center bg-blue-50/40 font-bold">
                                  {renderCouncilAverageScore(item)}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDetail(item)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                                      title="Xem chi tiết đề tài"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Chi tiết</span>
                                    </button>
                                    {item.status !== 'REJECTED' && (() => {
                                      const gradeStatus = getGradingStatusForThesis(item, 'COUNCIL');
                                      return (
                                        <button
                                          type="button"
                                          disabled={!gradeStatus.canGrade}
                                          onClick={() => {
                                            if (!gradeStatus.canGrade) return;
                                            handleOpenGradeBox(item, 'COUNCIL');
                                          }}
                                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl text-xs shadow-xs transition ${
                                            gradeStatus.canGrade
                                              ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                          }`}
                                          title={gradeStatus.reason}
                                        >
                                          <Award className="w-3.5 h-3.5" />
                                          <span>Chấm điểm</span>
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
          )
        ) : (
          <div className="space-y-8">
            {/* Banner gợi ý chuyển sang Phản biện hội đồng nếu có đề tài hội đồng */}
            {councilTheses.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-blue-50 to-white border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#123891] text-white flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Bạn có <span className="text-[#123891] font-extrabold">{councilTheses.length} đề tài</span> được phân công tại <span className="text-[#123891]">Phản biện hội đồng</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Vui lòng chuyển sang tab Phản biện hội đồng để xem danh sách phòng và thực hiện chấm điểm.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/lecturer/theses?tab=council')}
                  className="px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Xem đề tài Hội đồng ({councilTheses.length})</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* BẢNG 1: ĐỀ TÀI GIẢNG VIÊN PHẢN BIỆN 1 (GVPB 1) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50/90 to-blue-50/40 border-b border-blue-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Đề tài Giảng viên Phản biện 1 (GVPB 1)</span>
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white text-[#102d7d] font-bold text-xs font-mono border border-blue-200 shadow-2xs">
                  {filteredReviewer1Theses.length} đề tài
                </span>
              </div>

              {loading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={4} cols={10} />
                </div>
              ) : filteredReviewer1Theses.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="Chưa có đề tài nào làm Giảng viên phản biện 1"
                    description="Bạn hiện chưa được phân công làm GVPB 1 cho đề tài nào trong học kỳ này hoặc chưa khớp với từ khóa tìm kiếm."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4 w-12 text-center">STT</th>
                        <th className="py-3.5 px-4 min-w-[220px]">Tên đề tài KLTN</th>
                        <th className="py-3.5 px-4 min-w-[180px]">Sinh viên</th>
                        <th className="py-3.5 px-4 min-w-[150px]">GV Hướng Dẫn</th>
                        <th className="py-3.5 px-4 min-w-[150px] bg-blue-50/70 text-[#102d7d]">GVPB 1 (Bạn)</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px] bg-blue-50/70 text-[#102d7d]">Điểm GVPB 1</th>
                        <th className="py-3.5 px-4 min-w-[150px]">GVPB 2</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">Điểm GVPB 2</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[125px]">Điểm phản biện kín</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[130px]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReviewer1Theses.map((item, index) => {
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4 max-w-sm">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(item)}
                                className="text-left block group cursor-pointer"
                                title="Bấm để xem toàn bộ thông tin đề tài"
                              >
                                <strong className="text-slate-900 group-hover:text-[#123891] line-clamp-2 leading-snug transition">
                                  {item.thesisTitle}
                                </strong>
                              </button>
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono mt-1">
                                {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1.5 min-w-[170px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                    <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">
                                {formatLecturerDisplay(item.supervisorId)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap bg-blue-50/40 font-semibold text-[#102d7d]">
                              {getReviewer1Display(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center bg-blue-50/40 font-bold">
                              {renderReviewer1Score(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {getReviewer2Display(item) !== 'Chưa phân công' ? (
                                <span className="font-semibold text-slate-800">
                                  {getReviewer2Display(item)}
                                </span>
                              ) : (
                                <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {renderReviewer2Score(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {renderCombinedReviewerScore(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                                  title="Xem chi tiết đề tài"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Chi tiết</span>
                                </button>
                                {item.status !== 'REJECTED' && (() => {
                                  const gradeStatus = getGradingStatusForThesis(item, 'REVIEWER1');
                                  return (
                                    <button
                                      type="button"
                                      disabled={!gradeStatus.canGrade}
                                      onClick={() => {
                                        if (!gradeStatus.canGrade) return;
                                        handleOpenGradeBox(item, 'REVIEWER1');
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl text-xs shadow-xs transition ${
                                        gradeStatus.canGrade
                                          ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      }`}
                                      title={gradeStatus.reason}
                                    >
                                      <Award className="w-3.5 h-3.5" />
                                      <span>Chấm điểm</span>
                                    </button>
                                  );
                                })()}
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

            {/* ========================================================================= */}
            {/* BẢNG 2: ĐỀ TÀI GIẢNG VIÊN PHẢN BIỆN 2 (GVPB 2) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50/90 to-blue-50/40 border-b border-blue-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Đề tài Giảng viên Phản biện 2 (GVPB 2)</span>
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white text-[#102d7d] font-bold text-xs font-mono border border-blue-200 shadow-2xs">
                  {filteredReviewer2Theses.length} đề tài
                </span>
              </div>

              {loading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={4} cols={10} />
                </div>
              ) : filteredReviewer2Theses.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="Chưa có đề tài nào làm Giảng viên phản biện 2"
                    description="Bạn hiện chưa được phân công làm GVPB 2 cho đề tài nào trong học kỳ này hoặc chưa khớp với từ khóa tìm kiếm."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4 w-12 text-center">STT</th>
                        <th className="py-3.5 px-4 min-w-[220px]">Tên đề tài KLTN</th>
                        <th className="py-3.5 px-4 min-w-[180px]">Sinh viên</th>
                        <th className="py-3.5 px-4 min-w-[150px]">GV Hướng Dẫn</th>
                        <th className="py-3.5 px-4 min-w-[150px]">GVPB 1</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">Điểm GVPB 1</th>
                        <th className="py-3.5 px-4 min-w-[150px] bg-blue-50/70 text-[#102d7d]">GVPB 2 (Bạn)</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px] bg-blue-50/70 text-[#102d7d]">Điểm GVPB 2</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[125px]">Điểm phản biện kín</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[130px]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReviewer2Theses.map((item, index) => {
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4 max-w-sm">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(item)}
                                className="text-left block group cursor-pointer"
                                title="Bấm để xem toàn bộ thông tin đề tài"
                              >
                                <strong className="text-slate-900 group-hover:text-[#123891] line-clamp-2 leading-snug transition">
                                  {item.thesisTitle}
                                </strong>
                              </button>
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono mt-1">
                                {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1.5 min-w-[170px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                    <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">
                                {formatLecturerDisplay(item.supervisorId)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {getReviewer1Display(item) !== 'Chưa phân công' ? (
                                <span className="font-semibold text-slate-800">
                                  {getReviewer1Display(item)}
                                </span>
                              ) : (
                                <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {renderReviewer1Score(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap bg-blue-50/40 font-semibold text-[#102d7d]">
                              {getReviewer2Display(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center bg-blue-50/40 font-bold">
                              {renderReviewer2Score(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {renderCombinedReviewerScore(item)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                                  title="Xem chi tiết đề tài"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Chi tiết</span>
                                </button>
                                {item.status !== 'REJECTED' && (() => {
                                  const gradeStatus = getGradingStatusForThesis(item, 'REVIEWER2');
                                  return (
                                    <button
                                      type="button"
                                      disabled={!gradeStatus.canGrade}
                                      onClick={() => {
                                        if (!gradeStatus.canGrade) return;
                                        handleOpenGradeBox(item, 'REVIEWER2');
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl text-xs shadow-xs transition ${
                                        gradeStatus.canGrade
                                          ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      }`}
                                      title={gradeStatus.reason}
                                    >
                                      <Award className="w-3.5 h-3.5" />
                                      <span>Chấm điểm</span>
                                    </button>
                                  );
                                })()}
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
          </div>
        )
      ) : (
        /* ================= BẢNG 12 CỘT THEO YÊU CẦU ================= */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} cols={12} />
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
                    {/* 1. STT */}
                    <th className="py-3.5 px-4 w-12 text-center">STT</th>
                    {/* 2. Tên đề tài KLTN */}
                    <th className="py-3.5 px-4 min-w-[220px]">Tên đề tài KLTN</th>
                    {/* 3. Sinh viên */}
                    <th className="py-3.5 px-4 min-w-[180px]">Sinh viên</th>
                    {/* 4. GV Hướng Dẫn */}
                    <th className="py-3.5 px-4 min-w-[150px]">GV Hướng Dẫn</th>
                    {/* 5. GVPB 1 */}
                    <th className="py-3.5 px-4 min-w-[150px]">GVPB 1</th>
                    {/* 6. GVPB 2 */}
                    <th className="py-3.5 px-4 min-w-[150px]">GVPB 2</th>
                    {/* 7. Hội đồng */}
                    <th className="py-3.5 px-4 min-w-[150px]">Hội đồng</th>
                    {/* 8. Điểm GVHD */}
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Điểm GVHD</th>
                    {/* 9. Điểm phản biện kín */}
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[120px]">Điểm phản biện kín</th>
                    {/* 10. Điểm phản biện hội đồng */}
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[130px]">Điểm phản biện hội đồng</th>
                    {/* 11. Tổng điểm */}
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Tổng điểm</th>
                    {/* 12. Thao tác */}
                    <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentList.map((item, index) => {
                    const isSupervisorTab = activeTab === 'SUPERVISOR';
                    const isPendingApproval = isSupervisorTab && item.status === 'PENDING_SUPERVISOR_APPROVAL';
                    const assignedCouncil = getAssignedCouncil(item);

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        {/* 1. STT */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                          {index + 1}
                        </td>

                        {/* 2. Tên đề tài KLTN */}
                        <td className="py-3.5 px-4 max-w-sm">
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
                          </div>
                        </td>

                        {/* 3. Sinh viên */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 min-w-[170px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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
                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                <span className="text-[9px] font-bold text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
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

                        {/* 4. GV Hướng Dẫn */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {formatLecturerDisplay(item.supervisorId)}
                          </div>
                        </td>

                        {/* 5. GVPB 1 */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getReviewer1Display(item) !== 'Chưa phân công' ? (
                            <span className="font-semibold text-slate-800">
                              {getReviewer1Display(item)}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                          )}
                        </td>

                        {/* 6. GVPB 2 */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getReviewer2Display(item) !== 'Chưa phân công' ? (
                            <span className="font-semibold text-slate-800">
                              {getReviewer2Display(item)}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                          )}
                        </td>

                        {/* 7. Hội đồng */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {assignedCouncil ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCouncilDetail(assignedCouncil)}
                              className="text-left group cursor-pointer p-2 -m-2 rounded-xl hover:bg-blue-50/80 transition block"
                              title="Bấm để xem chi tiết Hội đồng đánh giá"
                            >
                              <div className="space-y-0.5">
                                <strong className="text-[#123891] group-hover:text-[#0d2a75] group-hover:underline font-bold text-xs flex items-center gap-1">
                                  <span>{(assignedCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}</span>
                                  <ExternalLink className="w-3 h-3 text-[#123891] opacity-70 group-hover:opacity-100 shrink-0" />
                                </strong>
                                {assignedCouncil.room && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Phòng: {assignedCouncil.room}
                                  </div>
                                )}
                                {assignedCouncil.reportTime && (
                                  <div className="text-[10px] text-slate-600 font-mono flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 text-[#123891]" />
                                    <span>{assignedCouncil.reportTime}</span>
                                  </div>
                                )}
                              </div>
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
                              Chưa phân hội đồng
                            </span>
                          )}
                        </td>

                        {/* 8. Điểm GVHD */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {renderSupervisorScore(item)}
                        </td>

                        {/* 9. Điểm phản biện kín */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {renderCombinedReviewerScore(item)}
                        </td>

                        {/* 10. Điểm phản biện hội đồng */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {renderCouncilScore(item)}
                        </td>

                        {/* 11. Tổng điểm */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {renderFinalScore(item)}
                        </td>

                        {/* 12. Thao tác */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Chi tiết button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                              title="Xem chi tiết đề tài"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </button>

                            {/* Chấm điểm button (Mở trang đánh giá đầy đủ cho GVHD) */}
                            {item.status !== 'REJECTED' && !isPendingApproval && (() => {
                              const gradeStatus = getGradingStatusForThesis(item, 'SUPERVISOR');
                              return (
                                <button
                                  type="button"
                                  disabled={!gradeStatus.canGrade}
                                  onClick={() => {
                                    if (!gradeStatus.canGrade) return;
                                    if (activeTab === 'SUPERVISOR') {
                                      navigate(`/lecturer/theses/${item._id}/evaluate`);
                                    } else {
                                      handleOpenGradeBox(item);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl text-xs shadow-xs transition ${
                                    gradeStatus.canGrade
                                      ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  }`}
                                  title={gradeStatus.reason}
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Chấm điểm</span>
                                </button>
                              );
                            })()}

                            {/* Hủy đề tài (GVHD) */}
                            {activeTab === 'SUPERVISOR' && item.status !== 'REJECTED' && item.status !== 'COMPLETED' && !isPendingApproval && (() => {
                              const s1 = item.scores?.student1SupervisorScore ?? item.scores?.supervisorScore;
                              const isSupervisorGraded = s1 !== null && s1 !== undefined && s1 !== '';

                              return (
                                <button
                                  type="button"
                                  disabled={isSupervisorGraded}
                                  onClick={() => {
                                    if (isSupervisorGraded) return;
                                    handleOpenCancel(item);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-xl text-xs transition ${
                                    isSupervisorGraded
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer'
                                  }`}
                                  title={
                                    isSupervisorGraded
                                      ? 'Không thể hủy đề tài do GVHD đã nhập điểm đánh giá'
                                      : 'Hủy đề tài và giải phóng đăng ký cho sinh viên'
                                  }
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Hủy đề tài</span>
                                </button>
                              );
                            })()}

                            {/* Duyệt & Từ chối khi có yêu cầu sinh viên gửi */}
                            {isPendingApproval && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAccept(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReject(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition cursor-pointer text-xs"
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

      {/* ========================================================================= */}
      {/* MODAL: CHẤM ĐIỂM (BOX POPUP NHẬP ĐIỂM SV1 & SV2) */}
      {/* ========================================================================= */}
      {gradeBoxOpen && gradeBoxThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
                    gradeBoxRole === 'REVIEWER1'
                      ? 'bg-blue-600 shadow-blue-200'
                      : gradeBoxRole === 'REVIEWER2'
                        ? 'bg-[#123891] shadow-blue-200'
                        : gradeBoxRole === 'COUNCIL'
                          ? 'bg-[#123891] shadow-blue-200'
                          : 'bg-[#123891] shadow-blue-200'
                  }`}
                >
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chấm Điểm Đề Tài Khóa Luận
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        gradeBoxRole === 'REVIEWER1'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : gradeBoxRole === 'REVIEWER2'
                            ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                            : gradeBoxRole === 'COUNCIL'
                              ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                              : 'bg-blue-50 text-[#102d7d] border-blue-200'
                      }`}
                    >
                      {gradeBoxRole === 'REVIEWER1'
                        ? 'GVPB 1 (30%)'
                        : gradeBoxRole === 'REVIEWER2'
                          ? 'GVPB 2 (30%)'
                          : gradeBoxRole === 'COUNCIL'
                            ? 'HỘI ĐỒNG (20%)'
                            : 'GVHD (50%)'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGradeBoxOpen(false);
                  setGradeBoxThesis(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thesis Title & Student Info Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Đề tài chấm điểm
              </div>
              <div className="font-bold text-slate-900 text-sm leading-snug">
                {gradeBoxThesis.thesisTitle}
              </div>
              <div className="text-[11px] text-slate-500 font-medium pt-1">
                Số sinh viên:{' '}
                <strong className="text-slate-800">
                  {gradeBoxThesis.studentCount === 2 ? 'Nhóm 2 sinh viên' : 'Cá nhân (1 sinh viên)'}
                </strong>
              </div>
            </div>

            {/* Other council members scores info */}
            {(gradeBoxRole === 'COUNCIL' || gradeBoxRole === 'REVIEWER2') && Array.isArray(gradeBoxThesis.scores?.councilLecturerScores) && gradeBoxThesis.scores.councilLecturerScores.length > 0 && (
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs space-y-1.5">
                <div className="font-bold text-[#123891] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Điểm các thành viên trong Hội đồng đã chấm:</span>
                </div>
                <div className="space-y-1">
                  {gradeBoxThesis.scores.councilLecturerScores.map((cls, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11.5px] text-slate-700 bg-white/70 px-2.5 py-1 rounded-lg border border-blue-100">
                      <span className="font-medium">• {cls.lecturerName || 'Giảng viên'}:</span>
                      <span className="font-bold font-mono text-[#123891]">{cls.score} điểm</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 italic pt-0.5">
                  * Điểm Hội đồng chung (20%) sẽ tự động tính bằng trung bình cộng điểm của các giảng viên.
                </div>
              </div>
            )}

            {/* Score Inputs Form */}
            <form onSubmit={handleConfirmGradeBox} className="space-y-4">
              <div className="space-y-3">
                {/* SV 1 Input */}
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#123891] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#123891]" />
                      SV1: {gradeBoxThesis.studentId?.userId?.fullName || 'Sinh viên 1'}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      MSSV: {gradeBoxThesis.studentId?.studentCode || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Điểm SV1 (Thang 10) <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      required
                      value={gradeSv1}
                      onChange={(e) => setGradeSv1(e.target.value)}
                      placeholder="Nhập điểm từ 0 - 10..."
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
                    />
                  </div>
                </div>

                {/* SV 2 Input (If 2 students) */}
                {gradeBoxThesis.studentCount === 2 && gradeBoxThesis.secondStudentId && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#123891] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#123891]" />
                        SV2: {gradeBoxThesis.secondStudentId?.userId?.fullName || 'Sinh viên 2'}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        MSSV: {gradeBoxThesis.secondStudentId?.studentCode || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Điểm SV2 (Thang 10) <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        required
                        value={gradeSv2}
                        onChange={(e) => setGradeSv2(e.target.value)}
                        placeholder="Nhập điểm từ 0 - 10..."
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
                      />
                    </div>
                  </div>
                )}

                {/* Comment / Evaluation (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhận xét & Góp ý (Tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    value={gradeComment}
                    onChange={(e) => setGradeComment(e.target.value)}
                    placeholder="Nhập nhận xét về tiến độ thực hiện, chất lượng đề tài, điểm mạnh & hạn chế..."
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:border-[#123891] focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setGradeBoxOpen(false);
                    setGradeBoxThesis(null);
                  }}
                  disabled={gradeSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={gradeSaving}
                  className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {gradeSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu điểm...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
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

      {/* Cancel Thesis Modal (GVHD) */}
      {cancelModalOpen && cancelThesisTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleConfirmCancel} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Hủy Đề Tài Khóa Luận</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ hủy đề tài và giải phóng quyền đăng ký đề tài mới cho sinh viên.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
              <div>
                <span className="text-slate-400">Đề tài:</span>
                <strong className="block text-slate-900 mt-0.5">{cancelThesisTarget.thesisTitle}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400">Sinh viên 1:</span>
                  <div className="font-semibold text-slate-800">
                    {cancelThesisTarget.studentId?.userId?.fullName || cancelThesisTarget.studentId?.fullName} ({cancelThesisTarget.studentId?.studentCode})
                  </div>
                </div>
                {cancelThesisTarget.secondStudentId && (
                  <div>
                    <span className="text-slate-400">Sinh viên 2:</span>
                    <div className="font-semibold text-slate-800">
                      {cancelThesisTarget.secondStudentId?.userId?.fullName || cancelThesisTarget.secondStudentId?.fullName} ({cancelThesisTarget.secondStudentId?.studentCode})
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">Hậu quả của việc hủy đề tài:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Đề tài sẽ được chuyển sang trạng thái đã hủy (REJECTED).</li>
                <li>Trạng thái đăng ký của tất cả sinh viên trong nhóm sẽ được giải phóng hoàn toàn.</li>
                <li>Sinh viên có thể tiến hành đăng ký đề tài mới trong thời gian quy định.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lý do hủy đề tài <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancelThesisReason}
                onChange={(e) => setCancelThesisReason(e.target.value)}
                placeholder="Nhập lý do hủy đề tài (bắt buộc)..."
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelThesisTarget(null);
                  setCancelThesisReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={actionLoading || !cancelThesisReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Xác nhận hủy đề tài</span>
                  </>
                )}
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

            {/* Thời gian thực hiện KLTN & Nhật ký */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#123891]" />
                  <span className="font-bold text-xs text-[#123891] uppercase tracking-wider">
                    Thời Gian Thực Hiện KLTN
                  </span>
                  {targetThesis.startDate ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-[#102d7d] rounded-md">
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
                      {detailStartDate ? new Date(detailStartDate).toLocaleDateString('vi-VN') : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {targetThesis.startDate ? '• Thời gian GVHD đã tùy chỉnh' : '• Mặc định: Ngày bắt đầu học kỳ'}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100/80">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">Ngày kết thúc KLTN</div>
                    <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                      {detailEndDate ? new Date(detailEndDate).toLocaleDateString('vi-VN') : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {targetThesis.endDate ? '• Thời gian GVHD đã tùy chỉnh' : '• Mặc định: Ngày kết thúc học kỳ'}
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
                    <div className="text-[11px] text-[#102d7d] bg-blue-50 px-3 py-1.5 rounded-xl font-medium flex items-center justify-between">
                      <span>Tổng số tuần dự kiến:</span>
                      <strong className="font-mono font-bold text-xs text-[#0d2a75]">
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
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{savingDetailTimeline ? 'Đang lưu...' : 'Lưu thời gian'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>



            {/* Actions inside Detail Modal */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div>
                {targetThesis.status === 'PENDING_SUPERVISOR_APPROVAL' && activeTab === 'SUPERVISOR' && (
                  <div className="flex items-center gap-2">
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
                  </div>
                )}

                {targetThesis.status !== 'REJECTED' &&
                  targetThesis.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                  targetThesis.status !== 'PENDING_TBM_APPROVAL' && (() => {
                    const modalRole =
                      activeTab === 'REVIEWER_1' || activeTab === 'REVIEW_BLIND'
                        ? 'REVIEWER1'
                        : activeTab === 'COUNCIL'
                          ? 'COUNCIL'
                          : activeTab === 'REVIEWER_2'
                            ? 'REVIEWER2'
                            : 'SUPERVISOR';
                    const gradeStatus = getGradingStatusForThesis(targetThesis, modalRole);
                    return (
                      <button
                        type="button"
                        disabled={!gradeStatus.canGrade}
                        onClick={() => {
                          if (!gradeStatus.canGrade) return;
                          setDetailModalOpen(false);
                          if (activeTab === 'SUPERVISOR') {
                            navigate(`/lecturer/theses/${targetThesis._id}/evaluate`);
                          } else {
                            handleOpenGradeBox(targetThesis, modalRole);
                          }
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                          gradeStatus.canGrade
                            ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                        title={gradeStatus.reason}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Chấm điểm</span>
                      </button>
                    );
                  })()}
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

      {/* Modal: Tạo danh sách đề tài KLTN hàng loạt */}
      {createTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đề Xuất Danh Sách Đề Tài KLTN</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateTopicModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition"
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
                  <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                    Tạo hàng loạt
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={batchTitleInput}
                  onChange={(e) => setBatchTitleInput(e.target.value)}
                  placeholder="Nhập tên đề tài"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Học kỳ áp dụng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTermForCreation || currentTerm?._id || ''}
                  onChange={(e) => setSelectedTermForCreation(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {Array.isArray(terms) && terms.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Giảng viên hướng dẫn
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{user?.fullName} ({user?.username})</span>
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
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateTopicModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createTopicLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {createTopicLoading ? 'Đang tạo...' : 'Gửi đề xuất đề tài'}
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
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Đề Tài Đề Xuất</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-500">
                      Trạng thái: {selectedTopicDetail.currentGroups > 0 ? 'Đã có nhóm đăng ký' : 'Chưa có nhóm đăng ký'}
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
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
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

                        <div className={`grid ${group.secondStudentId ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
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

      {/* Modal: Xem chi tiết Phòng Hội đồng */}
      {councilDetailModalOpen && selectedCouncilDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {(selectedCouncilDetail.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-50 text-[#102d7d] border border-blue-200">
                      {selectedCouncilDetail.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Hội đồng (Oral)'}
                    </span>
                    {selectedCouncilDetail.room && (
                      <span className="font-semibold text-slate-700">
                        • Phòng: {selectedCouncilDetail.room}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCouncilDetailModalOpen(false);
                  setSelectedCouncilDetail(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase">Phòng bảo vệ</div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#123891]" />
                  <span>{selectedCouncilDetail.room || 'Chưa thiết lập phòng'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase">Thời gian bảo vệ</div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#123891]" />
                  <span>
                    {selectedCouncilDetail.reportTime ||
                      (selectedCouncilDetail.reportDate
                        ? new Date(selectedCouncilDetail.reportDate).toLocaleDateString('vi-VN')
                        : 'Theo lịch thông báo của khoa')}
                  </span>
                </div>
              </div>
            </div>

            {selectedCouncilDetail.description && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase mb-1">Ghi chú & Hướng dẫn</div>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{selectedCouncilDetail.description}</p>
              </div>
            )}

            {/* Council Lecturers List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#123891]" />
                  <span>Danh sách Thành viên Hội đồng</span>
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {Array.isArray(selectedCouncilDetail.lecturers) ? selectedCouncilDetail.lecturers.length : 0} thành viên
                </span>
              </div>

              {Array.isArray(selectedCouncilDetail.lecturers) && selectedCouncilDetail.lecturers.length > 0 ? (
                <div className="space-y-2">
                  {selectedCouncilDetail.lecturers.map((lec, idx) => {
                    const isMe = isSameLecturer(lec, user, data?.lecturer);

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between flex-wrap gap-2 text-xs transition ${
                          isMe
                            ? 'bg-blue-50/80 border-blue-200 text-[#102d7d]'
                            : 'bg-white border-slate-200/80 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isMe ? 'bg-[#123891] text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>
                                {lec.academicTitle ? `${lec.academicTitle} ` : ''}
                                {lec.fullName || lec.name || 'Giảng viên'}
                              </span>
                              {isMe && (
                                <span className="px-2 py-0.2 rounded bg-[#123891] text-white text-[10px] font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                              {lec.lecturerCode && <span>Mã GV: {lec.lecturerCode}</span>}
                              {lec.email && <span>Email: {lec.email}</span>}
                              {lec.phone && <span>SĐT: {lec.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">
                  Chưa có danh sách giảng viên trong hội đồng này
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCouncilDetailModalOpen(false);
                  setSelectedCouncilDetail(null);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Đề tài (GVHD) */}
      {editTopicModalOpen && selectedTopicForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#123891] flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chỉnh Sửa Đề Tài KLTN</h3>
                  <p className="text-xs text-slate-500">
                    Thay đổi thông tin đề tài sẽ được gửi đến Trưởng Bộ Môn để xét duyệt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditTopicModalOpen(false);
                  setSelectedTopicForEdit(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEditTopicForm} className="space-y-4">
              {/* Giảng viên & Học kỳ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giảng viên hướng dẫn</label>
                  <div className="font-bold text-slate-900 text-xs mt-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#123891]" />
                    <span>{user?.fullName} ({user?.username})</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Học kỳ áp dụng</label>
                  <div className="font-bold text-slate-900 text-xs mt-1">
                    {selectedTopicForEdit.academicTermId?.name || currentTerm?.name || 'Học kỳ'}
                  </div>
                </div>
              </div>

              {/* Tên đề tài */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên đề tài KLTN <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editTopicTitle}
                  onChange={(e) => setEditTopicTitle(e.target.value)}
                  placeholder="Nhập tên đề tài khóa luận..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-none"
                />
              </div>

              {/* Mô tả đề tài */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả / Yêu cầu đề tài
                </label>
                <textarea
                  rows={4}
                  value={editTopicDescription}
                  onChange={(e) => setEditTopicDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt nội dung, công nghệ, mục tiêu đề tài..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-none"
                />
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-[#102d7d] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#123891] shrink-0 mt-0.5" />
                <span>
                  Sau khi lưu, yêu cầu chỉnh sửa sẽ được chuyển đến <strong>Trưởng Bộ Môn</strong>. Sau khi Trưởng Bộ Môn phê duyệt, tên đề tài sẽ chính thức được cập nhật trên hệ thống.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditTopicModalOpen(false);
                    setSelectedTopicForEdit(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !editTopicTitle.trim()}
                  className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Save Edit Topic Dialog */}
      <ConfirmDialog
        isOpen={confirmEditTopicDialogOpen}
        title="Xác nhận yêu cầu chỉnh sửa đề tài"
        message={`Bạn có chắc chắn muốn gửi yêu cầu đổi tên đề tài thành "${editTopicTitle}" đến Trưởng Bộ Môn để xét duyệt không?`}
        confirmText="Xác nhận"
        cancelText="Hủy bỏ"
        isDanger={false}
        loading={actionLoading}
        onConfirm={handleConfirmSaveEditTopic}
        onClose={() => setConfirmEditTopicDialogOpen(false)}
      />

      {/* Confirm Delete Topic Dialog */}
      <ConfirmDialog
        isOpen={deleteTopicDialogOpen}
        title="Xác nhận yêu cầu xóa đề tài"
        message={`Bạn có chắc chắn muốn gửi yêu cầu xóa đề tài "${selectedTopicForDelete?.title}" đến Trưởng Bộ Môn để xét duyệt không?`}
        confirmText="Xác nhận"
        cancelText="Hủy bỏ"
        isDanger={false}
        loading={actionLoading}
        onConfirm={handleConfirmDeleteTopic}
        onClose={() => {
          setDeleteTopicDialogOpen(false);
          setSelectedTopicForDelete(null);
        }}
      />
    </div>
  );
};

export default LecturerThesesPage;
