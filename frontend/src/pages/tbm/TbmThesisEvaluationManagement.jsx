import React, { useState, useEffect, useCallback } from 'react';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';

import {
  Award,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
  FileText,
  UserCheck,
  Percent,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  Calendar,
  Send,
  AlertTriangle,
  Lock,
  CheckSquare,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ASSIGNED_REVIEWERS', label: 'Đã gán PB' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'GRADED', label: 'Đã có điểm (GRADED)' },
  { value: 'COMPLETED', label: 'Hoàn tất (COMPLETED)' },
];

const TbmThesisEvaluationManagement = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  // Active Main Tab: 'EVALUATIONS' | 'CRITERIA' | 'GRADING_PERIODS'
  const [mainTab, setMainTab] = useState('EVALUATIONS');

  // ==========================================
  // TAB 1: EVALUATIONS STATE
  // ==========================================
  const [theses, setTheses] = useState([]);
  const [stats, setStats] = useState({
    totalEligible: 0,
    gradedCount: 0,
    completedCount: 0,
    pendingGradeCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Complete Dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [thesisToComplete, setThesisToComplete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);

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

  // ==========================================
  // FETCH METHODS
  // ==========================================
  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getEvaluations({
        search,
        status: statusFilter,
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setTheses(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đánh giá khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentTerm?._id, showToast]);

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
  // TAB 1 ACTIONS
  // ==========================================
  const handleConfirmComplete = async () => {
    if (!thesisToComplete) return;

    setActionLoading(true);
    try {
      const res = await thesisApi.completeEvaluation(thesisToComplete._id);
      if (res.success) {
        showToast('Đã hoàn tất đánh giá và nghiệm thu khóa luận tốt nghiệp!', 'success');
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#153898] flex items-center justify-center shrink-0 shadow-xs">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Quản lý Đánh giá Khóa luận Tốt nghiệp (KLTN)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý quy trình đánh giá điều kiện, thiết lập thời gian nhập điểm và tổng hợp kết quả KLTN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (mainTab === 'EVALUATIONS') fetchEvaluations();
                else if (mainTab === 'CRITERIA') fetchCriteria();
                else if (mainTab === 'GRADING_PERIODS') fetchGradingPeriods();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setMainTab('EVALUATIONS')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              mainTab === 'EVALUATIONS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>1. Tổng hợp Đánh giá KLTN</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('CRITERIA')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              mainTab === 'CRITERIA'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>2. Quản lý Tiêu chí Đánh giá (GVHD)</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('GRADING_PERIODS')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              mainTab === 'GRADING_PERIODS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>3. Quản lý Thời gian Nhập điểm</span>
          </button>
        </div>

        {/* Stats Grid (Only on EVALUATIONS tab) */}
        {mainTab === 'EVALUATIONS' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] text-slate-500 font-medium">Đủ điều kiện hội đồng</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{stats.totalEligible}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Đã gán đủ PB1 & PB2</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
              <div className="text-[11px] text-amber-700 font-medium">Chờ chấm điểm</div>
              <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{stats.pendingGradeCount}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Thiếu 1 hoặc nhiều điểm</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
              <div className="text-[11px] text-emerald-700 font-medium">Đã có điểm tổng kết</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{stats.gradedCount}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Đủ cả 3 cột điểm</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80">
              <div className="text-[11px] text-[#102d7d] font-medium">Đã hoàn tất bảo vệ</div>
              <div className="text-lg font-bold text-[#102d7d] font-mono mt-0.5">{stats.completedCount}</div>
              <div className="text-[10px] text-[#153898] mt-0.5">COMPLETED</div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* TAB 1: EVALUATIONS TABLE */}
      {/* ========================================== */}
      {mainTab === 'EVALUATIONS' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-96">
              <SearchInput
                value={search}
                onChange={(val) => setSearch(val)}
                placeholder="Tìm MSSV SV1, SV2, Tên SV, Tên đề tài, GVHD, PB..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    statusFilter === opt.value
                      ? 'bg-white text-[#102d7d] shadow-2xs font-bold'
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
            ) : theses.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Không có đề tài nào đủ điều kiện đánh giá"
                  description="Chỉ những đề tài KLTN đã được phân công đủ cả 2 giảng viên phản biện (PB1 và PB2) mới hiển thị trong mục này."
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
                      <th className="py-3.5 px-4">Điều kiện GVHD</th>
                      <th className="py-3.5 px-4">Hội đồng (GVHD | PB Kín | PB Hội đồng)</th>
                      <th className="py-3.5 px-4">Bảng điểm thành phần</th>
                      <th className="py-3.5 px-4">Điểm Tổng Kết</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {theses.map((item, idx) => {
                      const s = item.scores || {};
                      const isFullyGraded = s.finalScore !== null && s.finalScore !== undefined;
                      const isCompleted = item.status === 'COMPLETED';

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition">
                          {/* STT */}
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Title */}
                          <td className="py-3.5 px-4 min-w-[240px] max-w-sm" title={item.thesisTitle}>
                            <strong className="text-slate-900 line-clamp-2 leading-snug hover:text-[#153898] transition">
                              {item.thesisTitle}
                            </strong>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-1">
                              {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                            </span>
                          </td>

                          {/* Students */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#153898]" />
                                <strong className="text-slate-900">{item.studentId?.userId?.fullName}</strong>
                                <span className="text-[11px] font-mono text-slate-400">
                                  ({item.studentId?.studentCode})
                                </span>
                              </div>
                              {item.studentCount === 2 && item.secondStudentId && (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#153898]" />
                                  <strong className="text-slate-900">
                                    {item.secondStudentId?.userId?.fullName}
                                  </strong>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    ({item.secondStudentId?.studentCode})
                                  </span>
                                </div>
                              )}
                            </div>
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

                          {/* Council Lecturers */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1 text-[11px]">
                              <div>
                                <span className="text-slate-400">GVHD:</span>{' '}
                                <span className="font-semibold text-slate-700">
                                  {item.supervisorId?.userId?.fullName || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">PB1:</span>{' '}
                                <span className="font-semibold text-slate-700">
                                  {item.reviewer1Id?.userId?.fullName || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">PB2:</span>{' '}
                                <span className="font-semibold text-slate-700">
                                  {item.reviewer2Id?.userId?.fullName || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Component Scores */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                <span className="text-slate-400">GVHD (40%):</span>{' '}
                                <strong
                                  className={
                                    s.supervisorScore !== null && s.supervisorScore !== undefined
                                      ? 'text-[#153898]'
                                      : 'text-slate-400 font-normal'
                                  }
                                >
                                  {s.supervisorScore !== null && s.supervisorScore !== undefined
                                    ? s.supervisorScore
                                    : '—'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400">PB1 (30%):</span>{' '}
                                <strong
                                  className={
                                    s.reviewer1Score !== null && s.reviewer1Score !== undefined
                                      ? 'text-[#153898]'
                                      : 'text-slate-400 font-normal'
                                  }
                                >
                                  {s.reviewer1Score !== null && s.reviewer1Score !== undefined
                                    ? s.reviewer1Score
                                    : '—'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400">PB2 (30%):</span>{' '}
                                <strong
                                  className={
                                    s.reviewer2Score !== null && s.reviewer2Score !== undefined
                                      ? 'text-amber-600'
                                      : 'text-slate-400 font-normal'
                                  }
                                >
                                  {s.reviewer2Score !== null && s.reviewer2Score !== undefined
                                    ? s.reviewer2Score
                                    : '—'}
                                </strong>
                              </div>
                            </div>
                          </td>

                          {/* Final Score */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isFullyGraded ? (
                              <div className="inline-flex flex-col">
                                <span className="text-base font-extrabold text-emerald-600 font-mono">
                                  {s.finalScore}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">Thang 10</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa đủ điểm</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={item.status} />
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(item)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                                title="Xem chi tiết điểm & nhận xét"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isCompleted && isFullyGraded && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setThesisToComplete(item);
                                    setCompleteDialogOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                                  title="Hoàn tất đánh giá (Nghiệm thu)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Nghiệm thu</span>
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
              onClick={() => handleOpenCriteriaModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold text-xs rounded-2xl shadow-sm transition cursor-pointer"
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">Thứ tự</th>
                      <th className="py-3.5 px-4">Tên tiêu chí</th>
                      <th className="py-3.5 px-4">Mô tả / Ghi chú</th>
                      <th className="py-3.5 px-4">Tính chất</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
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
                            onClick={() => handleToggleCriteriaActive(crit)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                              crit.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCriteriaModal(crit)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#153898] rounded-lg transition cursor-pointer"
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
                onClick={() => setProcessFailDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl border border-rose-200 transition cursor-pointer"
                title="Quét và đánh dấu FAIL cho sinh viên quá hạn"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Xử lý sinh viên quá hạn (FAIL)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenPeriodModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold text-xs rounded-2xl shadow-sm transition cursor-pointer"
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Tên đợt nhập điểm</th>
                      <th className="py-3.5 px-4">Thời gian bắt đầu</th>
                      <th className="py-3.5 px-4">Thời gian kết thúc</th>
                      <th className="py-3.5 px-4">Phạm vi thông báo</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
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
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
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
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPeriodModal(period)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#153898] rounded-lg transition cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs resize-none"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={critForm.isRequired}
                  onChange={(e) => setCritForm({ ...critForm, isRequired: e.target.checked })}
                  className="w-4 h-4 text-[#153898] rounded border-slate-300 focus:ring-[#153898]"
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
              className="w-4 h-4 text-[#153898] rounded border-slate-300 focus:ring-[#153898]"
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
              className="px-5 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs"
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
                    ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
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
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898] text-xs resize-none"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
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
        title="Xử lý sinh viên quá hạn đánh giá KLTN (FAIL)"
        message="Hệ thống sẽ quét các đợt nhập điểm đã hết hạn trong học kỳ này và tự động chuyển trạng thái REJECTED (FAIL KLTN) cho tất cả các đề tài chưa đạt tiêu chí hoặc chưa có điểm GVHD. Các đề tài này sẽ bị dừng quy trình và không được phân công GV phản biện. Bạn có chắc chắn muốn thực hiện?"
        confirmText="Xác nhận đánh dấu FAIL"
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
        title="Xác nhận Nghiệm thu & Hoàn tất Đánh giá KLTN"
        message={`Bạn có chắc chắn muốn nghiệm thu đề tài "${thesisToComplete?.thesisTitle}"? Đề tài sẽ chuyển sang trạng thái COMPLETED và khóa vĩnh viễn không thể chỉnh sửa điểm.`}
        confirmText="Xác nhận nghiệm thu (COMPLETED)"
        cancelText="Hủy"
        type="primary"
        loading={actionLoading}
      />

      {/* ========================================== */}
      {/* MODAL: DETAIL SCORE & EVALUATION VIEW */}
      {/* ========================================== */}
      {selectedThesis && (
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

            {/* Detailed Scores */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-center">
                <div className="text-[11px] text-[#102d7d] font-bold">Điểm GVHD (40%)</div>
                <div className="text-xl font-black font-mono text-[#0B1E48] mt-1">
                  {selectedThesis.scores?.supervisorScore ?? '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedThesis.supervisorId?.userId?.fullName || 'Chưa có'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-center">
                <div className="text-[11px] text-[#102d7d] font-bold">Điểm PB Kín (30%)</div>
                <div className="text-xl font-black font-mono text-[#0B1E48] mt-1">
                  {selectedThesis.scores?.reviewer1Score ?? '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedThesis.reviewer1Id?.userId?.fullName || 'Chưa có'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 text-center">
                <div className="text-[11px] text-amber-700 font-bold">Điểm PB HĐ (30%)</div>
                <div className="text-xl font-black font-mono text-amber-900 mt-1">
                  {selectedThesis.scores?.reviewer2Score ?? '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedThesis.reviewer2Id?.userId?.fullName || 'Chưa có'}
                </div>
              </div>
            </div>

            {/* Final Score */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-emerald-900 text-sm">Điểm Tổng Kết Khóa Luận</div>
                <div className="text-[11px] text-emerald-700">
                  Công thức: (GVHD × 0.4) + (PB1 × 0.3) + (PB2 × 0.3)
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700">
                {selectedThesis.scores?.finalScore ?? '—'}
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
                <div className="font-bold text-slate-800 text-[11px]">Nhận xét của PB Kín:</div>
                <p className="text-slate-600 mt-0.5 italic">
                  {selectedThesis.reviewer1Comment || 'Chưa có nhận xét.'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl">
                <div className="font-bold text-slate-800 text-[11px]">Nhận xét của PB Hội đồng:</div>
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
      )}
    </div>
  );
};

export default TbmThesisEvaluationManagement;
