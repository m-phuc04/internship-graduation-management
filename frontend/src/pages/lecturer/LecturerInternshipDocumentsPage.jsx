import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import internshipDocumentApi from '../../api/internshipDocumentApi';
import internshipApi from '../../api/internshipApi';
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
  Edit,
  Tag,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
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

const GUIDE_CATEGORY_OPTIONS = [
  'Tài liệu hướng dẫn',
  'Mẫu báo cáo thực tập',
  'Đề cương thực tập',
  'Quy định & Kế hoạch',
  'Phiếu đánh giá',
  'Biểu mẫu khác',
];

const REMOVE_REPORT_REASONS = [
  'Sinh viên nộp nhầm file',
  'File không đúng nội dung báo cáo thực tập',
  'File bị lỗi hoặc không mở được',
  'Sinh viên yêu cầu thay thế file',
  'Lý do khác',
];

const LecturerInternshipDocumentsPage = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('GUIDES'); // 'GUIDES' | 'SUBMISSIONS'
  const [submissionViewMode, setSubmissionViewMode] = useState('FILES'); // 'FILES' | 'STUDENTS'
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [notificationWarning, setNotificationWarning] = useState(null);

  // Internships list for selection
  const [internshipsList, setInternshipsList] = useState([]);

  // Data states
  const [guides, setGuides] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 0, submittedCount: 0, notSubmittedCount: 0 });
  const [studentsStatus, setStudentsStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterInternshipId, setFilterInternshipId] = useState('');

  // Add Guide Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(GUIDE_CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('ALL'); // 'ALL' | 'SPECIFIC'
  const [targetInternshipId, setTargetInternshipId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Guide Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState(GUIDE_CATEGORY_OPTIONS[0]);
  const [editDescription, setEditDescription] = useState('');
  const [editScope, setEditScope] = useState('ALL');
  const [editTargetInternshipId, setEditTargetInternshipId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Delete Guide Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // GVGS Remove Student Report Modal State
  const [removeReportModalOpen, setRemoveReportModalOpen] = useState(false);
  const [targetSubmission, setTargetSubmission] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removingReport, setRemovingReport] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // Fetch supervised internships for dropdown
  const fetchSupervisedInternships = useCallback(async () => {
    try {
      const res = await internshipDocumentApi.getLecturerInternshipsList({
        academicTermId: currentTerm?._id || '',
      });
      if (res?.success) {
        setInternshipsList(res.data || []);
      }
    } catch {
      // ignore
    }
  }, [currentTerm?._id]);

  // Fetch Guides
  const fetchGuides = useCallback(async () => {
    try {
      const res = await internshipDocumentApi.getLecturerGuides({
        academicTermId: currentTerm?._id || '',
        search,
        internshipId: filterInternshipId,
      });
      if (res?.success) {
        setGuides(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài liệu hướng dẫn', 'error');
    }
  }, [currentTerm?._id, search, filterInternshipId, showToast]);

  // Sync state from URL Query Params / Navigation State
  useEffect(() => {
    const tabParam = searchParams.get('tab') || location.state?.activeTab;
    if (tabParam && tabParam.toLowerCase() === 'submissions') {
      setActiveTab('SUBMISSIONS');
      setSubmissionViewMode('FILES');
    }

    const searchParam =
      searchParams.get('search') ||
      location.state?.search ||
      location.state?.studentCode ||
      searchParams.get('studentCode');
    if (searchParam) {
      setSearch(searchParam);
    }

    const internshipIdParam = searchParams.get('internshipId') || location.state?.internshipId;
    if (internshipIdParam) {
      setFilterInternshipId(internshipIdParam);
    }

    const docIdParam =
      searchParams.get('docId') ||
      location.state?.docId ||
      searchParams.get('referenceId') ||
      location.state?.referenceId;
    if (docIdParam) {
      setHighlightedDocId(docIdParam);
    }
  }, [searchParams, location.state]);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await internshipDocumentApi.getLecturerSubmissions({
        academicTermId: currentTerm?._id || '',
        search,
        internshipId: filterInternshipId,
      });
      if (res?.success) {
        const subsData = res.data || [];
        setSubmissions(subsData);
        if (res.stats) setStats(res.stats);
        if (res.studentsStatus) setStudentsStatus(res.studentsStatus);

        // Kiểm tra tính tồn tại của file khi điều hướng từ thông báo
        const targetDoc = searchParams.get('docId') || location.state?.docId;
        const targetStudent = searchParams.get('search') || location.state?.studentCode || location.state?.search;
        if (targetDoc || targetStudent) {
          const found = subsData.some(
            (s) =>
              (targetDoc && s._id === targetDoc) ||
              (targetStudent &&
                (s.studentId?.studentCode === targetStudent ||
                  s.studentId?.userId?.fullName?.toLowerCase().includes(targetStudent.toLowerCase()))),
          );
          if (!found) {
            setNotificationWarning(
              `Tệp tài liệu hoặc báo cáo của sinh viên ${targetStudent ? `(${targetStudent})` : ''} không còn tồn tại hoặc đã được gỡ bỏ.`,
            );
          } else {
            setNotificationWarning(null);
          }
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách file sinh viên nộp', 'error');
    }
  }, [currentTerm?._id, search, filterInternshipId, showToast, searchParams, location.state]);

  // Scroll to highlighted submission row
  useEffect(() => {
    if (highlightedDocId && submissions.length > 0) {
      const el = document.getElementById(`submission-row-${highlightedDocId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timer = setTimeout(() => {
        setHighlightedDocId(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [highlightedDocId, submissions]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGuides(), fetchSubmissions()]);
    setLoading(false);
  }, [fetchGuides, fetchSubmissions]);

  useEffect(() => {
    fetchSupervisedInternships();
  }, [fetchSupervisedInternships]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = () => {
    setSelectedFile(null);
    setTitle('');
    setCategory(GUIDE_CATEGORY_OPTIONS[0]);
    setDescription('');
    setScope('ALL');
    setTargetInternshipId(internshipsList[0]?._id || '');
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
      if (!title) {
        setTitle(file.originalname);
      }
      setFormError('');
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFormError('Vui lòng chọn một tệp tài liệu để tải lên');
      return;
    }

    if (scope === 'SPECIFIC' && !targetInternshipId) {
      setFormError('Vui lòng chọn sinh viên / hồ sơ thực tập cụ thể');
      return;
    }

    setUploading(true);
    setFormError('');
    try {
      const safeTitle =
        typeof title === 'string' && title.trim()
          ? title.trim()
          : selectedFile.name || '';
      const safeCategory =
        typeof category === 'string' && category.trim()
          ? category.trim()
          : GUIDE_CATEGORY_OPTIONS[0];
      const safeDescription =
        typeof description === 'string' ? description.trim() : '';

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', safeTitle);
      formData.append('category', safeCategory);
      if (safeDescription) {
        formData.append('description', safeDescription);
      }
      formData.append('scope', scope);
      if (scope === 'SPECIFIC') {
        formData.append('internshipId', targetInternshipId);
      }
      if (currentTerm?._id) {
        formData.append('academicTermId', currentTerm._id);
      }

      const res = await internshipDocumentApi.createLecturerGuide(formData);
      if (res?.success) {
        showToast('Tải lên tài liệu hướng dẫn thành công!', 'success');
        setAddModalOpen(false);
        fetchGuides();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Lỗi khi tải tệp lên');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setEditFile(null);
    setEditTitle(doc.title || doc.fileName || '');
    setEditCategory(doc.category || GUIDE_CATEGORY_OPTIONS[0]);
    setEditDescription(doc.description || '');
    setEditScope(doc.scope || 'ALL');
    setEditTargetInternshipId(doc.internshipId?._id || internshipsList[0]?._id || '');
    setEditFormError('');
    setEditModalOpen(true);
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        setEditFormError('Kích thước tệp không được vượt quá 30MB');
        setEditFile(null);
        return;
      }
      setEditFile(file);
      setEditFormError('');
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    if (editScope === 'SPECIFIC' && !editTargetInternshipId) {
      setEditFormError('Vui lòng chọn sinh viên / hồ sơ thực tập cụ thể');
      return;
    }

    setSavingEdit(true);
    setEditFormError('');
    try {
      const safeEditTitle =
        typeof editTitle === 'string' && editTitle.trim()
          ? editTitle.trim()
          : (editingDoc.title || editingDoc.fileName || '');
      const safeEditCategory =
        typeof editCategory === 'string' && editCategory.trim()
          ? editCategory.trim()
          : GUIDE_CATEGORY_OPTIONS[0];
      const safeEditDesc =
        typeof editDescription === 'string' ? editDescription.trim() : '';

      const formData = new FormData();
      if (editFile) {
        formData.append('file', editFile);
      }
      formData.append('title', safeEditTitle);
      formData.append('category', safeEditCategory);
      formData.append('description', safeEditDesc);
      formData.append('scope', editScope);
      if (editScope === 'SPECIFIC') {
        formData.append('internshipId', editTargetInternshipId);
      }

      const res = await internshipDocumentApi.updateLecturerGuide(editingDoc._id, formData);
      if (res?.success) {
        showToast('Cập nhật tài liệu hướng dẫn thành công!', 'success');
        setEditModalOpen(false);
        setEditingDoc(null);
        fetchGuides();
      }
    } catch (err) {
      setEditFormError(err.response?.data?.message || err.message || 'Lỗi khi cập nhật');
    } finally {
      setSavingEdit(false);
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
      const res = await internshipDocumentApi.deleteLecturerGuide(deletingDoc._id);
      if (res?.success) {
        showToast('Đã xóa tài liệu hướng dẫn thành công!', 'success');
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
    link.setAttribute('download', doc.fileName || doc.title || 'tai-lieu-thuc-tap');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenRemoveReport = (sub) => {
    setTargetSubmission(sub);
    setRemoveReason('');
    setRemoveError('');
    setRemoveReportModalOpen(true);
  };

  const handleConfirmRemoveReport = async (e) => {
    if (e) e.preventDefault();
    const trimmedReason = typeof removeReason === 'string' ? removeReason.trim() : '';
    if (!trimmedReason) {
      setRemoveError('Vui lòng nhập lý do gỡ file báo cáo');
      return;
    }
    if (!targetSubmission) return;

    setRemovingReport(true);
    setRemoveError('');
    try {
      const internshipId =
        targetSubmission.internshipId?._id || targetSubmission.internshipId;
      if (!internshipId) {
        throw new Error('Không tìm thấy mã hồ sơ thực tập tương ứng');
      }

      const res = await internshipApi.deleteReportFile(internshipId, trimmedReason);
      if (res?.success) {
        showToast('Đã gỡ file báo cáo thực tập của sinh viên thành công!', 'success');
        setRemoveReportModalOpen(false);
        setTargetSubmission(null);
        setRemoveReason('');
        await loadData();
      }
    } catch (err) {
      setRemoveError(
        err.response?.data?.message || err.message || 'Không thể gỡ file báo cáo',
      );
    } finally {
      setRemovingReport(false);
    }
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
              Đăng tải tài liệu hướng dẫn cho sinh viên và theo dõi các file báo cáo thực tập do sinh viên nộp
            </p>
          </div>
        </div>

        {activeTab === 'GUIDES' && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài liệu mới</span>
          </button>
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
          <span>Tài liệu hướng dẫn</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'GUIDES'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
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
        {/* ================= TAB 1: TÀI LIỆU HƯỚNG DẪN ================= */}
        {activeTab === 'GUIDES' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="w-full sm:w-80">
                  <SearchInput
                    value={search}
                    onChange={(v) => setSearch(v)}
                    placeholder="Tìm theo tên file, mô tả tài liệu..."
                  />
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={filterInternshipId}
                    onChange={(e) => setFilterInternshipId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] transition bg-white"
                  >
                    <option value="">Tất cả sinh viên / phạm vi</option>
                    {internshipsList.map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.studentLabel} - {i.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={loadData}
                  className="p-2 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Guides Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {loading ? (
                <div className="p-6">
                  <LoadingSkeleton rows={4} cols={5} />
                </div>
              ) : guides.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Chưa có tài liệu hướng dẫn nào"
                  description="Hãy nhấn nút '+ Thêm tài liệu mới' để chia sẻ biểu mẫu hoặc hướng dẫn thực tập cho sinh viên."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-14">STT</th>
                        <th className="py-3.5 px-4 pl-6">Tài liệu</th>
                        <th className="py-3.5 px-4">Phân loại</th>
                        <th className="py-3.5 px-4">Mô tả / Hướng dẫn</th>
                        <th className="py-3.5 px-4">Phạm vi áp dụng</th>
                        <th className="py-3.5 px-4 pr-6 text-right w-36">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {guides.map((doc, idx) => (
                        <tr key={doc._id} className="hover:bg-slate-50/60 transition group">
                          {/* STT */}
                          <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                            {idx + 1}
                          </td>

                          {/* File info */}
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
                          <td className="py-3.5 px-4 text-xs">
                            {doc.scope === 'SPECIFIC' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <span>Chỉ định sinh viên</span>
                                </span>
                                {doc.internshipId?.studentId?.userId?.fullName && (
                                  <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[200px]">
                                    {doc.internshipId.studentId.userId.fullName}
                                    {doc.internshipId.studentId.studentCode && ` (${doc.internshipId.studentId.studentCode})`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>Tất cả sinh viên</span>
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
                                onClick={() => handleOpenEdit(doc)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                                title="Chỉnh sửa tài liệu"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(doc)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Xóa tài liệu"
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

        {/* ================= TAB 2: TÀI LIỆU SINH VIÊN NỘP ================= */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="space-y-4">
            {/* Warning banner if notification file was removed */}
            {notificationWarning && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{notificationWarning}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationWarning(null)}
                  className="text-amber-700 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/60 transition cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tổng sinh viên giám sát
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {stats.totalStudents}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Đã nộp tài liệu
                  </div>
                  <div className="text-xl font-bold text-emerald-600 mt-0.5">
                    {stats.submittedCount}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {stats.totalStudents} SV
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Chưa nộp tài liệu
                  </div>
                  <div className="text-xl font-bold text-amber-600 mt-0.5">
                    {stats.notSubmittedCount}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      SV
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and View mode toolbar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="w-full sm:w-80">
                  <SearchInput
                    value={search}
                    onChange={(v) => setSearch(v)}
                    placeholder="Tìm theo tên file, tên SV, MSSV..."
                  />
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={filterInternshipId}
                    onChange={(e) => setFilterInternshipId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] transition bg-white"
                  >
                    <option value="">Tất cả sinh viên</option>
                    {internshipsList.map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.studentLabel} - {i.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setSubmissionViewMode('FILES')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      submissionViewMode === 'FILES'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Danh sách file ({submissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionViewMode('STUDENTS')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      submissionViewMode === 'STUDENTS'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tình trạng nộp ({studentsStatus.length})
                  </button>
                </div>

                <button
                  onClick={loadData}
                  className="p-2 text-slate-500 hover:text-[#102d7d] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* View Mode 1: Files List */}
            {submissionViewMode === 'FILES' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {loading ? (
                  <div className="p-6">
                    <LoadingSkeleton rows={4} cols={5} />
                  </div>
                ) : submissions.length === 0 ? (
                  <EmptyState
                    icon={FileCheck}
                    title="Chưa có file nào được nộp"
                    description="Hiện tại chưa có sinh viên nào tải file hoặc báo cáo thực tập lên hệ thống."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4 text-center w-14">STT</th>
                          <th className="py-3.5 px-4 pl-6">Sinh viên nộp</th>
                          <th className="py-3.5 px-4">Tài liệu đã nộp</th>
                          <th className="py-3.5 px-4">Phân loại</th>
                          <th className="py-3.5 px-4">Ghi chú</th>
                          <th className="py-3.5 px-4 pr-6 text-right w-28">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {submissions.map((sub, idx) => {
                          const isHighlighted =
                            highlightedDocId &&
                            (sub._id === highlightedDocId ||
                              sub.referenceId === highlightedDocId);
                          return (
                          <tr
                            key={sub._id}
                            id={`submission-row-${sub._id}`}
                            className={`transition duration-500 group ${
                              isHighlighted
                                ? 'bg-blue-50/90 ring-2 ring-[#123891] shadow-xs'
                                : 'hover:bg-slate-50/60'
                            }`}
                          >
                            {/* STT */}
                            <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Sinh viên */}
                            <td className="py-3.5 px-4 pl-6">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 group-hover:text-[#123891] transition flex items-center gap-2">
                                  <span>{sub.studentId?.userId?.fullName || sub.uploadedBy?.fullName || 'Sinh viên'}</span>
                                  {isHighlighted && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#123891] text-white shrink-0 animate-pulse">
                                      Mới nộp
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  {sub.studentId?.studentCode && (
                                    <span className="font-mono">{sub.studentId.studentCode}</span>
                                  )}
                                  {sub.internshipId?.companyId?.name && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[150px]">{sub.internshipId.companyId.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* File */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                                  {getFileIcon(sub.fileName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate max-w-sm">
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

                            {/* Thao tác */}
                            <td className="py-3.5 px-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDownload(sub)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                                  title="Tải về file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Tải về</span>
                                </button>

                                {/* Nút Gỡ file dành cho GVGS đối với file Báo cáo thực tập */}
                                {/báo cáo/i.test(sub.category || '') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRemoveReport(sub)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition shadow-2xs cursor-pointer"
                                    title="Gỡ file báo cáo thực tập của sinh viên này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Gỡ file</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* View Mode 2: Students Submission Status */}
            {submissionViewMode === 'STUDENTS' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {loading ? (
                  <div className="p-6">
                    <LoadingSkeleton rows={4} cols={6} />
                  </div>
                ) : studentsStatus.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Chưa có sinh viên giám sát"
                    description="Hiện tại chưa có sinh viên nào được phân công bạn giám sát trong học kỳ này."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4 text-center w-14">STT</th>
                          <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                          <th className="py-3.5 px-4">Lớp</th>
                          <th className="py-3.5 px-4">Doanh nghiệp thực tập</th>
                          <th className="py-3.5 px-4">Vị trí</th>
                          <th className="py-3.5 px-4 text-center">Số file đã nộp</th>
                          <th className="py-3.5 px-4 pr-6 text-right">Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {studentsStatus.map((s, idx) => (
                          <tr key={`${s.internshipId}_${s.studentId}`} className="hover:bg-slate-50/60 transition group">
                            {/* STT */}
                            <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Sinh viên */}
                            <td className="py-3.5 px-4 pl-6">
                              <div className="font-bold text-slate-900 group-hover:text-[#123891] transition">
                                {s.studentName}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {s.studentCode || '—'}
                              </div>
                            </td>

                            {/* Lớp */}
                            <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                              {s.className || '—'}
                            </td>

                            {/* Doanh nghiệp */}
                            <td className="py-3.5 px-4 text-xs text-slate-800 font-medium max-w-[200px] truncate">
                              {s.companyName}
                            </td>

                            {/* Vị trí */}
                            <td className="py-3.5 px-4 text-xs text-slate-600">
                              {s.position || '—'}
                            </td>

                            {/* Số file đã nộp */}
                            <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-800">
                              {s.submissionCount}
                            </td>

                            {/* Tình trạng */}
                            <td className="py-3.5 px-4 pr-6 text-right">
                              {s.hasSubmitted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đã nộp</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Chưa nộp</span>
                                </span>
                              )}
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
        )}
      </div>

      {/* MODAL: THÊM TÀI LIỆU HƯỚNG DẪN MỚI */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tải Lên Tài Liệu Hướng Dẫn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đăng biểu mẫu hoặc hướng dẫn cho sinh viên thực tập
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAdd} className="space-y-4">
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

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Tên tài liệu
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Hướng dẫn viết báo cáo thực tập, Mẫu phiếu khảo sát..."
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
                  {GUIDE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Phạm vi áp dụng
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                      scope === 'ALL'
                        ? 'border-[#123891] bg-blue-50/50 text-[#123891]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="ALL"
                      checked={scope === 'ALL'}
                      onChange={() => setScope('ALL')}
                      className="text-[#123891] focus:ring-[#123891]"
                    />
                    <span>Tất cả sinh viên</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                      scope === 'SPECIFIC'
                        ? 'border-[#123891] bg-blue-50/50 text-[#123891]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="SPECIFIC"
                      checked={scope === 'SPECIFIC'}
                      onChange={() => setScope('SPECIFIC')}
                      className="text-[#123891] focus:ring-[#123891]"
                    />
                    <span>Chỉ định sinh viên</span>
                  </label>
                </div>
              </div>

              {/* Specific Internship Selector (if SPECIFIC) */}
              {scope === 'SPECIFIC' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-bold text-slate-700">
                    Chọn sinh viên / hồ sơ áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetInternshipId}
                    onChange={(e) => setTargetInternshipId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] transition bg-white"
                  >
                    {internshipsList.length === 0 ? (
                      <option value="">Không có sinh viên nào đang hướng dẫn</option>
                    ) : (
                      internshipsList.map((i) => (
                        <option key={i._id} value={i._id}>
                          {i.studentLabel} — {i.companyName} ({i.position})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mô tả / Hướng dẫn
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm về nội dung tài liệu, hạn chót hoặc yêu cầu liên quan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
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
                      <span>Tải lên tài liệu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA TÀI LIỆU */}
      {editModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chỉnh Sửa Tài Liệu Hướng Dẫn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cập nhật thông tin hoặc thay thế file tài liệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Tên tài liệu
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition"
                />
              </div>

              {/* File currently attached + option to replace */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Tệp đính kèm (Để trống nếu giữ file hiện tại)
                </label>
                <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-[#123891] shrink-0" />
                    <span className="truncate font-medium text-slate-800">
                      {editFile ? editFile.name : editingDoc.fileName}
                    </span>
                    {editFile && (
                      <span className="text-slate-400 text-[10px]">
                        (Mới: {formatFileSize(editFile.size)})
                      </span>
                    )}
                  </div>
                  <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#123891] text-[#123891] font-bold rounded-lg cursor-pointer transition shrink-0">
                    <span>Thay đổi file</span>
                    <input
                      type="file"
                      onChange={handleEditFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                    />
                  </label>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Phân loại tài liệu
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition bg-white"
                >
                  {GUIDE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Phạm vi áp dụng
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                      editScope === 'ALL'
                        ? 'border-[#123891] bg-blue-50/50 text-[#123891]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editScope"
                      value="ALL"
                      checked={editScope === 'ALL'}
                      onChange={() => setEditScope('ALL')}
                      className="text-[#123891] focus:ring-[#123891]"
                    />
                    <span>Tất cả sinh viên</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                      editScope === 'SPECIFIC'
                        ? 'border-[#123891] bg-blue-50/50 text-[#123891]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editScope"
                      value="SPECIFIC"
                      checked={editScope === 'SPECIFIC'}
                      onChange={() => setEditScope('SPECIFIC')}
                      className="text-[#123891] focus:ring-[#123891]"
                    />
                    <span>Chỉ định sinh viên</span>
                  </label>
                </div>
              </div>

              {/* Specific Internship Selector (if SPECIFIC) */}
              {editScope === 'SPECIFIC' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-bold text-slate-700">
                    Chọn sinh viên / hồ sơ áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editTargetInternshipId}
                    onChange={(e) => setEditTargetInternshipId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] transition bg-white"
                  >
                    {internshipsList.map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.studentLabel} — {i.companyName} ({i.position})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mô tả / Hướng dẫn
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891] transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA TÀI LIỆU */}
      {deleteModalOpen && deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Xóa tài liệu hướng dẫn?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa tài liệu{' '}
                <strong className="text-slate-800">
                  "{deletingDoc.title || deletingDoc.fileName}"
                </strong>
                ? Sinh viên sẽ không thể xem hoặc tải file này nữa.
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
                  <span>Xóa tài liệu</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GVGS GỠ FILE BÁO CÁO CỦA SINH VIÊN */}
      {removeReportModalOpen && targetSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gỡ File Báo Cáo Thực Tập Của Sinh Viên
                </h3>
                <p className="text-xs text-slate-500">
                  Hồ sơ sẽ chuyển về trạng thái Chưa nộp và cho phép sinh viên tải lại file mới
                </p>
              </div>
            </div>

            {/* Thông tin sinh viên & file */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sinh viên:</span>
                <strong className="text-slate-900 font-bold">
                  {targetSubmission.studentId?.userId?.fullName || targetSubmission.uploadedBy?.fullName || 'Sinh viên'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mã số sinh viên (MSSV):</span>
                <span className="font-mono font-bold text-[#123891]">
                  {targetSubmission.studentId?.studentCode || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">File sắp gỡ:</span>
                <strong className="text-rose-700 font-mono truncate max-w-[260px]" title={targetSubmission.title || targetSubmission.fileName}>
                  {targetSubmission.title || targetSubmission.fileName}
                </strong>
              </div>
            </div>

            {/* Lý do gỡ file */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Lý do gỡ file báo cáo <span className="text-rose-500">(*)</span>:
              </label>

              {/* Quick select reasons */}
              <div className="flex flex-wrap gap-1.5">
                {REMOVE_REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRemoveReason(r === 'Lý do khác' ? '' : r);
                      if (removeError) setRemoveError('');
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition cursor-pointer font-medium ${
                      removeReason === r
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={removeReason}
                onChange={(e) => {
                  setRemoveReason(e.target.value);
                  if (removeError) setRemoveError('');
                }}
                placeholder="Nhập chi tiết lý do gỡ file báo cáo (bắt buộc)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition resize-none"
              />
              {removeError && (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{removeError}</span>
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              Thao tác này sẽ xóa file báo cáo hiện tại và được ghi nhận vào lịch sử hệ thống. Hệ thống sẽ gửi thông báo đến sinh viên để nộp lại file mới.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={removingReport}
                onClick={() => {
                  setRemoveReportModalOpen(false);
                  setTargetSubmission(null);
                  setRemoveReason('');
                  setRemoveError('');
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={removingReport || !removeReason.trim()}
                onClick={handleConfirmRemoveReport}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {removingReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gỡ file...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận gỡ file</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerInternshipDocumentsPage;

