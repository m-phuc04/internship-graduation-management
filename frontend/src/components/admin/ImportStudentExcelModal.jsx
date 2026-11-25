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
  FileText,
  Filter,
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

  // Đặt lại modal về trạng thái ban đầu
  const handleResetModal = () => {
    setStep('UPLOAD');
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setFilterStatus('ALL');
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
                    <li>MSSV gồm 8 chữ số và phải trùng khớp với mã sinh viên trong Email</li>
                    <li>Email phải có định dạng chính thức: <strong>{'{mssv}.{tên}@student.iuh.edu.vn'}</strong></li>
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
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">
                Khởi tạo tài khoản hoàn tất!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống đã hoàn tất xử lý danh sách sinh viên từ file Excel
              </p>
            </div>

            {/* Thẻ thống kê kết quả */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <span className="text-xs font-semibold text-emerald-700 block">
                  Tạo thành công
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {importResult.createdCount || 0}
                </span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">tài khoản</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-xs font-semibold text-slate-600 block">
                  Bị bỏ qua
                </span>
                <span className="text-2xl font-black text-slate-700 mt-1 block">
                  {importResult.skippedCount || 0}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">dòng lỗi / đã có</span>
              </div>
            </div>

            {/* Thông báo chi tiết email */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 text-left space-y-1.5 max-w-lg mx-auto">
              <p className="font-bold flex items-center gap-1.5 text-[#123891]">
                <CheckCircle2 className="w-4 h-4 text-[#123891]" />
                Thông tin tài khoản đã được bảo mật & gửi email:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px] pl-1">
                <li>Mật khẩu ngẫu nhiên riêng biệt đã được gửi đến từng email sinh viên</li>
                <li>Sinh viên được đánh dấu bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên</li>
                <li>MSSV và email trường được liên kết cố định với hồ sơ sinh viên</li>
              </ul>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleResetModal}
                className="px-6 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
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
