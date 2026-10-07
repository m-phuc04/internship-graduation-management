import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import councilApi from '../../api/councilApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import AssignReviewersModal from '../../components/thesis/AssignReviewersModal';
import AssignSupervisorModal from '../../components/thesis/AssignSupervisorModal';
import TbmThesisDetailModal from '../../components/thesis/TbmThesisDetailModal';
import ExportModal from '../../components/common/ExportModal';
import ThesisTimelineModal from '../../components/thesis/ThesisTimelineModal';
import CouncilManagementSection from '../../components/thesis/CouncilManagementSection';
import AssignCouncilToThesisModal from '../../components/thesis/AssignCouncilToThesisModal';
import { isCouncilReportTimeExpired } from '../../utils/dateUtils';

import {
  GraduationCap,
  Users,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  UserCheck,
  RefreshCw,
  Filter,
  Layers,
  Clock,
  BookOpen,
  Award,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Check,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  List,
  LayoutGrid,
  Lock,
  Unlock,
  Ban,
  Edit2,
  Trash2,
} from 'lucide-react';

const TbmThesisManagement = () => {
  const { showToast } = useToast();
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const [searchParams] = useSearchParams();

  // Tab State: 'PROPOSED_TOPICS' | 'PRIVATE_REVIEWER' | 'COUNCIL_REVIEWER'
  const [activeMainTab, setActiveMainTab] = useState('PROPOSED_TOPICS');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const mode = searchParams.get('mode');
    if (tab === 'topics' || tab === 'proposed' || tab === 'proposed_topics') {
      setActiveMainTab('PROPOSED_TOPICS');
    } else if (tab === 'private_reviewer' || tab === 'reviewer' || tab === 'review') {
      setActiveMainTab('PRIVATE_REVIEWER');
    } else if (tab === 'council' || tab === 'council_reviewer') {
      setActiveMainTab('COUNCIL_REVIEWER');
    }

    if (mode === 'by_lecturer') {
      setTopicViewMode('BY_LECTURER');
    } else if (mode === 'table') {
      setTopicViewMode('TABLE');
    }
  }, [searchParams]);

  // ==========================================
  // TAB 1: PROPOSED TOPICS (GV ĐỀ XUẤT)
  // ==========================================
  const [proposedTopics, setProposedTopics] = useState([]);
  const [loadingProposedTopics, setLoadingProposedTopics] = useState(false);
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL');
  const [topicSearch, setTopicSearch] = useState('');
  const [topicViewMode, setTopicViewMode] = useState('TABLE'); // 'TABLE' | 'BY_LECTURER' (Mặc định Dạng bảng)
  const [expandedLecturers, setExpandedLecturers] = useState(new Set());
  const [rejectTopicModalOpen, setRejectTopicModalOpen] = useState(false);
  const [targetTopic, setTargetTopic] = useState(null);
  const [topicRejectReason, setTopicRejectReason] = useState('');
  const [topicDetailModalOpen, setTopicDetailModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // States for reviewing Lecturer's Edit and Delete Requests
  const [rejectEditModalOpen, setRejectEditModalOpen] = useState(false);
  const [targetTopicForRejectEdit, setTargetTopicForRejectEdit] = useState(null);
  const [rejectEditReason, setRejectEditReason] = useState('');

  const [confirmApproveDeleteOpen, setConfirmApproveDeleteOpen] = useState(false);
  const [targetTopicForApproveDelete, setTargetTopicForApproveDelete] = useState(null);

  const [rejectDeleteModalOpen, setRejectDeleteModalOpen] = useState(false);
  const [targetTopicForRejectDelete, setTargetTopicForRejectDelete] = useState(null);
  const [rejectDeleteReason, setRejectDeleteReason] = useState('');

  const fetchProposedTopics = useCallback(async () => {
    setLoadingProposedTopics(true);
    try {
      const res = await thesisApi.getTopicsForTbm({
        status: topicStatusFilter === 'ALL' ? '' : topicStatusFilter,
        search: topicSearch,
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setProposedTopics(res.data || []);
      }
    } catch (err) {
      console.warn('Cannot load proposed topics:', err.message);
    } finally {
      setLoadingProposedTopics(false);
    }
  }, [topicStatusFilter, topicSearch, currentTerm?._id]);

  useEffect(() => {
    fetchProposedTopics();
  }, [fetchProposedTopics]);

  // Tự động mở rộng tất cả danh sách giảng viên khi người dùng đang nhập tìm kiếm
  useEffect(() => {
    if (topicSearch.trim() && proposedTopics.length > 0) {
      const allLecIds = new Set(
        proposedTopics.map((t) => t.supervisorId?._id || 'unknown').filter(Boolean)
      );
      setExpandedLecturers(allLecIds);
    }
  }, [topicSearch, proposedTopics]);

  // Sắp xếp đề tài: Đề tài có yêu cầu Sửa/Xóa hoặc Chờ duyệt được đẩy lên đầu tiên
  const sortedProposedTopics = React.useMemo(() => {
    return [...proposedTopics].sort((a, b) => {
      // 1. Yêu cầu sửa / xóa từ Giảng viên cần TBM duyệt ưu tiên cao nhất
      const aHasActionReq = a.editRequest?.status === 'PENDING' || a.deleteRequest?.status === 'PENDING';
      const bHasActionReq = b.editRequest?.status === 'PENDING' || b.deleteRequest?.status === 'PENDING';
      if (aHasActionReq && !bHasActionReq) return -1;
      if (!aHasActionReq && bHasActionReq) return 1;

      // 2. Đề tài mới gửi chờ TBM duyệt (PENDING)
      const aIsPending = a.status === 'PENDING';
      const bIsPending = b.status === 'PENDING';
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;

      // 3. Mới nhất lên trước
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [proposedTopics]);

  // Group topics by Lecturer
  const groupedByLecturer = React.useMemo(() => {
    const map = new Map();
    for (const topic of sortedProposedTopics) {
      const lecId = topic.supervisorId?._id || 'unknown';
      if (!map.has(lecId)) {
        map.set(lecId, {
          id: lecId,
          supervisor: topic.supervisorId,
          lecturerCode: topic.supervisorId?.lecturerCode || '—',
          fullName: topic.supervisorId?.userId?.fullName || 'Giảng viên',
          academicTitle: topic.supervisorId?.academicTitle || '',
          email: topic.supervisorId?.userId?.email || '',
          phone: topic.supervisorId?.userId?.phone || '',
          hasPendingAction: false,
          topics: [],
        });
      }
      const group = map.get(lecId);
      if (topic.editRequest?.status === 'PENDING' || topic.deleteRequest?.status === 'PENDING' || topic.status === 'PENDING') {
        group.hasPendingAction = true;
      }
      group.topics.push(topic);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.hasPendingAction && !b.hasPendingAction) return -1;
      if (!a.hasPendingAction && b.hasPendingAction) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
    return list;
  }, [sortedProposedTopics]);

  const formatLecturerDisplay = (title, name) => {
    if (!name) return '—';
    return name.trim();
  };

  const toggleLecturerExpand = (lecId) => {
    setExpandedLecturers((prev) => {
      const next = new Set(prev);
      if (next.has(lecId)) next.delete(lecId);
      else next.add(lecId);
      return next;
    });
  };

  const expandAllLecturers = () => {
    setExpandedLecturers(new Set(groupedByLecturer.map((g) => g.id)));
  };

  const collapseAllLecturers = () => {
    setExpandedLecturers(new Set());
  };

  const handleApproveTopic = async (topic) => {
    setActionLoading(true);
    try {
      const res = await thesisApi.approveTopic(topic._id);
      if (res.success) {
        showToast(`Đã phê duyệt đề tài "${topic.title}" thành công! Sinh viên có thể bắt đầu đăng ký.`, 'success');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Phê duyệt đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchApproveLecturerTopics = async (lecturerGroup) => {
    const pendingTopicsOfLec = lecturerGroup.topics.filter((t) => t.status === 'PENDING');
    if (pendingTopicsOfLec.length === 0) return;

    setActionLoading(true);
    try {
      let approvedCount = 0;
      for (const t of pendingTopicsOfLec) {
        await thesisApi.approveTopic(t._id);
        approvedCount++;
      }
      showToast(`Đã duyệt tất cả ${approvedCount} đề tài của giảng viên ${lecturerGroup.fullName}!`, 'success');
      fetchProposedTopics();
    } catch (err) {
      showToast(err.message || 'Lỗi khi duyệt hàng loạt đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRejectTopic = async (e) => {
    if (e) e.preventDefault();
    if (!targetTopic) return;
    if (!topicRejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối đề tài', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await thesisApi.rejectTopic(targetTopic._id, {
        reason: topicRejectReason.trim(),
      });
      if (res.success) {
        showToast(`Đã từ chối đề tài "${targetTopic.title}"`, 'info');
        setRejectTopicModalOpen(false);
        setTargetTopic(null);
        setTopicRejectReason('');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Từ chối đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Reviewing Edit Requests
  const handleApproveEditTopic = async (topic) => {
    setActionLoading(true);
    try {
      const res = await thesisApi.approveEditTopic(topic._id);
      if (res.success) {
        showToast(`Đã duyệt yêu cầu chỉnh sửa đề tài "${topic.editRequest?.newTitle || topic.title}" thành công!`, 'success');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Phê duyệt chỉnh sửa đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectEditTopic = (topic) => {
    setTargetTopicForRejectEdit(topic);
    setRejectEditReason('');
    setRejectEditModalOpen(true);
  };

  const handleConfirmRejectEditTopic = async (e) => {
    if (e) e.preventDefault();
    if (!targetTopicForRejectEdit) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.rejectEditTopic(targetTopicForRejectEdit._id, {
        reason: rejectEditReason.trim(),
      });
      if (res.success) {
        showToast('Đã từ chối yêu cầu chỉnh sửa đề tài', 'info');
        setRejectEditModalOpen(false);
        setTargetTopicForRejectEdit(null);
        setRejectEditReason('');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Từ chối yêu cầu chỉnh sửa thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Reviewing Delete Requests
  const handleOpenApproveDeleteTopic = (topic) => {
    setTargetTopicForApproveDelete(topic);
    setConfirmApproveDeleteOpen(true);
  };

  const handleConfirmApproveDeleteTopic = async () => {
    if (!targetTopicForApproveDelete) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.approveDeleteTopic(targetTopicForApproveDelete._id);
      if (res.success) {
        showToast(`Đã phê duyệt xóa đề tài "${targetTopicForApproveDelete.title}" thành công!`, 'success');
        setConfirmApproveDeleteOpen(false);
        setTargetTopicForApproveDelete(null);
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Phê duyệt xóa đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectDeleteTopic = (topic) => {
    setTargetTopicForRejectDelete(topic);
    setRejectDeleteReason('');
    setRejectDeleteModalOpen(true);
  };

  const handleConfirmRejectDeleteTopic = async (e) => {
    if (e) e.preventDefault();
    if (!targetTopicForRejectDelete) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.rejectDeleteTopic(targetTopicForRejectDelete._id, {
        reason: rejectDeleteReason.trim(),
      });
      if (res.success) {
        showToast('Đã từ chối yêu cầu xóa đề tài', 'info');
        setRejectDeleteModalOpen(false);
        setTargetTopicForRejectDelete(null);
        setRejectDeleteReason('');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Từ chối yêu cầu xóa thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // TAB 2: STUDENT THESES & REVIEWERS ASSIGNMENT
  // ==========================================
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendingCount: 0,
    approvedCount: 0,
    assignedReviewersCount: 0,
    inProgressCount: 0,
    submittedCount: 0,
    gradedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
  });

  // Query Params for Tab 2
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modals for Tab 2
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignReviewersOpen, setAssignReviewersOpen] = useState(false);
  const [assignSupervisorOpen, setAssignSupervisorOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [cancelThesisConfirmOpen, setCancelThesisConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [assignCouncilToThesisModalOpen, setAssignCouncilToThesisModalOpen] = useState(false);
  const [selectedThesisForCouncil, setSelectedThesisForCouncil] = useState(null);

  const thesisCouncilStorageKey = `tbm_thesis_councils_${currentTerm?._id || 'default'}`;
  const [thesisCouncilMap, setThesisCouncilMap] = useState(() => {
    try {
      const saved = localStorage.getItem(thesisCouncilStorageKey);
      if (saved) return JSON.parse(saved) || {};
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(thesisCouncilStorageKey);
      if (saved) setThesisCouncilMap(JSON.parse(saved) || {});
    } catch {}
  }, [thesisCouncilStorageKey]);

  const getCouncilsList = useCallback(() => {
    try {
      const storageKey = `tbm_councils_${currentTerm?._id || 'default'}`;
      const raw = localStorage.getItem(storageKey) || localStorage.getItem('tbm_councils_default');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((c) => ({
            ...c,
            name: (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim(),
            lecturers: Array.isArray(c.lecturers) ? c.lecturers : [],
          }));
        }
      }
    } catch {}
    return [];
  }, [currentTerm?._id]);

  const handleAssignCouncilToThesis = (thesisId, councilId) => {
    const councilsList = getCouncilsList();
    const targetCouncil = councilsList.find((c) => (c.id && String(c.id) === String(councilId)) || (c._id && String(c._id) === String(councilId)));
    if (targetCouncil && isCouncilReportTimeExpired(targetCouncil)) {
      showToast('Phòng hội đồng đã kết thúc thời gian báo cáo, không thể phân công đề tài!', 'error');
      return;
    }

    const currentAssignedId = thesisCouncilMap[thesisId];
    if (currentAssignedId) {
      const currentCouncil = councilsList.find((c) => (c.id && String(c.id) === String(currentAssignedId)) || (c._id && String(c._id) === String(currentAssignedId)));
      if (currentCouncil && isCouncilReportTimeExpired(currentCouncil)) {
        showToast('Phòng hội đồng hiện tại đã kết thúc thời gian báo cáo, không thể thay đổi phân công!', 'error');
        return;
      }
    }

    // Persist to MongoDB
    councilApi.assignThesis({ thesisId, councilId }).catch((err) => {
      console.warn('Error assigning council to thesis in MongoDB:', err.message);
    });

    setThesisCouncilMap((prev) => {
      const next = { ...prev };
      if (councilId) {
        next[thesisId] = councilId;
      } else {
        delete next[thesisId];
      }
      try {
        localStorage.setItem(thesisCouncilStorageKey, JSON.stringify(next));
        localStorage.setItem('tbm_thesis_councils_default', JSON.stringify(next));
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('tbm_thesis_councils_')) {
            try {
              const cur = JSON.parse(localStorage.getItem(k) || '{}');
              if (councilId) cur[thesisId] = councilId;
              else delete cur[thesisId];
              localStorage.setItem(k, JSON.stringify(cur));
            } catch {}
          }
        }
        window.dispatchEvent(new Event('storage'));
      } catch {}
      return next;
    });
  };

  // Tính Điểm HD + PB theo công thức:
  // Nếu phân công 2 GVPB: (Điểm GVHD + (Điểm GVPB1 + Điểm GVPB2)/2) / 2 (khi cả 2 đã nhập điểm)
  // Nếu phân công 1 GVPB: (Điểm GVHD + Điểm GVPB) / 2 (khi 1 GVPB đó đã nhập điểm)
  const calculateScoreHDPB = useCallback((item) => {
    const scoreHD = item.scores?.supervisorScore ?? item.scores?.student1SupervisorScore;
    const scorePB1 = item.scores?.reviewer1Score ?? item.scores?.student1Reviewer1Score;
    const scorePB2 = item.scores?.reviewer2Score ?? item.scores?.student1Reviewer2Score;

    const isAssignedPB1 = Boolean(
      item.reviewer1Id ||
      (Array.isArray(item.reviewers) && item.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
    );
    const isAssignedPB2 = Boolean(
      item.reviewer2Id ||
      (Array.isArray(item.reviewers) && item.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
    );

    const hasS1 = scorePB1 !== null && scorePB1 !== undefined && !isNaN(scorePB1) && scorePB1 !== '';
    const hasS2 = scorePB2 !== null && scorePB2 !== undefined && !isNaN(scorePB2) && scorePB2 !== '';

    let avgPB = null;
    if (isAssignedPB1 && isAssignedPB2) {
      if (hasS1 && hasS2) {
        avgPB = (Number(scorePB1) + Number(scorePB2)) / 2;
      }
    } else if (isAssignedPB1) {
      if (hasS1) avgPB = Number(scorePB1);
    } else if (isAssignedPB2) {
      if (hasS2) avgPB = Number(scorePB2);
    }

    const hasHD = scoreHD !== null && scoreHD !== undefined && !isNaN(scoreHD) && scoreHD !== '';
    const numHD = hasHD ? Number(scoreHD) : null;

    if (numHD !== null && avgPB !== null) {
      const finalScore = (numHD + avgPB) / 2;
      return {
        score: Number(finalScore.toFixed(2)),
        scoreHD: numHD,
        scorePB1: hasS1 ? Number(scorePB1) : null,
        scorePB2: hasS2 ? Number(scorePB2) : null,
        avgPB: Number(avgPB.toFixed(2)),
      };
    }

    if (numHD !== null) {
      return {
        score: Number(numHD.toFixed(2)),
        scoreHD: numHD,
        scorePB1: hasS1 ? Number(scorePB1) : null,
        scorePB2: hasS2 ? Number(scorePB2) : null,
        avgPB: null,
      };
    }

    if (avgPB !== null) {
      return {
        score: Number(avgPB.toFixed(2)),
        scoreHD: null,
        scorePB1: hasS1 ? Number(scorePB1) : null,
        scorePB2: hasS2 ? Number(scorePB2) : null,
        avgPB: Number(avgPB.toFixed(2)),
      };
    }

    return null;
  }, []);

  const calculateCouncilScore = useCallback((item, assignedCouncil) => {
    const itemCouncilScore = item.scores?.councilScore ?? item.scores?.student1CouncilScore;
    if (itemCouncilScore !== null && itemCouncilScore !== undefined && !isNaN(itemCouncilScore)) {
      return Number(Number(itemCouncilScore).toFixed(2));
    }
    if (assignedCouncil && Array.isArray(assignedCouncil.lecturers)) {
      const validScores = assignedCouncil.lecturers
        .map((l) => l.score)
        .filter((s) => s !== null && s !== undefined && !isNaN(s) && s !== '');
      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, curr) => acc + Number(curr), 0);
        return Number((sum / validScores.length).toFixed(2));
      }
    }
    return null;
  }, []);

  const fetchTheses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        status: status === 'ALL' ? '' : status,
        search,
        academicTermId: currentTerm?._id,
      };
      const res = await thesisApi.getAll(params);
      if (res.success) {
        setTheses(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, search, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchTheses();
  }, [fetchTheses]);

  // Kiểm tra đề tài đã có điểm GVHD để đủ điều kiện phân công phản biện kín:
  const hasSupervisorScore = useCallback((item) => {
    if (!item) return false;
    const scoreHD = item.scores?.supervisorScore ?? item.scores?.student1SupervisorScore;
    return scoreHD !== null && scoreHD !== undefined && !isNaN(scoreHD) && scoreHD !== '';
  }, []);

  // Kiểm tra đề tài đã hoàn tất chấm điểm phản biện kín:
  // - Nếu phân công 2 GVPB: cả 2 phải chấm xong mới hoàn tất
  // - Nếu phân công 1 GVPB: 1 GVPB chấm xong là hoàn tất
  const hasBothReviewerScores = useCallback((item) => {
    const isAssignedPB1 = Boolean(
      item.reviewer1Id ||
      (Array.isArray(item.reviewers) && item.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
    );
    const isAssignedPB2 = Boolean(
      item.reviewer2Id ||
      (Array.isArray(item.reviewers) && item.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
    );

    const s1 = item.scores?.reviewer1Score ?? item.scores?.student1Reviewer1Score;
    const s2 = item.scores?.reviewer2Score ?? item.scores?.student1Reviewer2Score;

    const hasS1 = s1 !== null && s1 !== undefined && !isNaN(s1) && s1 !== '';
    const hasS2 = s2 !== null && s2 !== undefined && !isNaN(s2) && s2 !== '';

    if (isAssignedPB1 && isAssignedPB2) {
      return hasS1 && hasS2;
    } else if (isAssignedPB1) {
      return hasS1;
    } else if (isAssignedPB2) {
      return hasS2;
    }
    return false;
  }, []);

  const privateReviewerEligibleCount = React.useMemo(() => {
    return theses.filter((t) => t.status !== 'REJECTED' && hasSupervisorScore(t)).length;
  }, [theses, hasSupervisorScore]);

  const councilEligibleCount = React.useMemo(() => {
    return theses.filter(hasBothReviewerScores).length;
  }, [theses, hasBothReviewerScores]);

  const displayedTheses = React.useMemo(() => {
    let list = status === 'ALL' ? theses.filter((t) => t.status !== 'REJECTED') : theses;
    if (activeMainTab === 'PRIVATE_REVIEWER') {
      return list.filter(hasSupervisorScore);
    }
    if (activeMainTab === 'COUNCIL_REVIEWER') {
      return list.filter(hasBothReviewerScores);
    }
    return list;
  }, [theses, activeMainTab, hasSupervisorScore, hasBothReviewerScores, status]);

  // Tính hình thức báo cáo:
  // Đề tài nằm trong top 20% điểm cao nhất (của các đề tài có điểm) VÀ điểm >= 8.0 => 'ORAL' (Báo cáo Oral)
  // Các đề tài còn lại => 'POSTER' (Báo cáo Poster)
  const thesisReportFormatMap = React.useMemo(() => {
    const eligibleTheses = theses.filter(hasBothReviewerScores);
    const total = eligibleTheses.length;
    if (total === 0) return {};

    const scoredList = eligibleTheses.map((t) => {
      const sObj = calculateScoreHDPB(t);
      return {
        id: t._id,
        score: sObj ? sObj.score : -1,
        thesis: t,
      };
    });

    // Sắp xếp điểm giảm dần
    scoredList.sort((a, b) => b.score - a.score);

    // Top 20% số lượng đề tài
    const top20Count = Math.max(1, Math.ceil(total * 0.2));
    const cutoffScore = scoredList[top20Count - 1]?.score ?? -1;

    const map = {};
    scoredList.forEach((item, index) => {
      const isTop20 = index < top20Count || (item.score === cutoffScore && item.score >= 8.0);
      if (isTop20 && item.score >= 8.0) {
        map[item.id] = 'ORAL';
      } else {
        map[item.id] = 'POSTER';
      }
    });

    return map;
  }, [theses, hasBothReviewerScores, calculateScoreHDPB]);

  // Tự động kiểm tra và hủy phân công phòng nếu:
  // 1. Phòng hội đồng có GVHD của đề tài làm thành viên
  // 2. Hình thức phòng (Oral / Poster) không khớp với hình thức báo cáo của đề tài
  useEffect(() => {
    if (activeMainTab !== 'COUNCIL_REVIEWER') return;
    const councilsList = getCouncilsList();
    if (!councilsList.length || !displayedTheses.length) return;

    let changed = false;
    const nextMap = { ...thesisCouncilMap };
    const warnings = [];

    for (const item of displayedTheses) {
      const assignedCouncilId = nextMap[item._id];
      if (!assignedCouncilId) continue;

      const council = councilsList.find((c) => c.id === assignedCouncilId);
      if (!council) continue;

      // 1. Kiểm tra GVHD có trong hội đồng không
      const supId = String(item.supervisorId?._id || item.supervisorId?.id || item.supervisorId || '');
      const supCode = item.supervisorId?.lecturerCode;
      const hasSupervisor = Array.isArray(council.lecturers) && council.lecturers.some((l) => {
        const lId = String(l.lecturerId?._id || l.lecturerId || l.id || l._id || '');
        const lCode = l.lecturerCode;
        return (supId && lId && lId === supId) || (supCode && lCode && lCode === supCode);
      });

      // 2. Kiểm tra khớp hình thức báo cáo
      const reqFormat = thesisReportFormatMap[item._id] || 'POSTER';
      const isTypeMismatch = council.type && council.type !== reqFormat;

      if (hasSupervisor) {
        delete nextMap[item._id];
        changed = true;
        const supName = (item.supervisorId?.academicTitle ? item.supervisorId.academicTitle + ' ' : '') + (item.supervisorId?.userId?.fullName || 'GVHD');
        const cName = (council.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
        warnings.push('Đề tài "' + item.thesisTitle + '" có GVHD (' + supName + ') thuộc ' + cName + '. Hệ thống đã hủy phân công phòng cho đề tài này, vui lòng chọn phòng khác!');
      } else if (isTypeMismatch) {
        delete nextMap[item._id];
        changed = true;
        const cName = (council.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
        const reqText = reqFormat === 'ORAL' ? 'Báo cáo Oral' : 'Báo cáo Poster';
        warnings.push('Đề tài "' + item.thesisTitle + '" có hình thức ' + reqText + ', không khớp với ' + cName + ' (' + (council.type === 'ORAL' ? 'Oral' : 'Poster') + '). Đã hủy phân công phòng!');
      }
    }

    if (changed) {
      setThesisCouncilMap(nextMap);
      try {
        localStorage.setItem(thesisCouncilStorageKey, JSON.stringify(nextMap));
      } catch {}
      // Cleaned silently to avoid repeated toasts
    }
  }, [displayedTheses, thesisReportFormatMap, getCouncilsList, activeMainTab, thesisCouncilStorageKey, showToast]);

  // Actions for Tab 2
  const handleApprove = async () => {
    if (!selectedThesis) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.approve(selectedThesis._id);
      if (res.success) {
        showToast('Đã phê duyệt đề tài khóa luận thành công!', 'success');
        setApproveConfirmOpen(false);
        setDetailModalOpen(false);
        fetchTheses();
      }
    } catch (err) {
      showToast(err.message || 'Phê duyệt đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedThesis) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.reject(selectedThesis._id);
      if (res.success) {
        showToast('Đã từ chối đề tài và cho phép sinh viên đăng ký lại.', 'success');
        setRejectConfirmOpen(false);
        setDetailModalOpen(false);
        fetchTheses();
      }
    } catch (err) {
      showToast(err.message || 'Từ chối đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isThesisGraded = (thesis) => {
    if (!thesis) return false;
    const sc = thesis.scores;
    if (!sc) return false;
    const hasVal = (v) => v !== null && v !== undefined && v !== '';
    return Boolean(
      hasVal(sc.student1SupervisorScore) ||
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
        ))
    );
  };

  const handleCancelThesis = async () => {
    if (!selectedThesis) return;
    if (isThesisGraded(selectedThesis)) {
      showToast('Không thể hủy đề tài do đề tài đã có điểm đánh giá', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await thesisApi.cancel(selectedThesis._id, {
        reason: cancelReason.trim() || 'Trưởng Bộ Môn đã hủy đề tài',
      });
      if (res.success) {
        showToast(`Đã hủy đề tài "${selectedThesis.thesisTitle}" và giải phóng đăng ký cho sinh viên.`, 'success');
        setCancelThesisConfirmOpen(false);
        setDetailModalOpen(false);
        setCancelReason('');
        fetchTheses();
      }
    } catch (err) {
      showToast(err.message || 'Hủy đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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

  // Topic Status Badge Renderer
  const renderTopicBadge = (st) => {
    switch (st) {
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Đã duyệt</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Đã từ chối</span>;
      case 'PENDING':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Chờ duyệt</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Quản lý Khóa luận Tốt nghiệp (KLTN)
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            {/* Lock / Unlock Icon Button with Tooltip and Badge */}
            <button
              type="button"
              onClick={() => setTimelineModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer shadow-2xs ${
                windowBadge.isLocked
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title={
                windowBadge.isLocked
                  ? 'Đăng ký KLTN hiện đang bị KHÓA. Nhấn để xem cấu hình hoặc mở lại.'
                  : 'Đăng ký KLTN hiện đang MỞ. Nhấn để xem cấu hình hoặc khóa lại.'
              }
            >
              {windowBadge.isLocked ? (
                <Lock className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{windowBadge.isLocked ? 'Đã khóa đăng ký' : 'Đang mở đăng ký'}</span>
            </button>

            {/* Configure KLTN Timeline Button */}
            <button
              type="button"
              onClick={() => setTimelineModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#102d7d] text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer shadow-2xs"
              title="Cấu hình thời gian mở cổng đăng ký, phân công & bảo vệ KLTN"
            >
              <Clock className="w-3.5 h-3.5 text-[#123891]" />
              <span>Thời gian mở KLTN</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${windowBadge.color}`}>
                {windowBadge.text}
              </span>
            </button>

            {/* Quick Link to KLTN Grading Periods Management */}
            <Link
              to="/tbm/thesis-evaluations"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#123891] text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer shadow-2xs"
              title="Quản lý đợt nhập điểm, tiêu chí đánh giá và bảng điểm KLTN"
            >
              <Award className="w-3.5 h-3.5 text-[#123891]" />
              <span>Thời gian nhập điểm KLTN</span>
            </Link>

            <button
              onClick={() => (activeMainTab === 'PROPOSED_TOPICS' ? fetchProposedTopics() : fetchTheses())}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || loadingProposedTopics) ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              title="Xuất danh sách sinh viên & đề tài KLTN ra Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất danh sách</span>
            </button>
          </div>
        </div>

        {/* Main Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('PROPOSED_TOPICS')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'PROPOSED_TOPICS'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Duyệt đề tài</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeMainTab === 'PROPOSED_TOPICS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {proposedTopics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('PRIVATE_REVIEWER')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'PRIVATE_REVIEWER'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. Phân công phản biện kín</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeMainTab === 'PRIVATE_REVIEWER' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {privateReviewerEligibleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('COUNCIL_REVIEWER')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'COUNCIL_REVIEWER'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Phân công hội đồng</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeMainTab === 'COUNCIL_REVIEWER' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {councilEligibleCount}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DUYỆT ĐỀ TÀI GIẢNG VIÊN ĐỀ XUẤT */}
      {/* ========================================================================= */}
      {activeMainTab === 'PROPOSED_TOPICS' && (
        <div className="space-y-4">
          {/* Filter Bar & View Mode Toggle */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            {/* Row 1: Search Input (left) & Academic Term Selector (right) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-80 md:w-96">
                <SearchInput
                  value={topicSearch}
                  onChange={(val) => setTopicSearch(val)}
                  placeholder="Tìm tên đề tài, mô tả, GVHD, mã..."
                />
              </div>

              {/* Academic Term Selector */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <span className="text-xs font-semibold text-slate-500">Học kỳ:</span>
                <select
                  value={currentTerm?._id || ''}
                  onChange={(e) => {
                    if (setCurrentTerm && e.target.value) {
                      setCurrentTerm(e.target.value);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                >
                  {Array.isArray(terms) && terms.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: View Mode Toggle (left) & Status Filter + Expand/Collapse (right) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* View Mode Toggle */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setTopicViewMode('BY_LECTURER')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    topicViewMode === 'BY_LECTURER'
                      ? 'bg-white text-[#102d7d] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Theo Giảng viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTopicViewMode('TABLE')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    topicViewMode === 'TABLE'
                      ? 'bg-white text-[#102d7d] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Dạng bảng</span>
                </button>
              </div>

              {/* Status Filter & Expand/Collapse All */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={topicStatusFilter}
                    onChange={(e) => setTopicStatusFilter(e.target.value)}
                    className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ duyệt</option>
                    <option value="APPROVED">Đã duyệt</option>
                    <option value="REJECTED">Đã từ chối</option>
                  </select>
                </div>

                {/* Expand/Collapse All (Only in BY_LECTURER mode) */}
                {topicViewMode === 'BY_LECTURER' && groupedByLecturer.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={expandAllLecturers}
                      className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition cursor-pointer"
                      title="Mở rộng tất cả giảng viên"
                    >
                      Mở tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={collapseAllLecturers}
                      className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition cursor-pointer"
                      title="Thu gọn tất cả"
                    >
                      Thu gọn
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= VIEW MODE 1: GOM NHÓM THEO GIẢNG VIÊN ================= */}
          {topicViewMode === 'BY_LECTURER' ? (
            <div className="space-y-4">
              {loadingProposedTopics ? (
                <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                  <LoadingSkeleton rows={4} cols={5} />
                </div>
              ) : groupedByLecturer.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                  <EmptyState
                    title="Không có đề tài nào được đề xuất"
                    description="Khi Giảng viên tạo đề xuất danh sách đề tài KLTN, danh sách sẽ hiển thị tại đây để TBM xem xét và phê duyệt."
                  />
                </div>
              ) : (
                groupedByLecturer.map((group) => {
                  const isExpanded = expandedLecturers.has(group.id);
                  const pendingCount = group.topics.filter((t) => t.status === 'PENDING').length;
                  const approvedCount = group.topics.filter((t) => t.status === 'APPROVED').length;
                  const rejectedCount = group.topics.filter((t) => t.status === 'REJECTED').length;

                  return (
                    <div
                      key={group.id}
                      className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden transition"
                    >
                      {/* Lecturer Card Header (Clickable Accordion) */}
                      <div
                        onClick={() => toggleLecturerExpand(group.id)}
                        className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/90 to-blue-50/30 border-b border-slate-100 hover:bg-slate-100/60 transition cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0d2a75] to-[#123891] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                            {group.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                                {formatLecturerDisplay(group.academicTitle, group.fullName)}
                              </h3>
                              <span className="text-[11px] font-extrabold font-mono text-[#102d7d] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                {group.lecturerCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              {group.email && <span>Email: {group.email}</span>}
                              {group.phone && <span>• SĐT: {group.phone}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Summary Badges & Batch Action */}
                        <div
                          className="flex items-center gap-2.5 flex-wrap self-end lg:self-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl">
                            Tổng: {group.topics.length} đề tài
                          </span>

                          {pendingCount > 0 && (
                            <span className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 font-extrabold text-xs rounded-xl flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {pendingCount} chờ duyệt
                            </span>
                          )}

                          {approvedCount > 0 && (
                            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {approvedCount} đã duyệt
                            </span>
                          )}

                          {rejectedCount > 0 && (
                            <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl">
                              {rejectedCount} từ chối
                            </span>
                          )}

                          {/* Batch Approve All Topics of this Lecturer */}
                          {pendingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleBatchApproveLecturerTopics(group)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition cursor-pointer"
                              title="Duyệt tất cả đề tài đang chờ của giảng viên này"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Duyệt tất cả ({pendingCount})</span>
                            </button>
                          )}

                          {/* Toggle Icon */}
                          <button
                            type="button"
                            onClick={() => toggleLecturerExpand(group.id)}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#123891] hover:bg-blue-50 transition cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-[#123891]' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Lecturer Topics Table (Visible when expanded) */}
                      {isExpanded && (
                        <div className="overflow-x-auto border-t border-slate-100">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4 text-center w-12">STT</th>
                                <th className="py-3 px-4 min-w-[220px]">Tên đề tài KLTN</th>
                                <th className="py-3 px-4 min-w-[200px]">Mô tả / Yêu cầu</th>
                                <th className="py-3 px-4 min-w-[250px]">Nhóm SV đăng ký nhận (FIFO)</th>
                                <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.topics.map((topic, idx) => {
                                const isPending = topic.status === 'PENDING';
                                const currentCount = topic.currentGroups || topic.registeredGroups?.length || 0;
                                const maxCount = topic.maxGroups || 1;

                                return (
                                  <tr key={topic._id} className="hover:bg-slate-50/80 transition">
                                    <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                                      {idx + 1}
                                    </td>

                                    <td className="py-3.5 px-4 min-w-[240px]">
                                      <div className="font-bold text-slate-900 leading-snug">
                                        {topic.title}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Ngày gửi: {formatDate(topic.createdAt)}
                                      </div>

                                      {/* Pending Edit Request Box */}
                                      {topic.editRequest?.status === 'PENDING' && (
                                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1.5 shadow-2xs">
                                          <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Yêu cầu chỉnh sửa tên đề tài:</span>
                                          </div>
                                          <div className="font-semibold text-slate-900 bg-white p-2 rounded-xl border border-amber-200 text-xs">
                                            "{topic.editRequest?.newTitle}"
                                          </div>
                                          <div className="flex items-center gap-1.5 pt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleApproveEditTopic(topic)}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                                            >
                                              <Check className="w-3 h-3" />
                                              <span>Duyệt sửa</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenRejectEditTopic(topic)}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                              <span>Từ chối</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Pending Delete Request Box */}
                                      {topic.deleteRequest?.status === 'PENDING' && (
                                        <div className="mt-2 p-2.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs space-y-1.5 shadow-2xs">
                                          <div className="font-bold text-rose-900 flex items-center gap-1 text-[11px]">
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Giảng viên yêu cầu xóa đề tài này:</span>
                                          </div>
                                          <div className="text-slate-700 bg-white p-2 rounded-xl border border-rose-200 text-[11px]">
                                            Lý do: {topic.deleteRequest?.reason || 'GV yêu cầu xóa đề tài'}
                                          </div>
                                          <div className="flex items-center gap-1.5 pt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenApproveDeleteTopic(topic)}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Duyệt xóa</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenRejectDeleteTopic(topic)}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                              <span>Từ chối</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <p className="text-slate-600 line-clamp-2 text-xs">
                                        {topic.description || <span className="text-slate-400 italic">Không có mô tả</span>}
                                      </p>
                                      {topic.rejectionReason && (
                                        <div className="mt-1 text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                          <strong>Lý do từ chối:</strong> {topic.rejectionReason}
                                        </div>
                                      )}
                                    </td>

                                    {/* Nhóm sinh viên đã nhận đề tài */}
                                    <td className="py-3.5 px-4">
                                      {topic.registeredGroups?.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {topic.registeredGroups.map((g) => (
                                            <div
                                              key={g._id}
                                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5"
                                            >
                                              <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-[#102d7d]">
                                                  Nhóm {g.groupOrder}:
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                  {formatDate(g.registeredAt)}
                                                </span>
                                              </div>
                                              <div className="text-xs font-medium text-slate-800">
                                                <strong>SV1:</strong> {g.studentId?.userId?.fullName || g.studentCode} ({g.studentCode})
                                              </div>
                                              {g.secondStudentId && (
                                                <div className="text-xs font-medium text-slate-700">
                                                  <strong>SV2:</strong> {g.secondStudentId?.userId?.fullName || g.secondStudentCode} ({g.secondStudentCode})
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-xs">Chưa có nhóm ĐK</span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      {renderTopicBadge(topic.status)}
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {isPending && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleApproveTopic(topic)}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer"
                                              title="Phê duyệt đề tài"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Duyệt</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setTargetTopic(topic);
                                                setTopicRejectReason('');
                                                setRejectTopicModalOpen(true);
                                              }}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                              title="Từ chối đề tài"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                              <span>Từ chối</span>
                                            </button>
                                          </>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedTopic(topic);
                                            setTopicDetailModalOpen(true);
                                          }}
                                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                          title="Xem chi tiết đề tài"
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
                  );
                })
              )}
            </div>
          ) : (
            /* ================= VIEW MODE 2: DẠNG BẢNG PHẲNG TOÀN BỘ ĐỀ TÀI ================= */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {loadingProposedTopics ? (
                <div className="p-6">
                  <LoadingSkeleton rows={5} cols={6} />
                </div>
              ) : proposedTopics.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="Không có đề tài nào được đề xuất"
                    description="Khi Giảng viên tạo đề xuất danh sách đề tài KLTN, danh sách sẽ hiển thị tại đây để TBM xem xét và phê duyệt."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4 text-center w-12">STT</th>
                        <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                        <th className="py-3.5 px-4">Giảng viên hướng dẫn</th>
                        <th className="py-3.5 px-4">Mô tả / Yêu cầu</th>
                        <th className="py-3.5 px-4">Nhóm SV đăng ký (FIFO)</th>
                        <th className="py-3.5 px-4">Trạng thái</th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedProposedTopics.map((topic, idx) => {
                        const isPending = topic.status === 'PENDING';
                        const currentCount = topic.currentGroups || topic.registeredGroups?.length || 0;
                        const maxCount = topic.maxGroups || 1;

                        return (
                          <tr key={topic._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                              {idx + 1}
                            </td>

                            <td className="py-3.5 px-4 min-w-[240px] max-w-sm">
                              <div className="font-bold text-slate-900 leading-snug">
                                {topic.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ngày gửi: {formatDate(topic.createdAt)}
                              </div>

                              {/* Pending Edit Request Box */}
                              {topic.editRequest?.status === 'PENDING' && (
                                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1.5 shadow-2xs">
                                  <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Yêu cầu chỉnh sửa tên đề tài:</span>
                                  </div>
                                  <div className="font-semibold text-slate-900 bg-white p-2 rounded-xl border border-amber-200 text-xs">
                                    "{topic.editRequest?.newTitle}"
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleApproveEditTopic(topic)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Duyệt sửa</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectEditTopic(topic)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Từ chối</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Pending Delete Request Box */}
                              {topic.deleteRequest?.status === 'PENDING' && (
                                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs space-y-1.5 shadow-2xs">
                                  <div className="font-bold text-rose-900 flex items-center gap-1 text-[11px]">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Giảng viên yêu cầu xóa đề tài này:</span>
                                  </div>
                                  <div className="text-slate-700 bg-white p-2 rounded-xl border border-rose-200 text-[11px]">
                                    Lý do: {topic.deleteRequest?.reason || 'GV yêu cầu xóa đề tài'}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenApproveDeleteTopic(topic)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Duyệt xóa</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectDeleteTopic(topic)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Từ chối</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {formatLecturerDisplay(topic.supervisorId?.academicTitle, topic.supervisorId?.userId?.fullName)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Mã GV: {topic.supervisorId?.lecturerCode || '—'}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 min-w-[200px] max-w-xs">
                              <p className="text-slate-600 line-clamp-2 text-xs">
                                {topic.description || <span className="text-slate-400 italic">Không có mô tả</span>}
                              </p>
                              {topic.rejectionReason && (
                                <div className="mt-1 text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                  <strong>Lý do từ chối:</strong> {topic.rejectionReason}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 min-w-[200px]">
                              {topic.registeredGroups?.length > 0 ? (
                                <div className="space-y-1">
                                  {topic.registeredGroups.map((g) => (
                                    <div key={g._id} className="text-[11px] text-slate-700">
                                      <span className="font-bold text-[#102d7d]">N{g.groupOrder}:</span>{' '}
                                      {g.studentId?.userId?.fullName || g.studentCode} ({g.studentCode})
                                      {g.secondStudentId && ` + ${g.secondStudentId?.userId?.fullName || g.secondStudentCode}`}
                                      <span className="text-[10px] text-slate-400 block font-mono">
                                        Ngày nhận: {formatDate(g.registeredAt)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Chưa có nhóm</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {renderTopicBadge(topic.status)}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveTopic(topic)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer"
                                      title="Phê duyệt đề tài"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Duyệt</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetTopic(topic);
                                        setTopicRejectReason('');
                                        setRejectTopicModalOpen(true);
                                      }}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                      title="Từ chối đề tài"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Từ chối</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTopic(topic);
                                    setTopicDetailModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Xem chi tiết"
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 & 3: PHÂN CÔNG PHẢN BIỆN KÍN & PHÂN CÔNG HỘI ĐỒNG */}
      {/* ========================================================================= */}
      {(activeMainTab === 'PRIVATE_REVIEWER' || activeMainTab === 'COUNCIL_REVIEWER') && (
        <div className="space-y-6">
          {/* Bảng Phòng Hội Đồng (Dành riêng cho Tab 3: Phân công hội đồng) */}
          {activeMainTab === 'COUNCIL_REVIEWER' && (
            <CouncilManagementSection theses={displayedTheses} />
          )}



          {/* Filter & Search Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-96">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Tìm MSSV SV1, SV2, Tên SV, Tên đề tài, GVHD..."
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING_TBM_APPROVAL">PENDING_TBM_APPROVAL (Chờ duyệt)</option>
                <option value="APPROVED">APPROVED (Đã duyệt đề tài)</option>
                <option value="ASSIGNED_REVIEWERS">ASSIGNED_REVIEWERS (Đã phân phản biện)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Đang thực hiện)</option>
                <option value="SUBMITTED">SUBMITTED (Đã nộp bài)</option>
                <option value="GRADED">GRADED (Đã chấm điểm)</option>
                <option value="REJECTED">REJECTED (Đã từ chối)</option>
                <option value="COMPLETED">COMPLETED (Hoàn thành)</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={5} cols={6} />
              </div>
            ) : displayedTheses.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title={
                    activeMainTab === 'COUNCIL_REVIEWER'
                      ? 'Chưa có đề tài nào đủ điều kiện phản biện hội đồng'
                      : activeMainTab === 'PRIVATE_REVIEWER'
                      ? 'Chưa có đề tài nào có điểm GVHD để phân công phản biện kín'
                      : 'Không tìm thấy đề tài khóa luận nào'
                  }
                  description={
                    activeMainTab === 'COUNCIL_REVIEWER'
                      ? 'Chỉ các đề tài đã có đầy đủ điểm của Giảng viên Phản biện mới xuất hiện tại đây.'
                      : activeMainTab === 'PRIVATE_REVIEWER'
                      ? 'Chỉ các đề tài đã được Giảng viên hướng dẫn (GVHD) chấm điểm mới xuất hiện tại đây để phân công phản biện kín.'
                      : 'Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc trạng thái.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    {activeMainTab === 'COUNCIL_REVIEWER' ? (
                      <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4 text-center w-12">STT</th>
                        <th className="py-3.5 px-4 min-w-[200px]">Tên đề tài KLTN</th>
                        <th className="py-3.5 px-4 min-w-[180px]">Sinh viên</th>
                        <th className="py-3.5 px-4 min-w-[160px]">GV Hướng Dẫn</th>
                        <th className="py-3.5 px-4 text-center min-w-[120px] whitespace-nowrap">Điểm HD + PB</th>
                        <th className="py-3.5 px-4 text-center min-w-[130px] whitespace-nowrap">Hình thức báo cáo</th>
                        <th className="py-3.5 px-4 min-w-[160px]">Phòng hội đồng</th>
                        <th className="py-3.5 px-4 text-center min-w-[110px] whitespace-nowrap">Điểm Hội đồng</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                      </tr>
                    ) : (
                      <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4 text-center w-14">STT</th>
                        <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                        <th className="py-3.5 px-4">Sinh viên</th>
                        <th className="py-3.5 px-4">GV Hướng Dẫn</th>
                        <th className="py-3.5 px-4">GVPB 1</th>
                        <th className="py-3.5 px-4 text-center">Điểm GVPB 1</th>
                        <th className="py-3.5 px-4">GVPB 2</th>
                        <th className="py-3.5 px-4 text-center">Điểm GVPB 2</th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedTheses.map((item, idx) => {
                      const isPending = item.status === 'PENDING_TBM_APPROVAL';
                      const councilsList = getCouncilsList();
                      const rawAssignedId = thesisCouncilMap[item._id] || (item.councilId?._id ? item.councilId._id : item.councilId);
                      const assignedCouncilId = typeof rawAssignedId === 'object' && rawAssignedId !== null ? String(rawAssignedId._id || rawAssignedId.id || '') : String(rawAssignedId || '');
                      const assignedCouncil = councilsList.find((c) => (c.id && String(c.id) === assignedCouncilId) || (c._id && String(c._id) === assignedCouncilId));

                      if (activeMainTab === 'COUNCIL_REVIEWER') {
                        const scoreHDPB = calculateScoreHDPB(item);
                        const councilFinalScore = calculateCouncilScore(item, assignedCouncil);
                        const isAssignedCouncilExpired = assignedCouncil ? isCouncilReportTimeExpired(assignedCouncil) : false;

                        return (
                          <tr
                            key={item._id}
                            className={`transition ${isAssignedCouncilExpired ? 'bg-slate-50/40 hover:bg-slate-50/70' : 'hover:bg-slate-50/80'}`}
                          >
                            {/* 1. STT */}
                            <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                              {(page - 1) * limit + idx + 1}
                            </td>

                            {/* 2. Tên đề tài KLTN */}
                            <td className="py-3.5 px-4 min-w-[200px] max-w-sm" title={item.thesisTitle}>
                              <div
                                onClick={() => {
                                  setSelectedThesis(item);
                                  setDetailModalOpen(true);
                                }}
                                className="font-bold text-slate-900 line-clamp-2 leading-snug hover:text-[#123891] cursor-pointer transition"
                              >
                                {item.thesisTitle}
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-1">
                                {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                              </span>
                            </td>

                            {/* 3. Sinh viên */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                                  <strong className="text-slate-900">{item.studentId?.userId?.fullName}</strong>
                                  <span className="text-[10px] font-mono text-slate-500">({item.studentId?.studentCode})</span>
                                </div>

                                {item.studentCount === 2 && item.secondStudentId && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                                    <strong className="text-slate-900">{item.secondStudentId?.userId?.fullName}</strong>
                                    <span className="text-[10px] font-mono text-slate-500">({item.secondStudentId?.studentCode})</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 4. GV Hướng Dẫn */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {item.supervisorId?.academicTitle ? `${item.supervisorId.academicTitle} ` : ''}
                                {item.supervisorId?.userId?.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Mã GV: {item.supervisorId?.lecturerCode}
                              </div>
                            </td>

                            {/* 5. Điểm HD + PB: (Điểm GVHD + (Điểm GVPB1 + Điểm GVPB2)/2) / 2 */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {scoreHDPB ? (
                                <span
                                  className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs inline-block"
                                  title={`GVHD: ${scoreHDPB.scoreHD ?? '—'} | GVPB1: ${scoreHDPB.scorePB1 ?? '—'} | GVPB2: ${scoreHDPB.scorePB2 ?? '—'} | TB PB: ${scoreHDPB.avgPB ?? '—'}`}
                                >
                                  {scoreHDPB.score}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              )}
                            </td>

                            {/* 6. Hình thức báo cáo (Top 20% & Điểm >= 8 -> Báo cáo Oral, còn lại -> Báo cáo Poster) */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {scoreHDPB ? (
                                (() => {
                                  const reqFormat = thesisReportFormatMap[item._id] || 'POSTER';
                                  return reqFormat === 'ORAL' ? (
                                    <span
                                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-[#102d7d] border-blue-200 shadow-2xs"
                                      title="Top 20% điểm HD + PB và điểm ≥ 8.0"
                                    >
                                      Báo cáo Oral
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-[#102d7d] border-blue-200 shadow-2xs"
                                      title="Báo cáo Poster"
                                    >
                                      Báo cáo Poster
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              )}
                            </td>

                            {/* 7. Phòng hội đồng */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {assignedCouncil ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-slate-900 block font-bold text-xs">
                                      {(assignedCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}
                                    </strong>
                                    {isAssignedCouncilExpired && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        Đã kết thúc
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Phòng: {assignedCouncil.room}
                                  </div>
                                  {assignedCouncil.reportTime && (
                                    <div className="text-[10px] text-slate-600 font-mono flex items-center gap-1 mt-0.5">
                                      <Clock className="w-3 h-3 text-[#123891]" />
                                      <span>{assignedCouncil.reportTime}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                                  Chưa phân công
                                </span>
                              )}
                            </td>

                            {/* 8. Điểm Hội đồng */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {councilFinalScore !== null ? (
                                <span className="font-extrabold text-emerald-800 font-mono text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                                  {councilFinalScore}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Chưa có điểm</span>
                              )}
                            </td>

                            {/* 9. Thao tác */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Phân công phòng hội đồng */}
                                <button
                                  type="button"
                                  disabled={isAssignedCouncilExpired}
                                  onClick={() => {
                                    setSelectedThesisForCouncil(item);
                                    setAssignCouncilToThesisModalOpen(true);
                                  }}
                                  className={`p-1.5 rounded-lg transition ${
                                    isAssignedCouncilExpired
                                      ? 'text-slate-300 cursor-not-allowed opacity-40'
                                      : 'text-[#123891] hover:bg-blue-50 cursor-pointer'
                                  }`}
                                  title={
                                    isAssignedCouncilExpired
                                      ? 'Phòng hội đồng đã kết thúc thời gian báo cáo, không thể thay đổi phân công'
                                      : 'Phân công phòng hội đồng cho đề tài'
                                  }
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedThesis(item);
                                    setDetailModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Xem chi tiết"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {item.status !== 'REJECTED' && item.status !== 'COMPLETED' && (() => {
                                  const graded = isThesisGraded(item);
                                  return (
                                    <button
                                      type="button"
                                      disabled={graded}
                                      onClick={() => {
                                        if (graded) return;
                                        setSelectedThesis(item);
                                        setCancelReason('');
                                        setCancelThesisConfirmOpen(true);
                                      }}
                                      className={`p-1.5 rounded-lg transition ${
                                        graded
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                      }`}
                                      title={graded ? 'Không thể hủy đề tài do đề tài đã có điểm đánh giá' : 'Hủy đề tài KLTN'}
                                    >
                                      <Ban className="w-4 h-4" />
                                    </button>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // TAB 2 (Phản biện kín) row rendering
                      // GVPB 1
                      let rev1Name = '';
                      if (item.reviewer1Id) {
                        const title = item.reviewer1Id.academicTitle ? `${item.reviewer1Id.academicTitle} ` : '';
                        rev1Name = `${title}${item.reviewer1Id.userId?.fullName || item.reviewer1Id.fullName || 'Giảng viên'}`;
                      } else if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                        const priv = item.reviewers.find((r) => r.isPrivateReviewer && r.lecturerId);
                        if (priv) {
                          const lec = priv.lecturerId;
                          const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                          rev1Name = `${title}${lec.userId?.fullName || lec.fullName || 'Giảng viên'}`;
                        }
                      }

                      // GVPB 2
                      let rev2Name = '';
                      if (item.reviewer2Id) {
                        const title = item.reviewer2Id.academicTitle ? `${item.reviewer2Id.academicTitle} ` : '';
                        rev2Name = `${title}${item.reviewer2Id.userId?.fullName || item.reviewer2Id.fullName || 'Giảng viên'}`;
                      } else if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                        const coun = item.reviewers.find((r) => r.isCouncilReviewer && r.lecturerId);
                        if (coun) {
                          const lec = coun.lecturerId;
                          const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                          rev2Name = `${title}${lec.userId?.fullName || lec.fullName || 'Giảng viên'}`;
                        }
                      }

                      const score1 = item.scores?.reviewer1Score ?? item.scores?.student1Reviewer1Score;
                      const score2 = item.scores?.reviewer2Score ?? item.scores?.student1Reviewer2Score;

                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-slate-50/80 transition"
                        >
                          {/* 1. STT */}
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                            {(page - 1) * limit + idx + 1}
                          </td>

                          {/* 2. Tên đề tài KLTN */}
                          <td className="py-3.5 px-4 min-w-[200px] max-w-xs" title={item.thesisTitle}>
                            <div
                              onClick={() => {
                                setSelectedThesis(item);
                                setDetailModalOpen(true);
                              }}
                              className="font-bold text-slate-900 line-clamp-2 leading-snug hover:text-[#123891] cursor-pointer transition"
                            >
                              {item.thesisTitle}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-1">
                              {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                            </span>
                          </td>

                          {/* 3. Sinh viên */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                                <strong className="text-slate-900">{item.studentId?.userId?.fullName}</strong>
                                <span className="text-[10px] font-mono text-slate-500">({item.studentId?.studentCode})</span>
                              </div>

                              {item.studentCount === 2 && item.secondStudentId && (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                                  <strong className="text-slate-900">{item.secondStudentId?.userId?.fullName}</strong>
                                  <span className="text-[10px] font-mono text-slate-500">({item.secondStudentId?.studentCode})</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. GV Hướng Dẫn */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">
                              {item.supervisorId?.academicTitle ? `${item.supervisorId.academicTitle} ` : ''}
                              {item.supervisorId?.userId?.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Mã GV: {item.supervisorId?.lecturerCode}
                            </div>
                          </td>

                          {/* 5. GVPB 1 */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {rev1Name ? (
                              <span className="font-semibold text-slate-800">{rev1Name}</span>
                            ) : (
                              <span className="text-amber-600 italic">Chưa phân công</span>
                            )}
                          </td>

                          {/* 6. Điểm GVPB 1 */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {score1 !== null && score1 !== undefined ? (
                              <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
                                {score1}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* 7. GVPB 2 */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {rev2Name ? (
                              <span className="font-semibold text-slate-800">{rev2Name}</span>
                            ) : (
                              <span className="text-amber-600 italic">Chưa phân công</span>
                            )}
                          </td>

                          {/* 8. Điểm GVPB 2 */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {score2 !== null && score2 !== undefined ? (
                              <span className="font-bold text-amber-700 font-mono text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 shadow-2xs">
                                {score2}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* 9. Thao tác */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedThesis(item);
                                      setApproveConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                    title="Phê duyệt đề tài"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedThesis(item);
                                      setRejectConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Từ chối đề tài"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {/* Phân công phản biện */}
                              {item.status !== 'REJECTED' &&
                                item.status !== 'PENDING_TBM_APPROVAL' &&
                                item.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                                item.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedThesis(item);
                                      setAssignReviewersOpen(true);
                                    }}
                                    className="p-1.5 text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                    title="Phân công phản biện"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(item);
                                  setDetailModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {item.status !== 'REJECTED' && item.status !== 'COMPLETED' && (() => {
                                const graded = isThesisGraded(item);
                                return (
                                  <button
                                    type="button"
                                    disabled={graded}
                                    onClick={() => {
                                      if (graded) return;
                                      setSelectedThesis(item);
                                      setCancelReason('');
                                      setCancelThesisConfirmOpen(true);
                                    }}
                                    className={`p-1.5 rounded-lg transition ${
                                      graded
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                    }`}
                                    title={graded ? 'Không thể hủy đề tài do đề tài đã có điểm đánh giá' : 'Hủy đề tài KLTN'}
                                  >
                                    <Ban className="w-4 h-4" />
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

            {/* Pagination */}
            {!loading && displayedTheses.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-4">
                <Pagination
                  pagination={pagination}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Reject Proposed Topic Modal */}
      {rejectTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ chối đề tài KLTN</h3>
                <p className="text-xs text-slate-500">Giảng viên sẽ nhận được lý do từ chối</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-xs space-y-1">
              <div className="font-semibold text-slate-800">{targetTopic?.title}</div>
              <div className="text-slate-500">
                GV: {targetTopic?.supervisorId?.academicTitle} {targetTopic?.supervisorId?.userId?.fullName} ({targetTopic?.supervisorId?.lecturerCode})
              </div>
            </div>

            <form onSubmit={handleConfirmRejectTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={topicRejectReason}
                  onChange={(e) => setTopicRejectReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết từ chối đề tài (VD: Đề tài trùng lặp, nội dung chưa đạt yêu cầu, thiếu công nghệ mới...)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTopicModalOpen(false);
                    setTargetTopic(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !topicRejectReason.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposed Topic Detail & Registered Groups Modal */}
      {topicDetailModalOpen && selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi tiết đề tài đề xuất</h3>
                  <p className="text-xs text-slate-500">Trạng thái: {renderTopicBadge(selectedTopic.status)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopicDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs space-y-2">
              <div>
                <span className="text-slate-500">Tên đề tài:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedTopic.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-500">Giảng viên hướng dẫn:</span>
                  <div className="font-semibold text-slate-800">
                    {formatLecturerDisplay(selectedTopic.supervisorId?.academicTitle, selectedTopic.supervisorId?.userId?.fullName)} ({selectedTopic.supervisorId?.lecturerCode})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Trạng thái đăng ký:</span>
                  <div className="font-bold text-blue-700 font-mono">
                    {selectedTopic.currentGroups > 0 || selectedTopic.registeredGroups?.length > 0 ? 'Đã có nhóm đăng ký' : 'Chưa có nhóm đăng ký'}
                  </div>
                </div>
              </div>
              {selectedTopic.description && (
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Mô tả:</span>
                  <div className="text-slate-700 mt-0.5 leading-relaxed">{selectedTopic.description}</div>
                </div>
              )}
            </div>

            {/* List of FIFO registered groups */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Danh sách sinh viên đã đăng ký (FIFO theo thứ tự)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {selectedTopic.registeredGroups?.length || 0} nhóm đã đăng ký
                </span>
              </h4>

              {(!selectedTopic.registeredGroups || selectedTopic.registeredGroups.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Chưa có sinh viên / nhóm sinh viên nào đăng ký đề tài này.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {selectedTopic.registeredGroups.map((grp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">
                            Nhóm #{grp.groupOrder || idx + 1}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {grp.secondStudentId ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatDate(grp.registeredAt)}
                        </div>
                      </div>

                      <div className={`grid ${grp.secondStudentId ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                        <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-0.5 text-[11px]">
                          <div className="font-bold text-[#123891] flex items-center gap-1.5 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                            <span>SV1: {grp.studentId?.userId?.fullName || 'Sinh viên 1'}</span>
                          </div>
                          <div><strong>MSSV:</strong> {grp.studentCode || grp.studentId?.studentCode}</div>
                          <div><strong>Lớp:</strong> {grp.studentId?.className || '—'}</div>
                          <div><strong>Email:</strong> {grp.studentId?.userId?.email || '—'}</div>
                        </div>

                        {grp.secondStudentId && (
                          <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-0.5 text-[11px]">
                            <div className="font-bold text-[#123891] flex items-center gap-1.5 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#123891]" />
                              <span>SV2: {grp.secondStudentId?.userId?.fullName || 'Sinh viên 2'}</span>
                            </div>
                            <div><strong>MSSV:</strong> {grp.secondStudentCode || grp.secondStudentId?.studentCode}</div>
                            <div><strong>Lớp:</strong> {grp.secondStudentId?.className || '—'}</div>
                            <div><strong>Email:</strong> {grp.secondStudentId?.userId?.email || '—'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTopicDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Từ chối yêu cầu chỉnh sửa đề tài */}
      {rejectEditModalOpen && targetTopicForRejectEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Từ Chối Yêu Cầu Chỉnh Sửa</h3>
                  <p className="text-xs text-slate-500">Nhập lý do từ chối yêu cầu đổi tên đề tài</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div><span className="text-slate-400">Tên hiện tại:</span> <strong>{targetTopicForRejectEdit.title}</strong></div>
              <div><span className="text-slate-400">Tên yêu cầu đổi:</span> <strong className="text-amber-800">"{targetTopicForRejectEdit.editRequest?.newTitle}"</strong></div>
            </div>

            <form onSubmit={handleConfirmRejectEditTopic} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectEditReason}
                  onChange={(e) => setRejectEditReason(e.target.value)}
                  placeholder="Nhập lý do từ chối yêu cầu chỉnh sửa đề tài..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRejectEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectEditReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span>Xác nhận từ chối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Từ chối yêu cầu xóa đề tài */}
      {rejectDeleteModalOpen && targetTopicForRejectDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Từ Chối Yêu Cầu Xóa Đề Tài</h3>
                  <p className="text-xs text-slate-500">Nhập lý do từ chối yêu cầu xóa đề tài</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div><span className="text-slate-400">Đề tài:</span> <strong>{targetTopicForRejectDelete.title}</strong></div>
              <div><span className="text-slate-400">Lý do GV xin xóa:</span> <span className="text-slate-700">{targetTopicForRejectDelete.deleteRequest?.reason || '—'}</span></div>
            </div>

            <form onSubmit={handleConfirmRejectDeleteTopic} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý do từ chối xóa <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectDeleteReason}
                  onChange={(e) => setRejectDeleteReason(e.target.value)}
                  placeholder="Nhập lý do không đồng ý xóa đề tài..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRejectDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectDeleteReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span>Xác nhận từ chối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Approve Delete Topic Dialog */}
      <ConfirmDialog
        isOpen={confirmApproveDeleteOpen}
        onClose={() => setConfirmApproveDeleteOpen(false)}
        onConfirm={handleConfirmApproveDeleteTopic}
        title="Xác nhận Phê duyệt Xóa Đề tài KLTN"
        message={`Bạn có chắc chắn muốn phê duyệt yêu cầu xóa đề tài "${targetTopicForApproveDelete?.title}" của Giảng viên không? Đề tài sẽ bị xóa khỏi hệ thống.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isDanger={true}
        loading={actionLoading}
      />

      {/* Tab 2 Detail Modal */}
      <TbmThesisDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        thesis={selectedThesis}
        onApprove={(t) => {
          setSelectedThesis(t);
          setApproveConfirmOpen(true);
        }}
        onReject={(t) => {
          setSelectedThesis(t);
          setRejectConfirmOpen(true);
        }}
        onCancelThesis={(t) => {
          setSelectedThesis(t);
          setCancelReason('');
          setCancelThesisConfirmOpen(true);
        }}
        onOpenAssignReviewers={(t) => {
          setSelectedThesis(t);
          setAssignReviewersOpen(true);
        }}
        onOpenAssignSupervisor={(t) => {
          setSelectedThesis(t);
          setAssignSupervisorOpen(true);
        }}
      />

      {/* Assign Reviewers Modal */}
      <AssignReviewersModal
        isOpen={assignReviewersOpen}
        onClose={() => setAssignReviewersOpen(false)}
        thesis={selectedThesis}
        onSuccess={(updatedThesis) => {
          if (updatedThesis) {
            setSelectedThesis(updatedThesis);
            setTheses((prev) =>
              prev.map((t) => (t._id === updatedThesis._id ? updatedThesis : t)),
            );
          }
          fetchTheses();
        }}
      />

      {/* Assign Supervisor Modal */}
      <AssignSupervisorModal
        isOpen={assignSupervisorOpen}
        onClose={() => setAssignSupervisorOpen(false)}
        thesis={selectedThesis}
        onSuccess={(updatedThesis) => {
          if (updatedThesis) {
            setSelectedThesis(updatedThesis);
            setTheses((prev) =>
              prev.map((t) => (t._id === updatedThesis._id ? updatedThesis : t)),
            );
          }
          fetchTheses();
        }}
      />

      {/* Assign Council To Thesis Modal */}
      <AssignCouncilToThesisModal
        isOpen={assignCouncilToThesisModalOpen}
        onClose={() => {
          setAssignCouncilToThesisModalOpen(false);
          setSelectedThesisForCouncil(null);
        }}
        thesis={selectedThesisForCouncil}
        councils={getCouncilsList()}
        currentCouncilId={
          selectedThesisForCouncil
            ? typeof (thesisCouncilMap[selectedThesisForCouncil._id] || (selectedThesisForCouncil.councilId?._id ? selectedThesisForCouncil.councilId._id : selectedThesisForCouncil.councilId)) === 'object'
              ? String((selectedThesisForCouncil.councilId?._id || selectedThesisForCouncil.councilId?.id || ''))
              : String(thesisCouncilMap[selectedThesisForCouncil._id] || selectedThesisForCouncil.councilId || '')
            : ''
        }
        reportFormat={selectedThesisForCouncil ? (thesisReportFormatMap[selectedThesisForCouncil._id] || 'POSTER') : 'POSTER'}
        onAssignCouncil={handleAssignCouncilToThesis}
      />

      {/* Approve Confirm Modal */}
      <ConfirmDialog
        isOpen={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleApprove}
        title="Xác nhận Phê duyệt Đề tài KLTN"
        message={`Bạn có chắc chắn muốn phê duyệt đề tài "${selectedThesis?.thesisTitle}"? Trạng thái đề tài sẽ chuyển sang APPROVED.`}
        confirmText="Phê duyệt ngay"
        isDanger={false}
        loading={actionLoading}
      />

      {/* Reject Confirm Modal */}
      <ConfirmDialog
        isOpen={rejectConfirmOpen}
        onClose={() => setRejectConfirmOpen(false)}
        onConfirm={handleReject}
        title="Xác nhận Từ chối Đề tài KLTN"
        message={`Bạn có chắc chắn muốn từ chối đề tài "${selectedThesis?.thesisTitle}"? Sinh viên sẽ được giải phóng cờ đăng ký và có thể nộp đề tài khác.`}
        confirmText="Từ chối đề tài"
        isDanger={true}
        loading={actionLoading}
      />

      {/* Cancel Thesis Confirm Dialog */}
      {cancelThesisConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận Hủy Đề tài KLTN</h3>
                <p className="text-xs text-slate-500">Giải phóng trạng thái đăng ký của sinh viên</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-slate-900 line-clamp-2">{selectedThesis?.thesisTitle}</div>
              <div>Sinh viên 1: <strong>{selectedThesis?.studentId?.userId?.fullName || selectedThesis?.studentId?.studentCode}</strong></div>
              {selectedThesis?.secondStudentId && (
                <div>Sinh viên 2: <strong>{selectedThesis?.secondStudentId?.userId?.fullName || selectedThesis?.secondStudentId?.studentCode}</strong></div>
              )}
              <div className="text-[11px] text-rose-600 pt-1 font-medium border-t border-slate-200/60 mt-1">
                ⚠️ Hậu quả: Đề tài sẽ chuyển sang trạng thái ĐÃ HỦY (REJECTED). Toàn bộ sinh viên trong nhóm sẽ được giải phóng để đăng ký đề tài mới.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do hủy đề tài (Tùy chọn):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đề tài..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setCancelThesisConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelThesis}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Xác nhận Hủy Đề tài</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Xuất danh sách đề tài Khóa luận Tốt nghiệp (KLTN)"
        type="THESIS"
        currentFilters={{ academicTermId: currentTerm?._id, status: status === 'ALL' ? '' : status, search }}
        onExport={(params) => thesisApi.exportExcel(params)}
      />

      <ThesisTimelineModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
      />
    </div>
  );
};

export default TbmThesisManagement;
