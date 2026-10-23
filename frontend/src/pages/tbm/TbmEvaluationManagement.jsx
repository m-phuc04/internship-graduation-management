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
import InternshipEvaluationDoc from '../../components/documents/InternshipEvaluationDoc';
import DocumentViewerModal from '../../components/documents/DocumentViewerModal';

import {
  Award,
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  Printer,
  Trash2,
  Send,
  CheckSquare,
  Square,
  AlertCircle,
  Users,
  Check,
  X,
} from 'lucide-react';

const EVAL_STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PUBLISHED', label: 'Đã công bố điểm' },
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
  const [docModalOpen, setDocModalOpen] = useState(false);
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
      if (status === 'PUBLISHED' || status === 'UNPUBLISHED') {
        filterStatus = ''; // Filter client-side
      }

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
          list = list.filter((it) => it.isScorePublished);
        } else if (status === 'UNPUBLISHED') {
          list = list.filter((it) => !it.isScorePublished);
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

  // Single Publish Handler
  const handlePublishSingle = async (item) => {
    const hasValidScore = Boolean(
      item.evaluation?.score !== undefined &&
      item.evaluation?.score !== null &&
      !isNaN(item.evaluation?.score)
    );

    if (!hasValidScore) {
      showToast('Sinh viên chưa có điểm đánh giá từ Giảng viên Giám sát. Không thể công bố điểm!', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await evaluationApi.tbmPublishScore(item._id);
      if (res?.success || res?.status === 200) {
        showToast(`Đã công bố điểm cho sinh viên ${item.studentId?.userId?.fullName || 'thành công'}!`, 'success');
        setEvaluations((prev) =>
          prev.map((it) =>
            String(it._id) === String(item._id)
              ? { ...it, isScorePublished: true, scorePublishedAt: new Date() }
              : it
          )
        );
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể công bố điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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
      showToast('Vui lòng chọn ít nhất một sinh viên có điểm để công bố.', 'error');
      return;
    }

    setPublishing(true);
    try {
      const res = await evaluationApi.tbmPublishScoresBulk({
        internshipIds: selectedPublishIds,
      });

      if (res?.success || res?.status === 200) {
        showToast(
          res?.message || `Đã công bố điểm cho ${res?.data?.publishedCount || selectedPublishIds.length} sinh viên thành công!`,
          'success'
        );
        setPublishAllModalOpen(false);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi công bố điểm hàng loạt', 'error');
    } finally {
      setPublishing(false);
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

        {/* Nút Công Bố Điểm Tất Cả */}
        <div className="flex items-center gap-3">
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
        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Tìm theo SV, MSSV, DN tiếp nhận..."
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#123891]"
              >
                {EVAL_STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchEvaluations}
              className="p-2 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-xl transition cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
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
                    <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
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
                    const isPublished = Boolean(item.isScorePublished);

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
                              <div className="text-[11px] text-slate-400 font-mono">
                                {item.lecturerId?.lecturerCode}
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
                          {isPublished ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã công bố</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePublishSingle(item)}
                              className={`p-2 text-xs font-bold rounded-xl transition inline-flex items-center justify-center shadow-2xs cursor-pointer ${
                                hasValidScore
                                  ? 'bg-[#123891] hover:bg-[#102d7d] text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                              }`}
                              title={hasValidScore ? 'Công bố điểm cho sinh viên này' : 'Chưa có điểm — Nhấn để xem cảnh báo'}
                            >
                              <Send className="w-4 h-4" />
                            </button>
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

                            {hasValidScore && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInternship(item);
                                  setDocModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Xem và in biểu mẫu"
                              >
                                <Printer className="w-4 h-4" />
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
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-2">
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
                  <span>Chọn tất cả đề tài có điểm</span>
                </button>
              </div>

              <div className="text-slate-600">
                Đã chọn <strong className="text-emerald-700 font-bold">{selectedPublishIds.length}</strong> / <strong>{eligibleCount}</strong> sinh viên đủ điều kiện có điểm
              </div>
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
                          <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-200 text-slate-500 border border-slate-300">
                            Chưa có điểm — Vô hiệu hóa
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

      {/* 2. Document Viewer Modal */}
      {docModalOpen && selectedInternship && (
        <DocumentViewerModal
          isOpen={docModalOpen}
          onClose={() => {
            setDocModalOpen(false);
            setSelectedInternship(null);
          }}
          title="Phiếu Đánh Giá Thực Tập Doanh Nghiệp"
        >
          <InternshipEvaluationDoc internship={selectedInternship} />
        </DocumentViewerModal>
      )}

      {/* 3. Complete / Lock Confirmation Modal */}
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
    </div>
  );
};

export default TbmEvaluationManagement;
