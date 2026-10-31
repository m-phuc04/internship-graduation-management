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
  FolderOpen,
  FileCheck,
  UserCheck,
  GraduationCap,
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

const formatLecturerDisplay = (title, name) => {
  if (!name) return 'Chưa phân công';
  if (!title) return name;
  const cleanTitle = title.endsWith('.') ? title : `${title}.`;
  return `${cleanTitle} ${name}`;
};

const StudentThesisDocumentsPage = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('GUIDES'); // 'GUIDES' | 'SUBMISSIONS'

  // Data states
  const [guidesData, setGuidesData] = useState({
    hasThesis: false,
    thesis: null,
    supervisor: null,
    documents: [],
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');

  // Submit File Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Submission Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Guides from supervisor
  const fetchGuides = useCallback(async () => {
    try {
      const res = await thesisDocumentApi.getStudentGuides({
        academicTermId: currentTerm?._id || '',
        search,
      });
      if (res?.success) {
        setGuidesData(res.data || { hasThesis: false, thesis: null, supervisor: null, documents: [] });
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải tài liệu hướng dẫn khóa luận', 'error');
    }
  }, [currentTerm?._id, search, showToast]);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await thesisDocumentApi.getStudentSubmissions({
        academicTermId: currentTerm?._id || '',
      });
      if (res?.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách file đã nộp', 'error');
    }
  }, [currentTerm?._id, showToast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGuides(), fetchSubmissions()]);
    setLoading(false);
  }, [fetchGuides, fetchSubmissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenSubmitModal = () => {
    setSelectedFile(null);
    setDescription('');
    setFormError('');
    setSubmitModalOpen(true);
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

  const handleSubmitFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFormError('Vui lòng chọn một tệp tài liệu để nộp');
      return;
    }

    setUploading(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', description.trim());

      const res = await thesisDocumentApi.createStudentSubmission(formData);
      if (res?.success) {
        showToast('Nộp file tài liệu khóa luận thành công!', 'success');
        setSubmitModalOpen(false);
        fetchSubmissions();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Lỗi khi nộp file');
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
      const res = await thesisDocumentApi.deleteStudentSubmission(deletingDoc._id);
      if (res?.success) {
        showToast('Đã gỡ file tài liệu nộp thành công!', 'success');
        setDeleteModalOpen(false);
        setDeletingDoc(null);
        fetchSubmissions();
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
              Tài Liệu Khóa Luận
            </h1>
          </div>
        </div>
      </div>

      {/* Thesis Info Banner (If student has a thesis) */}
      {guidesData.thesis && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-[#123891] shrink-0" />
            <div>
              <span className="text-slate-500">Đề tài: </span>
              <strong className="text-slate-900 font-bold">{guidesData.thesis.thesisTitle}</strong>
            </div>
          </div>
          {guidesData.supervisor && (
            <div className="flex items-center gap-2 text-slate-600 shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                GVHD: <strong>{formatLecturerDisplay(guidesData.supervisor.academicTitle, guidesData.supervisor.userId?.fullName || guidesData.supervisor.fullName)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

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
            {guidesData.documents?.length || 0}
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
          <span>Nộp file</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'SUBMISSIONS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {submissions.length}
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {/* ================= TAB 1: TÀI LIỆU TỪ GVHD ================= */}
        {activeTab === 'GUIDES' && (
          <div className="space-y-4">
            {/* Search toolbar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="w-full sm:w-80">
                <SearchInput
                  value={search}
                  onChange={(v) => setSearch(v)}
                  placeholder="Tìm theo tên file, mô tả tài liệu..."
                />
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

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {loading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={4} cols={4} />
                </div>
              ) : !guidesData.hasThesis ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Bạn chưa có đề tài khóa luận"
                  description="Sau khi được Trưởng Bộ Môn phê duyệt đề tài và phân công Giảng viên hướng dẫn, bạn sẽ xem được các tài liệu hướng dẫn tại đây."
                />
              ) : guidesData.documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Chưa có tài liệu hướng dẫn nào"
                  description="Hiện tại Giảng viên hướng dẫn chưa tải lên tài liệu hướng dẫn nào cho nhóm của bạn."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-14">STT</th>
                        <th className="py-3.5 px-4 pl-6">File tài liệu</th>
                        <th className="py-3.5 px-4">Mô tả / Hướng dẫn</th>
                        <th className="py-3.5 px-4">Phạm vi</th>
                        <th className="py-3.5 px-4 pr-6 text-right w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {guidesData.documents.map((doc, idx) => (
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

                          {/* Phạm vi */}
                          <td className="py-3.5 px-4">
                            {doc.scope === 'SPECIFIC' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <span>Đề tài của bạn</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>Chung các nhóm</span>
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
        )}

        {/* ================= TAB 2: NỘP FILE ================= */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="space-y-4">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenSubmitModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <span>Thêm file</span>
              </button>

              <button
                onClick={fetchSubmissions}
                className="p-2 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                title="Tải lại danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {loading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={3} cols={4} />
                </div>
              ) : submissions.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="Chưa có file nào được nộp"
                  description="Hãy nhấn nút '+ Nộp file mới' để gửi tài liệu, báo cáo hoặc bản nháp cho Giảng viên hướng dẫn."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-14">STT</th>
                        <th className="py-3.5 px-4 pl-6">File đã nộp</th>
                        <th className="py-3.5 px-4">Người nộp</th>
                        <th className="py-3.5 px-4">Ghi chú</th>
                        <th className="py-3.5 px-4 pr-6 text-right w-36"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {submissions.map((sub, idx) => (
                        <tr key={sub._id} className="hover:bg-slate-50/60 transition group">
                          {/* STT */}
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                            {idx + 1}
                          </td>

                          {/* File */}
                          <td className="py-3.5 px-4 pl-6">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-sm">
                                {sub.fileName}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{formatFileSize(sub.fileSize)}</span>
                                <span>•</span>
                                <span>{formatDate(sub.createdAt)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Người nộp */}
                          <td className="py-3.5 px-4 text-xs">
                            <span className="font-semibold text-slate-800">
                              {sub.studentId?.userId?.fullName || sub.uploadedBy?.fullName || 'Sinh viên'}
                            </span>
                            {sub.studentId?.studentCode && (
                              <span className="text-slate-400 block font-mono text-[11px]">
                                {sub.studentId.studentCode}
                              </span>
                            )}
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
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(sub)}
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
          </div>
        )}
      </div>

      {/* MODAL: NỘP FILE MỚI */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95">
            <div className="px-6 py-5 bg-[#123891] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Nộp file tài liệu khóa luận</h3>
                  <p className="text-xs text-blue-100">
                    Gửi file báo cáo, đề cương, slide hoặc mã nguồn cho Giảng viên hướng dẫn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFile} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* File upload picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tệp đính kèm <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#123891] rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/50 hover:bg-blue-50/30">
                  <input
                    type="file"
                    id="student-doc-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  />
                  <label htmlFor="student-doc-upload" className="cursor-pointer block">
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
                          Nhấn để chọn tệp cần nộp
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Hỗ trợ: PDF, Word, Excel, PowerPoint, ZIP, RAR (tối đa 30MB)
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ghi chú / Lời nhắn cho giảng viên
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="VD: Báo cáo tiến độ chương 2, slide thuyết trình tuần 8..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] text-xs text-slate-800 resize-none transition"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
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
                      <span>Đang nộp...</span>
                    </>
                  ) : (
                    <span>Xác nhận nộp</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN GỠ FILE NỘP */}
      {deleteModalOpen && deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Gỡ file đã nộp này?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  File <strong className="text-slate-700">{deletingDoc.fileName}</strong> sẽ bị xóa khỏi danh sách nộp bài và Giảng viên hướng dẫn sẽ không xem được nữa.
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

export default StudentThesisDocumentsPage;
