import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Send,
  MailCheck,
  MailX,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';

const ImportStudentExcelModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('UPLOAD'); // 'UPLOAD' | 'PREVIEW' | 'RESULT'
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Dữ liệu Preview từ Backend
  const [previewData, setPreviewData] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'VALID' | 'INVALID'

  // Dữ liệu kết quả sau khi Import
  const [importResult, setImportResult] = useState(null);
  const [resendingCode, setResendingCode] = useState(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [resultTab, setResultTab] = useState('FAILED'); // 'FAILED' | 'ALL'

  // Tải file Excel mẫu
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await adminApi.getStudentExcelTemplate();
      const blob = new Blob([response.data || response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_SinhVien_IUH.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Đã tải xuống file Excel mẫu thành công', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể tải file Excel mẫu', 'error');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Chọn file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      showToast('Chỉ chấp nhận file định dạng Excel (.xlsx, .xls)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước file không được vượt quá 10MB', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Tải file lên để phân tích & xem trước
  const handleUploadAndPreview = async () => {
    if (!selectedFile) {
      showToast('Vui lòng chọn file Excel để tải lên', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await adminApi.previewStudentExcel(formData);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setStep('PREVIEW');
      } else {
        showToast(res.message || 'Lỗi khi kiểm tra dữ liệu file Excel', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi phân tích file Excel', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận tạo tài khoản cho các dòng hợp lệ
  const handleConfirmImport = async () => {
    if (!previewData || !previewData.rows) return;

    const validRows = previewData.rows.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) {
      showToast('Không có dòng dữ liệu hợp lệ nào để tạo tài khoản', 'error');
      return;
    }

    const confirmMsg = `Xác nhận tạo tài khoản cho ${validRows.length} sinh viên hợp lệ?\n(Hệ thống sẽ bỏ qua ${
      (previewData.summary?.error || 0) + (previewData.summary?.existed || 0)
    } dòng lỗi hoặc đã tồn tại)`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await adminApi.confirmImportStudents(validRows);
      if (res.success) {
        setImportResult(res.data);
        setStep('RESULT');
        showToast(res.message || 'Tạo tài khoản sinh viên thành công!', 'success');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo tài khoản từ file Excel', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sao chép văn bản vào clipboard
  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Đã sao chép vào bộ nhớ tạm', 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Sao chép toàn bộ danh sách tài khoản & mật khẩu gửi email thất bại
  const handleCopyAllFailed = () => {
    if (!importResult?.failedEmails || importResult.failedEmails.length === 0) return;
    const text = importResult.failedEmails
      .map(
        (item, idx) =>
          `${idx + 1}. MSSV: ${item.mssv} | Họ tên: ${item.fullName} | Email: ${item.email} | Mật khẩu: ${
            item.password || '—'
          }`
      )
      .join('\n');
    handleCopyText(text, 'all-failed');
    showToast(`Đã sao chép danh sách ${importResult.failedEmails.length} tài khoản gửi lỗi!`, 'success');
  };

  // Gửi lại email thông tin đăng nhập cho 1 sinh viên
  const handleResendSingleEmail = async (student) => {
    if (!student || !student.mssv) return;
    setResendingCode(student.mssv);
    try {
      const res = await adminApi.resendStudentCredentials({ mssv: student.mssv });
      const itemResult = res?.data?.results?.[0];
      if (res?.success && itemResult?.success) {
        showToast(`Đã cấp lại mật khẩu và máy chủ SMTP đã tiếp nhận email cho sinh viên ${student.mssv}!`, 'success');
        setImportResult((prev) => {
          if (!prev) return prev;
          const updatedFailed = (prev.failedEmails || []).filter((f) => f.mssv !== student.mssv);
          const currentSuccess = prev.summary?.emailSuccess || 0;
          const currentFailed = prev.summary?.emailFailed || 0;
          return {
            ...prev,
            failedEmails: updatedFailed,
            summary: {
              ...prev.summary,
              emailSuccess: currentSuccess + 1,
              emailFailed: Math.max(0, currentFailed - 1),
            },
          };
        });
      } else {
        const errDesc = itemResult?.emailError || res?.message || 'Gửi lại email thất bại';
        showToast(`Gửi email cho ${student.mssv} thất bại: ${errDesc}. Mật khẩu mới đã được cập nhật.`, 'warning');
        if (itemResult?.newPassword) {
          setImportResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              failedEmails: (prev.failedEmails || []).map((f) =>
                f.mssv === student.mssv
                  ? { ...f, password: itemResult.newPassword, error: itemResult.emailError }
                  : f
              ),
              createdStudents: (prev.createdStudents || []).map((c) =>
                c.mssv === student.mssv
                  ? { ...c, password: itemResult.newPassword, emailSent: false, emailError: itemResult.emailError }
                  : c
              ),
            };
          });
        }
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi gửi lại email', 'error');
    } finally {
      setResendingCode(null);
    }
  };

  // Gửi lại email cho tất cả sinh viên bị thất bại
  const handleResendAllFailedEmails = async () => {
    const failedList = importResult?.failedEmails || [];
    if (failedList.length === 0) return;

    setResendingAll(true);
    try {
      const mssvs = failedList.map((f) => f.mssv);
      const res = await adminApi.resendStudentCredentials({ mssvs });
      if (res?.success) {
        const results = res.data?.results || [];
        const successList = results.filter((r) => r.success);
        const successes = successList.map((r) => r.mssv);
        showToast(res.message || `Đã xử lý gửi lại cho ${failedList.length} sinh viên`, 'success');

        setImportResult((prev) => {
          if (!prev) return prev;
          const remainingFailed = (prev.failedEmails || [])
            .filter((f) => !successes.includes(f.mssv))
            .map((f) => {
              const match = results.find((r) => r.mssv === f.mssv);
              if (match && match.newPassword) {
                return { ...f, password: match.newPassword, error: match.emailError };
              }
              return f;
            });
          return {
            ...prev,
            failedEmails: remainingFailed,
            summary: {
              ...prev.summary,
              emailSuccess: (prev.summary?.emailSuccess || 0) + successes.length,
              emailFailed: remainingFailed.length,
            },
          };
        });
      } else {
        showToast(res?.message || 'Có lỗi khi gửi lại email', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi gửi lại email', 'error');
    } finally {
      setResendingAll(false);
    }
  };

  // Đặt lại modal về trạng thái ban đầu
  const handleResetModal = () => {
    setStep('UPLOAD');
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setFilterStatus('ALL');
    setResendingCode(null);
    setResendingAll(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  // Lọc dòng hiển thị theo trạng thái
  const filteredRows = (previewData?.rows || []).filter((row) => {
    if (filterStatus === 'VALID') return row.status === 'VALID';
    if (filterStatus === 'INVALID') return row.status === 'ERROR' || row.status === 'EXISTED';
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title="Import danh sách sinh viên bằng Excel"
      subtitle="Tải danh sách sinh viên từ file Excel, kiểm tra hợp lệ và tự động khởi tạo tài khoản"
      maxWidth="max-w-4xl"
    >
      <div className="p-4 sm:p-6 space-y-5">
        {/* ================= BƯỚC 1: CHỌN FILE VÀ TẢI MẪU ================= */}
        {step === 'UPLOAD' && (
          <div className="space-y-5">
            {/* Hướng dẫn và tải file mẫu */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-[#123891] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-[#123891]">Quy định chuẩn dữ liệu Excel:</p>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                    <li>Các cột bắt buộc: <strong>STT, MSSV, Họ và tên, Email, Lớp</strong></li>
                    <li>MSSV gồm đúng <strong>8 chữ số</strong></li>
                    <li>Email chấp nhận mọi nhà cung cấp hợp lệ (Gmail, Outlook, IUH...), không bắt buộc dùng email IUH và không yêu cầu MSSV trùng đầu email</li>
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-blue-50 text-[#123891] border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingTemplate ? 'Đang tải...' : 'Tải file Excel mẫu'}</span>
              </button>
            </div>

            {/* Vùng tải file lên */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#123891] rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100/70 text-[#123891] flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Nhấn để chọn file Excel hoặc kéo thả vào đây'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedFile
                  ? `Dung lượng: ${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'Hỗ trợ định dạng .xlsx, .xls (tối đa 10MB)'}
              </p>
            </div>

            {/* Nút hành động Bước 1 */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUploadAndPreview}
                disabled={!selectedFile || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kiểm tra dữ liệu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= BƯỚC 2: XEM TRƯỚC DỮ LIỆU (PREVIEW) ================= */}
        {step === 'PREVIEW' && previewData && (
          <div className="space-y-4">
            {/* Thẻ tóm tắt kết quả kiểm tra */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Tổng số dòng
                </span>
                <span className="text-xl font-black text-slate-800">
                  {previewData.summary?.total || 0}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Hợp lệ
                </span>
                <span className="text-xl font-black text-emerald-600">
                  {previewData.summary?.valid || 0}
                </span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                  Lỗi dữ liệu
                </span>
                <span className="text-xl font-black text-rose-600">
                  {previewData.summary?.error || 0}
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                  Đã tồn tại
                </span>
                <span className="text-xl font-black text-amber-600">
                  {previewData.summary?.existed || 0}
                </span>
              </div>
            </div>

            {/* Thanh công cụ lọc */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    filterStatus === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({previewData.summary?.total || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('VALID')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    filterStatus === 'VALID'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Hợp lệ ({previewData.summary?.valid || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('INVALID')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    filterStatus === 'INVALID'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Lỗi / Đã có ({(previewData.summary?.error || 0) + (previewData.summary?.existed || 0)})
                </button>
              </div>

              <span className="text-xs text-slate-500">
                Hiển thị <strong>{filteredRows.length}</strong> dòng
              </span>
            </div>

            {/* Bảng xem trước dữ liệu */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-slate-700 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 w-24">MSSV</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Họ và tên</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Email</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 w-28">Lớp</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 w-28 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Ghi chú / Chi tiết lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không có dòng dữ liệu nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const isValid = row.status === 'VALID';
                      const isExisted = row.status === 'EXISTED';
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 transition ${
                            !isValid ? (isExisted ? 'bg-amber-50/30' : 'bg-rose-50/30') : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {row.stt || idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {row.mssv || <span className="text-rose-500 italic">Trống</span>}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {row.fullName || <span className="text-rose-500 italic">Trống</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                            {row.email || <span className="text-rose-500 italic">Trống</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {row.className || <span className="text-rose-500 italic">Trống</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isValid && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                              </span>
                            )}
                            {isExisted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" /> Đã tồn tại
                              </span>
                            )}
                            {row.status === 'ERROR' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3 h-3" /> Lỗi dữ liệu
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {row.errors && row.errors.length > 0 ? (
                              <ul className="text-[11px] text-rose-600 space-y-0.5">
                                {row.errors.map((err, errIdx) => (
                                  <li key={errIdx} className="flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                                    <span>{err}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium">Sẵn sàng tạo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Lưu ý hệ thống */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Lưu ý:</strong> Chỉ các dòng có trạng thái <strong>Hợp lệ</strong> mới được tạo tài khoản.
                Các dòng lỗi hoặc trùng lặp sẽ tự động bị bỏ qua để đảm bảo tính toàn vẹn dữ liệu.
              </span>
            </div>

            {/* Nút hành động Bước 2 */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('UPLOAD')}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ← Chọn file khác
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetModal}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={(previewData.summary?.valid || 0) === 0 || loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Tạo {previewData.summary?.valid || 0} tài khoản sinh viên</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= BƯỚC 3: KẾT QUẢ IMPORT ================= */}
        {step === 'RESULT' && importResult && (
          <div className="space-y-5 py-2">
            {/* Tiêu đề & Icon trạng thái */}
            <div className="text-center">
              <div
                className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs ${
                  (importResult.summary?.emailFailed || 0) > 0
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {(importResult.summary?.emailFailed || 0) > 0 ? (
                  <AlertTriangle className="w-8 h-8" />
                ) : (
                  <CheckCircle2 className="w-8 h-8" />
                )}
              </div>

              <h4 className="text-lg font-bold text-slate-900 mt-3">
                {importResult.summary?.emailDisabled
                  ? 'Khởi tạo tài khoản thành công (Email tự động đang tắt)'
                  : (importResult.summary?.emailFailed || 0) > 0
                  ? 'Tạo tài khoản thành công (Có email chưa gửi được)'
                  : 'Khởi tạo tài khoản & Gửi email thành công!'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
                {importResult.summary?.emailDisabled
                  ? 'Tất cả tài khoản sinh viên đã được khởi tạo và lưu an toàn vào cơ sở dữ liệu. Tính năng gửi email thông tin đăng nhập đang tắt trong Cấu hình Email hệ thống. Quản trị viên có thể sao chép mật khẩu bên dưới để bàn giao.'
                  : (importResult.summary?.emailFailed || 0) > 0
                  ? 'Tất cả tài khoản sinh viên đã được lưu an toàn trong cơ sở dữ liệu. Máy chủ SMTP gặp lỗi khi gửi một số email. Quản trị viên có thể sao chép mật khẩu bên dưới hoặc bấm gửi lại.'
                  : 'Tất cả tài khoản sinh viên đã được khởi tạo và email thông tin đăng nhập đã được chuyển đến máy chủ thư.'}
              </p>
            </div>

            {/* Bảng thống kê 6 chỉ số chi tiết theo đúng quy chuẩn */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-slate-500 block">Tổng số dòng</span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {previewData?.summary?.total || importResult.summary?.totalRequested || 0}
                </span>
                <span className="text-[10px] text-slate-400 block">trong file Excel</span>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-[#123891] block">Tạo tài khoản</span>
                <span className="text-xl font-bold text-[#123891] mt-0.5 block">
                  {importResult.summary?.created || 0}
                </span>
                <span className="text-[10px] text-blue-600 block">thành công</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-emerald-700 block">Email tiếp nhận</span>
                <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
                  {importResult.summary?.emailSuccess || 0}
                </span>
                <span className="text-[10px] text-emerald-600 block">SMTP chấp nhận</span>
              </div>

              <div
                className={`p-3 rounded-xl text-center border ${
                  (importResult.summary?.emailFailed || 0) > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="text-[11px] font-semibold block">Gửi email</span>
                <span
                  className={`text-xl font-bold mt-0.5 block ${
                    (importResult.summary?.emailFailed || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}
                >
                  {importResult.summary?.emailFailed || 0}
                </span>
                <span className="text-[10px] block opacity-80">thất bại</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-amber-700 block">Bỏ qua đã có</span>
                <span className="text-xl font-bold text-amber-600 mt-0.5 block">
                  {previewData?.summary?.existed || 0}
                </span>
                <span className="text-[10px] text-amber-600 block">trùng trong DB</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-slate-600 block">Dữ liệu lỗi</span>
                <span className="text-xl font-bold text-slate-600 mt-0.5 block">
                  {previewData?.summary?.error || 0}
                </span>
                <span className="text-[10px] text-slate-400 block">không hợp lệ</span>
              </div>
            </div>

            {/* Thanh Tab chuyển chế độ xem */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setResultTab('FAILED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  resultTab === 'FAILED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MailX className="w-4 h-4" />
                <span>Tài khoản gửi email thất bại</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-800 font-bold">
                  {importResult.failedEmails?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setResultTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  resultTab === 'ALL'
                    ? 'bg-blue-100 text-[#123891]'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Tất cả tài khoản vừa tạo</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200 text-[#123891] font-bold">
                  {importResult.createdStudents?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB 1: Danh sách tài khoản gửi email thất bại */}
            {resultTab === 'FAILED' && (
              <div className="space-y-3 text-left">
                {importResult.failedEmails && importResult.failedEmails.length > 0 ? (
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MailX className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                          <h5 className="text-xs font-bold text-rose-800">
                            Danh sách tài khoản gửi email thất bại ({importResult.failedEmails.length})
                          </h5>
                          <p className="text-[11px] text-rose-600">
                            Tài khoản đã tạo thành công trong DB. Bạn có thể sao chép mật khẩu bên dưới hoặc bấm gửi lại.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyAllFailed}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          {copiedKey === 'all-failed' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === 'all-failed' ? 'Đã chép!' : 'Sao chép tất cả'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResendAllFailedEmails}
                          disabled={resendingAll || resendingCode !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {resendingAll ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang gửi lại...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Gửi lại tất cả</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bảng chi tiết các email thất bại */}
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-rose-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-100/60 text-rose-900 uppercase text-[10px] tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2 px-3">MSSV</th>
                            <th className="py-2 px-3">Họ và tên</th>
                            <th className="py-2 px-3">Email nhận</th>
                            <th className="py-2 px-3">Mật khẩu khởi tạo</th>
                            <th className="py-2 px-3">Lý do SMTP</th>
                            <th className="py-2 px-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {importResult.failedEmails.map((item, fIdx) => (
                            <tr key={fIdx} className="hover:bg-rose-50/40 transition">
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">{item.mssv}</td>
                              <td className="py-2 px-3 font-medium text-slate-700">{item.fullName}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{item.email}</td>
                              <td className="py-2 px-3">
                                <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  <span className="font-mono text-xs font-semibold text-slate-800">
                                    {item.password || '••••••••'}
                                  </span>
                                  {item.password && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(item.password, `failed-${item.mssv}`)}
                                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition cursor-pointer"
                                      title="Sao chép mật khẩu"
                                    >
                                      {copiedKey === `failed-${item.mssv}` ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-rose-600 text-[11px]">
                                {item.error || 'Lỗi kết nối SMTP'}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleResendSingleEmail(item)}
                                  disabled={resendingCode === item.mssv || resendingAll}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                  {resendingCode === item.mssv ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  <span>Gửi lại</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 text-left space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <MailCheck className="w-4 h-4 text-emerald-600" />
                      Không có email nào gửi thất bại!
                    </p>
                    <p className="text-emerald-700 text-[11px]">
                      Máy chủ SMTP đã tiếp nhận toàn bộ email thông tin tài khoản của đợt Import này.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Tất cả tài khoản vừa tạo */}
            {resultTab === 'ALL' && (
              <div className="space-y-3 text-left">
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2 px-3">MSSV</th>
                        <th className="py-2 px-3">Họ và tên</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Mật khẩu khởi tạo</th>
                        <th className="py-2 px-3 text-center">Trạng thái SMTP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(importResult.createdStudents || []).map((student, sIdx) => (
                        <tr key={sIdx} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{student.mssv}</td>
                          <td className="py-2 px-3 font-medium text-slate-700">{student.fullName}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{student.email}</td>
                          <td className="py-2 px-3">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                {student.password || '••••••••'}
                              </span>
                              {student.password && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(student.password, `created-${student.mssv}`)}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition cursor-pointer"
                                  title="Sao chép mật khẩu"
                                >
                                  {copiedKey === `created-${student.mssv}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {student.emailSent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <MailCheck className="w-3 h-3" />
                                Đã gửi
                              </span>
                            ) : student.emailDisabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700" title="Email tự động đang tắt theo cấu hình hệ thống">
                                <MailX className="w-3 h-3" />
                                Tắt gửi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                <MailX className="w-3 h-3" />
                                Gửi lỗi
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Thông báo bảo mật hệ thống */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Lưu ý bảo mật mật khẩu khởi tạo:
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-slate-500 text-[10px]">
                <li>Mật khẩu hiển thị ở đây chỉ tồn tại tạm thời trong bộ nhớ phiên làm việc này để Quản trị viên sao chép khi cần bàn giao trực tiếp.</li>
                <li>Cơ sở dữ liệu chỉ lưu trữ mật khẩu đã băm bằng chuẩn an toàn bcrypt (cost 12), tuyệt đối không lưu mật khẩu dạng văn bản thuần.</li>
                <li>Mọi tài khoản mới tạo đều được đánh dấu bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.</li>
                <li>Khi đóng cửa sổ này, mật khẩu dạng văn bản thuần sẽ được giải phóng hoàn toàn khỏi bộ nhớ trình duyệt.</li>
              </ul>
            </div>

            {/* Nút hoàn tất */}
            <div className="flex items-center justify-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetModal}
                className="px-8 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportStudentExcelModal;
