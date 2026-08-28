import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  Link2,
  RotateCcw,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

const EVAL_STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'SUBMITTED', label: 'Đã gửi (SUBMITTED)' },
  { value: 'CONFIRMED', label: 'Hoàn tất (COMPLETED)' },
  { value: 'DRAFT', label: 'Bản nháp (DRAFT)' },
  { value: 'UNASSESSED', label: 'Chưa đánh giá' },
];

const TbmEvaluationManagement = () => {
  const location = useLocation();
  const { currentTerm } = useAcademicTerm();
  const [activeTab, setActiveTab] = useState('evaluations'); // 'evaluations' | 'requests'

  // Tab 1: Evaluations State
  const [evaluations, setEvaluations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Tab 2: Evaluation Requests State
  const [requests, setRequests] = useState([]);
  const [reqPagination, setReqPagination] = useState(null);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatus, setReqStatus] = useState('');
  const [reqPage, setReqPage] = useState(1);
  const [resettingId, setResettingId] = useState(null);

  // Modal
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [targetInternship, setTargetInternship] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      if (res.success) {
        showToast('Đã hoàn tất đánh giá thực tập và khóa phiếu thành công!', 'success');
        setCompleteModalOpen(false);
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
      let res = await evaluationApi.getForTbm({
        page,
        limit: 10,
        search,
        status,
        academicTermId: currentTerm?._id || '',
      });

      if ((!res?.success || !res?.data?.length) && currentTerm?._id && !search && !status) {
        const fallbackRes = await evaluationApi.getForTbm({
          page,
          limit: 10,
          search,
          status,
        });
        if (fallbackRes?.success && fallbackRes?.data?.length) {
          res = fallbackRes;
        }
      }

      if (res?.success) {
        setEvaluations(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách phiếu đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, currentTerm?._id, showToast]);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await evaluationApi.tbmGetAllEvaluationRequests({
        page: reqPage,
        limit: 10,
        search: reqSearch,
        status: reqStatus,
      });
      if (res.success) {
        setRequests(res.data || []);
        setReqPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách yêu cầu link đánh giá', 'error');
    } finally {
      setReqLoading(false);
    }
  }, [reqPage, reqSearch, reqStatus, showToast]);

  useEffect(() => {
    if (activeTab === 'evaluations') {
      fetchEvaluations();
    } else {
      fetchRequests();
    }
  }, [activeTab, fetchEvaluations, fetchRequests, location.key, location.state]);

  const handleResetRequest = async (requestId, studentName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn cấp quyền cho sinh viên "${studentName}" tạo lại link đánh giá mới?`)) {
      return;
    }

    setResettingId(requestId);
    try {
      const res = await evaluationApi.tbmResetEvaluationRequest(requestId);
      if (res.success) {
        showToast(res.message || 'Đã cho phép sinh viên tạo lại link đánh giá.', 'success');
        fetchRequests();
      }
    } catch (err) {
      showToast(err.message || 'Không thể cấp lại quyền tạo link', 'error');
    } finally {
      setResettingId(null);
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
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs tracking-wider uppercase">
            <Award className="w-4 h-4" /> Quản Lý Đánh Giá Thực Tập
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Tổng Hợp Đánh Giá & Quản Lý Link Doanh Nghiệp (TTDN)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi kết quả đánh giá, kỹ năng chuyên môn, quản lý link đánh giá và cấp quyền tạo lại link cho sinh viên
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'evaluations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kết quả đánh giá
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Yêu cầu link & Cấp quyền</span>
          </button>
        </div>
      </div>

      {/* TAB 1: EVALUATIONS LIST */}
      {activeTab === 'evaluations' && (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Tìm kiếm MSSV, họ tên, công ty..."
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                className="p-2 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition cursor-pointer"
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
                <LoadingSkeleton rows={5} cols={6} />
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
                      <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                      <th className="py-3.5 px-4">Doanh nghiệp tiếp nhận</th>
                      <th className="py-3.5 px-4">Giảng viên hướng dẫn</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4">Điểm số</th>
                      <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {evaluations.map((item) => (
                      <tr
                        key={item._id}
                        onClick={() => {
                          setSelectedInternship(item);
                          setDetailModalOpen(true);
                        }}
                        className="hover:bg-amber-50/40 transition cursor-pointer group"
                      >
                        {/* Student */}
                        <td className="py-3.5 px-4 pl-6">
                          <div className="font-bold text-slate-900 group-hover:text-amber-900 transition">
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

                        {/* Lecturer */}
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {item.lecturerId ? (
                            <div>
                              <div className="font-semibold text-indigo-700">
                                {item.lecturerId?.academicTitle} {item.lecturerId?.userId?.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {item.lecturerId?.lecturerCode}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-600 text-[11px]">Chưa phân công</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {item.status === 'COMPLETED' || item.evaluation?.status === 'CONFIRMED' ? (
                            <StatusBadge status="COMPLETED" size="sm" />
                          ) : item.evaluation ? (
                            <StatusBadge status={item.evaluation.status} size="sm" />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" /> Chưa đánh giá
                            </span>
                          )}
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-4 text-xs font-bold">
                          {item.evaluation?.score !== undefined && item.evaluation?.score !== null ? (
                            <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              {item.evaluation.score} / 10
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 pr-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If evaluated and not completed -> Show [ Hoàn tất ] button */}
                            {item.evaluation?.score !== undefined &&
                              item.evaluation?.score !== null &&
                              item.status !== 'COMPLETED' &&
                              item.evaluation?.status !== 'CONFIRMED' && (
                                <button
                                  onClick={() => handleOpenComplete(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
                                  title="Xác nhận hoàn tất và khóa phiếu đánh giá"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Hoàn tất</span>
                                </button>
                              )}

                            {item.evaluation && (
                              <button
                                onClick={() => {
                                  setSelectedInternship(item);
                                  setDocModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition cursor-pointer"
                                title="In phiếu đánh giá của sinh viên này"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>In phiếu</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedInternship(item);
                                setDetailModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition cursor-pointer"
                              title="Xem chi tiết phiếu đánh giá"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem chi tiết</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-4">
              <Pagination pagination={pagination} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {/* TAB 2: EVALUATION REQUESTS MANAGEMENT & RESET */}
      {activeTab === 'requests' && (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <SearchInput
                value={reqSearch}
                onChange={(val) => {
                  setReqSearch(val);
                  setReqPage(1);
                }}
                placeholder="Tìm kiếm MSSV, họ tên sinh viên, công ty..."
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={reqStatus}
                onChange={(e) => {
                  setReqStatus(e.target.value);
                  setReqPage(1);
                }}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Tất cả trạng thái link</option>
                <option value="PENDING">Chờ DN đánh giá (PENDING)</option>
                <option value="SUBMITTED">Đã nộp (SUBMITTED)</option>
                <option value="EXPIRED">Đã hết hạn (EXPIRED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>

              <button
                onClick={fetchRequests}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                title="Tải lại danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${reqLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {reqLoading ? (
              <div className="p-6">
                <LoadingSkeleton rows={5} cols={6} />
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="Chưa có yêu cầu link đánh giá nào"
                description="Không tìm thấy yêu cầu tạo link đánh giá nào phù hợp."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                      <th className="py-3.5 px-4">Doanh nghiệp</th>
                      <th className="py-3.5 px-4">Ngày tạo link</th>
                      <th className="py-3.5 px-4">Trạng thái link</th>
                      <th className="py-3.5 px-4">Ngày nộp đánh giá</th>
                      <th className="py-3.5 px-4 pr-6 text-right">Quyền TBM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {requests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/60 transition">
                        {/* Student */}
                        <td className="py-3.5 px-4 pl-6">
                          <div className="font-bold text-slate-900">
                            {req.studentId?.userId?.fullName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            MSSV: {req.studentId?.studentCode}
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <div className="font-semibold text-slate-800">
                            {req.companyId?.companyName || req.companyId?.name || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                            Token: {req.token?.slice(0, 12)}...
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDate(req.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                              req.status === 'SUBMITTED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : req.status === 'EXPIRED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.status === 'SUBMITTED' && <CheckCircle2 className="w-3 h-3" />}
                            {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                            {req.status}
                          </span>
                        </td>

                        {/* Submitted At */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDate(req.submittedAt)}
                        </td>

                        {/* TBM Actions */}
                        <td className="py-3.5 px-4 pr-6 text-right">
                          <button
                            type="button"
                            disabled={resettingId === req._id}
                            onClick={() => handleResetRequest(req._id, req.studentId?.userId?.fullName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                            title="Cho phép sinh viên tạo lại link đánh giá mới"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${resettingId === req._id ? 'animate-spin' : ''}`} />
                            <span>Cho phép tạo lại</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-4">
              <Pagination pagination={reqPagination} onPageChange={setReqPage} />
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <EvaluationDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
      />

      {/* Document B Viewer Modal */}
      <DocumentViewerModal
        isOpen={docModalOpen}
        onClose={() => {
          setDocModalOpen(false);
          setSelectedInternship(null);
        }}
        title="Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp"
      >
        <InternshipEvaluationDoc internship={selectedInternship} />
      </DocumentViewerModal>

      {/* Complete Confirmation Modal */}
      {completeModalOpen && targetInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Hoàn Tất Đánh Giá</h3>
                <p className="text-xs text-slate-500">Khóa phiếu đánh giá và nghiệm thu kết quả</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
              <p className="text-slate-600 mb-2">
                Bạn có chắc chắn muốn hoàn tất phiếu đánh giá thực tập của sinh viên:
              </p>
              <div>
                <span className="text-slate-400">Sinh viên:</span>
                <strong className="block text-slate-900 mt-0.5">
                  {targetInternship.studentId?.userId?.fullName} ({targetInternship.studentId?.studentCode})
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400">Doanh nghiệp:</span>
                  <div className="font-semibold text-slate-800">
                    {targetInternship.companyId?.name || targetInternship.companyId?.companyName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Điểm đánh giá:</span>
                  <div className="font-bold text-amber-700">
                    {targetInternship.evaluation?.score !== undefined ? `${targetInternship.evaluation.score} / 10` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Sau khi hoàn tất:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11.5px] pl-1">
                <li>Không thể chỉnh sửa nội dung đánh giá.</li>
                <li>Không thể thay đổi điểm.</li>
                <li>Chỉ có thể xem và in phiếu.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TbmEvaluationManagement;
