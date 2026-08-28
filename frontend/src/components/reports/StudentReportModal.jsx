import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import reportApi from '../../api/reportApi';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Send,
  Save,
  AlertCircle,
  Paperclip,
  Upload,
  CheckCircle2,
  X,
  FileCheck,
} from 'lucide-react';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];

const StudentReportModal = ({ isOpen, onClose, internship, onCreated }) => {
  const [reportType, setReportType] = useState('WEEKLY');
  const [weekNumber, setWeekNumber] = useState(1);
  const [monthNumber, setMonthNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check Extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Định dạng file không được hỗ trợ. Vui lòng chọn .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx');
      showToast('Định dạng file không được hỗ trợ.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check Size
    if (file.size > MAX_FILE_SIZE) {
      setError('File vượt quá dung lượng cho phép (tối đa 15MB).');
      showToast('File vượt quá dung lượng cho phép.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
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

  const handleSubmit = async (targetStatus) => {
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề báo cáo');
      return;
    }

    if (reportType === 'WEEKLY' && (!weekNumber || Number(weekNumber) < 1 || Number(weekNumber) > 52)) {
      setError('Vui lòng nhập số tuần hợp lệ (từ 1 đến 52)');
      return;
    }

    if (reportType === 'MONTHLY' && (!monthNumber || Number(monthNumber) < 1 || Number(monthNumber) > 12)) {
      setError('Vui lòng chọn số tháng hợp lệ (từ 1 đến 12)');
      return;
    }

    // Must have a file when submitting
    if (targetStatus === 'SUBMITTED' && !selectedFile) {
      setError('Vui lòng chọn file báo cáo.');
      showToast('Vui lòng chọn file báo cáo.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('internshipId', internship._id);
      formData.append('reportType', reportType);
      formData.append('title', title.trim());
      formData.append('status', targetStatus);

      if (reportType === 'WEEKLY') {
        formData.append('weekNumber', Number(weekNumber));
      } else if (reportType === 'MONTHLY') {
        formData.append('monthNumber', Number(monthNumber));
      }

      if (content.trim()) {
        formData.append('content', content.trim());
      }

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await reportApi.create(formData);

      showToast(
        targetStatus === 'DRAFT'
          ? 'Đã lưu bản nháp báo cáo thành công!'
          : 'Nộp báo cáo thực tập thành công!',
        'success',
      );

      // Reset form
      setTitle('');
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setReportType('WEEKLY');
      setWeekNumber(1);
      setMonthNumber(1);

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể tạo báo cáo thực tập');
      showToast(err.message || 'Không thể tạo báo cáo thực tập', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nộp Báo cáo Thực tập Doanh nghiệp"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Internship Banner */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-indigo-950 flex justify-between items-center">
          <div>
            <div className="font-bold text-sm">{internship.position}</div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              Đơn vị: <strong>{internship.companyId?.name}</strong>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 shadow-2xs">
            Hồ sơ hợp lệ
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Report Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Loại báo cáo <span className="text-rose-500">*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="WEEKLY">Báo cáo tuần (WEEKLY)</option>
              <option value="MONTHLY">Báo cáo tháng (MONTHLY)</option>
              <option value="FINAL">Báo cáo tổng kết (FINAL)</option>
            </select>
          </div>

          {/* Week number if WEEKLY */}
          {reportType === 'WEEKLY' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Báo cáo Tuần số <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                placeholder="VD: 1, 2, 3..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          )}

          {/* Month number if MONTHLY */}
          {reportType === 'MONTHLY' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Báo cáo Tháng thứ <span className="text-rose-500">*</span>
              </label>
              <select
                value={monthNumber}
                onChange={(e) => setMonthNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Tiêu đề báo cáo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Báo cáo kết quả thực tập tuần 1 - Tìm hiểu quy trình công ty"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Note / Description (Optional) */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Ghi chú / Tóm tắt báo cáo (Tùy chọn)</span>
            <span className="text-[10px] text-slate-400 font-normal">Không thay thế file đính kèm</span>
          </label>
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ghi chú ngắn gọn cho Giảng viên hướng dẫn (nếu có)..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
          />
        </div>

        {/* File Upload Section (Choose File) */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700">
            File báo cáo đính kèm <span className="text-rose-500">*</span>
          </label>

          {/* Hidden native input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-indigo-600 hover:underline">
                  Nhấn để chọn file báo cáo từ máy tính
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hỗ trợ định dạng: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx (Tối đa 15MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate text-xs">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã sẵn sàng tải lên
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
                >
                  Đổi file
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Xóa file đã chọn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Hủy
          </button>

          <div className="flex items-center gap-2">
            {/* Save Draft button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('DRAFT')}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang lưu...' : 'Lưu bản nháp'}</span>
            </button>

            {/* Submit button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('SUBMITTED')}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang nộp...' : 'Nộp báo cáo'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StudentReportModal;
