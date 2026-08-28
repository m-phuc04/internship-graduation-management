import React, { useState, useEffect, useCallback } from 'react';
import reportApi from '../../api/reportApi';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import StudentReportModal from '../../components/reports/StudentReportModal';
import StudentReportDetailModal from '../../components/reports/StudentReportDetailModal';

import {
  FileText,
  PlusCircle,
  Calendar,
  Award,
  Eye,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Paperclip,
} from 'lucide-react';

const StudentReportPage = () => {
  const [reports, setReports] = useState([]);
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter
  const [filterType, setFilterType] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { showToast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, internRes] = await Promise.allSettled([
        reportApi.getMyReports(),
        internshipApi.getMyInternship(),
      ]);

      let internData = null;
      if (internRes.status === 'fulfilled' && internRes.value?.success) {
        internData = internRes.value.data?.internship || internRes.value.data || null;
      }

      if (reportRes.status === 'fulfilled' && reportRes.value?.success) {
        setReports(reportRes.value.data || []);
        if (!internData) {
          internData = reportRes.value.internship || null;
        }
      }
      setInternship(internData);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách báo cáo', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isReady =
    internship &&
    ['APPROVED', 'INTERNING', 'PENDING_SUPERVISOR_ACCEPTANCE', 'COMPLETED'].includes(
      internship.status,
    );
  const canSubmitNew =
    internship &&
    ['APPROVED', 'INTERNING', 'PENDING_SUPERVISOR_ACCEPTANCE'].includes(
      internship.status,
    );

  const filteredReports = reports.filter((r) => {
    if (filterType === 'ALL') return true;
    return r.reportType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
            <FileText className="w-4 h-4" /> Báo Cáo Tiến Độ Thực Tập
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Báo Cáo Thực Tập Của Tôi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nộp báo cáo định kỳ hàng tuần, hàng tháng và báo cáo tổng kết cho Giảng viên hướng dẫn
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchReports}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canSubmitNew && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nộp báo cáo mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Internship Check Warning if not ready */}
      {!loading && !isReady && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Hồ sơ thực tập chưa sẵn sàng nộp báo cáo</div>
            <div className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
              Bạn chỉ có thể nộp báo cáo thực tập định kỳ sau khi hồ sơ thực tập đã được Trưởng Bộ Môn (TBM) phê duyệt (Trạng thái APPROVED hoặc INTERNING).
            </div>
          </div>
        </div>
      )}

      {/* Type Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'WEEKLY', 'MONTHLY', 'FINAL'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterType === type
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {type === 'ALL'
              ? 'Tất cả báo cáo'
              : type === 'WEEKLY'
              ? 'Báo cáo Tuần'
              : type === 'MONTHLY'
              ? 'Báo cáo Tháng'
              : 'Báo cáo Tổng kết (Final)'}
          </button>
        ))}
      </div>

      {/* Reports Table / Card List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={4} cols={5} />
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            title="Chưa có báo cáo nào"
            description="Bạn chưa nộp báo cáo nào trong đợt thực tập này. Hãy nhấn nút 'Nộp báo cáo mới' để bắt đầu."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-6">Loại / Đợt</th>
                  <th className="py-3.5 px-4">Tiêu đề báo cáo</th>
                  <th className="py-3.5 px-4">Ngày nộp</th>
                  <th className="py-3.5 px-4">Điểm GVHD</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReports.map((report) => (
                  <tr
                    key={report._id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setDetailModalOpen(true);
                    }}
                  >
                    {/* Report Type Badge */}
                    <td className="py-3.5 px-4 pl-6">
                      <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                        {report.reportType === 'WEEKLY'
                          ? `Tuần ${report.weekNumber}`
                          : report.reportType === 'MONTHLY'
                          ? `Tháng ${report.monthNumber}`
                          : 'Tổng kết'}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {report.title}
                      </div>
                      {report.file?.originalName ? (
                        <div className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[160px]">{report.file.originalName}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {report.content ? report.content.substring(0, 60) + '...' : 'Không có tóm tắt'}
                        </div>
                      )}
                    </td>

                    {/* Submitted At */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {formatDate(report.submittedAt || report.createdAt)}
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-xs font-bold">
                      {report.lecturerScore !== null ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {report.lecturerScore} / 10
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-normal">
                          Chưa chấm
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={report.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 pr-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setDetailModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentReportModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        internship={internship}
        onCreated={fetchReports}
      />

      <StudentReportDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
      />
    </div>
  );
};

export default StudentReportPage;
