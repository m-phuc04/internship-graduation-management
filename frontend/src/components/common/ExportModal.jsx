import React, { useState } from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  Download,
  X,
  GraduationCap,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  BookOpen,
} from 'lucide-react';

const ExportModal = ({
  isOpen,
  onClose,
  title = 'Xuất danh sách ra file Excel',
  type = 'INTERNSHIP', // 'INTERNSHIP' | 'THESIS'
  currentFilters = {},
  onExport,
  companies = [],
  lecturers = [],
}) => {
  const { terms, currentTerm } = useAcademicTerm();
  const { showSuccess, showError } = useToast();

  const [selectedTermId, setSelectedTermId] = useState(
    currentFilters.academicTermId || currentTerm?._id || ''
  );
  const [selectedStatus, setSelectedStatus] = useState(currentFilters.status || '');
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentFilters.companyId || '');
  const [selectedLecturerId, setSelectedLecturerId] = useState(currentFilters.lecturerId || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTriggerExport = async (isFiltered = false) => {
    try {
      setLoading(true);
      const exportParams = {
        academicTermId: selectedTermId,
        ...(isFiltered
          ? {
              status: selectedStatus,
              search: currentFilters.search || '',
              ...(type === 'INTERNSHIP' ? { companyId: selectedCompanyId } : { lecturerId: selectedLecturerId }),
            }
          : {}),
      };

      const response = await onExport(exportParams);

      // Trigger browser download from blob response
      const blob = new Blob([response.data || response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Extract filename from header or build default
      const defaultFilename =
        type === 'INTERNSHIP'
          ? `DanhSach_TTDN_${terms.find((t) => t._id === selectedTermId)?.code || 'Export'}.xlsx`
          : `DanhSach_KLTN_${terms.find((t) => t._id === selectedTermId)?.code || 'Export'}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', defaultFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess('Xuất danh sách thành công.');
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      showError('Không thể xuất danh sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Xuất file Excel (.xlsx) chuẩn định dạng lưu trữ & báo cáo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Filters */}
        <div className="p-6 space-y-4 text-xs">
          {/* Term Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Chọn Học kỳ & Năm học:
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold text-slate-800"
            >
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} — Năm học {t.academicYear} ({t.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Trạng thái:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700"
            >
              <option value="">Tất cả trạng thái</option>
              {type === 'INTERNSHIP' ? (
                <>
                  <option value="PENDING">Chờ duyệt (PENDING)</option>
                  <option value="APPROVED">Đã duyệt (APPROVED)</option>
                  <option value="INTERNING">Đang thực tập (INTERNING)</option>
                  <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                  <option value="REJECTED">Bị từ chối (REJECTED)</option>
                </>
              ) : (
                <>
                  <option value="PENDING_TBM_APPROVAL">Chờ TBM duyệt</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="ASSIGNED_REVIEWERS">Đã phân công PB</option>
                  <option value="IN_PROGRESS">Đang thực hiện</option>
                  <option value="GRADED">Đã có điểm</option>
                  <option value="COMPLETED">Hoàn tất (COMPLETED)</option>
                  <option value="REJECTED">Bị từ chối</option>
                </>
              )}
            </select>
          </div>

          {/* Type-Specific Filter (Company for TTDN / Lecturer for KLTN) */}
          {type === 'INTERNSHIP' && companies.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Doanh nghiệp:
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700"
              >
                <option value="">Tất cả doanh nghiệp</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'THESIS' && lecturers.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Giảng viên hướng dẫn / Phản biện:
              </label>
              <select
                value={selectedLecturerId}
                onChange={(e) => setSelectedLecturerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700"
              >
                <option value="">Tất cả giảng viên</option>
                {lecturers.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.academicTitle ? `${l.academicTitle}. ` : ''}{l.userId?.fullName || l.fullName} ({l.lecturerCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
            💡 File Excel sẽ xuất toàn bộ sinh viên thỏa điều kiện lọc của học kỳ được chọn, không bị giới hạn bởi phân trang.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Hủy
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTriggerExport(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang tạo file...' : 'Xuất kết quả đang lọc'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleTriggerExport(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang tạo file...' : 'Xuất tất cả'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
