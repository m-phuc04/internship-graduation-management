import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import UserNameClickable from '../../components/common/UserNameClickable';

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
  Edit3,
  FileText,
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

  // Proposed Topics (KLTN Topic Management)
  const [myTopics, setMyTopics] = useState([]);
  const [loadingMyTopics, setLoadingMyTopics] = useState(false);
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [batchTitleInput, setBatchTitleInput] = useState('');
  const [batchMaxGroups, setBatchMaxGroups] = useState(1);
  const [batchDescription, setBatchDescription] = useState('');
  const [createTopicLoading, setCreateTopicLoading] = useState(false);
  const [selectedTopicDetail, setSelectedTopicDetail] = useState(null);

  // Approved topics for registration list
  const [approvedTopics, setApprovedTopics] = useState([]);
  const [loadingApprovedTopics, setLoadingApprovedTopics] = useState(false);
  const [onlyMyApprovedTopics, setOnlyMyApprovedTopics] = useState(false);

  useEffect(() => {
    if (location.search.includes('tab=topics')) {
      setActiveTab('MY_TOPICS');
    } else if (location.search.includes('tab=reviewer2')) {
      setActiveTab('REVIEWER_2');
    } else if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1')) {
      setActiveTab('REVIEWER_1');
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

  // Council Room Data for Reviewer 2 (Phản biện hội đồng)
  const [councils, setCouncils] = useState([]);
  const [thesisCouncilMap, setThesisCouncilMap] = useState({});
  const [selectedCouncilId, setSelectedCouncilId] = useState(null);

  const loadCouncilData = useCallback(() => {
    try {
      const termId = currentTerm?._id || 'default';
      const cKey = `tbm_councils_${termId}`;
      const tcKey = `tbm_thesis_councils_${termId}`;

      const savedCouncils = localStorage.getItem(cKey);
      if (savedCouncils) {
        const parsed = JSON.parse(savedCouncils);
        if (Array.isArray(parsed)) {
          setCouncils(parsed);
        }
      } else {
        setCouncils([]);
      }

      const savedThesisCouncils = localStorage.getItem(tcKey);
      if (savedThesisCouncils) {
        setThesisCouncilMap(JSON.parse(savedThesisCouncils));
      } else {
        setThesisCouncilMap({});
      }
    } catch (e) {
      console.warn('Error loading council data in Lecturer page', e);
    }
  }, [currentTerm?._id]);

  // Timeline edit in detail modal
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [savingDetailTimeline, setSavingDetailTimeline] = useState(false);

  const fetchAssignedTheses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const thesesRes = await thesisApi.getAssignedThesesForLecturer({
        roleType: 'ALL',
        search,
        academicTermId: currentTerm?._id || '',
      });

      if (thesesRes.success) {
        setData(thesesRes.data);
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

    setCreateTopicLoading(true);
    try {
      const res = await thesisApi.batchCreateTopics({
        topicListRaw: batchTitleInput.trim(),
        defaultMaxGroups: Number(batchMaxGroups) || 1,
        defaultDescription: batchDescription.trim() || '',
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        showToast(res.message || 'Tạo danh sách đề tài KLTN thành công!', 'success');
        setCreateTopicModalOpen(false);
        setBatchTitleInput('');
        setBatchMaxGroups(1);
        setBatchDescription('');
        fetchMyTopics();
      }
    } catch (err) {
      showToast(err.message || 'Tạo đề tài thất bại', 'error');
    } finally {
      setCreateTopicLoading(false);
    }
  };

  // Current list based on active tab with resilient fallback
  const supervisedTheses = data?.supervisedTheses || (data?.theses || []).filter((t) => t.isSupervisor) || [];
  const reviewer1Theses = data?.reviewer1Theses || (data?.theses || []).filter((t) => t.isReviewer1) || [];
  const reviewer2Theses = data?.reviewer2Theses || (data?.theses || []).filter((t) => t.isReviewer2) || [];

  // Computations for Council Rooms
  const myCouncils = useMemo(() => {
    let result = [];
    if (councils && councils.length > 0) {
      // Match lecturer by id, name, or email
      const matched = councils.filter((c) => {
        if (!Array.isArray(c.lecturers)) return false;
        return c.lecturers.some((l) => {
          const matchesId =
            (l.lecturerId && (l.lecturerId === user?._id || l.lecturerId === user?.userId)) ||
            (l.userId && (l.userId === user?._id || l.userId === user?.userId));
          const matchesName =
            user?.fullName &&
            ((l.name && l.name.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
              (l.fullName && l.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase()));
          const matchesEmail =
            user?.email && l.email && l.email.trim().toLowerCase() === user.email.trim().toLowerCase();
          return matchesId || matchesName || matchesEmail;
        });
      });

      if (matched.length > 0) {
        result = matched;
      } else {
        // Check if any reviewer2 theses are mapped to a council
        const reviewer2List = data?.reviewer2Theses || [];
        const mappedIds = new Set(reviewer2List.map((t) => thesisCouncilMap[t._id]).filter(Boolean));
        const matchedFromTheses = councils.filter((c) => mappedIds.has(c.id || c._id));
        if (matchedFromTheses.length > 0) {
          result = matchedFromTheses;
        } else {
          result = councils;
        }
      }
    }

    // Fallback: If no councils in storage or not matched, but reviewer2Theses exist
    if (result.length === 0 && (data?.reviewer2Theses || []).length > 0) {
      result = [
        {
          id: 'default_council',
          _id: 'default_council',
          name: 'Hội đồng Bảo vệ Khóa Luận Tốt Nghiệp',
          room: 'Phòng Hội đồng Khoa CNTT',
          reportDate: null,
          reportTime: 'Theo lịch phân công',
          type: 'ORAL',
          format: 'ORAL',
          description: 'Hội đồng đánh giá và chấm điểm bảo vệ Khóa luận tốt nghiệp',
          lecturers: [
            {
              userId: user?._id,
              lecturerId: user?._id,
              name: user?.fullName || 'Giảng viên',
              role: 'Ủy viên / Giảng viên chấm Hội đồng',
            },
          ],
        },
      ];
    }

    return result;
  }, [councils, user, data?.reviewer2Theses, thesisCouncilMap]);

  const activeCouncil = useMemo(() => {
    if (myCouncils.length === 0) return null;
    if (selectedCouncilId) {
      const found = myCouncils.find((c) => (c.id || c._id) === selectedCouncilId);
      if (found) return found;
    }
    return myCouncils[0];
  }, [myCouncils, selectedCouncilId]);

  const councilTheses = useMemo(() => {
    if (!activeCouncil) return [];
    const cId = activeCouncil.id || activeCouncil._id;

    const allThesesPool = data?.allTheses || data?.theses || [];
    const reviewer2Pool = data?.reviewer2Theses || [];

    // All theses mapped to this council
    let list = allThesesPool.filter((t) => thesisCouncilMap[t._id] === cId);
    if (list.length === 0 && reviewer2Pool.length > 0) {
      list = reviewer2Pool;
    }

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
          t.reviewer1Id?.userId?.fullName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCouncil, data, thesisCouncilMap, search]);

  const stats = {
    supervisedCount: data?.stats?.supervisedCount ?? supervisedTheses.length,
    reviewer1Count: data?.stats?.reviewer1Count ?? reviewer1Theses.length,
    reviewer2Count: councilTheses.length || data?.stats?.reviewer2Count || reviewer2Theses.length,
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

  // Open Grade Box Modal
  const handleOpenGradeBox = (thesis) => {
    if (activeTab === 'SUPERVISOR') {
      navigate(`/lecturer/theses/${thesis._id}/evaluate`);
      return;
    }
    setGradeBoxThesis(thesis);
    const role =
      activeTab === 'REVIEWER_1'
        ? 'REVIEWER1'
        : activeTab === 'REVIEWER_2'
          ? 'REVIEWER2'
          : 'SUPERVISOR';
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
      const myId = user?._id || user?.userId;
      const myScoreEntry = Array.isArray(thesis.scores?.councilLecturerScores)
        ? thesis.scores.councilLecturerScores.find(
            (e) => (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === myId ||
                   (user?.fullName && e.lecturerName && e.lecturerName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
          )
        : null;

      if (myScoreEntry) {
        s1 = myScoreEntry.student1Score !== null && myScoreEntry.student1Score !== undefined
          ? myScoreEntry.student1Score
          : myScoreEntry.score !== null && myScoreEntry.score !== undefined
          ? myScoreEntry.score
          : '';
        s2 = myScoreEntry.student2Score !== null && myScoreEntry.student2Score !== undefined
          ? myScoreEntry.student2Score
          : '';
        c = myScoreEntry.comment || '';
      } else {
        s1 = thesis.scores?.student1Reviewer2Score !== null && thesis.scores?.student1Reviewer2Score !== undefined
          ? thesis.scores.student1Reviewer2Score
          : !isTwo && thesis.scores?.reviewer2Score !== null && thesis.scores?.reviewer2Score !== undefined
            ? thesis.scores.reviewer2Score
            : '';
        s2 = thesis.scores?.student2Reviewer2Score !== null && thesis.scores?.student2Reviewer2Score !== undefined
          ? thesis.scores.student2Reviewer2Score
          : '';
        c = thesis.scores?.reviewer2Comment || '';
      }
    }

    setGradeSv1(s1 !== '' && s1 !== null && s1 !== undefined ? String(s1) : '');
    setGradeSv2(s2 !== '' && s2 !== null && s2 !== undefined ? String(s2) : '');
    setGradeComment(c || '');
    setGradeBoxOpen(true);
  };

  const handleConfirmGradeBox = async (e) => {
    if (e) e.preventDefault();
    if (!gradeBoxThesis) return;

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

  const handleOpenDetail = (thesis) => {
    setTargetThesis(thesis);
    setDetailStartDate(thesis.startDate ? thesis.startDate.split('T')[0] : '');
    setDetailEndDate(thesis.endDate ? thesis.endDate.split('T')[0] : '');
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

  // Reviewer 1 Display Name
  const getReviewer1Display = (item) => {
    if (!item) return 'Chưa phân công';
    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      const priv = item.reviewers.find((r) => r.isPrivateReviewer && r.lecturerId);
      if (priv) {
        const lec = priv.lecturerId;
        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
        return `${title}${lec.userId?.fullName || lec.fullName || 'Giảng viên'}`;
      }
    }
    if (item.reviewer1Id) {
      const title = item.reviewer1Id.academicTitle ? `${item.reviewer1Id.academicTitle} ` : '';
      return `${title}${item.reviewer1Id.userId?.fullName || item.reviewer1Id.fullName || 'Giảng viên'}`;
    }
    return 'Chưa phân công';
  };

  // Reviewer 2 Display Name
  const getReviewer2Display = (item) => {
    if (!item) return 'Chưa phân công';
    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      const coun = item.reviewers.find((r) => r.isCouncilReviewer && r.lecturerId);
      if (coun) {
        const lec = coun.lecturerId;
        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
        return `${title}${lec.userId?.fullName || lec.fullName || 'Giảng viên'}`;
      }
    }
    if (item.reviewer2Id) {
      const title = item.reviewer2Id.academicTitle ? `${item.reviewer2Id.academicTitle} ` : '';
      return `${title}${item.reviewer2Id.userId?.fullName || item.reviewer2Id.fullName || 'Giảng viên'}`;
    }
    return 'Chưa phân công';
  };

  // Reviewer 1 Score Component
  const renderReviewer1Score = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1 = item.scores?.student1Reviewer1Score ?? item.scores?.reviewer1Score;
    const s2 = item.scores?.student2Reviewer1Score;

    if (s1 === null || s1 === undefined || s1 === '') {
      return <span className="text-slate-400 italic text-[11px]">—</span>;
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

  // Reviewer 2 Score Component
  const renderReviewer2Score = (item) => {
    const isTwo = item.studentCount === 2 && item.secondStudentId;
    const s1 = item.scores?.student1Reviewer2Score ?? item.scores?.reviewer2Score;
    const s2 = item.scores?.student2Reviewer2Score;

    if (s1 === null || s1 === undefined || s1 === '') {
      return <span className="text-slate-400 italic text-[11px]">—</span>;
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

  const isTopicsView = activeTab === 'MY_TOPICS' || location.search.includes('tab=topics');
  const isReviewView =
    activeTab === 'REVIEWER_1' ||
    activeTab === 'REVIEWER_2' ||
    location.search.includes('tab=review') ||
    location.search.includes('tab=reviewer1') ||
    location.search.includes('tab=reviewer2');
  const isEvaluationView = location.search.includes('view=evaluation');

  const filteredApprovedTopics = approvedTopics.filter((topic) => {
    const q = (search || '').trim().toLowerCase();
    const matchSearch =
      !q ||
      topic.title?.toLowerCase().includes(q) ||
      topic.description?.toLowerCase().includes(q) ||
      topic.supervisor?.fullName?.toLowerCase().includes(q) ||
      topic.supervisor?.lecturerCode?.toLowerCase().includes(q);

    const isMyTopic =
      topic.supervisor?._id === user?._id ||
      topic.supervisorId?._id === user?._id ||
      topic.supervisor?.email === user?.email ||
      topic.supervisor?.userId === user?._id;

    const matchMine = !onlyMyApprovedTopics || isMyTopic;
    return matchSearch && matchMine;
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
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-200'
                  : isReviewView
                    ? 'bg-gradient-to-tr from-[#0d2a75] to-[#123891] shadow-blue-200'
                    : isEvaluationView
                      ? 'bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-amber-200'
                      : 'bg-gradient-to-tr from-[#0d2a75] to-[#123891] shadow-blue-200'
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
                    ? 'Danh Sách Đề Tài Khóa Luận Tốt Nghiệp'
                    : isReviewView
                      ? 'Chấm Điểm Phản Biện Khóa Luận (GVPB)'
                      : isEvaluationView
                        ? 'Đánh Giá Khóa Luận Tốt Nghiệp (GVHD - 50%)'
                        : 'Quản Lý Sinh Viên Hướng Dẫn Khóa Luận'}
                </h2>
                {!isTopicsView && (
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      isReviewView
                        ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                        : isEvaluationView
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-[#102d7d] border-blue-200'
                    }`}
                  >
                    {isReviewView
                      ? 'PHẢN BIỆN (GVPB 1: 20% - GVPB 2: 30%)'
                      : isEvaluationView
                        ? 'ĐÁNH GIÁ (50%)'
                        : 'HƯỚNG DẪN (50%)'}
                  </span>
                )}
              </div>
              {!isTopicsView && (
                <p className="text-xs text-slate-500 mt-1">
                  {isReviewView
                    ? 'Chấm điểm độc lập theo phân công Phản biện kín (20%) và Phản biện hội đồng (30%).'
                    : isEvaluationView
                      ? 'Theo dõi và thực hiện đánh giá điểm số hướng dẫn chính (50%) cho sinh viên khóa luận.'
                      : 'Theo dõi danh sách các nhóm sinh viên và đề tài bạn phụ trách hướng dẫn chính trong học kỳ.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isTopicsView && (
              <button
                type="button"
                onClick={() => setCreateTopicModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Dynamic Context Tabs */}
        {!isTopicsView && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
            {/* Tab 1: Supervised (GVHD - 50%) */}
            <button
              type="button"
              onClick={() => setActiveTab('SUPERVISOR')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'SUPERVISOR'
                  ? 'bg-blue-50/80 border-[#123891]/60 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123891] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#123891]" />
                  Đề tài hướng dẫn (50%)
                </span>
                <span className="text-xs font-mono font-extrabold text-[#102d7d] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {stats.supervisedCount}
                </span>
              </div>
            </button>

            {/* Tab 2: Reviewer 1 (PB Kín - 20%) */}
            <button
              type="button"
              onClick={() => setActiveTab('REVIEWER_1')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'REVIEWER_1'
                  ? 'bg-blue-50/80 border-[#123891]/60 ring-2 ring-violet-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123891] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#123891]" />
                  Phản biện kín (20%)
                </span>
                <span className="text-xs font-mono font-extrabold text-[#102d7d] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {stats.reviewer1Count}
                </span>
              </div>
            </button>

            {/* Tab 3: Reviewer 2 (PB Hội đồng - 30%) */}
            <button
              type="button"
              onClick={() => setActiveTab('REVIEWER_2')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                activeTab === 'REVIEWER_2'
                  ? 'bg-blue-50/80 border-[#123891]/60 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123891] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#123891]" />
                  Phản biện hội đồng (30%)
                </span>
                <span className="text-xs font-mono font-extrabold text-[#102d7d] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {stats.reviewer2Count}
                </span>
              </div>
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

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          {isTopicsView && (
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/80 cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={onlyMyApprovedTopics}
                onChange={(e) => setOnlyMyApprovedTopics(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#123891] focus:ring-[#123891] cursor-pointer"
              />
              <span>Chỉ hiện đề tài của tôi</span>
            </label>
          )}
          {!isTopicsView && (
            <div className="text-xs text-slate-500 font-medium">
              Hiển thị <strong>{currentList.length}</strong> đề tài
            </div>
          )}
        </div>
      </div>

      {/* Main Table Area */}
      {isTopicsView ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loadingApprovedTopics ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} cols={7} />
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
                  ? 'Bấm nút "+ Đề xuất đề tài KLTN" ở trên để tạo đề tài mới gửi Trưởng Bộ Môn xét duyệt.'
                  : 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn "Chỉ hiện đề tài của tôi".'}
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
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Số nhóm nhận</th>
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
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold font-mono border ${
                              isLocked
                                ? 'bg-rose-50 text-[#c5221f] border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {currentCount}/{maxCount} nhóm
                          </span>
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
      ) : activeTab === 'REVIEWER_2' ? (
        /* ================= GIAO DIỆN PHẢN BIỆN HỘI ĐỒNG: TÊN PHÒNG + THÔNG TIN + BẢNG ĐỀ TÀI ================= */
        <div className="space-y-4">
          {!activeCouncil ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
              <EmptyState
                title="Chưa có thông tin phòng hội đồng"
                description="Trưởng Bộ Môn chưa thiết lập phòng hội đồng bảo vệ hoặc bạn chưa được phân công vào hội đồng nào trong học kỳ này."
              />
            </div>
          ) : (
            <>
              {/* 1. DÒNG TÊN PHÒNG HỘI ĐỒNG */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-gradient-to-r from-[#0a2368] via-[#0d2a75] to-[#123891] text-white shadow-md border border-blue-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-blue-200 font-semibold uppercase tracking-wider">
                      Phòng Hội Đồng Bảo Vệ Khóa Luận
                    </div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>{activeCouncil.name}</span>
                      {activeCouncil.room && (
                        <span className="text-blue-200 font-mono text-xs font-normal">
                          (Phòng {activeCouncil.room})
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Switch council tabs if lecturer participates in multiple councils */}
                {myCouncils.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-2xl">
                    {myCouncils.map((c) => {
                      const cId = c.id || c._id;
                      const isCur = (activeCouncil.id || activeCouncil._id) === cId;
                      return (
                        <button
                          key={cId}
                          type="button"
                          onClick={() => setSelectedCouncilId(cId)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isCur
                              ? 'bg-white text-[#123891] shadow-sm'
                              : 'text-blue-100 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. KHUNG THÔNG TIN PHÒNG HỘI ĐỒNG */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* 1. Tên hội đồng & Phòng */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                    <div className="text-[11px] font-semibold text-[#102d7d] flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#123891]" />
                      <span>Hội đồng & Phòng bảo vệ</span>
                    </div>
                    <div className="text-sm font-bold text-[#102d7d] mt-1">
                      {activeCouncil.name}
                    </div>
                    <div className="text-xs text-blue-800 font-medium mt-0.5">
                      Địa điểm: <strong>{activeCouncil.room || 'Chưa cập nhật phòng'}</strong>
                    </div>
                  </div>

                  {/* 2. Thời gian bảo vệ */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70">
                    <div className="text-[11px] font-semibold text-[#102d7d] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#123891]" />
                      <span>Thời gian báo cáo</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1 font-mono">
                      {activeCouncil.reportTime ||
                        (activeCouncil.reportStartTime && activeCouncil.reportEndTime
                          ? `${activeCouncil.reportStartTime} - ${activeCouncil.reportEndTime}${activeCouncil.reportDate ? `, ${new Date(activeCouncil.reportDate).toLocaleDateString('vi-VN')}` : ''}`
                          : 'Chưa xếp thời gian')}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Ngày: {activeCouncil.reportDate ? new Date(activeCouncil.reportDate).toLocaleDateString('vi-VN') : 'Theo lịch học kỳ'}
                    </div>
                  </div>

                  {/* 3. Hình thức bảo vệ */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                    <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hình thức bảo vệ</span>
                    </div>
                    <div className="text-sm font-bold text-amber-950 mt-1">
                      {activeCouncil.type === 'POSTER' || activeCouncil.format === 'POSTER'
                        ? 'Báo cáo Poster (POSTER)'
                        : 'Báo cáo Trực tiếp (ORAL)'}
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      {activeCouncil.description || 'Chấm điểm hội đồng theo quy chế KLTN'}
                    </div>
                  </div>
                </div>

                {/* Thành viên hội đồng */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#123891]" />
                    <span>Thành viên Hội đồng chấm bảo vệ:</span>
                  </div>
                  {Array.isArray(activeCouncil.lecturers) && activeCouncil.lecturers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {activeCouncil.lecturers.map((lec, idx) => {
                        const isMe =
                          lec.lecturerId === user?._id ||
                          lec.lecturerId === user?.userId ||
                          lec.userId === user?._id ||
                          (user?.fullName && (lec.name?.trim().toLowerCase() === user.fullName.trim().toLowerCase() || lec.fullName?.trim().toLowerCase() === user.fullName.trim().toLowerCase()));

                        const gradedCount = councilTheses.filter((t) =>
                          Array.isArray(t.scores?.councilLecturerScores) &&
                          t.scores.councilLecturerScores.some(
                            (cls) =>
                              (cls.lecturerId?._id || cls.lecturerId?.toString() || cls.lecturerId) === (lec.lecturerId || lec.userId) ||
                              (lec.name && cls.lecturerName && cls.lecturerName.trim().toLowerCase() === lec.name.trim().toLowerCase())
                          )
                        ).length;

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              isMe
                                ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-400/30'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isMe ? 'bg-[#123891] text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {lec.name || lec.fullName || 'Giảng viên'}
                                  {isMe && (
                                    <span className="ml-1.5 text-[10px] font-extrabold text-[#123891] bg-blue-100 px-1.5 py-0.2 rounded font-sans">
                                      (Bạn)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {lec.role || 'Thành viên hội đồng'}
                                </div>
                              </div>
                            </div>

                            {councilTheses.length > 0 && (
                              <div className="shrink-0 text-right">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  gradedCount === councilTheses.length
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : gradedCount > 0
                                    ? 'bg-blue-50 text-[#123891] border border-blue-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  Đã chấm {gradedCount}/{councilTheses.length}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Chưa có danh sách giảng viên thành viên trong hội đồng này.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. BẢNG ĐỀ TÀI SẼ BÁO CÁO TRONG HỘI ĐỒNG NÀY */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#123891]" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Danh sách Đề tài Báo cáo tại {activeCouncil.name}
                    </h4>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Tổng số: <strong>{councilTheses.length}</strong> đề tài
                  </div>
                </div>

                {councilTheses.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      title="Chưa có đề tài nào được xếp vào hội đồng này"
                      description="Hội đồng này hiện chưa có đề tài KLTN nào được phân công báo cáo hoặc chưa có kết quả tìm kiếm phù hợp."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">STT</th>
                          <th className="py-3.5 px-4 min-w-[220px]">Tên đề tài KLTN</th>
                          <th className="py-3.5 px-4 min-w-[180px]">Sinh viên thực hiện</th>
                          <th className="py-3.5 px-4 min-w-[150px]">GV Hướng dẫn</th>
                          <th className="py-3.5 px-4 min-w-[150px]">GVPB 1 (PB Kín)</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">Điểm GVHD (50%)</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">Điểm PB Kín (20%)</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">
                            Điểm GVHĐ 1
                            {activeCouncil?.lecturers?.[0]?.name && (
                              <span className="block text-[9px] font-normal text-slate-400 truncate max-w-[90px] mx-auto">
                                ({activeCouncil.lecturers[0].name.split(' ').slice(-1)[0]})
                              </span>
                            )}
                          </th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">
                            Điểm GVHĐ 2
                            {activeCouncil?.lecturers?.[1]?.name && (
                              <span className="block text-[9px] font-normal text-slate-400 truncate max-w-[90px] mx-auto">
                                ({activeCouncil.lecturers[1].name.split(' ').slice(-1)[0]})
                              </span>
                            )}
                          </th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">Điểm Hội Đồng (30%)</th>
                          <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {councilTheses.map((item, idx) => {
                          const s = item.scores || {};
                          const scoreHD = s.supervisorScore ?? s.student1SupervisorScore;
                          const scorePB1 = s.reviewer1Score ?? s.student1Reviewer1Score;
                          const scorePB2 = s.reviewer2Score ?? s.student1Reviewer2Score;

                          // Retrieve individual scores of GVHĐ 1 & GVHĐ 2
                          const lec1 = activeCouncil?.lecturers?.[0];
                          const lec2 = activeCouncil?.lecturers?.[1];

                          const scoreEntry1 = (s.councilLecturerScores || []).find(
                            (e) => (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === (lec1?.lecturerId || lec1?.userId) ||
                                   (lec1?.name && e.lecturerName && e.lecturerName.trim().toLowerCase() === lec1.name.trim().toLowerCase())
                          ) || (s.councilLecturerScores || [])[0];

                          const scoreEntry2 = (s.councilLecturerScores || []).find(
                            (e) => (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === (lec2?.lecturerId || lec2?.userId) ||
                                   (lec2?.name && e.lecturerName && e.lecturerName.trim().toLowerCase() === lec2.name.trim().toLowerCase())
                          ) || (s.councilLecturerScores && s.councilLecturerScores.length > 1 ? s.councilLecturerScores[1] : null);

                          const scoreGVHD1 = scoreEntry1 ? (scoreEntry1.score ?? scoreEntry1.student1Score) : null;
                          const scoreGVHD2 = scoreEntry2 && scoreEntry2 !== scoreEntry1 ? (scoreEntry2.score ?? scoreEntry2.student1Score) : (s.councilLecturerScores && s.councilLecturerScores.length > 1 ? s.councilLecturerScores[1].score : null);
                          const hasTwoLecturers = Array.isArray(activeCouncil?.lecturers) && activeCouncil.lecturers.length >= 2;
                          let scoreCouncil = null;
                          // STRICT: Chỉ tính điểm hội đồng khi CẢ 2 GIẢNG VIÊN HỘI ĐỒNG (GVHĐ 1 và GVHĐ 2) ĐÃ CHẤM!
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
                            scoreCouncil = null;
                          }

                          return (
                            <tr key={item._id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4 max-w-sm">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(item)}
                                  className="text-left block group cursor-pointer"
                                  title="Xem chi tiết đề tài"
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
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-900">
                                    {item.studentId?.userId?.fullName}
                                    <span className="text-slate-400 font-mono text-[11px] ml-1">
                                      ({item.studentId?.studentCode})
                                    </span>
                                  </div>
                                  {item.studentCount === 2 && item.secondStudentId && (
                                    <div className="font-semibold text-slate-900">
                                      {item.secondStudentId?.userId?.fullName}
                                      <span className="text-slate-400 font-mono text-[11px] ml-1">
                                        ({item.secondStudentId?.studentCode})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-medium text-slate-800">
                                  {item.supervisorId?.userId?.fullName || '—'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-medium text-slate-800">
                                  {item.reviewer1Id?.userId?.fullName || '—'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                {scoreHD !== null && scoreHD !== undefined ? (
                                  <span className="font-bold text-[#123891] bg-blue-50 px-2 py-0.5 rounded">
                                    {scoreHD}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                {scorePB1 !== null && scorePB1 !== undefined ? (
                                  <span className="font-bold text-[#123891] bg-blue-50 px-2 py-0.5 rounded">
                                    {scorePB1}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              {/* Điểm GVHĐ 1 */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                {scoreGVHD1 !== null && scoreGVHD1 !== undefined ? (
                                  <span className="font-bold text-[#123891] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    {scoreGVHD1}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Điểm GVHĐ 2 */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                {scoreGVHD2 !== null && scoreGVHD2 !== undefined ? (
                                  <span className="font-bold text-[#123891] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    {scoreGVHD2}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Điểm Hội Đồng (30%) - Trung bình cộng của GVHĐ 1 và GVHĐ 2 (chỉ tính khi đủ cả 2 điểm) */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                {scoreCouncil !== null && scoreCouncil !== undefined ? (
                                  <span className="font-bold text-[#123891] bg-blue-100/90 px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs">
                                    {scoreCouncil}
                                  </span>
                                ) : (Array.isArray(activeCouncil?.lecturers) && activeCouncil.lecturers.length >= 2 && (scoreGVHD1 !== null || scoreGVHD2 !== null)) ? (
                                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-medium border border-amber-200" title="Chờ giảng viên còn lại trong hội đồng chấm điểm để tính trung bình">
                                    Chờ GV còn lại
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa chấm</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetail(item)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                                    title="Xem chi tiết"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenGradeBox(item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                                    title="Chấm điểm Hội đồng bảo vệ"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Chấm điểm</span>
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
            </>
          )}
        </div>
      ) : (
        /* ================= BẢNG 9 CỘT THEO YÊU CẦU ================= */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} cols={9} />
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
                    <th className="py-3.5 px-4 min-w-[160px]">GV Hướng Dẫn</th>
                    {/* 5. GVPB 1 */}
                    <th className="py-3.5 px-4 min-w-[160px]">GVPB 1</th>
                    {/* 6. Điểm GVPB 1 */}
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Điểm GVPB 1</th>
                    {/* 7. GVPB 2 */}
                    <th className="py-3.5 px-4 min-w-[160px]">GVPB 2</th>
                    {/* 8. Điểm GVPB 2 */}
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Điểm GVPB 2</th>
                    {/* 9. Thao tác */}
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentList.map((item, index) => {
                    const isSupervisorTab = activeTab === 'SUPERVISOR';
                    const isPendingApproval = isSupervisorTab && item.status === 'PENDING_SUPERVISOR_APPROVAL';

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
                            {item.scores?.finalScore !== null && item.scores?.finalScore !== undefined && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Tổng: {item.scores.finalScore}/10
                              </span>
                            )}
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
                          {item.supervisorId?.lecturerCode && (
                            <span className="text-slate-400 font-mono text-[10px]">
                              Mã GV: {item.supervisorId.lecturerCode}
                            </span>
                          )}
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

                        {/* 6. Điểm GVPB 1 */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {renderReviewer1Score(item)}
                        </td>

                        {/* 7. GVPB 2 */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getReviewer2Display(item) !== 'Chưa phân công' ? (
                            <span className="font-semibold text-slate-800">
                              {getReviewer2Display(item)}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic text-[11px]">Chưa phân công</span>
                          )}
                        </td>

                        {/* 8. Điểm GVPB 2 */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {renderReviewer2Score(item)}
                        </td>

                        {/* 9. Thao tác */}
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
                            {item.status !== 'REJECTED' && !isPendingApproval && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeTab === 'SUPERVISOR') {
                                    navigate(`/lecturer/theses/${item._id}/evaluate`);
                                  } else {
                                    handleOpenGradeBox(item);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                                title="Bấm để nhập điểm và đánh giá đề tài"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Chấm điểm</span>
                              </button>
                            )}

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
                        : 'bg-[#123891] shadow-indigo-200'
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
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {gradeBoxRole === 'REVIEWER1'
                        ? 'GVPB 1 (20%)'
                        : gradeBoxRole === 'REVIEWER2'
                          ? 'GVPB 2 (30%)'
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
            {gradeBoxRole === 'REVIEWER2' && Array.isArray(gradeBoxThesis.scores?.councilLecturerScores) && gradeBoxThesis.scores.councilLecturerScores.length > 0 && (
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
                  * Điểm Hội đồng chung (30%) sẽ tự động tính bằng trung bình cộng điểm của các giảng viên.
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
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:border-[#123891] focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
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
                  className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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

            {/* Lecturers & Evaluation Breakdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Hội Đồng & Kết Quả Đánh Giá
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Supervisor (50%) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#123891] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#123891]" />
                      GVHD (50%)
                    </span>
                    {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV1">
                          SV1: {targetThesis.scores?.student1SupervisorScore ?? '—'}
                        </span>
                        <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV2">
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
                  {targetThesis.supervisorId?.lecturerCode && (
                    <div className="text-[10.5px] text-slate-400 font-mono">
                      Mã GV: {targetThesis.supervisorId.lecturerCode}
                    </div>
                  )}
                </div>

                {/* Reviewer 1 (20%) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#123891] flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#123891]" />
                      GVPB 1 (20%)
                    </span>
                    {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV1">
                          SV1: {targetThesis.scores?.student1Reviewer1Score ?? '—'}
                        </span>
                        <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV2">
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
                    {getReviewer1Display(targetThesis)}
                  </div>
                </div>

                {/* Reviewer 2 (30%) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#123891] flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#123891]" />
                      GVPB 2 (30%)
                    </span>
                    {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV1">
                          SV1: {targetThesis.scores?.student1Reviewer2Score ?? '—'}
                        </span>
                        <span className="text-[#102d7d] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Điểm SV2">
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
                    {getReviewer2Display(targetThesis)}
                  </div>
                </div>
              </div>

              {/* Final Score Banner */}
              {targetThesis.scores?.finalScore !== null && targetThesis.scores?.finalScore !== undefined && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between text-xs gap-2">
                  <span className="font-bold text-emerald-900">Điểm tổng kết khóa luận (Thang 10):</span>
                  {targetThesis.studentCount === 2 && targetThesis.secondStudentId ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[#0d2a75] font-bold font-mono">
                        SV1: {targetThesis.scores?.student1FinalScore ?? targetThesis.scores.finalScore}/10
                      </span>
                      <span className="text-[#0d2a75] font-bold font-mono">
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
                  targetThesis.status !== 'PENDING_TBM_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        if (activeTab === 'SUPERVISOR') {
                          navigate(`/lecturer/theses/${targetThesis._id}/evaluate`);
                        } else {
                          handleOpenGradeBox(targetThesis);
                        }
                      }}
                      className="px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Chấm điểm</span>
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
                  <p className="text-xs text-slate-500">Nhập nhiều đề tài cùng lúc để gửi Trưởng Bộ Môn xét duyệt</p>
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
                  placeholder={`Ví dụ:\nXây dựng hệ thống quản lý thực tập doanh nghiệp,\nXây dựng hệ thống quản lý khóa luận tốt nghiệp,\nỨng dụng Trí tuệ nhân tạo nhận diện biển số xe`}
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống sẽ tự động tách từng dòng hoặc theo dấu phẩy để tạo các đề tài độc lập.
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                    <span>{user?.fullName} ({user?.username})</span>
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
    </div>
  );
};

export default LecturerThesesPage;
