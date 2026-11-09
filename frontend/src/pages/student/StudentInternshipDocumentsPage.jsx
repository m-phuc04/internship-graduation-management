import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import internshipDocumentApi from '../../api/internshipDocumentApi';
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
  Briefcase,
  Building2,
  X,
  Tag,
  ArrowRight,
  ShieldAlert,
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

const CATEGORY_OPTIONS = [
  'Báo cáo thực tập',
  'Báo cáo tuần',
  'Đề cương thực tập',
  'Phiếu khảo sát',
  'Báo cáo tiến độ',
  'Báo cáo tổng kết',
  'Tài liệu minh chứng',
  'Khác',
];

const StudentInternshipDocumentsPage = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('GUIDES'); // 'GUIDES' | 'SUBMISSIONS'

  // Data states
  const [guidesData, setGuidesData] = useState({
    hasInternship: false,
    internship: null,
    supervisor: null,
    documents: [],
    canSubmit: false,
    submitBlockReason: '',
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');

  // Submit File Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
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
      const res = await internshipDocumentApi.getStudentGuides({
        academicTermId: currentTerm?._id || '',
        search,
      });
      if (res?.success) {
        setGuidesData(
          res.data || {
            hasInternship: false,
            internship: null,
            supervisor: null,
            documents: [],
            canSubmit: false,
            submitBlockReason: '',
          },
        );
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải tài liệu hướng dẫn thực tập', 'error');
    }
  }, [currentTerm?._id, search, showToast]);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await internshipDocumentApi.getStudentSubmissions({
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
    if (!guidesData.canSubmit) {
      showToast(
        guidesData.submitBlockReason ||
          'Bạn chưa đủ điều kiện nộp file tài liệu thực tập. Vui lòng đăng ký thực tập trước.',
        'warning',
      );
      return;
    }
    setSelectedFile(null);
    setTitle('');
    setCategory(CATEGORY_OPTIONS[0]);
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
      const safeCurrentTitle = typeof title === 'string' ? title.trim() : '';
      if (!safeCurrentTitle) {
        setTitle(file.name || '');
      }
      setFormError('');
    }
  };

  const handleSubmitFile = async (e) => {
    e.preventDefault();

    if (!guidesData.canSubmit) {
      setFormError(
        guidesData.submitBlockReason ||
          'Bạn chưa đủ điều kiện nộp file tài liệu thực tập.',
      );
      return;
    }

    if (!selectedFile) {
      setFormError('Vui lòng chọn một tệp tài liệu để nộp');
      return;
    }

    const safeTitle =
      typeof title === 'string' && title.trim()
        ? title.trim()
        : selectedFile.name || '';

    const safeCategory =
      typeof category === 'string' && category.trim()
        ? category.trim()
        : '';

    if (!safeCategory) {
      setFormError('Vui lòng chọn phân loại tài liệu');
      return;
    }

    const hasActiveReport =
      submissions.some((sub) => /báo cáo/i.test(sub.category || '')) ||
      Boolean(guidesData.internship?.reportFile?.fileUrl);

    if (hasActiveReport && /báo cáo/i.test(safeCategory)) {
      setFormError(
        'Hồ sơ thực tập đã có file báo cáo đang có hiệu lực. Vui lòng gỡ file cũ trước khi nộp file mới.',
      );
      return;
    }

    const safeDescription =
      typeof description === 'string' ? description.trim() : '';

    setUploading(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', safeTitle);
      formData.append('category', safeCategory);
      if (safeDescription) {
        formData.append('description', safeDescription);
      }

      const res = await internshipDocumentApi.createStudentSubmission(formData);
      if (res?.success) {
        showToast('Nộp file tài liệu thực tập thành công!', 'success');
        setSubmitModalOpen(false);
        loadData();
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
      const res = await internshipDocumentApi.deleteStudentSubmission(deletingDoc._id);
      if (res?.success) {
        showToast('Đã gỡ file tài liệu nộp thành công!', 'success');
        setDeleteModalOpen(false);
        setDeletingDoc(null);
        loadData();
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
    link.setAttribute('download', doc.fileName || doc.title || 'tai-lieu-thuc-tap');
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
              Tài Liệu Thực Tập
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Xem tài liệu hướng dẫn từ Giảng viên giám sát và nộp các báo cáo thực tập
            </p>
          </div>
        </div>
      </div>

      {/* Internship Info Banner */}
      {guidesData.internship ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/60 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#123891] shrink-0" />
              <span className="text-slate-500">Doanh nghiệp:</span>
              <strong className="text-slate-900 font-bold">
                {guidesData.internship.companyName || 'Chưa cập nhật'}
              </strong>
            </div>

            {guidesData.internship.position && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-slate-500">Vị trí:</span>
                <span className="font-semibold text-slate-800">
                  {guidesData.internship.position}
                </span>
              </div>
            )}
          </div>

          {guidesData.supervisor && (
            <div className="flex items-center gap-2 text-slate-600 shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                GVGS: <strong>{formatLecturerDisplay(guidesData.supervisor.academicTitle, guidesData.supervisor.userId?.fullName || guidesData.supervisor.fullName)}</strong>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 shadow-2xs flex items-center gap-3 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Bạn chưa đăng ký hoặc chưa có hồ sơ thực tập được duyệt. Bạn vẫn có thể xem và tải các tài liệu hướng dẫn chung và biểu mẫu bên dưới.
          </span>
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
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'GUIDES'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
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
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'SUBMISSIONS'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {submissions.length}
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {/* ================= TAB 1: TÀI LIỆU TỪ GVGS ================= */}
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
              ) : guidesData.documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Chưa có tài liệu hướng dẫn nào"
                  description={
                    !guidesData.hasInternship
                      ? 'Hiện tại chưa có tài liệu hướng dẫn chung nào cho học kỳ này. Bạn có thể đăng ký thực tập để được phân công Giảng viên giám sát.'
                      : 'Hiện tại chưa có tài liệu hướng dẫn nào được tải lên cho học kỳ này.'
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-14">STT</th>
                        <th className="py-3.5 px-4 pl-6">File tài liệu</th>
                        <th className="py-3.5 px-4">Phân loại</th>
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
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                                {getFileIcon(doc.fileName)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-sm">
                                  {doc.title || doc.fileName}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{doc.fileName}</span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                  <span>•</span>
                                  <span>{formatDate(doc.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phân loại */}
                          <td className="py-3.5 px-4 text-xs">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium text-slate-700 bg-slate-100 border border-slate-200">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{doc.category || 'Tài liệu hướng dẫn'}</span>
                            </span>
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
                                <span>Riêng bạn</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>Chung sinh viên</span>
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
            {/* Condition Warning Banner (if ineligible to submit) */}
            {!guidesData.canSubmit && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="font-bold text-amber-950 block">
                      {!guidesData.hasInternship
                        ? 'Chưa đủ điều kiện nộp file tài liệu'
                        : 'Hồ sơ thực tập chưa được duyệt'}
                    </strong>
                    <span className="text-amber-800 leading-relaxed">
                      {guidesData.submitBlockReason ||
                        'Bạn chỉ được phép nộp file tài liệu thực tập khi đã đăng ký thực tập thành công và hồ sơ được duyệt hợp lệ.'}
                    </span>
                  </div>
                </div>

                {!guidesData.hasInternship && (
                  <Link
                    to="/student/internship/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0 text-xs self-start sm:self-center"
                  >
                    <span>Đăng ký ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Top Action Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenSubmitModal}
                disabled={!guidesData.canSubmit}
                title={
                  !guidesData.canSubmit
                    ? guidesData.submitBlockReason || 'Chưa đủ điều kiện nộp file'
                    : 'Nộp file mới'
                }
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition ${
                  guidesData.canSubmit
                    ? 'bg-[#123891] hover:bg-[#102d7d] text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Nộp file mới</span>
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
                  description="Hãy nhấn nút '+ Nộp file mới' để gửi tài liệu, báo cáo cho Giảng viên giám sát."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-14">STT</th>
                        <th className="py-3.5 px-4 pl-6">File đã nộp</th>
                        <th className="py-3.5 px-4">Phân loại</th>
                        <th className="py-3.5 px-4">Ghi chú</th>
                        <th className="py-3.5 px-4">Trạng thái</th>
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
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                                {getFileIcon(sub.fileName)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-sm">
                                  {sub.title || sub.fileName}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{sub.fileName}</span>
                                  <span>•</span>
                                  <span>{formatFileSize(sub.fileSize)}</span>
                                  <span>•</span>
                                  <span>{formatDate(sub.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phân loại */}
                          <td className="py-3.5 px-4 text-xs">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium text-slate-700 bg-slate-100 border border-slate-200">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{sub.category || 'Báo cáo thực tập'}</span>
                            </span>
                          </td>

                          {/* Ghi chú */}
                          <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                            {sub.description ? (
                              <span className="leading-relaxed line-clamp-2">{sub.description}</span>
                            ) : (
                              <span className="text-slate-400 italic">Không có ghi chú</span>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-4 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                              <span>Đã nộp</span>
                            </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Nộp File Tài Liệu Thực Tập
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gửi file báo cáo hoặc tài liệu cho Giảng viên giám sát
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitFile} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* File Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Chọn tệp tài liệu <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#123891] rounded-2xl p-4 text-center transition cursor-pointer bg-slate-50/50 relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-800 font-semibold">
                      <FileText className="w-4 h-4 text-[#123891]" />
                      <span className="truncate max-w-xs">{selectedFile.name}</span>
                      <span className="text-slate-400 font-normal">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <div className="text-xs text-slate-600">
                        <span className="font-bold text-[#123891]">Nhấn để chọn tệp</span> hoặc kéo thả vào đây
                      </div>
                      <div className="text-[10px] text-slate-400">
                        PDF, Word, Excel, PowerPoint, ZIP, RAR (Tối đa 30MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title / Tên file */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Tiêu đề / Tên tài liệu
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Báo cáo thực tập tuần 4, Phiếu khảo sát doanh nghiệp..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Phân loại tài liệu
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition bg-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {/* Warning if report file already submitted and student is selecting report category */}
                {submissions.some((sub) => /báo cáo/i.test(sub.category || '')) && /báo cáo/i.test(category) && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 mt-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Đã có file báo cáo thực tập</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Hồ sơ thực tập đã có file báo cáo đang có hiệu lực. Bạn không thể nộp thêm file mới khi file cũ vẫn còn tồn tại. Vui lòng gỡ file cũ trước rồi mới nộp file mới.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mô tả / Ghi chú cho GVGS
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm về nội dung file hoặc các điểm cần lưu ý..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    uploading ||
                    !selectedFile ||
                    (submissions.some((sub) => /báo cáo/i.test(sub.category || '')) &&
                      /báo cáo/i.test(category))
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Xác nhận nộp file</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN GỠ FILE */}
      {deleteModalOpen && deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {/báo cáo/i.test(deletingDoc.category || '') ? 'Gỡ file báo cáo thực tập?' : 'Gỡ file đã nộp?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {/báo cáo/i.test(deletingDoc.category || '') ? (
                  <>
                    File báo cáo hiện tại sẽ bị gỡ và bạn phải tải lại file mới nếu muốn tiếp tục nộp báo cáo. Bạn có chắc chắn muốn gỡ tệp{' '}
                    <strong className="text-slate-800">
                      "{deletingDoc.title || deletingDoc.fileName}"
                    </strong>{' '}
                    không?
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn gỡ tệp{' '}
                    <strong className="text-slate-800">
                      "{deletingDoc.title || deletingDoc.fileName}"
                    </strong>{' '}
                    khỏi hệ thống? Hành động này không thể hoàn tác.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="w-full py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Gỡ file</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentInternshipDocumentsPage;
