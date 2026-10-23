import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import reportApi from '../../api/reportApi';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  Send,
  Save,
  AlertCircle,
  Paperclip,
  Upload,
  CheckCircle2,
  X,
  FileCheck,
  Calendar,
  Users,
} from 'lucide-react';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'];

const formatDateForInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StudentReportModal = ({
  isOpen,
  onClose,
  internship,
  targetWeek,
  editingReport,
  onCreated,
}) => {
  const [weekNumber, setWeekNumber] = useState(1);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFile, setExistingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (editingReport) {
        setWeekNumber(editingReport.weekNumber || 1);
        setWeekStartDate(formatDateForInput(editingReport.weekStartDate));
        setWeekEndDate(formatDateForInput(editingReport.weekEndDate));
        setTitle(editingReport.title || `Nhật ký tuần ${editingReport.weekNumber || 1}`);
        setContent(editingReport.content || '');
        setExistingFile(editingReport.file || null);
        setSelectedFile(null);
      } else if (targetWeek) {
        setWeekNumber(targetWeek.weekNumber);
        setWeekStartDate(formatDateForInput(targetWeek.startDate));
        setWeekEndDate(formatDateForInput(targetWeek.endDate));
        setTitle(`Nhật ký tuần ${targetWeek.weekNumber}`);
        setContent('');
        setExistingFile(null);
        setSelectedFile(null);
      } else {
        setWeekNumber(1);
        setWeekStartDate('');
        setWeekEndDate('');
        setTitle('Nhật ký tuần 1');
        setContent('');
        setExistingFile(null);
        setSelectedFile(null);
      }
      setError('');
    }
  }, [isOpen, targetWeek, editingReport]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check Extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Định dạng file không được hỗ trợ. Vui lòng chọn .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .zip, .rar');
      showToast('Định dạng file không được hỗ trợ.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check Size
    if (file.size > MAX_FILE_SIZE) {
      setError('File vượt quá dung lượng cho phép (tối đa 20MB).');
      showToast('File vượt quá dung lượng cho phép.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExistingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSubmit = async (targetStatus) => {
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề nhật ký');
      return;
    }

    if (!content.trim() && !selectedFile && !existingFile) {
      setError('Vui lòng nhập nội dung nhật ký hoặc tải lên file đính kèm.');
      showToast('Vui lòng nhập nội dung hoặc đính kèm file báo cáo.', 'error');
      return;
    }

    if (weekStartDate && weekEndDate) {
      if (new Date(weekEndDate) < new Date(weekStartDate)) {
        setError('Ngày kết thúc tuần phải sau hoặc bằng ngày bắt đầu tuần.');
        showToast('Ngày kết thúc tuần phải sau hoặc bằng ngày bắt đầu tuần.', 'error');
        return;
      }
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('reportType', 'WEEKLY');
      formData.append('weekNumber', String(weekNumber));
      if (weekStartDate) formData.append('weekStartDate', weekStartDate);
      if (weekEndDate) formData.append('weekEndDate', weekEndDate);
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('status', targetStatus);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (editingReport) {
        await reportApi.update(editingReport._id, formData);
        showToast(
          targetStatus === 'DRAFT'
            ? 'Đã lưu bản nháp nhật ký thành công!'
            : internship?.secondStudentId
            ? 'Cập nhật thành công! Nhật ký đã được gửi để Sinh viên 2 xác nhận.'
            : 'Cập nhật và gửi nhật ký cho GVGS thành công!',
          'success',
        );
      } else {
        if (!internship?._id) {
          throw new Error('Không tìm thấy thông tin hồ sơ thực tập.');
        }
        formData.append('internshipId', internship._id);
        await reportApi.create(formData);
        showToast(
          targetStatus === 'DRAFT'
            ? 'Đã lưu bản nháp nhật ký thành công!'
            : internship?.secondStudentId
            ? 'Đã gửi nhật ký! Đang chờ Sinh viên 2 kiểm tra và xác nhận.'
            : 'Gửi nhật ký thực tập cho GVHD thành công!',
          'success',
        );
      }

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể lưu nhật ký thực tập';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasStudent2 = !!internship?.secondStudentId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReport ? `Chỉnh sửa Nhật Ký Tuần ${weekNumber}` : `Ghi Nhật Ký Tuần ${weekNumber}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Student Group Notice */}
        {hasStudent2 && (
          <div className="p-3 bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs rounded-2xl flex items-start gap-2.5">
            <Users className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <div className="font-bold">Quy trình xác nhận 2 sinh viên</div>
              <div className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                Sau khi bạn gửi nhật ký, hệ thống sẽ gửi thông báo cho <strong>Sinh viên 2 ({internship.secondStudentId?.userId?.fullName || 'SV2'})</strong> để kiểm tra và xác nhận. Khi SV2 đồng ý, nhật ký mới được chuyển tới Giảng viên Giám sát.
              </div>
            </div>
          </div>
        )}

        {/* Week Info & Interactive Date Inputs */}
        <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white bg-[#123891] px-2.5 py-1 rounded-lg text-xs font-mono shadow-2xs">
                Tuần #{weekNumber}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Nhật ký thực tập định kỳ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-xs">
              <strong>Doanh nghiệp:</strong> {internship?.companyId?.name || '—'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#123891]" />
                <span>Thời gian thực hiện Tuần {weekNumber}</span>
              </label>
              <span className="text-[11px] text-slate-400">Tự nhập hoặc chọn ngày</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ngày bắt đầu tuần:
                </label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ngày kết thúc tuần:
                </label>
                <input
                  type="date"
                  value={weekEndDate}
                  min={weekStartDate || undefined}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                />
              </div>
            </div>

            {weekStartDate && weekEndDate && (
              <div className="text-[11px] text-[#123891] font-medium mt-2 flex items-center gap-1 bg-[#123891]/5 px-2.5 py-1 rounded-lg border border-[#123891]/10">
                <span>📅 Khoảng thời gian:</span>
                <strong>{formatDateDisplay(weekStartDate)} — {formatDateDisplay(weekEndDate)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tiêu đề nhật ký <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Ví dụ: Nhật ký tuần ${weekNumber} - Tìm hiểu quy trình và nghiệp vụ`}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
          />
        </div>

        {/* Text Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nội dung công việc thực hiện
            </label>
            <span className="text-[11px] text-slate-400">Có thể nhập văn bản hoặc đính kèm file</span>
          </div>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mô tả tóm tắt các công việc đã làm trong tuần, kết quả đạt được, khó khăn gặp phải và kế hoạch tuần tiếp theo..."
            className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition leading-relaxed resize-none"
          />
        </div>

        {/* File Upload Attachment */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            File đính kèm (nếu có)
          </label>

          {selectedFile || existingFile ? (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#123891] text-white flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#123891] truncate">
                    {selectedFile ? selectedFile.name : existingFile.originalName}
                  </div>
                  <div className="text-[10px] text-[#123891] font-mono">
                    {selectedFile ? formatFileSize(selectedFile.size) : formatFileSize(existingFile.size)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                title="Gỡ bỏ file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 border-2 border-dashed border-slate-200 hover:border-[#123891]/60 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-[#123891] flex items-center justify-center transition">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-700 group-hover:text-[#123891] transition">
                Bấm để chọn file đính kèm (.PDF, .DOCX, .ZIP,...)
              </div>
              <div className="text-[10px] text-slate-400">Dung lượng tối đa: 20MB</div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={ALLOWED_EXTENSIONS.join(',')}
            className="hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('SUBMITTED')}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-sm shadow-blue-200 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang gửi...' : hasStudent2 ? 'Gửi cho SV2 duyệt' : 'Nộp nhật ký'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default StudentReportModal;
