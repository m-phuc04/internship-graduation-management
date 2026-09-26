import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Sparkles,
  Info,
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
  const [topicSearch, setTopicSearch] = useState('');
  const [rejectTopicModalOpen, setRejectTopicModalOpen] = useState(false);
  const [targetTopic, setTargetTopic] = useState(null);
  const [topicRejectReason, setTopicRejectReason] = useState('');
  const [topicDetailModalOpen, setTopicDetailModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showRejectedList, setShowRejectedList] = useState(false);

  const fetchProposedTopics = useCallback(async () => {
    setLoadingProposedTopics(true);
    try {
      const res = await thesisApi.getTopicsForTbm({
        status: '', // Lấy tất cả để phân loại vào bảng đã duyệt & bảng chờ duyệt
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
  }, [topicSearch, currentTerm?._id]);

  useEffect(() => {
    if (activeMainTab === 'PROPOSED_TOPICS') {
      fetchProposedTopics();
    }
  }, [activeMainTab, fetchProposedTopics]);

  // Helper to format lecturer display title nicely
  const formatLecturerDisplay = (title, name) => {
    if (!name) return '—';
    const trimmedName = name.trim();
    if (!title) return trimmedName;
    const trimmedTitle = title.trim();
    if (trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase())) {
      return trimmedName;
    }
    return trimmedTitle + ' ' + trimmedName;
  };

  // Filter topics into Approved, Pending, and Rejected
  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return proposedTopics;
    const q = topicSearch.toLowerCase().trim();
    return proposedTopics.filter((t) => {
      const titleMatch = t.title?.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      const lecName = t.supervisorId?.userId?.fullName?.toLowerCase().includes(q);
      const lecCode = t.supervisorId?.lecturerCode?.toLowerCase().includes(q);
      const stMatch = t.registeredGroups?.some((g) =>
        g.students?.some((st) => st.studentCode?.toLowerCase().includes(q) || st.fullName?.toLowerCase().includes(q))
      );
      return titleMatch || descMatch || lecName || lecCode || stMatch;
    });
  }, [proposedTopics, topicSearch]);

  const approvedTopics = useMemo(() => {
    return filteredTopics.filter((t) => t.status === 'APPROVED');
  }, [filteredTopics]);

  const pendingTopics = useMemo(() => {
    return filteredTopics.filter((t) => t.status === 'PENDING');
  }, [filteredTopics]);

  const rejectedTopics = useMemo(() => {
    return filteredTopics.filter((t) => t.status === 'REJECTED');
  }, [filteredTopics]);

  // Handle Approve single topic
  const handleApproveTopic = async (topic) => {
    setActionLoading(true);
    try {
      const res = await thesisApi.approveTopic(topic._id);
      if (res.success) {
        showToast('Đã duyệt đề tài "' + topic.title + '" thành công! Đề tài đã chuyển lên danh sách chính thức.', 'success');
        fetchProposedTopics();
      }
    } catch (err) {
      showToast(err.message || 'Phê duyệt đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Approve all pending topics
  const handleApproveAllPending = async () => {
    if (pendingTopics.length === 0) return;
    if (!window.confirm('Bạn có chắc chắn muốn duyệt tất cả ' + pendingTopics.length + ' đề tài đang chờ phê duyệt không?')) {
      return;
    }

    setActionLoading(true);
    try {
      let count = 0;
      for (const t of pendingTopics) {
        await thesisApi.approveTopic(t._id);
        count++;
      }
      showToast('Đã phê duyệt thành công tất cả ' + count + ' đề tài!', 'success');
      fetchProposedTopics();
    } catch (err) {
      showToast(err.message || 'Lỗi khi duyệt hàng loạt đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Confirm Reject Topic
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
        showToast('Đã từ chối đề tài "' + targetTopic.title + '"', 'info');
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
              <span className={'px-1.5 py-0.5 text-[10px] font-bold rounded-md ' + windowBadge.color}>
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + ((loading || loadingProposedTopics) ? 'animate-spin' : '')} />
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
            className={'px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ' + (
              activeMainTab === 'PROPOSED_TOPICS'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Danh sách đề tài (KLTN)</span>
            <span className={'px-2 py-0.5 rounded-full text-[10px] font-mono ' + (activeMainTab === 'PROPOSED_TOPICS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700')}>
              {proposedTopics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('STUDENT_THESES')}
            className={'px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ' + (
              activeMainTab === 'STUDENT_THESES'
                ? 'bg-[#123891] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Users className="w-4 h-4" />
            <span>2. Quản lý Khóa luận SV & Phân công Phản biện</span>
            <span className={'px-2 py-0.5 rounded-full text-[10px] font-mono ' + (activeMainTab === 'STUDENT_THESES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700')}>
              {stats.total}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH ĐỀ TÀI & ĐỀ TÀI ĐANG YÊU CẦU DUYỆT */}
      {/* ========================================================================= */}
      {activeMainTab === 'PROPOSED_TOPICS' && (
        <div className="space-y-6">
          {/* Top Search & Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-96">
              <SearchInput
                value={topicSearch}
                onChange={(val) => setTopicSearch(val)}
                placeholder="Tìm tên đề tài, mô tả, GVHD, mã GV..."
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã duyệt: {approvedTopics.length}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-300">
                <Clock className="w-4 h-4 text-amber-600" />
                Chờ duyệt: {pendingTopics.length}
              </span>
              {rejectedTopics.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 font-bold border border-rose-200">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Từ chối: {rejectedTopics.length}
                </span>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. BẢNG TRÊN: BẢNG DANH SÁCH ĐỀ TÀI (ĐÃ PHÊ DUYỆT / CHÍNH THỨC) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#123891] text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Danh Sách Đề Tài Khóa Luận (Đã Phê Duyệt)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Danh sách đề tài chính thức đã được TBM duyệt, sinh viên có thể đăng ký thực hiện
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs self-start sm:self-center border border-emerald-300">
                {approvedTopics.length} đề tài chính thức
              </span>
            </div>

            {loadingProposedTopics ? (
              <div className="p-6">
                <LoadingSkeleton rows={4} cols={6} />
              </div>
            ) : approvedTopics.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  title="Chưa có đề tài nào được duyệt"
                  description="Khi Trưởng bộ môn phê duyệt các đề tài từ danh sách yêu cầu bên dưới, đề tài sẽ xuất hiện tại bảng này."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 w-12 text-center">STT</th>
                      <th className="py-3 px-4">Tên đề tài & Mô tả</th>
                      <th className="py-3 px-4 w-60">Giảng viên đề xuất</th>
                      <th className="py-3 px-4 w-28 text-center">Số nhóm tối đa</th>
                      <th className="py-3 px-4 w-32 text-center">Đã ĐK (Nhóm/SV)</th>
                      <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                      <th className="py-3 px-4 w-24 text-center">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {approvedTopics.map((topic, idx) => {
                      const registeredCount = topic.registeredGroups?.length || 0;
                      const maxGroups = topic.maxGroups || 1;
                      const isFull = registeredCount >= maxGroups;

                      return (
                        <tr key={topic._id} className="hover:bg-slate-50/80 transition group">
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm group-hover:text-[#123891] transition">
                              {topic.title}
                            </div>
                            {topic.description && (
                              <p className="text-slate-500 text-xs mt-1 line-clamp-2 max-w-xl">
                                {topic.description}
                              </p>
                            )}
                            {topic.requirements && (
                              <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1 italic">
                                <span className="font-semibold text-slate-500">Yêu cầu:</span> {topic.requirements}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">
                              {formatLecturerDisplay(
                                topic.supervisorId?.academicTitle,
                                topic.supervisorId?.userId?.fullName
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Mã GV: {topic.supervisorId?.lecturerCode || '—'}
                            </div>
                            {topic.supervisorId?.userId?.email && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {topic.supervisorId?.userId?.email}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                            {maxGroups} nhóm
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ' + (
                                isFull
                                  ? 'bg-rose-100 text-rose-800'
                                  : registeredCount > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {registeredCount} / {maxGroups} nhóm
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đã duyệt
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTopic(topic);
                                setTopicDetailModalOpen(true);
                              }}
                              className="p-2 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              title="Xem chi tiết đề tài"
                            >
                              <Eye className="w-4 h-4" />
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

          {/* ========================================================================= */}
          {/* 2. BẢNG DƯỚI: BẢNG CÁC ĐỀ TÀI ĐANG YÊU CẦU DUYỆT (CHỜ TBM DUYỆT) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-amber-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-yellow-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Danh Sách Đề Tài Đang Yêu Cầu Duyệt
                    {pendingTopics.length > 0 && (
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-xs font-extrabold animate-pulse">
                        {pendingTopics.length} cần duyệt
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bấm nút xanh "✓" để duyệt đề tài (đề tài sẽ hiện lên bảng trên), hoặc nút đỏ "✕" để từ chối
                  </p>
                </div>
              </div>

              {pendingTopics.length > 0 && (
                <button
                  type="button"
                  onClick={handleApproveAllPending}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/30 transition cursor-pointer self-start sm:self-center"
                  title="Duyệt nhanh tất cả đề tài đang chờ"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Duyệt tất cả ({pendingTopics.length})</span>
                </button>
              )}
            </div>

            {loadingProposedTopics ? (
              <div className="p-6">
                <LoadingSkeleton rows={3} cols={6} />
              </div>
            ) : pendingTopics.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/40">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Hiện không có đề tài nào đang yêu cầu duyệt
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Tất cả các đề tài do giảng viên đề xuất đã được xử lý hoặc chưa có giảng viên nào gửi đề xuất mới.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/60 text-slate-700 uppercase text-[11px] font-bold tracking-wider border-b border-amber-200">
                      <th className="py-3.5 px-4 w-12 text-center">STT</th>
                      <th className="py-3.5 px-4 w-60">Giảng viên đề xuất</th>
                      <th className="py-3.5 px-4">Tên đề tài & Mô tả</th>
                      <th className="py-3.5 px-4 w-28 text-center">Số nhóm tối đa</th>
                      <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                      <th className="py-3.5 px-4 w-36 text-center">Hành động duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 text-slate-700">
                    {pendingTopics.map((topic, idx) => (
                      <tr key={topic._id} className="hover:bg-amber-50/40 transition group">
                        <td className="py-4 px-4 text-center font-mono font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {formatLecturerDisplay(
                              topic.supervisorId?.academicTitle,
                              topic.supervisorId?.userId?.fullName
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#123891] font-semibold mt-0.5">
                            Mã GV: {topic.supervisorId?.lecturerCode || '—'}
                          </div>
                          {topic.supervisorId?.userId?.email && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {topic.supervisorId?.userId?.email}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {topic.title}
                          </div>
                          {topic.description && (
                            <p className="text-slate-600 text-xs mt-1 line-clamp-2 max-w-xl">
                              {topic.description}
                            </p>
                          )}
                          {topic.requirements && (
                            <p className="text-slate-500 text-[11px] mt-0.5 italic">
                              <span className="font-semibold text-slate-600">Yêu cầu:</span> {topic.requirements}
                            </p>
                          )}
                          {topic.createdAt && (
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Đề xuất lúc: {formatDate(topic.createdAt)}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-800">
                          {topic.maxGroups || 1} nhóm
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Chờ duyệt
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Nút Xanh "✓" - Phê duyệt */}
                            <button
                              type="button"
                              onClick={() => handleApproveTopic(topic)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm shadow-emerald-600/30 transition cursor-pointer"
                              title="Duyệt đề tài này (Đề tài sẽ lập tức chuyển lên bảng trên)"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Duyệt</span>
                            </button>

                            {/* Nút Đỏ "✕" - Từ chối */}
                            <button
                              type="button"
                              onClick={() => {
                                setTargetTopic(topic);
                                setTopicRejectReason('');
                                setRejectTopicModalOpen(true);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl font-bold text-xs flex items-center gap-1 border border-rose-200 hover:border-rose-600 transition cursor-pointer"
                              title="Từ chối đề tài này"
                            >
                              <X className="w-4 h-4 stroke-[2.5]" />
                              <span>Từ chối</span>
                            </button>

                            {/* Nút Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTopic(topic);
                                setTopicDetailModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#123891] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              title="Xem chi tiết đề tài"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. BẢNG ĐỀ TÀI ĐÃ TỪ CHỐI (Thu gọn/Mở rộng nếu có) */}
          {/* ========================================================================= */}
          {rejectedTopics.length > 0 && (
            <div className="bg-white rounded-3xl border border-rose-200/80 shadow-2xs overflow-hidden">
              <div
                onClick={() => setShowRejectedList(!showRejectedList)}
                className="p-4 bg-rose-50/50 flex items-center justify-between cursor-pointer hover:bg-rose-50 transition select-none"
              >
                <div className="flex items-center gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900">
                    Danh Sách Đề Tài Đã Từ Chối ({rejectedTopics.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-rose-600 font-semibold">
                  <span>{showRejectedList ? 'Thu gọn' : 'Xem danh sách'}</span>
                  <ChevronDown
                    className={'w-4 h-4 transition-transform duration-200 ' + (
                      showRejectedList ? 'rotate-180' : ''
                    )}
                  />
                </div>
              </div>

              {showRejectedList && (
                <div className="overflow-x-auto border-t border-rose-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-[10.5px] font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4 w-12 text-center">STT</th>
                        <th className="py-2.5 px-4">Tên đề tài</th>
                        <th className="py-2.5 px-4 w-48">Giảng viên</th>
                        <th className="py-2.5 px-4">Lý do từ chối</th>
                        <th className="py-2.5 px-4 w-28 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {rejectedTopics.map((topic, idx) => (
                        <tr key={topic._id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{topic.title}</td>
                          <td className="py-2.5 px-4">
                            {formatLecturerDisplay(topic.supervisorId?.academicTitle, topic.supervisorId?.userId?.fullName)}
                          </td>
                          <td className="py-2.5 px-4 text-rose-600 font-medium">
                            {topic.rejectionReason || 'Không có lý do cụ thể'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleApproveTopic(topic)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-xs font-bold border border-emerald-200 transition cursor-pointer"
                              title="Duyệt lại đề tài này"
                            >
                              Duyệt lại
                            </button>
                          </td>
                        </tr>
                      ))}
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
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Tổng đăng ký</span>
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-800 mt-2">{stats.total}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Chờ duyệt</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">{stats.pendingCount}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Đã duyệt</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">{stats.approvedCount}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Đã phân PB</span>
                <UserCheck className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-600 mt-2">{stats.assignedReviewersCount}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Hoàn thành</span>
                <Award className="w-4 h-4 text-[#123891]" />
              </div>
              <div className="text-2xl font-black text-[#123891] mt-2">{stats.completedCount || stats.gradedCount || 0}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-96">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Tìm tên đề tài, tên SV, MSSV, GVHD..."
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt (PENDING)</option>
                <option value="APPROVED">Đã duyệt (APPROVED)</option>
                <option value="ASSIGNED_REVIEWERS">Đã phân công phản biện</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="SUBMITTED">Đã nộp báo cáo</option>
                <option value="DEFENSE_SCHEDULED">Đã lên lịch bảo vệ</option>
                <option value="GRADED">Đã chấm điểm</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
            </div>
          </div>

          {/* Theses Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={5} cols={6} />
              </div>
            ) : theses.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Không tìm thấy khóa luận nào"
                  description="Không có đề tài khóa luận nào khớp với bộ lọc hoặc sinh viên chưa đăng ký trong học kỳ này."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4 w-12 text-center">STT</th>
                      <th className="py-3.5 px-4">Tên đề tài & Nhóm SV</th>
                      <th className="py-3.5 px-4 w-52">GV Hướng dẫn</th>
                      <th className="py-3.5 px-4 w-60">Hội đồng Phản biện</th>
                      <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                      <th className="py-3.5 px-4 w-36 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {theses.map((thesis, idx) => {
                      const student1 = thesis.studentId;
                      const student2 = thesis.partnerStudentId;
                      const supervisor = thesis.supervisorId;
                      const reviewer1 = thesis.reviewer1Id;
                      const reviewer2 = thesis.reviewer2Id;

                      return (
                        <tr key={thesis._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {(page - 1) * limit + idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm hover:text-[#123891] cursor-pointer"
                              onClick={() => {
                                setSelectedThesis(thesis);
                                setDetailModalOpen(true);
                              }}
                            >
                              {thesis.topicTitle}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {student1 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-[#123891] font-medium px-2 py-0.5 rounded-md border border-blue-100">
                                  <User className="w-3 h-3 text-[#123891]" />
                                  {student1.userId?.fullName || 'SV 1'} ({student1.studentCode})
                                </span>
                              )}
                              {student2 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-md border border-indigo-100">
                                  <User className="w-3 h-3 text-indigo-600" />
                                  {student2.userId?.fullName || 'SV 2'} ({student2.studentCode})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {supervisor ? (
                              <div>
                                <div className="font-bold text-slate-800">
                                  {formatLecturerDisplay(supervisor.academicTitle, supervisor.userId?.fullName)}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {supervisor.lecturerCode}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(thesis);
                                  setAssignSupervisorOpen(true);
                                }}
                                className="text-amber-600 hover:text-amber-700 font-bold text-xs underline cursor-pointer"
                              >
                                + Phân công GVHD
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="font-semibold text-slate-500 w-9">PB1:</span>
                                {reviewer1 ? (
                                  <span className="font-medium text-slate-800">
                                    {formatLecturerDisplay(reviewer1.academicTitle, reviewer1.userId?.fullName)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa phân công</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="font-semibold text-slate-500 w-9">PB2:</span>
                                {reviewer2 ? (
                                  <span className="font-medium text-slate-800">
                                    {formatLecturerDisplay(reviewer2.academicTitle, reviewer2.userId?.fullName)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa phân công</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={thesis.status} />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(thesis);
                                  setAssignReviewersOpen(true);
                                }}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-xs border border-purple-200 transition cursor-pointer"
                                title="Phân công 2 giảng viên phản biện"
                              >
                                Phân PB
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(thesis);
                                  setDetailModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
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

            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} trong tổng số {pagination.total} khóa luận
                </div>
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal Reject Topic */}
      {rejectTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ chối đề tài KLTN</h3>
                <p className="text-xs text-slate-500">Nhập lý do để gửi phản hồi cho Giảng viên</p>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1">
                Tên đề tài: <span className="font-bold text-slate-900">{targetTopic?.title}</span>
              </div>
              <textarea
                value={topicRejectReason}
                onChange={(e) => setTopicRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (bắt buộc: trùng lặp, khối lượng chưa phù hợp, thiếu tài nguyên...)"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTopicModalOpen(false);
                  setTargetTopic(null);
                  setTopicRejectReason('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectTopic}
                disabled={actionLoading || !topicRejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Topic (Tab 1) */}
      {topicDetailModalOpen && selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi tiết Đề tài Khóa luận</h3>
                  <p className="text-xs text-slate-500">Mã đề tài: {selectedTopic._id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTopicDetailModalOpen(false);
                  setSelectedTopic(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block mb-1">Tên đề tài:</span>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {selectedTopic.title}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-1">Giảng viên đề xuất:</span>
                  <p className="font-bold text-slate-900">
                    {formatLecturerDisplay(selectedTopic.supervisorId?.academicTitle, selectedTopic.supervisorId?.userId?.fullName)}
                  </p>
                  <p className="text-[11px] text-slate-500">Mã GV: {selectedTopic.supervisorId?.lecturerCode}</p>
                  <p className="text-[11px] text-slate-500">{selectedTopic.supervisorId?.userId?.email}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-1">Giới hạn đăng ký:</span>
                  <p className="font-bold text-slate-900">Tối đa {selectedTopic.maxGroups || 1} nhóm</p>
                  <p className="text-[11px] text-slate-500">Hiện đã có {selectedTopic.registeredGroups?.length || 0} nhóm đăng ký</p>
                </div>
              </div>

              {selectedTopic.description && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Mô tả đề tài:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 whitespace-pre-line leading-relaxed">
                    {selectedTopic.description}
                  </p>
                </div>
              )}

              {selectedTopic.requirements && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Yêu cầu kiến thức & Kỹ năng:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 whitespace-pre-line leading-relaxed">
                    {selectedTopic.requirements}
                  </p>
                </div>
              )}

              {/* Registered Groups details */}
              {selectedTopic.registeredGroups?.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-2">
                    Danh sách các nhóm sinh viên đã đăng ký ({selectedTopic.registeredGroups.length}):
                  </span>
                  <div className="space-y-2">
                    {selectedTopic.registeredGroups.map((g, gIdx) => (
                      <div key={gIdx} className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="font-bold text-[#123891] mb-1">Nhóm {gIdx + 1}:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                          {g.students?.map((st, stIdx) => (
                            <li key={stIdx}>
                              <span className="font-semibold">{st.fullName}</span> ({st.studentCode}) - Lớp: {st.className || '—'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {selectedTopic.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTopicDetailModalOpen(false);
                      setTargetTopic(selectedTopic);
                      setTopicRejectReason('');
                      setRejectTopicModalOpen(true);
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveTopic(selectedTopic);
                      setTopicDetailModalOpen(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Phê duyệt đề tài
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setTopicDetailModalOpen(false);
                  setSelectedTopic(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2 Modals */}
      {detailModalOpen && selectedThesis && (
        <TbmThesisDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedThesis(null);
          }}
          thesis={selectedThesis}
          onApprove={() => setApproveConfirmOpen(true)}
          onReject={() => setRejectConfirmOpen(true)}
          onAssignSupervisor={() => setAssignSupervisorOpen(true)}
          onAssignReviewers={() => setAssignReviewersOpen(true)}
        />
      )}

      {assignReviewersOpen && selectedThesis && (
        <AssignReviewersModal
          isOpen={assignReviewersOpen}
          onClose={() => {
            setAssignReviewersOpen(false);
            setSelectedThesis(null);
          }}
          thesis={selectedThesis}
          onSuccess={() => {
            fetchTheses();
            showToast('Đã phân công giảng viên phản biện thành công!', 'success');
          }}
        />
      )}

      {assignSupervisorOpen && selectedThesis && (
        <AssignSupervisorModal
          isOpen={assignSupervisorOpen}
          onClose={() => {
            setAssignSupervisorOpen(false);
            setSelectedThesis(null);
          }}
          thesis={selectedThesis}
          onSuccess={() => {
            fetchTheses();
            showToast('Đã phân công giảng viên hướng dẫn thành công!', 'success');
          }}
        />
      )}

      {timelineModalOpen && (
        <ThesisTimelineModal
          isOpen={timelineModalOpen}
          onClose={() => setTimelineModalOpen(false)}
          academicTerm={currentTerm}
          onSuccess={() => {
            fetchTheses();
            fetchProposedTopics();
          }}
        />
      )}

      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          exportType="THESIS"
          academicTermId={currentTerm?._id}
        />
      )}

      {/* Confirm Approve (Tab 2) */}
      <ConfirmDialog
        isOpen={approveConfirmOpen}
        title="Xác nhận phê duyệt đề tài"
        message={'Bạn có chắc chắn muốn phê duyệt đề tài "' + selectedThesis?.topicTitle + '" cho sinh viên không?'}
        confirmLabel="Phê duyệt"
        cancelLabel="Hủy"
        variant="primary"
        loading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setApproveConfirmOpen(false)}
      />

      {/* Confirm Reject (Tab 2) */}
      <ConfirmDialog
        isOpen={rejectConfirmOpen}
        title="Xác nhận từ chối đề tài"
        message={'Bạn có chắc chắn muốn từ chối đề tài "' + selectedThesis?.topicTitle + '" không? Sinh viên sẽ có thể chỉnh sửa hoặc đăng ký lại đề tài khác.'}
        confirmLabel="Từ chối"
        cancelLabel="Hủy"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleReject}
        onCancel={() => setRejectConfirmOpen(false)}
      />
    </div>
  );
};

export default TbmThesisManagement;
