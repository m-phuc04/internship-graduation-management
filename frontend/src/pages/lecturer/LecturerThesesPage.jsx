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
    if (location.search.includes('tab=council')) return 'COUNCIL';
    if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1') || location.search.includes('tab=reviewer2')) return 'REVIEW_BLIND';
    return 'SUPERVISOR';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab); // 'MY_TOPICS', 'SUPERVISOR', 'REVIEW_BLIND', 'COUNCIL'
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
  const [councilsMap, setCouncilsMap] = useState({});
  const [thesisCouncilMap, setThesisCouncilMap] = useState({});
  const [publishedScores, setPublishedScores] = useState({});
  const [selectedCouncilId, setSelectedCouncilId] = useState(null);

  const loadCouncilData = useCallback(() => {
    try {
      const termId = currentTerm?._id || 'default';

      // 1. Load councils with multi-key merge fallback
      let mergedCouncils = [];
      const map = {};

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_councils_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(parsed)) {
              parsed.forEach((c) => {
                const cid = c.id || c._id;
                if (cid && !map[cid]) {
                  map[cid] = c;
                  mergedCouncils.push(c);
                }
              });
            }
          } catch (e) {}
        }
      }

      // Also ensure exact term key is prioritized
      const cKey = `tbm_councils_${termId}`;
      const savedCouncils = localStorage.getItem(cKey);
      if (savedCouncils) {
        try {
          const parsed = JSON.parse(savedCouncils);
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => {
              const cid = c.id || c._id;
              if (cid) {
                map[cid] = c;
                const existingIdx = mergedCouncils.findIndex((mc) => (mc.id || mc._id) === cid);
                if (existingIdx >= 0) {
                  mergedCouncils[existingIdx] = c;
                } else {
                  mergedCouncils.push(c);
                }
              }
            });
          }
        } catch (e) {}
      }

      setCouncils(mergedCouncils);
      setCouncilsMap(map);

      // 2. Load thesis-council mappings with multi-key merge fallback
      let mergedThesisCouncils = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_thesis_councils_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '{}');
            if (parsed && typeof parsed === 'object') {
              mergedThesisCouncils = { ...mergedThesisCouncils, ...parsed };
            }
          } catch (e) {}
        }
      }
      const tcKey = `tbm_thesis_councils_${termId}`;
      const savedThesisCouncils = localStorage.getItem(tcKey);
      if (savedThesisCouncils) {
        try {
          mergedThesisCouncils = { ...mergedThesisCouncils, ...JSON.parse(savedThesisCouncils) };
        } catch (e) {}
      }
      setThesisCouncilMap(mergedThesisCouncils);

      // 3. Load published scores
      let mergedPub = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_published_scores_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '{}');
            if (parsed && typeof parsed === 'object') {
              mergedPub = { ...mergedPub, ...parsed };
            }
          } catch (e) {}
        }
      }
      const psKey = `tbm_published_scores_${termId}`;
      const savedPub = localStorage.getItem(psKey);
      if (savedPub) {
        try {
          mergedPub = { ...mergedPub, ...JSON.parse(savedPub) };
        } catch (e) {}
      }
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

  // Helper to find assigned council (STRICT: only return council if thesis is explicitly assigned)
  const getAssignedCouncil = useCallback((item) => {
    if (!item) return null;

    const possibleItemIds = [
      item._id,
      item.id,
      item.thesisId,
      typeof item.topicId === 'string' ? item.topicId : item.topicId?._id,
    ].filter(Boolean).map(String);

    const sCode1 = item.studentId?.studentCode || item.studentCode;
    const sCode2 = item.secondStudentId?.studentCode;
    const sId1 = item.studentId?._id || item.studentId?.id;
    const sId2 = item.secondStudentId?._id || item.secondStudentId?.id;
    const sName1 = (item.studentId?.userId?.fullName || item.studentId?.fullName || '').trim().toLowerCase();
    const title = (item.thesisTitle || '').trim().toLowerCase();

    // 1. Gather all councils from localStorage & state
    let allCouncils = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_councils_')) {
          const parsed = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => {
              const cid = c.id || c._id;
              if (cid && !allCouncils.some((ac) => (ac.id || ac._id) === cid)) {
                allCouncils.push(c);
              }
            });
          }
        }
      }
    } catch (e) {}

    if (Array.isArray(councils)) {
      councils.forEach((c) => {
        const cid = c.id || c._id;
        if (cid && !allCouncils.some((ac) => (ac.id || ac._id) === cid)) {
          allCouncils.push(c);
        }
      });
    }

    // 2. Gather all thesis-council mappings from localStorage & state
    let allThesisCouncils = { ...thesisCouncilMap };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_thesis_councils_')) {
          const parsed = JSON.parse(localStorage.getItem(k) || '{}');
          if (parsed && typeof parsed === 'object') {
            allThesisCouncils = { ...allThesisCouncils, ...parsed };
          }
        }
      }
    } catch (e) {}

    // 3. Find councilId
    let councilId = null;
    for (const tid of possibleItemIds) {
      if (allThesisCouncils[tid]) {
        councilId = allThesisCouncils[tid];
        break;
      }
    }

    if (!councilId) {
      councilId = item.councilId || (item.council?._id || item.council?.id);
    }

    if (!councilId) {
      for (const [key, val] of Object.entries(allThesisCouncils)) {
        if (sCode1 && String(key) === String(sCode1)) { councilId = val; break; }
        if (sCode2 && String(key) === String(sCode2)) { councilId = val; break; }
        if (sId1 && String(key) === String(sId1)) { councilId = val; break; }
        if (sId2 && String(key) === String(sId2)) { councilId = val; break; }
        if (title && String(key).toLowerCase() === title) { councilId = val; break; }
      }
    }

    // If still not explicitly mapped, check if thesis is assigned to a council where user or reviewers match or council index
    if (!councilId || councilId === 'default_council') return null;

    // 4. Resolve council object
    const found = allCouncils.find((c) => 
      (c.id && String(c.id) === String(councilId)) || 
      (c._id && String(c._id) === String(councilId)) ||
      (c.name && String(c.name).toLowerCase() === String(councilId).toLowerCase()) ||
      (c.name && String(c.name).replace(/\s+/g, '').toLowerCase() === String(councilId).replace(/\s+/g, '').toLowerCase())
    );

    if (found) return found;

    if (typeof councilId === 'string' && councilId.toLowerCase().includes('hội đồng')) {
      return {
        id: councilId,
        name: councilId,
        room: '',
      };
    }

    return null;
  }, [councils, thesisCouncilMap]);

  const cleanTitle = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/(ths\.|ts\.|pgs\.ts\.|gs\.ts\.|thạc sĩ|tiến sĩ|giáo sư|pgs\.|gs\.)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Helper to check if logged-in lecturer is in a council
  const isLecturerInCouncil = useCallback(
    (council) => {
      if (!council || !Array.isArray(council.lecturers) || council.lecturers.length === 0) return false;
      const myIds = [user?._id, user?.userId, user?.lecturerId, data?.lecturer?._id]
        .filter(Boolean)
        .map((id) => String(id).trim());
      const rawMyName = user?.fullName || user?.name || data?.lecturer?.fullName || '';
      const myName = cleanTitle(rawMyName);
      const myEmail = (user?.email || data?.lecturer?.email || '').trim().toLowerCase();
      const myCode = (user?.lecturerCode || user?.code || data?.lecturer?.lecturerCode || '').trim().toLowerCase();

      return council.lecturers.some((l) => {
        if (!l) return false;
        if (typeof l === 'string') {
          return myIds.includes(l.trim()) || (myCode && l.trim().toLowerCase() === myCode);
        }
        const lIds = [
          l.lecturerId?._id || l.lecturerId?.id || l.lecturerId,
          l.userId?._id || l.userId?.id || l.userId,
          l.id,
          l._id,
        ]
          .filter(Boolean)
          .map((id) => String(id).trim());

        const matchesId = lIds.some((id) => myIds.includes(id));
        if (matchesId) return true;

        const rawLName = l.fullName || l.name || '';
        const lName = cleanTitle(rawLName);
        if (myName && lName && (myName === lName || lName.includes(myName) || myName.includes(lName))) return true;

        const lEmail = (l.email || '').trim().toLowerCase();
        if (myEmail && lEmail && myEmail === lEmail) return true;

        const lCode = (l.lecturerCode || l.code || '').trim().toLowerCase();
        if (myCode && lCode && myCode === lCode) return true;

        return false;
      });
    },
    [user, data?.lecturer]
  );

  // Computations for Council Rooms - Aggregate all councils across all sources
  const allAvailableCouncils = useMemo(() => {
    let list = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_councils_')) {
          const parsed = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => {
              const cid = c.id || c._id;
              if (cid && !list.some((ac) => (ac.id || ac._id) === cid)) {
                list.push(c);
              }
            });
          }
        }
      }
    } catch (e) {}

    if (Array.isArray(councils)) {
      councils.forEach((c) => {
        const cid = c.id || c._id;
        if (cid && !list.some((ac) => (ac.id || ac._id) === cid)) {
          list.push(c);
        }
      });
    }
    return list;
  }, [councils]);

  // STRICT: Only councils containing this lecturer
  const myCouncils = useMemo(() => {
    if (!allAvailableCouncils || allAvailableCouncils.length === 0) return [];
    return allAvailableCouncils.filter((c) => isLecturerInCouncil(c));
  }, [allAvailableCouncils, isLecturerInCouncil]);

  const activeCouncil = useMemo(() => {
    if (myCouncils.length === 0) return null;
    if (selectedCouncilId) {
      const found = myCouncils.find((c) => (c.id || c._id) === selectedCouncilId || String(c.id || c._id) === String(selectedCouncilId));
      if (found) return found;
    }
    return myCouncils[0];
  }, [myCouncils, selectedCouncilId]);

  const councilTheses = useMemo(() => {
    const allThesesPool = [
      ...(data?.allTheses || []),
      ...(data?.theses || []),
      ...(data?.reviewer2Theses || []),
      ...(data?.reviewer1Theses || []),
      ...(data?.supervisedTheses || []),
    ];
    // Deduplicate
    const uniqueTheses = [];
    const seenIds = new Set();
    allThesesPool.forEach((t) => {
      const tid = t._id || t.id;
      if (tid && !seenIds.has(String(tid))) {
        seenIds.add(String(tid));
        uniqueTheses.push(t);
      }
    });

    const targetCouncil = activeCouncil || (myCouncils.length > 0 ? myCouncils[0] : null);
    if (!targetCouncil) return [];

    const cId = String(targetCouncil.id || targetCouncil._id || '');
    const cName = (targetCouncil.name || '').trim().toLowerCase();

    // Gather all thesis-council mappings from all localStorage keys
    let allThesisCouncils = { ...thesisCouncilMap };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_thesis_councils_')) {
          const parsed = JSON.parse(localStorage.getItem(k) || '{}');
          if (parsed && typeof parsed === 'object') {
            allThesisCouncils = { ...allThesisCouncils, ...parsed };
          }
        }
      }
    } catch (e) {}

    let list = uniqueTheses.filter((t) => {
      const tIds = [t._id, t.id, t.thesisId, t.topicId?._id, t.topicId].filter(Boolean).map(String);
      const sCode1 = t.studentId?.studentCode || t.studentCode;
      const sCode2 = t.secondStudentId?.studentCode;
      const sId1 = t.studentId?._id || t.studentId?.id;
      const sId2 = t.secondStudentId?._id || t.secondStudentId?.id;
      const title = (t.thesisTitle || '').trim().toLowerCase();

      let mappedCouncilId = null;
      for (const tid of tIds) {
        if (allThesisCouncils[tid]) {
          mappedCouncilId = allThesisCouncils[tid];
          break;
        }
      }

      if (!mappedCouncilId) {
        mappedCouncilId = t.councilId || (t.council?._id || t.council?.id);
      }

      if (!mappedCouncilId) {
        for (const [key, val] of Object.entries(allThesisCouncils)) {
          if (sCode1 && String(key) === String(sCode1)) { mappedCouncilId = val; break; }
          if (sCode2 && String(key) === String(sCode2)) { mappedCouncilId = val; break; }
          if (sId1 && String(key) === String(sId1)) { mappedCouncilId = val; break; }
          if (sId2 && String(key) === String(sId2)) { mappedCouncilId = val; break; }
          if (title && String(key).toLowerCase() === title) { mappedCouncilId = val; break; }
        }
      }

      if (!mappedCouncilId) return false;

      const mappedStr = String(mappedCouncilId);
      return (
        mappedStr === cId ||
        mappedStr.toLowerCase() === cName ||
        mappedStr.replace(/\s+/g, '').toLowerCase() === cName.replace(/\s+/g, '')
      );
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
          t.reviewer1Id?.userId?.fullName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCouncil, myCouncils, data, thesisCouncilMap, search]);

  const effectiveActiveCouncil = useMemo(() => {
    if (activeCouncil) return activeCouncil;
    if (myCouncils.length > 0) return myCouncils[0];
    return null;
  }, [activeCouncil, myCouncils]);

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
  }

  // Open Grade Box Modal
  const handleOpenGradeBox = (thesis, targetRole = null) => {
    if (activeTab === 'SUPERVISOR' && !targetRole) {
      navigate(`/lecturer/theses/${thesis._id}/evaluate`);
      return;
    }
    setGradeBoxThesis(thesis);
    const role =
      targetRole ||
      (activeTab === 'REVIEWER_1' || activeTab === 'REVIEW_BLIND'
        ? 'REVIEWER1'
        : activeTab === 'COUNCIL'
          ? 'COUNCIL'
          : activeTab === 'REVIEWER_2'
            ? 'REVIEWER2'
            : 'SUPERVISOR');
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
        ? thesis.scores.councilLecturerScores.find(
            (e) =>
              (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === (user?._id || user?.userId) ||
              (e.lecturerName && user?.fullName && e.lecturerName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
          )
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
    if (item.reviewer1Id) {
      const title = item.reviewer1Id.academicTitle ? `${item.reviewer1Id.academicTitle} ` : '';
      return `${title}${item.reviewer1Id.userId?.fullName || item.reviewer1Id.fullName || 'Giảng viên'}`;
    }
    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      const priv = item.reviewers.find((r) => r.isPrivateReviewer && r.lecturerId);
      if (priv) {
        const lec = priv.lecturerId;
        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
        return `${title}${lec.userId?.fullName || lec.fullName || 'Giảng viên'}`;
      }
    }
    return 'Chưa phân công';
  };

  // Reviewer 2 Display Name
  const getReviewer2Display = (item) => {
    if (!item) return 'Chưa phân công';
    if (item.reviewer2Id) {
      const title = item.reviewer2Id.academicTitle ? `${item.reviewer2Id.academicTitle} ` : '';
      return `${title}${item.reviewer2Id.userId?.fullName || item.reviewer2Id.fullName || 'Giảng viên'}`;
    }
    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      const coun = item.reviewers.find((r) => r.isCouncilReviewer && r.lecturerId);
      if (coun) {
        const lec = coun.lecturerId;
        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
        return `${title}${lec.userId?.fullName || lec.fullName || 'Giảng viên'}`;
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
    const otherLec = Array.isArray(council?.lecturers) ? council.lecturers[lecIndex === 0 ? 1 : 0] : null;

    const councilScores = Array.isArray(item.scores?.councilLecturerScores)
      ? item.scores.councilLecturerScores.filter((e) => e && (e.score !== null || e.student1Score !== null || e.student2Score !== null))
      : [];

    let entry = null;

    if (targetLec) {
      const targetLecId = (
        targetLec.lecturerId?._id ||
        targetLec.lecturerId ||
        targetLec.userId?._id ||
        targetLec.userId ||
        targetLec._id
      )?.toString();
      const rawName = (targetLec.name || targetLec.fullName || '').toLowerCase().replace(/^(ths\.|ts\.|pgs\.ts\.|gs\.ts\.|thạc sĩ|tiến sĩ)\s+/i, '').trim();

      // Tìm bài chấm khớp chính xác targetLec
      entry = councilScores.find((e) => {
        const eId = (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId)?.toString();
        if (targetLecId && eId && eId === targetLecId) return true;
        const eName = (e.lecturerName || '').toLowerCase().replace(/^(ths\.|ts\.|pgs\.ts\.|gs\.ts\.|thạc sĩ|tiến sĩ)\s+/i, '').trim();
        if (rawName && eName && (rawName === eName || rawName.includes(eName) || eName.includes(rawName))) return true;
        return false;
      });
    }

    // Fallback: nếu không tìm thấy bằng ID/tên, lấy theo vị trí mảng nhưng đảm bảo không lấy nhầm bài chấm của GV còn lại
    if (!entry && councilScores.length > lecIndex) {
      const candidate = councilScores[lecIndex];
      if (otherLec) {
        const otherLecId = (
          otherLec.lecturerId?._id ||
          otherLec.lecturerId ||
          otherLec.userId?._id ||
          otherLec.userId ||
          otherLec._id
        )?.toString();
        const otherRawName = (otherLec.name || otherLec.fullName || '').toLowerCase().replace(/^(ths\.|ts\.|pgs\.ts\.|gs\.ts\.|thạc sĩ|tiến sĩ)\s+/i, '').trim();
        const candId = (candidate.lecturerId?._id || candidate.lecturerId?.toString() || candidate.lecturerId)?.toString();
        const candName = (candidate.lecturerName || '').toLowerCase().replace(/^(ths\.|ts\.|pgs\.ts\.|gs\.ts\.|thạc sĩ|tiến sĩ)\s+/i, '').trim();

        const belongsToOther = (otherLecId && candId && otherLecId === candId) ||
          (otherRawName && candName && (otherRawName === candName || otherRawName.includes(candName) || candName.includes(otherRawName)));

        if (!belongsToOther) {
          entry = candidate;
        }
      } else {
        entry = candidate;
      }
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
    } else {
      // Fallback: Nếu GVHĐ 2 đã chấm qua role GVPB 2
      if (lecIndex === 1 && (item.scores?.student1Reviewer2Score !== null && item.scores?.student1Reviewer2Score !== undefined || item.scores?.reviewer2Score !== null && item.scores?.reviewer2Score !== undefined)) {
        s1 = item.scores.student1Reviewer2Score !== null && item.scores.student1Reviewer2Score !== undefined ? Number(item.scores.student1Reviewer2Score) : Number(item.scores.reviewer2Score);
        s2 = item.scores.student2Reviewer2Score !== null && item.scores.student2Reviewer2Score !== undefined ? Number(item.scores.student2Reviewer2Score) : null;
      }
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
      ? item.scores.councilLecturerScores.find(
          (e) =>
            (e.lecturerId?._id || e.lecturerId?.toString() || e.lecturerId) === (user?._id || user?.userId) ||
            (e.lecturerName && user?.fullName && e.lecturerName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
        )
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
                        ? 'Chấm Điểm Phản Biện Hội Đồng (30%)'
                        : 'Chấm Điểm Phản Biện Khóa Luận (GVPB)'
                      : isEvaluationView
                        ? 'Đánh Giá Khóa Luận Tốt Nghiệp (GVHD - 50%)'
                        : 'Đề tài hướng dẫn'}
                </h2>
                {!isTopicsView && (
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      isReviewView
                        ? isCouncilTab
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-blue-50 text-[#102d7d] border-blue-200'
                        : isEvaluationView
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-[#102d7d] border-blue-200'
                    }`}
                  >
                    {isReviewView
                      ? isCouncilTab
                        ? 'PHẢN BIỆN HỘI ĐỒNG (30%)'
                        : 'PHẢN BIỆN KÍN (GVPB 1 & GVPB 2)'
                      : isEvaluationView
                        ? 'ĐÁNH GIÁ (50%)'
                        : 'HƯỚNG DẪN (50%)'}
                  </span>
                )}
              </div>
              {!isTopicsView && (isReviewView || isEvaluationView) && (
                <p className="text-xs text-slate-500 mt-1">
                  {isReviewView
                    ? isCouncilTab
                      ? 'Đánh giá và chấm điểm trực tiếp cho sinh viên báo cáo trước Hội đồng bảo vệ Khóa luận tốt nghiệp (trọng số 30%).'
                      : 'Chấm điểm độc lập theo phân công Giảng viên phản biện 1 và Giảng viên phản biện 2. Điểm phản biện kín là điểm trung bình cộng của cả 2 GVPB.'
                    : 'Theo dõi và thực hiện đánh giá điểm số hướng dẫn chính (50%) cho sinh viên khóa luận.'}
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
      ) : isReviewView ? (
        isCouncilTab ? (
          myCouncils.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-12 text-center space-y-3">
              <Award className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700">
                Bạn chưa được phân công vào hội đồng nào
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Hiện tại bạn chưa có lịch tham gia hội đồng chấm phản biện khóa luận tốt nghiệp trong học kỳ này.
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
              <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border border-blue-200/80 shadow-2xs space-y-3">
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
                      const isMe =
                        (lec.userId && (lec.userId === user?._id || lec.userId === user?.userId)) ||
                        (lec.lecturerId && (lec.lecturerId === user?._id || lec.lecturerId === user?.userId || lec.lecturerId === data?.lecturer?._id)) ||
                        (lec._id && (lec._id === user?._id || lec._id === data?.lecturer?._id)) ||
                        (lec.name && user?.fullName && lec.name.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
                        (lec.fullName && user?.fullName && lec.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase());
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
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/90 to-blue-50/40 border-b border-indigo-100/80 flex items-center justify-between">
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
                <span className="px-3 py-1 rounded-full bg-white text-[#102d7d] font-bold text-xs font-mono border border-indigo-200 shadow-2xs">
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

                  const isLec1Me = lec1 && (
                    (lec1.userId && (lec1.userId === user?._id || lec1.userId === user?.userId)) ||
                    (lec1.lecturerId && (lec1.lecturerId === user?._id || lec1.lecturerId === user?.userId || lec1.lecturerId === data?.lecturer?._id)) ||
                    (lec1._id && (lec1._id === user?._id || lec1._id === data?.lecturer?._id)) ||
                    (lec1.name && user?.fullName && lec1.name.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
                    (lec1.fullName && user?.fullName && lec1.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
                  );

                  const isLec2Me = lec2 && (
                    (lec2.userId && (lec2.userId === user?._id || lec2.userId === user?.userId)) ||
                    (lec2.lecturerId && (lec2.lecturerId === user?._id || lec2.lecturerId === user?.userId || lec2.lecturerId === data?.lecturer?._id)) ||
                    (lec2._id && (lec2._id === user?._id || lec2._id === data?.lecturer?._id)) ||
                    (lec2.name && user?.fullName && lec2.name.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
                    (lec2.fullName && user?.fullName && lec2.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
                  );

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
                            <th className={`py-3.5 px-4 text-center whitespace-nowrap min-w-[120px] ${isLec1Me ? 'bg-indigo-50/70 text-[#102d7d]' : ''}`}>
                              <div>Điểm GVHĐ 1</div>
                              {(lec1?.name || lec1?.fullName) && (
                                <div className="text-[9px] font-normal normal-case opacity-80 truncate max-w-[110px] mx-auto">
                                  {lec1.name || lec1.fullName} {isLec1Me && <span className="font-bold text-[#123891]">(Bạn)</span>}
                                </div>
                              )}
                            </th>
                            <th className={`py-3.5 px-4 text-center whitespace-nowrap min-w-[120px] ${isLec2Me ? 'bg-indigo-50/70 text-[#102d7d]' : ''}`}>
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
                                  {item.supervisorId?.lecturerCode && (
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      Mã GV: {item.supervisorId.lecturerCode}
                                    </span>
                                  )}
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
                                <td className={`py-3.5 px-4 whitespace-nowrap text-center ${isLec1Me ? 'bg-indigo-50/30 font-bold' : ''}`}>
                                  {renderCouncilLecturerScore(item, 0)}
                                </td>
                                <td className={`py-3.5 px-4 whitespace-nowrap text-center ${isLec2Me ? 'bg-indigo-50/30 font-bold' : ''}`}>
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
                                    {item.status !== 'REJECTED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenGradeBox(item, 'COUNCIL')}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                                        title="Chấm điểm Hội đồng"
                                      >
                                        <Award className="w-3.5 h-3.5" />
                                        <span>Chấm điểm</span>
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
                  );
                })()
              )}
            </div>
          </div>
          )
        ) : (
          <div className="space-y-8">
            {/* ========================================================================= */}
            {/* BẢNG 1: ĐỀ TÀI GIẢNG VIÊN PHẢN BIỆN 1 (GVPB 1) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/40 border-b border-blue-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Đề tài Giảng viên Phản biện 1 (GVPB 1)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Danh sách các đề tài bạn được phân công làm Giảng viên phản biện 1
                    </p>
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
                              {item.supervisorId?.lecturerCode && (
                                <span className="text-slate-400 font-mono text-[10px]">
                                  Mã GV: {item.supervisorId.lecturerCode}
                                </span>
                              )}
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
                                {item.status !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenGradeBox(item, 'REVIEWER1')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                                    title="Chấm điểm Giảng viên phản biện 1"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Chấm điểm</span>
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
              )}
            </div>

            {/* ========================================================================= */}
            {/* BẢNG 2: ĐỀ TÀI GIẢNG VIÊN PHẢN BIỆN 2 (GVPB 2) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/40 border-b border-blue-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Đề tài Giảng viên Phản biện 2 (GVPB 2)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Danh sách các đề tài bạn được phân công làm Giảng viên phản biện 2
                    </p>
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
                              {item.supervisorId?.lecturerCode && (
                                <span className="text-slate-400 font-mono text-[10px]">
                                  Mã GV: {item.supervisorId.lecturerCode}
                                </span>
                              )}
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
                                {item.status !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenGradeBox(item, 'REVIEWER2')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                                    title="Chấm điểm Giảng viên phản biện 2"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Chấm điểm</span>
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
                            <div className="space-y-0.5">
                              <strong className="text-slate-900 block font-bold text-xs">
                                {(assignedCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}
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
                        : gradeBoxRole === 'COUNCIL'
                          ? 'bg-indigo-600 shadow-indigo-200'
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
                            : gradeBoxRole === 'COUNCIL'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {gradeBoxRole === 'REVIEWER1'
                        ? 'GVPB 1 (20%)'
                        : gradeBoxRole === 'REVIEWER2'
                          ? 'GVPB 2 (20%)'
                          : gradeBoxRole === 'COUNCIL'
                            ? 'HỘI ĐỒNG (30%)'
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
