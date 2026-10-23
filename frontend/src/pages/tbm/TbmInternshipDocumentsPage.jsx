import React, { useState, useEffect, useCallback } from 'react';
import internshipDocumentApi from '../../api/internshipDocumentApi';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  Trash2,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  File,
  X,
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <FileText className="w-5 h-5 text-rose-600" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileText className="w-5 h-5 text-blue-600" />;
  }
  return <File className="w-5 h-5 text-slate-500" />;
};

const TbmInternshipDocumentsPage = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add File Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete File Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internshipDocumentApi.getAll({
        academicTermId: currentTerm?._id || '',
        search,
      });
      if (res?.success) {
        setDocuments(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài liệu thực tập', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, search, showToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleOpenAddModal = () => {
    setSelectedFile(null);
    setDescription('');
    setFormError('');
    setAddModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        setFormError('Kích thước tệp không được vượt quá 30MB');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setFormError('');
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFormError('Vui lòng chọn một tệp tài liệu để tải lên');
      return;
    }

    setUploading(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', description.trim());
      if (currentTerm?._id) {
        formData.append('academicTermId', currentTerm._id);
      }

      const res = await internshipDocumentApi.create(formData);
      if (res?.success) {
        showToast('Tải lên tài liệu thực tập thành công!', 'success');
        setAddModalOpen(false);
        fetchDocuments();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Lỗi khi tải tệp lên');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDelete = (doc) => {
    setDeletingDoc(doc);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setDeleting(true);
    try {
      const res = await internshipDocumentApi.delete(deletingDoc._id);
      if (res?.success) {
        showToast('Đã gỡ file tài liệu thành công!', 'success');
        setDeleteModalOpen(false);
        setDeletingDoc(null);
        fetchDocuments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể gỡ file', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = (doc) => {
    const fileUrl = doc.fileUrl.startsWith('http')
      ? doc.fileUrl
      : `${window.location.origin}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', doc.fileName || 'tai-lieu');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lí Tài liệu thực tập
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Toolbar: Search and Refresh */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <SearchInput
              value={search}
              onChange={(v) => setSearch(v)}
              placeholder="Tìm theo tên file, ghi chú..."
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDocuments}
              className="p-2 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-xl transition cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Nút Thêm (để dưới thanh search và để trước bảng, không có dấu +) */}
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <span>Thêm</span>
          </button>
        </div>

        {/* Table of Documents */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={4} cols={4} />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Chưa có tài liệu thực tập nào"
              description="Hãy nhấn nút 'Thêm' phía trên để tải lên biểu mẫu hoặc hướng dẫn đầu tiên cho sinh viên."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-16">STT</th>
                    <th className="py-3.5 px-4 pl-6">File</th>
                    <th className="py-3.5 px-4">Ghi chú</th>
                    <th className="py-3.5 px-4 pr-6 text-right w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {documents.map((doc, idx) => (
                    <tr key={doc._id} className="hover:bg-slate-50/60 transition group">
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                        {idx + 1}
                      </td>

                      {/* File Info */}
                      <td className="py-3.5 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                            {getFileIcon(doc.fileName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-md">
                              {doc.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.createdAt)}</span>
                              {doc.academicTermId?.termName && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#123891] font-medium">{doc.academicTermId.termName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {doc.description ? (
                          <span className="leading-relaxed">{doc.description}</span>
                        ) : (
                          <span className="text-slate-400 italic">Không có ghi chú</span>
                        )}
                      </td>

                      {/* Thao tác (Gỡ file) */}
                      <td className="py-3.5 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Xem / Tải về thử */}
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                            title="Tải về file"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Nút Gỡ file */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(doc)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer inline-flex items-center gap-1 font-semibold text-xs"
                            title="Gỡ file này"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Gỡ file</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: THÊM FILE */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95">
            <div className="px-6 py-5 bg-[#123891] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Thêm tài liệu thực tập</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* File upload drag/drop or picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tệp đính kèm <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#123891] rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/50 hover:bg-blue-50/30">
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx"
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer block">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        {getFileIcon(selectedFile.name)}
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-xs">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatFileSize(selectedFile.size)} • Nhấn để đổi tệp
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Upload className="w-7 h-7 mx-auto text-slate-400" />
                        <div className="text-xs font-semibold text-slate-700">
                          Nhấn để chọn tệp tài liệu
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Hỗ trợ: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (tối đa 30MB)
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Note / Description input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ghi chú mô tả
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập ghi chú hoặc hướng dẫn cho sinh viên (không bắt buộc)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs text-slate-800 resize-none transition"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#123891] hover:bg-[#102d7d] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <span>Xác nhận</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN GỠ FILE */}
      {deleteModalOpen && deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Gỡ tài liệu này?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  File <strong className="text-slate-700">{deletingDoc.fileName}</strong> sẽ bị xóa vĩnh viễn khỏi hệ thống và sinh viên sẽ không thể tải về được nữa.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {deleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang gỡ...</span>
                    </>
                  ) : (
                    <span>Xác nhận gỡ</span>
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

export default TbmInternshipDocumentsPage;
