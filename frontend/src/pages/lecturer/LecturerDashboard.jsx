import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardApi from '../../api/dashboardApi';
import researchFieldApi from '../../api/researchFieldApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Briefcase,
  Sparkles,
  FileText,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Tag,
  Plus,
  X,
  Check,
} from 'lucide-react';

const LecturerDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Field change request states
  const [fieldRequestInfo, setFieldRequestInfo] = useState({
    hasPending: false,
    request: null,
    currentFields: [],
  });
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [allSystemFields, setAllSystemFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [proposedTags, setProposedTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [submittingFieldRequest, setSubmittingFieldRequest] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, fieldRes] = await Promise.all([
        dashboardApi.getLecturerDashboard({
          academicTermId: currentTerm?._id || '',
        }),
        researchFieldApi.getMyRequest().catch(() => null),
      ]);
      if (dashRes.success) {
        setData(dashRes.data);
      }
      if (fieldRes && fieldRes.success) {
        setFieldRequestInfo(fieldRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải tổng quan giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Handle open modal
  const handleOpenFieldModal = async () => {
    setIsFieldModalOpen(true);
    setLoadingFields(true);
    try {
      const res = await researchFieldApi.getAllFields();
      if (res.success) {
        setAllSystemFields(res.data || []);
      }

      // Initial selected fields
      if (fieldRequestInfo?.hasPending && fieldRequestInfo.request?.requestedFields) {
        setSelectedFields([...fieldRequestInfo.request.requestedFields]);
        setProposedTags([...(fieldRequestInfo.request.proposedNewTags || [])]);
      } else {
        const initialFields = fieldRequestInfo?.currentFields?.length
          ? fieldRequestInfo.currentFields
          : (data?.lecturer?.fields || []);
        setSelectedFields([...initialFields]);
        setProposedTags([]);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách lĩnh vực', 'error');
    } finally {
      setLoadingFields(false);
    }
  };

  // Toggle existing tag
  const toggleField = (fieldName) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((name) => name !== fieldName)
        : [...prev, fieldName]
    );
  };

  // Propose a new tag
  const handleAddProposedTag = () => {
    const cleanTag = newTagInput.trim();
    if (!cleanTag) return;

    if (selectedFields.includes(cleanTag)) {
      showToast('Lĩnh vực này đã được chọn', 'info');
      setNewTagInput('');
      return;
    }

    setProposedTags((prev) => (prev.includes(cleanTag) ? prev : [...prev, cleanTag]));
    setSelectedFields((prev) => [...prev, cleanTag]);
    setNewTagInput('');
  };

  // Remove proposed tag
  const handleRemoveProposedTag = (tagToRemove) => {
    setProposedTags((prev) => prev.filter((t) => t !== tagToRemove));
    setSelectedFields((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Submit field change request
  const handleSubmitFieldRequest = async () => {
    if (selectedFields.length === 0) {
      showToast('Vui lòng chọn hoặc đề xuất ít nhất một lĩnh vực', 'warning');
      return;
    }

    setSubmittingFieldRequest(true);
    try {
      const res = await researchFieldApi.createRequest({
        requestedFields: selectedFields,
        proposedNewTags: proposedTags,
      });

      if (res.success) {
        showToast('Đã gửi yêu cầu thay đổi lĩnh vực tới Trưởng bộ môn', 'success');
        setFieldRequestInfo((prev) => ({
          ...prev,
          hasPending: true,
          request: res.data,
        }));
        setIsFieldModalOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Không thể gửi yêu cầu thay đổi lĩnh vực', 'error');
    } finally {
      setSubmittingFieldRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <LoadingSkeleton rows={5} cols={4} />
        </div>
      </div>
    );
  }

  const lecturer = data?.lecturer;
  const stats = data?.stats || {};
  const supervisedInternships = data?.supervisedInternships || [];
  const supervisedTheses = data?.supervisedTheses || [];
  const pendingReports = data?.pendingInternshipReports || [];
  const pendingProgress = data?.pendingThesisProgress || [];

  const currentFields = fieldRequestInfo?.currentFields?.length
    ? fieldRequestInfo.currentFields
    : (lecturer?.fields || []);

  return (
    <div className="space-y-6">
      {/* 1. Lecturer Identity Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
            {lecturer?.academicTitle ? lecturer.academicTitle.charAt(0) : (user?.fullName?.charAt(0) || 'G')}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#123891] text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-[#1B4DA1]" />
              <span>Cổng Thông Tin Giảng Viên</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              Xin chào, {lecturer?.academicTitle ? `${lecturer.academicTitle} ` : ''}{lecturer?.userId?.fullName || user?.fullName}!
            </h1>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Khoa: <strong className="text-slate-800">{lecturer?.department || 'Công nghệ Thông tin'}</strong></span>
            </div>

            {/* Mục hiển thị Lĩnh vực của Giảng viên */}
            <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-700">Lĩnh vực:</span>
              {currentFields && currentFields.length > 0 ? (
                currentFields.map((f, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Chưa có lĩnh vực</span>
              )}
            </div>

            {/* Trạng thái chờ TBM duyệt yêu cầu thay đổi lĩnh vực */}
            {fieldRequestInfo?.hasPending && (
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Đang chờ TBM duyệt yêu cầu thay đổi lĩnh vực</span>
              </div>
            )}
          </div>
        </div>

        {/* Nút Yêu cầu thay đổi lĩnh vực và Làm mới */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleOpenFieldModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123891] border border-blue-200 transition shadow-2xs cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-[#123891]" />
            <span>Yêu cầu thay đổi lĩnh vực</span>
          </button>

          <button
            type="button"
            onClick={fetchDashboard}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Overview 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SV Hướng Dẫn TTDN */}
        <Link
          to="/lecturer/internships"
          className="p-5 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-[#123891] transition">
              SV Thực Tập (TTDN)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center group-hover:scale-110 transition">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#123891] font-mono">
            {stats.internshipStudentsCount || 0}
          </div>
          <div className="text-[11px] text-[#123891] font-semibold flex items-center gap-1">
            <span>Xem danh sách sinh viên</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Đề Tài KLTN */}
        <Link
          to="/lecturer/theses"
          className="p-5 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-[#123891] transition">
              Đề Tài Khóa Luận (KLTN)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#123891] font-mono">
            {stats.supervisedThesesCount || 0}
          </div>
          <div className="text-[11px] text-[#123891] font-semibold flex items-center gap-1">
            <span>Đang hướng dẫn</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Báo Cáo Chờ Chấm TTDN */}
        <Link
          to="/lecturer/reports"
          className="p-5 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-[#123891] transition">
              Báo Cáo Chờ Đánh Giá
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#123891] font-mono">
            {stats.pendingReportsCount || 0}
          </div>
          <div className="text-[11px] text-[#123891] font-semibold flex items-center gap-1">
            <span>Xem chi tiết báo cáo</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* KLTN Cần Chấm Phản Biện */}
        <Link
          to="/lecturer/theses"
          className="p-5 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-[#123891] transition">
              KLTN Cần Phản Biện
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center group-hover:scale-110 transition">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#123891] font-mono">
            {stats.reviewerThesesCount || 0}
          </div>
          <div className="text-[11px] text-[#123891] font-semibold flex items-center gap-1">
            <span>Vai trò cán bộ phản biện</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>
      </div>

      {/* 3. Main Split Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Reports List */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <FileText className="w-4 h-4 text-[#123891]" />
              <span>Báo Cáo TTDN Mới Gửi ({pendingReports.length})</span>
            </div>
            <Link to="/lecturer/reports" className="text-xs font-bold text-[#123891] hover:text-[#102d7d]">
              Xem tất cả →
            </Link>
          </div>

          {pendingReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <span>Tất cả báo cáo tuần đã được phản hồi!</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {pendingReports.slice(0, 5).map((r) => (
                <div key={r._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 max-w-[70%]">
                    <strong className="text-slate-900 block truncate">{r.reportTitle || `Báo cáo Tuần ${r.weekNumber || 1}`}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                      SV: {r.internshipId?.studentId?.userId?.fullName || 'Sinh viên'} ({r.internshipId?.studentId?.studentCode})
                    </span>
                  </div>
                  <Link
                    to="/lecturer/reports"
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#123891] font-semibold hover:bg-blue-100 transition whitespace-nowrap"
                  >
                    Đánh giá
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Supervised Theses List */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <GraduationCap className="w-4 h-4 text-[#1B4DA1]" />
              <span>Đề Tài KLTN Đang Hướng Dẫn ({supervisedTheses.length})</span>
            </div>
            <Link to="/lecturer/theses" className="text-xs font-bold text-[#1B4DA1] hover:text-[#ECA124]">
              Xem tất cả →
            </Link>
          </div>

          {supervisedTheses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <BookOpen className="w-8 h-8 text-slate-300" />
              <span>Chưa có đề tài KLTN nào được phân công hướng dẫn.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {supervisedTheses.slice(0, 5).map((t) => (
                <div key={t._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 max-w-[70%]">
                    <strong className="text-slate-900 line-clamp-1 block">{t.thesisTitle}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                      SV: {t.studentId?.userId?.fullName} ({t.studentId?.studentCode}){t.secondStudentId ? ` & ${t.secondStudentId?.userId?.fullName}` : ''}
                    </span>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Yêu cầu thay đổi lĩnh vực */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Yêu cầu thay đổi lĩnh vực nghiên cứu</h2>
                  <p className="text-xs text-slate-500">Chọn các lĩnh vực hiện có hoặc đề xuất tag lĩnh vực mới</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Existing System Fields */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Danh sách lĩnh vực hiện có ({allSystemFields.length})
                </label>
                {loadingFields ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Đang tải danh sách lĩnh vực...</div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    {allSystemFields.map((field) => {
                      const isSelected = selectedFields.includes(field.name);
                      return (
                        <button
                          key={field._id || field.name}
                          type="button"
                          onClick={() => toggleField(field.name)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                            isSelected
                              ? 'bg-[#123891] text-white border-[#123891] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0 inline-block" />
                          )}
                          <span>{field.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Propose New Tag */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Đề xuất lĩnh vực mới
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProposedTag();
                      }
                    }}
                    placeholder="Nhập tên tag mới muốn đề xuất..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#123891]"
                  />
                  <button
                    type="button"
                    onClick={handleAddProposedTag}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium transition cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* List of proposed new tags */}
                {proposedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {proposedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProposedTag(tag)}
                          className="hover:text-purple-900 hover:bg-purple-100 p-0.5 rounded transition cursor-pointer"
                          title="Xóa đề xuất"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Summary */}
              <div className="text-xs text-slate-500">
                Đã chọn: <strong className="text-slate-800">{selectedFields.length}</strong> lĩnh vực
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitFieldRequest}
                disabled={submittingFieldRequest || selectedFields.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingFieldRequest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Gửi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerDashboard;
