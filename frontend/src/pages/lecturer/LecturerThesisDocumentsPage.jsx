import React, { useState, useEffect, useCallback } from 'react';
import thesisDocumentApi from '../../api/thesisDocumentApi';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  FileArchive,
  File,
  Users,
  Layers,
  FolderOpen,
  X,
  FileCheck,
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
  if (['zip', 'rar', '7z'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-600" />;
  }
  return <File className="w-5 h-5 text-slate-500" />;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LecturerThesisDocumentsPage = () => {
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('GUIDES'); // 'GUIDES' | 'SUBMISSIONS'

  // Theses list for selection
  const [thesesList, setThesesList] = useState([]);

  // Data states
  const [guides, setGuides] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterThesisId, setFilterThesisId] = useState('');

  // Add Guide Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('ALL'); // 'ALL' | 'SPECIFIC'
  const [targetThesisId, setTargetThesisId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Guide Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch supervised theses for dropdown
  const fetchSupervisedTheses = useCallback(async () => {
    try {
      const res = await thesisDocumentApi.getLecturerThesesList({
        academicTermId: currentTerm?._id || '',
      });
      if (res?.success) {
        setThesesList(res.data || []);
      }
    } catch {
      // ignore
    }
  }, [currentTerm?._id]);

  // Fetch Guides
  const fetchGuides = useCallback(async () => {
    try {
      const res = await thesisDocumentApi.getLecturerGuides({
        academicTermId: currentTerm?._id || '',
        search,
        thesisId: filterThesisId,
      });
      if (res?.success) {
        setGuides(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài liệu hướng dẫn', 'error');
    }
  }, [currentTerm?._id, search, filterThesisId, showToast]);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await thesisDocumentApi.getLecturerSubmissions({
        academicTermId: currentTerm?._id || '',
        search,
        thesisId: filterThesisId,
      });
      if (res?.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách file sinh viên nộp', 'error');
    }
  }, [currentTerm?._id, search, filterThesisId, showToast]);

  // Load all data on mount or filter change
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGuides(), fetchSubmissions()]);
    setLoading(false);
  }, [fetchGuides, fetchSubmissions]);

  useEffect(() => {
    fetchSupervisedTheses();
  }, [fetchSupervisedTheses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = () => {
    setSelectedFile(null);
    setDescription('');
    setScope('ALL');
    setTargetThesisId(thesesList[0]?._id || '');
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

    if (scope === 'SPECIFIC' && !targetThesisId) {
      setFormError('Vui lòng chọn đề tài cụ thể áp dụng');
      return;
    }

    setUploading(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', description.trim());
      formData.append('scope', scope);
      if (scope === 'SPECIFIC') {
        formData.append('thesisId', targetThesisId);
      }
      if (currentTerm?._id) {
        formData.append('academicTermId', currentTerm._id);
      }

      const res = await thesisDocumentApi.createLecturerGuide(formData);
      if (res?.success) {
        showToast('Tải lên tài liệu khóa luận thành công!', 'success');
        setAddModalOpen(false);
        fetchGuides();
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
      const res = await thesisDocumentApi.deleteLecturerGuide(deletingDoc._id);
      if (res?.success) {
        showToast('Đã xóa tài liệu khóa luận thành công!', 'success');
        setDeleteModalOpen(false);
        setDeletingDoc(null);
        fetchGuides();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể xóa file', 'error');
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
    link.setAttribute('download', doc.fileName || 'tai-lieu-khoa-luan');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              Quản Lý Tài Liệu Khóa Luận
            </h1>
          </div>
        </div>

        {Array.isArray(terms) && terms.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-4 h-4 text-[#123891]" />
            <span className="text-xs font-semibold text-slate-500">Học kỳ:</span>
            <select
              value={currentTerm?._id || ''}
              onChange={(e) => {
                if (setCurrentTerm && e.target.value) {
                  setCurrentTerm(e.target.value);
                }
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 transition cursor-pointer"
            >
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.termName || t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : '• Đã đóng'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('GUIDES');
            setSearch('');
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'GUIDES'
              ? 'bg-[#123891] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Tài liệu</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'GUIDES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {guides.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('SUBMISSIONS');
            setSearch('');
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'SUBMISSIONS'
              ? 'bg-[#123891] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Tài liệu sinh viên</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'SUBMISSIONS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {submissions.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={(v) => setSearch(v)}
                placeholder={
                  activeTab === 'GUIDES'
                    ? 'Tìm theo tên file, mô tả...'
                    : 'Tìm theo tên file, sinh viên, MSSV...'
                }
              />
            </div>

            {/* Filter by thesis topic */}
            {thesesList.length > 0 && (
              <select
                value={filterThesisId}
                onChange={(e) => setFilterThesisId(e.target.value)}
                className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-slate-700 truncate max-w-xs"
              >
                <option value="">Tất cả các đề tài hướng dẫn</option>
                {thesesList.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.thesisTitle} ({t.studentLabel})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-xl transition cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Nút + Thêm tài liệu (Chỉ hiển thị ở tab "Tài liệu") */}
        {activeTab === 'GUIDES' && (
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Thêm tài liệu</span>
            </button>
          </div>
        )}

        {/* ================= TAB 1: TÀI LIỆU HƯỚNG DẪN ================= */}
        {activeTab === 'GUIDES' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={4} cols={5} />
              </div>
            ) : guides.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Chưa có tài liệu khóa luận nào"
                description="Hãy nhấn nút 'Thêm tài liệu' phía trên để tải lên tài liệu hướng dẫn hoặc biểu mẫu cho các nhóm sinh viên."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">STT</th>
                      <th className="py-3.5 px-4 pl-6">File tài liệu</th>
                      <th className="py-3.5 px-4">Mô tả tài liệu</th>
                      <th className="py-3.5 px-4">Phạm vi áp dụng</th>
                      <th className="py-3.5 px-4 pr-6 text-right w-36"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {guides.map((doc, idx) => (
                      <tr key={doc._id} className="hover:bg-slate-50/60 transition group">
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                          {idx + 1}
                        </td>

                        {/* File */}
                        <td className="py-3.5 px-4 pl-6">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-sm">
                              {doc.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.createdAt)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Mô tả */}
                        <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                          {doc.description ? (
                            <span className="leading-relaxed line-clamp-2">{doc.description}</span>
                          ) : (
                            <span className="text-slate-400 italic">Không có mô tả</span>
                          )}
                        </td>

                        {/* Phạm vi áp dụng */}
                        <td className="py-3.5 px-4">
                          {doc.scope === 'SPECIFIC' && doc.thesisId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-xs truncate" title={doc.thesisId.thesisTitle}>
                              <Layers className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{doc.thesisId.thesisTitle}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>Tất cả các nhóm</span>
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="p-2 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              title="Tải về file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(doc)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Gỡ file này"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}

        {/* ================= TAB 2: NỘP FILE / TÀI LIỆU SINH VIÊN ================= */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={4} cols={5} />
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="Chưa có file nào do sinh viên nộp"
                description="Các file báo cáo, bản nháp hoặc tài liệu do các nhóm sinh viên hướng dẫn nộp lên sẽ xuất hiện tại đây."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">STT</th>
                      <th className="py-3.5 px-4">Sinh viên nộp</th>
                      <th className="py-3.5 px-4">Đề tài khóa luận</th>
                      <th className="py-3.5 px-4 pl-4">File tài liệu</th>
                      <th className="py-3.5 px-4">Ghi chú của SV</th>
                      <th className="py-3.5 px-4 pr-6 text-right w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {submissions.map((sub, idx) => (
                      <tr key={sub._id} className="hover:bg-slate-50/60 transition group">
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Sinh viên */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {sub.studentId?.userId?.fullName || sub.uploadedBy?.fullName || 'Sinh viên'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {sub.studentId?.studentCode && (
                              <span className="font-mono">{sub.studentId.studentCode}</span>
                            )}
                            {sub.studentId?.className && (
                              <>
                                <span>•</span>
                                <span>{sub.studentId.className}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Đề tài */}
                        <td className="py-3.5 px-4 text-xs max-w-xs">
                          <span className="font-semibold text-slate-800 line-clamp-2" title={sub.thesisId?.thesisTitle}>
                            {sub.thesisId?.thesisTitle || 'Đề tài khóa luận'}
                          </span>
                        </td>

                        {/* File */}
                        <td className="py-3.5 px-4 pl-4">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-xs">
                              {sub.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(sub.fileSize)}</span>
                              <span>•</span>
                              <span>{formatDate(sub.createdAt)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Ghi chú */}
                        <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                          {sub.description ? (
                            <span className="leading-relaxed line-clamp-2">{sub.description}</span>
                          ) : (
                            <span className="text-slate-400 italic">Không có ghi chú</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownload(sub)}
                              className="p-2 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              title="Tải về file"
                            >
                              <Download className="w-4 h-4" />
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
        )}
      </div>

      {/* MODAL: + THÊM TÀI LIỆU */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95">
            <div className="px-6 py-5 bg-[#123891] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Thêm tài liệu khóa luận</h3>
                  <p className="text-xs text-blue-100">
                    Tải lên tài liệu hướng dẫn, biểu mẫu cho các nhóm sinh viên
                  </p>
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

              {/* 1. File Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tệp tài liệu đính kèm <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#123891] rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/50 hover:bg-blue-50/30">
                  <input
                    type="file"
                    id="thesis-doc-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  />
                  <label htmlFor="thesis-doc-upload" className="cursor-pointer block">
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
                          Hỗ trợ: PDF, Word, Excel, PowerPoint, ZIP, RAR (tối đa 30MB)
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* 2. Mô tả tài liệu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mô tả tài liệu
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mô tả nội dung hoặc hướng dẫn cho sinh viên..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs text-slate-800 resize-none transition"
                />
              </div>

              {/* 3. Phạm vi áp dụng (Select Box) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phạm vi áp dụng <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs text-slate-800 transition font-medium"
                  >
                    <option value="ALL">Áp dụng cho tất cả các nhóm</option>
                    <option value="SPECIFIC">Áp dụng cho đề tài cụ thể</option>
                  </select>

                  {scope === 'SPECIFIC' && (
                    <div className="animate-in fade-in duration-150">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Chọn đề tài áp dụng:
                      </label>
                      {thesesList.length === 0 ? (
                        <p className="text-xs text-amber-600 italic">
                          Chưa có đề tài nào được phân công hướng dẫn trong kỳ này.
                        </p>
                      ) : (
                        <select
                          value={targetThesisId}
                          onChange={(e) => setTargetThesisId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs text-slate-800 transition"
                        >
                          {thesesList.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.thesisTitle} ({t.studentLabel})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {scope === 'ALL'
                    ? 'Tất cả các sinh viên do bạn hướng dẫn đều có thể xem và tải về tài liệu này.'
                    : 'Chỉ các sinh viên thuộc nhóm đề tài được chọn mới có thể xem và tải về tài liệu này.'}
                </p>
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
                  File <strong className="text-slate-700">{deletingDoc.fileName}</strong> sẽ bị xóa vĩnh viễn khỏi hệ thống và sinh viên sẽ không thể xem hoặc tải về được nữa.
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

export default LecturerThesisDocumentsPage;
