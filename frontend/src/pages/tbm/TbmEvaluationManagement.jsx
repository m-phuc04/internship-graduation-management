import React, { useState, useEffect, useCallback, useMemo } from 'react';
import evaluationApi from '../../api/evaluationApi';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import EvaluationDetailModal from '../../components/evaluations/EvaluationDetailModal';

import {
  Award,
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  Trash2,
  Send,
  CheckSquare,
  Square,
  AlertCircle,
  Users,
  Check,
  X,
  EyeOff,
} from 'lucide-react';

const EVAL_STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PUBLISHED', label: 'Đã công bố điểm' },
  { value: 'HIDDEN', label: 'Đã ẩn điểm' },
  { value: 'UNPUBLISHED', label: 'Chưa công bố điểm' },
  { value: 'SUBMITTED', label: 'Đã có điểm' },
  { value: 'UNASSESSED', label: 'Chưa có điểm' },
];

const TbmEvaluationManagement = () => {
  const { currentTerm } = useAcademicTerm();

  // Evaluations State
  const [evaluations, setEvaluations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [targetInternship, setTargetInternship] = useState(null);
  const [deleteEvalModalOpen, setDeleteEvalModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal: Publish All Scores
  const [publishAllModalOpen, setPublishAllModalOpen] = useState(false);
  const [allTermInternships, setAllTermInternships] = useState([]);
  const [loadingAllInternships, setLoadingAllInternships] = useState(false);
  const [selectedPublishIds, setSelectedPublishIds] = useState([]);
  const [publishing, setPublishing] = useState(false);

  // Modal: Hide Single Score
  const [hideSingleModalOpen, setHideSingleModalOpen] = useState(false);
  const [targetHideItem, setTargetHideItem] = useState(null);
  const [hideReason, setHideReason] = useState('');

  // Modal: Republish Single Score
  const [republishSingleModalOpen, setRepublishSingleModalOpen] = useState(false);
  const [targetRepublishItem, setTargetRepublishItem] = useState(null);
  const [republishReason, setRepublishReason] = useState('');

  // Modal: Hide Bulk Scores
  const [hideBulkModalOpen, setHideBulkModalOpen] = useState(false);
  const [selectedHideIds, setSelectedHideIds] = useState([]);
  const [hideBulkReason, setHideBulkReason] = useState('');
  const [hiding, setHiding] = useState(false);

  const { showToast } = useToast();

  const handleOpenComplete = (intern) => {
    setTargetInternship(intern);
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!targetInternship) return;
    setActionLoading(true);
    try {
      const res = await internshipApi.complete(targetInternship._id);
      if (res?.success || res?.status === 200 || !res?.error) {
        showToast('Đã hoàn tất đánh giá thực tập và khóa phiếu thành công!', 'success');
        setCompleteModalOpen(false);
        setEvaluations((prev) =>
          prev.map((it) =>
            String(it._id) === String(targetInternship._id)
              ? {
                  ...it,
                  status: 'COMPLETED',
                  evaluation: {
                    ...(it.evaluation || {}),
                    status: 'CONFIRMED',
                  },
                }
              : it
          )
        );
        setTargetInternship(null);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.message || 'Không thể hoàn tất phiếu đánh giá', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      let filterStatus = status;

      let res = await evaluationApi.getForTbm({
        page,
        limit: 10,
        search,
        status: filterStatus,
        academicTermId: currentTerm?._id || '',
      });

      if ((!res?.success || !res?.data?.length) && currentTerm?._id && !search && !filterStatus) {
        const fallbackRes = await evaluationApi.getForTbm({
          page,
          limit: 10,
          search,
          status: filterStatus,
        });
        if (fallbackRes?.success && fallbackRes?.data?.length) {
          res = fallbackRes;
        }
      }

      if (res?.success) {
        let list = res.data || [];
        if (status === 'PUBLISHED') {
          list = list.filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished));
        } else if (status === 'HIDDEN') {
          list = list.filter((it) => it.scorePublishStatus === 'HIDDEN');
        } else if (status === 'UNPUBLISHED') {
          list = list.filter((it) => it.scorePublishStatus === 'UNPUBLISHED' || (!it.isScorePublished && it.scorePublishStatus !== 'HIDDEN'));
        }
        setEvaluations(list);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách phiếu đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  // Open Bulk Publish Modal
  const handleOpenPublishAllModal = async () => {
    setPublishAllModalOpen(true);
    setLoadingAllInternships(true);
    try {
      const res = await evaluationApi.getForTbm({
        page: 1,
        limit: 1000,
        academicTermId: currentTerm?._id || '',
      });

      let list = [];
      if (res?.success && Array.isArray(res.data)) {
        list = res.data;
      } else {
        list = evaluations;
      }

      setAllTermInternships(list);

      // Auto-tick all items that have a valid score
      const validIds = list
        .filter((it) => {
          const hasScore = Boolean(
            it.evaluation?.score !== undefined &&
            it.evaluation?.score !== null &&
            !isNaN(it.evaluation?.score)
          );
          return hasScore;
        })
        .map((it) => it._id);

      setSelectedPublishIds(validIds);
    } catch (err) {
      console.error('Failed to load all internships for publish modal:', err);
      setAllTermInternships(evaluations);
      const validIds = evaluations
        .filter((it) => it.evaluation?.score !== undefined && it.evaluation?.score !== null)
        .map((it) => it._id);
      setSelectedPublishIds(validIds);
    } finally {
      setLoadingAllInternships(false);
    }
  };

  // Sorted list for Bulk Modal:
  // Eligible (has valid score) on TOP
  // Ineligible (no score) on BOTTOM (disabled/greyed out)
  const sortedBulkList = useMemo(() => {
    const list = [...allTermInternships];
    return list.sort((a, b) => {
      const aHasScore = Boolean(
        a.evaluation?.score !== undefined && a.evaluation?.score !== null && !isNaN(a.evaluation?.score)
      );
      const bHasScore = Boolean(
        b.evaluation?.score !== undefined && b.evaluation?.score !== null && !isNaN(b.evaluation?.score)
      );

      if (aHasScore && !bHasScore) return -1;
      if (!aHasScore && bHasScore) return 1;

      // If both have score, unpublished ones come first
      if (aHasScore && bHasScore) {
        if (!a.isScorePublished && b.isScorePublished) return -1;
        if (a.isScorePublished && !b.isScorePublished) return 1;
      }

      return 0;
    });
  }, [allTermInternships]);

  const eligibleCount = useMemo(() => {
    return allTermInternships.filter((it) => {
      return (
        it.evaluation?.score !== undefined &&
        it.evaluation?.score !== null &&
        !isNaN(it.evaluation?.score)
      );
    }).length;
  }, [allTermInternships]);

  const ineligibleCount = useMemo(() => {
    return allTermInternships.length - eligibleCount;
  }, [allTermInternships, eligibleCount]);

  const toggleSelectPublish = (id, hasScore) => {
    if (!hasScore) return; // Do not allow interaction
    setSelectedPublishIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEligible = () => {
    const allEligibleIds = allTermInternships
      .filter((it) => it.evaluation?.score !== undefined && it.evaluation?.score !== null)
      .map((it) => it._id);

    if (selectedPublishIds.length === allEligibleIds.length) {
      setSelectedPublishIds([]);
    } else {
      setSelectedPublishIds(allEligibleIds);
    }
  };

  const handleConfirmBulkPublish = async () => {
    if (selectedPublishIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một sinh viên đủ điều kiện để công bố điểm.', 'error');
      return;
    }

    setPublishing(true);
    try {
      const res = await evaluationApi.tbmPublishScoresBulk({
        internshipIds: selectedPublishIds,
      });

      if (res?.success || res?.status === 200) {
        const pubCount = res?.data?.publishedCount ?? selectedPublishIds.length;
        const skipCount = res?.data?.skippedCount ?? 0;
        let successMsg = `Đã công bố điểm cho ${pubCount} sinh viên đủ điều kiện thành công!`;
        if (skipCount > 0) {
          successMsg += ` (Bỏ qua ${skipCount} sinh viên chưa có điểm)`;
        }
        showToast(successMsg, 'success');
        setPublishAllModalOpen(false);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi công bố điểm hàng loạt', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Single Hide Handlers
  const handleOpenHideSingle = (item) => {
    setTargetHideItem(item);
    setHideReason('');
    setHideSingleModalOpen(true);
  };

  const handleConfirmHideSingle = async () => {
    if (!targetHideItem) return;
    setActionLoading(true);
    try {
      const res = await evaluationApi.tbmHideScore(targetHideItem._id, {
        reason: hideReason.trim(),
      });
      if (res?.success || res?.status === 200) {
        showToast('Đã ẩn điểm đánh giá thành công! Điểm không còn hiển thị với sinh viên.', 'success');
        setHideSingleModalOpen(false);
        setTargetHideItem(null);
        setHideReason('');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể ẩn điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Republish Handlers
  const handleOpenRepublishSingle = (item) => {
    setTargetRepublishItem(item);
    setRepublishReason('');
    setRepublishSingleModalOpen(true);
  };

  const handleConfirmRepublishSingle = async () => {
    if (!targetRepublishItem) return;
    setActionLoading(true);
    try {
      const res = await evaluationApi.tbmRepublishScore(targetRepublishItem._id, {
        reason: republishReason.trim(),
      });
      if (res?.success || res?.status === 200) {
        showToast('Đã công bố lại điểm thành công!', 'success');
        setRepublishSingleModalOpen(false);
        setTargetRepublishItem(null);
        setRepublishReason('');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể công bố lại điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Publish Handler
  const handlePublishSingle = async (item) => {
    setActionLoading(true);
    try {
      const res = await evaluationApi.tbmPublishScore(item._id);
      if (res?.success || res?.status === 200) {
        showToast('Công bố điểm thành công!', 'success');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể công bố điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Hide Handlers
  const handleOpenHideBulkModal = async () => {
    setHideBulkModalOpen(true);
    setLoadingAllInternships(true);
    setHideBulkReason('');
    try {
      const res = await evaluationApi.getForTbm({
        page: 1,
        limit: 1000,
        academicTermId: currentTerm?._id || '',
      });

      let list = [];
      if (res?.success && Array.isArray(res.data)) {
        list = res.data;
      } else {
        list = evaluations;
      }

      setAllTermInternships(list);

      const publishedIds = list
        .filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished))
        .map((it) => it._id);

      setSelectedHideIds(publishedIds);
    } catch (err) {
      console.error('Failed to load published internships for hide modal:', err);
      setAllTermInternships(evaluations);
      const publishedIds = evaluations
        .filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished))
        .map((it) => it._id);
      setSelectedHideIds(publishedIds);
    } finally {
      setLoadingAllInternships(false);
    }
  };

  const handleConfirmBulkHide = async () => {
    if (selectedHideIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một sinh viên để ẩn điểm.', 'error');
      return;
    }

    setHiding(true);
    try {
      const res = await evaluationApi.tbmHideScoresBulk({
        internshipIds: selectedHideIds,
        reason: hideBulkReason.trim(),
      });

      if (res?.success || res?.status === 200) {
        const hCount = res?.data?.hiddenCount ?? selectedHideIds.length;
        showToast(`Đã ẩn điểm của ${hCount} sinh viên thành công!`, 'success');
        setHideBulkModalOpen(false);
        setSelectedHideIds([]);
        setHideBulkReason('');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi ẩn điểm hàng loạt', 'error');
    } finally {
      setHiding(false);
    }
  };

  const toggleSelectHide = (id) => {
    setSelectedHideIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const publishedBulkList = useMemo(() => {
    return allTermInternships.filter(
      (it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished)
    );
  }, [allTermInternships]);

  const toggleSelectAllHide = () => {
    const allPublishedIds = publishedBulkList.map((it) => it._id);
    if (selectedHideIds.length === allPublishedIds.length) {
      setSelectedHideIds([]);
    } else {
      setSelectedHideIds(allPublishedIds);
    }
  };

  const handleOpenDeleteEvaluation = (item) => {
    setDeleteTarget(item);
    setDeleteEvalModalOpen(true);
  };

  const handleConfirmDeleteEvaluation = async () => {
    if (!deleteTarget) return;

    setActionLoading(true);
    try {
      const evalId = deleteTarget.evaluation?._id || deleteTarget._id;
      const res = await evaluationApi.tbmDeleteEvaluation(evalId);

      if (res?.success || res?.status === 200) {
        setEvaluations((prev) =>
          prev.map((it) => {
            if (String(it._id) === String(deleteTarget._id)) {
              return {
                ...it,
                evaluation: null,
                isScorePublished: false,
                status: it.status === 'COMPLETED' ? 'APPROVED' : it.status,
              };
            }
            return it;
          })
        );

        showToast(res?.message || 'Đã xóa kết quả đánh giá thành công!', 'success');
        setDeleteEvalModalOpen(false);
        setDetailModalOpen(false);
        setDeleteTarget(null);
        setSelectedInternship(null);
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể xóa kết quả đánh giá', 'error');
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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tổng hợp Đánh giá Thực tập Doanh nghiệp (TTDN)
            </h1>
          </div>
        </div>

        {/* Nút Công Bố & Ẩn Điểm */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenHideBulkModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Mở hộp thoại ẩn điểm các sinh viên đã được công bố điểm"
          >
            <EyeOff className="w-4 h-4" />
            <span>Ẩn điểm đã công bố</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPublishAllModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Mở hộp thoại công bố điểm cho toàn bộ sinh viên có điểm"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Công bố điểm tất cả</span>
          </button>
        </div>
      </div>

      {/* Main Content: Evaluations List */}
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Tìm theo SV, MSSV, DN tiếp nhận..."
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
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#123891] cursor-pointer"
            >
              {EVAL_STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Evaluations Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} cols={7} />
            </div>
          ) : evaluations.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Chưa có dữ liệu đánh giá"
              description="Không tìm thấy phiếu đánh giá thực tập nào phù hợp với bộ lọc."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-14">STT</th>
                    <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                    <th className="py-3.5 px-4">Doanh nghiệp tiếp nhận</th>
                    <th className="py-3.5 px-4">Giảng viên Giám sát</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Điểm số</th>
                    <th className="py-3.5 px-4 text-center">Kết quả</th>
                    <th className="py-3.5 px-4 text-center">Công bố điểm</th>
                    <th className="py-3.5 px-4 pr-6 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {evaluations.map((item, idx) => {
                    const hasValidScore = Boolean(
                      item.evaluation?.score !== undefined &&
                      item.evaluation?.score !== null &&
                      !isNaN(item.evaluation?.score)
                    );
                    const isItemPass = item.isPass || hasValidScore;
                    const isItemFail = item.isFail && !hasValidScore;
                    const isHidden = item.scorePublishStatus === 'HIDDEN';
                    const isPublished = !isHidden && Boolean(item.scorePublishStatus === 'PUBLISHED' || item.isScorePublished);

                    return (
                      <tr
                        key={item._id}
                        onClick={() => {
                          setSelectedInternship(item);
                          setDetailModalOpen(true);
                        }}
                        className="hover:bg-blue-50/40 transition cursor-pointer group"
                      >
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                          {(page - 1) * (pagination?.limit || 10) + idx + 1}
                        </td>

                        {/* Student */}
                        <td className="py-3.5 px-4 pl-6">
                          <div className="font-bold text-slate-900 group-hover:text-[#102d7d] transition">
                            {item.studentId?.userId?.fullName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {item.studentId?.studentCode} • {item.studentId?.className}
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <div className="font-semibold text-slate-800">
                            {item.companyId?.name || item.companyId?.companyName || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {item.position || 'Thực tập sinh'}
                          </div>
                        </td>

                        {/* Supervisor Lecturer */}
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {item.lecturerId ? (
                            <div>
                              <div className="font-semibold text-[#102d7d]">
                                {item.lecturerId?.academicTitle} {item.lecturerId?.userId?.fullName}
                              </div>
                              
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phân công</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-4">
                          {hasValidScore ? (
                            <div className="inline-flex items-baseline gap-1 font-bold text-[#102d7d] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                              <span className="text-sm">
                                {Number(item.evaluation.score) % 1 === 0
                                  ? Number(item.evaluation.score).toFixed(1)
                                  : item.evaluation.score}
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Chưa có điểm</span>
                          )}
                        </td>

                        {/* Result */}
                        <td className="py-3.5 px-4 text-center">
                          {isItemPass ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PASS (Đạt)</span>
                            </span>
                          ) : isItemFail ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              FAIL (Không đạt)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Đang thực hiện
                            </span>
                          )}
                        </td>

                        {/* Column: Công Bố Điểm */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isHidden ? (
                            <span
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 shadow-2xs"
                              title={
                                item.publishHistory?.[item.publishHistory.length - 1]?.reason
                                  ? `Lý do ẩn: ${item.publishHistory[item.publishHistory.length - 1].reason}`
                                  : 'Điểm đã được ẩn'
                              }
                            >
                              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              <span>Đã ẩn</span>
                            </span>
                          ) : isPublished ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã công bố</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
                              <span>Chưa công bố</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 pr-6 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInternship(item);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Xem chi tiết phiếu đánh giá"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Ẩn điểm đã công bố */}
                            {isPublished && (
                              <button
                                type="button"
                                onClick={() => handleOpenHideSingle(item)}
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                title="Ẩn điểm đã công bố của sinh viên này"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}

                            {/* Công bố lại điểm (cho sinh viên Đã ẩn) */}
                            {isHidden && hasValidScore && (
                              <button
                                type="button"
                                onClick={() => handleOpenRepublishSingle(item)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Công bố lại điểm cho sinh viên này"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {/* Công bố điểm lần đầu */}
                            {!isPublished && !isHidden && hasValidScore && (
                              <button
                                type="button"
                                onClick={() => handlePublishSingle(item)}
                                className="p-1.5 text-blue-600 hover:text-[#102d7d] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Công bố điểm cho sinh viên này"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {hasValidScore && item.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => handleOpenComplete(item)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Hoàn tất và khóa kết quả"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {hasValidScore && item.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteEvaluation(item)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Xóa kết quả đánh giá"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                page={page}
                pages={pagination.pages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CÔNG BỐ ĐIỂM TẤT CẢ (BULK PUBLISH MODAL) */}
      {publishAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Xác nhận công bố điểm Thực tập Doanh nghiệp</h3>
                  <p className="text-xs text-emerald-100">
                    Chọn các đề tài/sinh viên sẽ được công bố điểm chính thức
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishAllModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader Summary & Controls */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 shrink-0 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAllEligible}
                  className="font-bold text-[#123891] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  {selectedPublishIds.length === eligibleCount && eligibleCount > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#123891]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả sinh viên có điểm</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 font-semibold">
                    Đủ điều kiện có điểm: <strong>{eligibleCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100/70 text-rose-800 font-semibold">
                    Chưa có điểm: <strong>{ineligibleCount}</strong>
                  </span>
                  <span className="text-slate-600 ml-1">
                    (Đã chọn <strong className="text-emerald-700 font-bold">{selectedPublishIds.length}</strong>)
                  </span>
                </div>
              </div>

              {ineligibleCount > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Có <strong>{ineligibleCount}</strong> sinh viên chưa có điểm đánh giá từ Giảng viên Giám sát. Hệ thống chỉ công bố cho sinh viên đã có điểm và bỏ qua các trường hợp chưa đủ điều kiện.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Body: List of Students */}
            <div className="p-6 overflow-y-auto space-y-2.5 text-xs flex-1">
              {loadingAllInternships ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#123891]" />
                  <span>Đang tải danh sách sinh viên...</span>
                </div>
              ) : sortedBulkList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Không có hồ sơ thực tập nào trong đợt này.
                </div>
              ) : (
                sortedBulkList.map((item) => {
                  const hasScore = Boolean(
                    item.evaluation?.score !== undefined &&
                    item.evaluation?.score !== null &&
                    !isNaN(item.evaluation?.score)
                  );
                  const isChecked = selectedPublishIds.includes(item._id);
                  const isPublished = Boolean(item.isScorePublished);

                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleSelectPublish(item._id, hasScore)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        !hasScore
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed select-none opacity-60'
                          : isChecked
                          ? 'bg-emerald-50/60 border-emerald-300 text-slate-800 cursor-pointer shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {/* Left: Checkbox + Student Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={!hasScore}
                          checked={isChecked}
                          onChange={() => {}} // Handled by container onClick
                          className={`w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 ${
                            !hasScore ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${hasScore ? 'text-slate-900' : 'text-slate-400'}`}>
                              {item.studentId?.userId?.fullName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              ({item.studentId?.studentCode || '—'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            DN: <strong>{item.companyId?.name || item.companyId?.companyName || '—'}</strong>
                            {item.lecturerId?.userId?.fullName && (
                              <span> • GVGS: {item.lecturerId?.academicTitle || 'ThS.'} {item.lecturerId?.userId?.fullName}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Score Status / Disabled Badge */}
                      <div className="shrink-0 text-right">
                        {hasScore ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-baseline gap-1 font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                              <span className="text-sm">
                                {Number(item.evaluation.score) % 1 === 0
                                  ? Number(item.evaluation.score).toFixed(1)
                                  : item.evaluation.score}
                              </span>
                              <span className="text-[10px] text-slate-500">/ 10</span>
                            </div>
                            {isPublished && (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                ✓ Đã công bố trước đó
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>Chưa có điểm — Không thể công bố</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                Chỉ công bố cho những sinh viên được chọn.
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPublishAllModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={publishing || selectedPublishIds.length === 0}
                  onClick={handleConfirmBulkPublish}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  {publishing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang công bố...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Xác nhận công bố ({selectedPublishIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 1. Evaluation Detail Modal */}
      {detailModalOpen && selectedInternship && (
        <EvaluationDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedInternship(null);
          }}
          internship={selectedInternship}
          onDeleteEvaluation={handleOpenDeleteEvaluation}
        />
      )}

      {/* 2. Complete / Lock Confirmation Modal */}
      {completeModalOpen && targetInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-slate-900 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Hoàn tất kết quả thực tập</h3>
                <p className="text-xs text-slate-500">Khóa điểm và chuyển sang trạng thái COMPLETED</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xác nhận hoàn tất đợt thực tập cho sinh viên{' '}
              <strong>{targetInternship.studentId?.userId?.fullName}</strong> ({targetInternship.studentId?.studentCode})? Sau khi khóa, điểm số sẽ không thể chỉnh sửa.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCompleteModalOpen(false);
                  setTargetInternship(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Đang lưu...' : 'Xác nhận hoàn tất'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Evaluation Modal */}
      {deleteEvalModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700 pb-3 border-b border-rose-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-900">Xóa kết quả chấm điểm</h3>
                <p className="text-xs text-rose-600">Cho phép Giảng viên Giám sát chấm lại</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa kết quả đánh giá của sinh viên{' '}
              <strong>{deleteTarget.studentId?.userId?.fullName}</strong> ({deleteTarget.studentId?.studentCode})? Sau khi xóa, Giảng viên Giám sát sẽ có thể chấm điểm lại.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteEvalModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeleteEvaluation}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Hide Single Score Modal */}
      {hideSingleModalOpen && targetHideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-700 pb-3 border-b border-amber-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-amber-900">Ẩn điểm đã công bố</h3>
                <p className="text-xs text-amber-700">Tạm thời không hiển thị điểm với sinh viên</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Bạn có chắc chắn muốn ẩn điểm của sinh viên{' '}
                <strong>{targetHideItem.studentId?.userId?.fullName}</strong> (MSSV:{' '}
                <strong>{targetHideItem.studentId?.studentCode}</strong>)?
              </p>
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">Lưu ý sau khi ẩn điểm:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  <li>Điểm số sẽ <strong>ngay lập tức không hiển thị</strong> trên Cổng sinh viên.</li>
                  <li>Điểm, nhận xét và dữ liệu đánh giá <strong>vẫn được giữ nguyên</strong> trong Database.</li>
                  <li>Trạng thái cập nhật thành <strong>Đã ẩn</strong> và bạn có thể công bố lại bất cứ khi nào.</li>
                </ul>
              </div>
            </div>

            {/* Lý do ẩn điểm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Lý do ẩn điểm</span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </label>
              <textarea
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                placeholder="Nhập lý do ẩn điểm (ví dụ: Cần rà soát cột điểm, kiểm tra lại hồ sơ...)"
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setHideSingleModalOpen(false);
                  setTargetHideItem(null);
                  setHideReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmHideSingle}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{actionLoading ? 'Đang ẩn...' : 'Xác nhận ẩn điểm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Republish Single Score Modal */}
      {republishSingleModalOpen && targetRepublishItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-700 pb-3 border-b border-emerald-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-900">Công bố lại điểm TTDN</h3>
                <p className="text-xs text-emerald-700">Hiển thị lại điểm số cho sinh viên</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Xác nhận công bố lại điểm cho sinh viên{' '}
                <strong>{targetRepublishItem.studentId?.userId?.fullName}</strong> (MSSV:{' '}
                <strong>{targetRepublishItem.studentId?.studentCode}</strong>).
              </p>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <p>
                  Điểm số được công bố lại: <strong>{targetRepublishItem.evaluation?.score} / 10</strong>
                </p>
                <p className="text-slate-600">
                  (Sử dụng dữ liệu điểm đã lưu trước đó, không tạo bản ghi mới và không gửi lại thông báo trùng lặp).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Ghi chú công bố lại</span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </label>
              <textarea
                value={republishReason}
                onChange={(e) => setRepublishReason(e.target.value)}
                placeholder="Nhập ghi chú hoặc lý do công bố lại..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setRepublishSingleModalOpen(false);
                  setTargetRepublishItem(null);
                  setRepublishReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRepublishSingle}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{actionLoading ? 'Đang công bố...' : 'Xác nhận công bố lại'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bulk Hide Modal */}
      {hideBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Ẩn điểm đã công bố hàng loạt</h3>
                  <p className="text-xs text-amber-100">
                    Chọn các sinh viên cần ẩn điểm trên Cổng sinh viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHideBulkModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Bar & Reason Input */}
            <div className="p-4 bg-amber-50/50 border-b border-amber-100 space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAllHide}
                  className="font-bold text-amber-900 hover:text-amber-700 inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  {selectedHideIds.length === publishedBulkList.length && publishedBulkList.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả ({publishedBulkList.length})</span>
                </button>

                <span className="text-slate-600 text-xs">
                  (Đã chọn <strong className="text-amber-700 font-bold">{selectedHideIds.length}</strong>)
                </span>
              </div>

              {/* Lý do ẩn */}
              <div>
                <input
                  type="text"
                  value={hideBulkReason}
                  onChange={(e) => setHideBulkReason(e.target.value)}
                  placeholder="Lý do ẩn điểm hàng loạt (tùy chọn)..."
                  className="w-full text-xs px-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
              {loadingAllInternships ? (
                <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Đang tải danh sách sinh viên...</span>
                </div>
              ) : publishedBulkList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không có sinh viên nào đang ở trạng thái đã công bố điểm trong học kỳ này.
                </div>
              ) : (
                publishedBulkList.map((item) => {
                  const isChecked = selectedHideIds.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleSelectHide(item._id)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isChecked
                          ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 text-amber-600">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-amber-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {item.studentId?.userId?.fullName || 'Sinh viên'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MSSV: <strong>{item.studentId?.studentCode}</strong> • {item.companyId?.name || 'Doanh nghiệp'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-baseline gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <span className="text-sm">{item.evaluation?.score}</span>
                          <span className="text-[10px] text-slate-500">/ 10</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                Chỉ ẩn điểm cho các sinh viên được tích chọn.
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setHideBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={hiding || selectedHideIds.length === 0}
                  onClick={handleConfirmBulkHide}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  {hiding ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang ẩn...</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Xác nhận ẩn điểm ({selectedHideIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TbmEvaluationManagement;
