import React, { useState, useEffect, useCallback } from 'react';
import thesisApi from '../../api/thesisApi';
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
} from 'lucide-react';

const TbmThesisManagement = () => {
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();

  // Tab State: 'PROPOSED_TOPICS' | 'STUDENT_THESES'
  const [activeMainTab, setActiveMainTab] = useState('PROPOSED_TOPICS');
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================
  // TAB 1: PROPOSED TOPICS (GV ĐỀ XUẤT)
  // ==========================================
  const [proposedTopics, setProposedTopics] = useState([]);
  const [loadingProposedTopics, setLoadingProposedTopics] = useState(false);
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL');
  const [topicSearch, setTopicSearch] = useState('');
  const [topicViewMode, setTopicViewMode] = useState('BY_LECTURER'); // 'BY_LECTURER' | 'TABLE'
  const [expandedLecturers, setExpandedLecturers] = useState(new Set());
  const [rejectTopicModalOpen, setRejectTopicModalOpen] = useState(false);
  const [targetTopic, setTargetTopic] = useState(null);
  const [topicRejectReason, setTopicRejectReason] = useState('');
  const [topicDetailModalOpen, setTopicDetailModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

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
    if (activeMainTab === 'PROPOSED_TOPICS') {
      fetchProposedTopics();
    }
  }, [activeMainTab, fetchProposedTopics]);

  // Group topics by Lecturer
  const groupedByLecturer = React.useMemo(() => {
    const map = new Map();
    for (const topic of proposedTopics) {
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
          topics: [],
        });
      }
      map.get(lecId).topics.push(topic);
    }
    return Array.from(map.values());
  }, [proposedTopics]);

  // Helper to format lecturer display title nicely (prevent duplicate "TS. TS.")
  const formatLecturerDisplay = (title, name) => {
    if (!name) return '—';
    const trimmedName = name.trim();
    if (!title) return trimmedName;
    const trimmedTitle = title.trim();
    if (trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase())) {
      return trimmedName;
    }
    return `${trimmedTitle} ${trimmedName}`;
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
    if (activeMainTab === 'STUDENT_THESES') {
      fetchTheses();
    }
  }, [activeMainTab, fetchTheses]);

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
    if (!currentTerm?.thesis?.registrationStart && !currentTerm?.thesis?.registrationEnd) {
      return { text: 'Mở tự do', color: 'bg-slate-100 text-slate-700' };
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = currentTerm?.thesis?.registrationStart ? new Date(currentTerm.thesis.registrationStart) : null;
    const end = currentTerm?.thesis?.registrationEnd ? new Date(currentTerm.thesis.registrationEnd) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && now < start) {
      return { text: 'Sắp mở', color: 'bg-amber-100 text-amber-800' };
    }
    if (end && now > end) {
      return { text: 'Đã đóng', color: 'bg-rose-100 text-rose-800' };
    }
    return { text: 'Đang mở', color: 'bg-emerald-100 text-emerald-800' };
  };

  const windowBadge = getThesisWindowBadge();

  // Topic Status Badge Renderer
  const renderTopicBadge = (st) => {
    switch (st) {
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Đã duyệt (APPROVED)</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Đã từ chối (REJECTED)</span>;
      case 'PENDING':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Chờ duyệt (PENDING)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Quản lý Khóa luận Tốt nghiệp (KLTN)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Phê duyệt danh sách đề tài GV đề xuất, quản lý sinh viên đăng ký đề tài & phân công Hội đồng Phản biện
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Configure KLTN Timeline Button */}
            <button
              type="button"
              onClick={() => setTimelineModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition cursor-pointer shadow-2xs"
              title="Cấu hình thời gian mở cổng đăng ký, phân công & bảo vệ KLTN"
            >
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Thời gian mở KLTN</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${windowBadge.color}`}>
                {windowBadge.text}
              </span>
            </button>

            <button
              onClick={() => (activeMainTab === 'PROPOSED_TOPICS' ? fetchProposedTopics() : fetchTheses())}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || loadingProposedTopics) ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
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
                ? 'bg-[#0B4DB7] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Duyệt đề tài GV đề xuất (KLTN)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeMainTab === 'PROPOSED_TOPICS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {proposedTopics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('STUDENT_THESES')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'STUDENT_THESES'
                ? 'bg-[#0B4DB7] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Quản lý Khóa luận SV & Phân công Phản biện</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeMainTab === 'STUDENT_THESES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {stats.total}
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
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-96">
              <SearchInput
                value={topicSearch}
                onChange={(val) => setTopicSearch(val)}
                placeholder="Tìm tên đề tài, mô tả, GVHD, mã GV, tên SV..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {/* View Mode Toggle */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setTopicViewMode('BY_LECTURER')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    topicViewMode === 'BY_LECTURER'
                      ? 'bg-white text-indigo-700 shadow-xs'
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
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Dạng bảng phẳng</span>
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={topicStatusFilter}
                  onChange={(e) => setTopicStatusFilter(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ duyệt (PENDING)</option>
                  <option value="APPROVED">Đã duyệt (APPROVED)</option>
                  <option value="REJECTED">Đã từ chối (REJECTED)</option>
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
                        className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/90 to-indigo-50/30 border-b border-slate-100 hover:bg-slate-100/60 transition cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                            {group.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                                {formatLecturerDisplay(group.academicTitle, group.fullName)}
                              </h3>
                              <span className="text-[11px] font-extrabold font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
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
                            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-indigo-600' : ''
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
                                <th className="py-3 px-4 text-center whitespace-nowrap">Số nhóm nhận</th>
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

                                    <td className="py-3.5 px-4">
                                      <div className="font-bold text-slate-900 leading-snug">
                                        {topic.title}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Ngày gửi: {formatDate(topic.createdAt)}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                        {currentCount} / {maxCount} nhóm
                                      </span>
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
                                                <span className="font-bold text-indigo-700">
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
                                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
                        <th className="py-3.5 px-4 text-center">Số nhóm</th>
                        <th className="py-3.5 px-4">Mô tả / Yêu cầu</th>
                        <th className="py-3.5 px-4">Nhóm SV đăng ký (FIFO)</th>
                        <th className="py-3.5 px-4">Trạng thái</th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proposedTopics.map((topic, idx) => {
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
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {formatLecturerDisplay(topic.supervisorId?.academicTitle, topic.supervisorId?.userId?.fullName)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Mã GV: {topic.supervisorId?.lecturerCode || '—'}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                {currentCount} / {maxCount} nhóm
                              </span>
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
                                      <span className="font-bold text-indigo-700">N{g.groupOrder}:</span>{' '}
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
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
      {/* TAB 2: QUẢN LÝ KHÓA LUẬN SV & PHÂN CÔNG PHẢN BIỆN */}
      {/* ========================================================================= */}
      {activeMainTab === 'STUDENT_THESES' && (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div
                onClick={() => { setStatus('ALL'); setPage(1); }}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  status === 'ALL'
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-[11px] text-slate-500 font-medium">Tổng số đề tài</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{stats.total}</div>
              </div>

              <div
                onClick={() => { setStatus('PENDING_TBM_APPROVAL'); setPage(1); }}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  status === 'PENDING_TBM_APPROVAL'
                    ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-[11px] text-amber-700 font-medium">Chờ TBM duyệt</div>
                <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{stats.pendingCount}</div>
              </div>

              <div
                onClick={() => { setStatus('APPROVED'); setPage(1); }}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  status === 'APPROVED'
                    ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-[11px] text-emerald-700 font-medium">Đã duyệt đề tài</div>
                <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{stats.approvedCount}</div>
              </div>

              <div
                onClick={() => { setStatus('ASSIGNED_REVIEWERS'); setPage(1); }}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  status === 'ASSIGNED_REVIEWERS'
                    ? 'bg-violet-50/80 border-violet-300 ring-2 ring-violet-500/20'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-[11px] text-violet-700 font-medium">Đã gán 2 Phản biện</div>
                <div className="text-lg font-bold text-violet-700 font-mono mt-0.5">{stats.assignedReviewersCount}</div>
              </div>

              <div
                onClick={() => { setStatus('IN_PROGRESS'); setPage(1); }}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  status === 'IN_PROGRESS'
                    ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-[11px] text-blue-700 font-medium">Đang thực hiện</div>
                <div className="text-lg font-bold text-blue-700 font-mono mt-0.5">{stats.inProgressCount}</div>
              </div>

              <div
                onClick={() => { setStatus('GRADED'); setPage(1); }}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  status === 'GRADED'
                    ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-[11px] text-purple-700 font-medium">Đã chấm điểm</div>
                <div className="text-lg font-bold text-purple-700 font-mono mt-0.5">{stats.gradedCount}</div>
              </div>
            </div>
          </div>

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
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
            ) : theses.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Không tìm thấy đề tài khóa luận nào"
                  description="Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc trạng thái."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">STT</th>
                      <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                      <th className="py-3.5 px-4">Sinh viên thực hiện</th>
                      <th className="py-3.5 px-4">GV Hướng Dẫn (GVHD)</th>
                      <th className="py-3.5 px-4">Hội đồng Phản biện (1 & 2)</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4">Ngày tạo</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {theses.map((item, idx) => {
                      const isPending = item.status === 'PENDING_TBM_APPROVAL';
                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-slate-50/80 transition"
                        >
                          {/* STT */}
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                            {(page - 1) * limit + idx + 1}
                          </td>

                          {/* Thesis Title */}
                          <td className="py-3.5 px-4 min-w-[260px] max-w-sm" title={item.thesisTitle}>
                            <div
                              onClick={() => {
                                setSelectedThesis(item);
                                setDetailModalOpen(true);
                              }}
                              className="font-bold text-slate-900 line-clamp-2 leading-snug hover:text-indigo-600 cursor-pointer transition"
                            >
                              {item.thesisTitle}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-1">
                              {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                            </span>
                          </td>

                          {/* Students */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                <strong className="text-slate-900">{item.studentId?.userId?.fullName}</strong>
                                <span className="text-[10px] font-mono text-slate-500">({item.studentId?.studentCode})</span>
                              </div>

                              {item.studentCount === 2 && item.secondStudentId && (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                                  <strong className="text-slate-900">{item.secondStudentId?.userId?.fullName}</strong>
                                  <span className="text-[10px] font-mono text-slate-500">({item.secondStudentId?.studentCode})</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Supervisor */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">
                              {item.supervisorId?.academicTitle} {item.supervisorId?.userId?.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.supervisorId?.lecturerCode} • {item.supervisorId?.specialization}
                            </div>
                          </td>

                          {/* Reviewers */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                <span className="text-violet-700 font-semibold">PB KÍN: </span>
                                {(() => {
                                  let names = [];
                                  if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                                    names = item.reviewers
                                      .filter((r) => r.isPrivateReviewer && r.lecturerId)
                                      .map((r) => {
                                        const lec = r.lecturerId;
                                        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                                        return `${title}${lec.userId?.fullName || 'Giảng viên'}`;
                                      });
                                  }
                                  if (names.length === 0 && item.reviewer1Id) {
                                    const title = item.reviewer1Id.academicTitle ? `${item.reviewer1Id.academicTitle} ` : '';
                                    names = [`${title}${item.reviewer1Id.userId?.fullName || 'Giảng viên'}`];
                                  }

                                  return names.length > 0 ? (
                                    <span className="font-semibold text-slate-800" title={names.join(', ')}>
                                      {names.join(', ')}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 italic">Chưa có</span>
                                  );
                                })()}
                              </div>
                              <div>
                                <span className="text-amber-700 font-semibold">PB HỘI ĐỒNG: </span>
                                {(() => {
                                  let names = [];
                                  if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                                    names = item.reviewers
                                      .filter((r) => r.isCouncilReviewer && r.lecturerId)
                                      .map((r) => {
                                        const lec = r.lecturerId;
                                        const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                                        return `${title}${lec.userId?.fullName || 'Giảng viên'}`;
                                      });
                                  }
                                  if (names.length === 0 && item.reviewer2Id) {
                                    const title = item.reviewer2Id.academicTitle ? `${item.reviewer2Id.academicTitle} ` : '';
                                    names = [`${title}${item.reviewer2Id.userId?.fullName || 'Giảng viên'}`];
                                  }

                                  return names.length > 0 ? (
                                    <span className="font-semibold text-slate-800" title={names.join(', ')}>
                                      {names.join(', ')}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 italic">Chưa có</span>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={item.status} size="sm" />
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formatDate(item.createdAt)}
                          </td>

                          {/* Actions */}
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
                                    className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition cursor-pointer"
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
            {!loading && theses.length > 0 && (
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0">
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
                  <span className="text-slate-500">Số lượng nhóm:</span>
                  <div className="font-bold text-blue-700 font-mono">
                    {selectedTopic.currentGroups || selectedTopic.registeredGroups?.length || 0} / {selectedTopic.maxGroups} nhóm
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
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-0.5 text-[11px]">
                          <div className="font-bold text-indigo-950 flex items-center gap-1.5 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            <span>SV1: {grp.studentId?.userId?.fullName || 'Sinh viên 1'}</span>
                          </div>
                          <div><strong>MSSV:</strong> {grp.studentCode || grp.studentId?.studentCode}</div>
                          <div><strong>Lớp:</strong> {grp.studentId?.className || '—'}</div>
                          <div><strong>Email:</strong> {grp.studentId?.userId?.email || '—'}</div>
                        </div>

                        {grp.secondStudentId && (
                          <div className="p-2.5 bg-white rounded-xl border border-violet-100 space-y-0.5 text-[11px]">
                            <div className="font-bold text-violet-950 flex items-center gap-1.5 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
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
