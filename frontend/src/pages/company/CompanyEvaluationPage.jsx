import React, { useState, useEffect, useCallback } from 'react';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import CompanyEvaluationModal from '../../components/evaluations/CompanyEvaluationModal';
import EvaluationDetailModal from '../../components/evaluations/EvaluationDetailModal';
import InternshipEvaluationDoc from '../../components/documents/InternshipEvaluationDoc';
import DocumentViewerModal from '../../components/documents/DocumentViewerModal';

import {
  Building2,
  Award,
  Edit,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  Printer,
} from 'lucide-react';

const EVAL_STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'UNASSESSED', label: 'Chưa đánh giá' },
  { value: 'DRAFT', label: 'Bản nháp (DRAFT)' },
  { value: 'SUBMITTED', label: 'Đã gửi (SUBMITTED)' },
];

const CompanyEvaluationPage = () => {
  const [internships, setInternships] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);

  const { showToast } = useToast();

  const fetchInternships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await evaluationApi.getCompanyInternships({
        page,
        limit: 10,
        search,
        status,
      });

      if (res.success) {
        setInternships(res.data || []);
        setCompanyInfo(res.company || null);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(
        err.message || 'Không thể tải danh sách sinh viên thực tập',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, showToast]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
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
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs tracking-wider uppercase">
            <Building2 className="w-4 h-4" /> Cổng Doanh Nghiệp Đối Tác
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Đánh Giá Kết Quả Sinh Viên Thực Tập
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Doanh nghiệp: <strong className="text-slate-800">{companyInfo?.name || 'Doanh nghiệp'}</strong> • Mã: <span className="font-mono text-amber-700 font-bold">{companyInfo?.code || '—'}</span>
          </p>
        </div>

        <button
          onClick={fetchInternships}
          className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition self-start sm:self-center"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => handleFilterChange(setSearch, val)}
              placeholder="Tìm theo MSSV, Tên SV, Vị trí thực tập..."
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            >
              {EVAL_STATUS_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : internships.length === 0 ? (
          <EmptyState
            title="Chưa có sinh viên thực tập"
            description="Hiện không tìm thấy sinh viên nào đang thực tập tại quý doanh nghiệp theo bộ lọc đã chọn."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                  <th className="py-3.5 px-4">Vị trí thực tập</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Trạng thái đánh giá</th>
                  <th className="py-3.5 px-4">Điểm đánh giá</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {internships.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedInternship(item);
                      if (item.evaluation?.status === 'SUBMITTED') {
                        setDetailModalOpen(true);
                      } else {
                        setEvalModalOpen(true);
                      }
                    }}
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4 pl-6">
                      <div className="font-semibold text-slate-900 text-xs">
                        {item.studentId?.userId?.fullName}
                      </div>
                      <div className="text-[11px] text-amber-700 font-mono">
                        MSSV: {item.studentId?.studentCode} • {item.studentId?.className}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                      {item.position}
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{formatDate(item.startDate)}</div>
                      <div className="text-slate-400 text-[11px]">đến {formatDate(item.endDate)}</div>
                    </td>

                    {/* Evaluation Status */}
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
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
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
                        {(item.evaluation?.status === 'SUBMITTED' || item.status === 'COMPLETED' || item.evaluation?.status === 'CONFIRMED') && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedInternship(item);
                                setDocModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition"
                              title="In phiếu đánh giá thực tập này"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In phiếu</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedInternship(item);
                                setDetailModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem</span>
                            </button>
                          </>
                        )}

                        {/* HIDE Edit button if COMPLETED */}
                        {item.status !== 'COMPLETED' && item.evaluation?.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => {
                              setSelectedInternship(item);
                              setEvalModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>
                              {item.evaluation?.status === 'SUBMITTED'
                                ? 'Sửa phiếu'
                                : 'Đánh giá'}
                            </span>
                          </button>
                        )}
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

      {/* Modals */}
      <CompanyEvaluationModal
        isOpen={evalModalOpen}
        onClose={() => {
          setEvalModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
        company={companyInfo}
        onSaved={fetchInternships}
      />

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
    </div>
  );
};

export default CompanyEvaluationPage;
