import React, { useState, useEffect, useCallback } from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import academicTermApi from '../../api/academicTermApi';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  Clock,
  FileEdit,
  AlertCircle,
  Briefcase,
  Layers,
  X,
} from 'lucide-react';

import {
  formatDateVN,
  formatFullDateVN,
  formatDateForInput,
  parseLocalDate,
} from '../../utils/dateUtils';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Đang diễn ra',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Sparkles,
  },
  UPCOMING: {
    label: 'Sắp diễn ra',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  CLOSED: {
    label: 'Đã đóng',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Lock,
  },
  DRAFT: {
    label: 'Nháp cấu hình',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: FileEdit,
  },
};

const formatDate = (d) => formatDateVN(d);

const AcademicTermManagement = () => {
  const { terms, refreshTerms, setCurrentTerm, currentTerm } = useAcademicTerm();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [viewingTerm, setViewingTerm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: 'Học kỳ 1',
    academicYear: '2026-2027',
    code: '',
    startDate: '',
    endDate: '',
    status: 'DRAFT',
    description: '',
  });

  // Auto-generate Code suggestion
  const handleAutoCode = (name, year) => {
    let prefix = 'HK1';
    if (name.toLowerCase().includes('2')) prefix = 'HK2';
    else if (name.toLowerCase().includes('3') || name.toLowerCase().includes('hè')) prefix = 'HK3';
    return `${prefix}-${year.trim()}`;
  };

  // Open Create Modal
  const openCreateModal = () => {
    const defaultName = 'Học kỳ 2';
    const defaultYear = '2026-2027';
    setEditingTerm(null);
    setFormData({
      name: defaultName,
      academicYear: defaultYear,
      code: handleAutoCode(defaultName, defaultYear),
      startDate: '',
      endDate: '',
      status: 'UPCOMING',
      description: '',
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (term) => {
    setEditingTerm(term);
    setFormData({
      name: term.name || '',
      academicYear: term.academicYear || '',
      code: term.code || '',
      startDate: formatDateForInput(term.startDate),
      endDate: formatDateForInput(term.endDate),
      status: term.status || 'DRAFT',
      description: term.description || '',
    });
    setModalOpen(true);
  };

  // Submit Create/Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.academicYear?.trim() || !formData.code?.trim() || !formData.startDate || !formData.endDate) {
      showError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      showError('Ngày kết thúc học kỳ phải sau ngày bắt đầu học kỳ');
      return;
    }

    try {
      setActionLoading(true);
      if (editingTerm) {
        await academicTermApi.updateTerm(editingTerm._id, formData);
        showSuccess('Cập nhật thông tin học kỳ thành công!');
      } else {
        await academicTermApi.createTerm(formData);
        showSuccess('Tạo học kỳ thành công.');
      }
      setModalOpen(false);
      await refreshTerms();
    } catch (err) {
      const status = err.response?.status;
      const resMsg = err.response?.data?.message || err.message;
      if (status === 409) {
        showError(resMsg || 'Mã học kỳ đã tồn tại. Vui lòng sử dụng mã khác.');
      } else {
        showError(resMsg || 'Không thể tạo học kỳ. Vui lòng thử lại.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Activate Term
  const handleActivate = async (term) => {
    if (!window.confirm(`Xác nhận kích hoạt học kỳ ${term.code} thành học kỳ hiện tại (ACTIVE)?\n\nHọc kỳ đang hoạt động trước đó sẽ tự động chuyển sang ĐÃ ĐÓNG (CLOSED).`)) {
      return;
    }

    try {
      setActionLoading(true);
      await academicTermApi.activateTerm(term._id);
      showSuccess(`Đã kích hoạt học kỳ ${term.code} thành công.`);
      setCurrentTerm(term);
      await refreshTerms();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Lỗi khi kích hoạt học kỳ');
    } finally {
      setActionLoading(false);
    }
  };

  // Close Term
  const handleClose = async (term) => {
    if (!window.confirm(`Xác nhận ĐÓNG học kỳ ${term.code}?\n\nSau khi đóng, các dữ liệu lịch sử sẽ chuyển sang chế độ CHỈ XEM.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await academicTermApi.closeTerm(term._id);
      showSuccess(`Đã đóng học kỳ ${term.code}.`);
      await refreshTerms();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Lỗi khi đóng học kỳ');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Term
  const handleDelete = async (term) => {
    if (!window.confirm(`Xác nhận XÓA học kỳ ${term.code}?\n\nLưu ý: Chỉ học kỳ chưa có dữ liệu TTDN & KLTN mới được phép xóa.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await academicTermApi.deleteTerm(term._id);
      showSuccess('Xóa học kỳ thành công!');
      await refreshTerms();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Không thể xóa học kỳ');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered terms
  const filteredTerms = terms.filter((term) => {
    if (statusFilter !== 'ALL' && term.status !== statusFilter) return false;
    if (yearFilter !== 'ALL' && term.academicYear !== yearFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = term.name?.toLowerCase().includes(q);
      const matchCode = term.code?.toLowerCase().includes(q);
      const matchYear = term.academicYear?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchYear) return false;
    }
    return true;
  });

  const uniqueYears = Array.from(new Set(terms.map((t) => t.academicYear))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Học kỳ & Năm học
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý danh sách các học kỳ, niên khóa đào tạo và trạng thái hoạt động của hệ thống
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B4DB7] hover:bg-[#093e94] text-white font-bold text-xs shadow-sm transition hover:shadow-md shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Học Kỳ Mới</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã, tên học kỳ, năm học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-medium text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang diễn ra (ACTIVE)</option>
            <option value="UPCOMING">🟡 Sắp diễn ra (UPCOMING)</option>
            <option value="CLOSED">🔵 Đã đóng (CLOSED)</option>
            <option value="DRAFT">⚪ Nháp cấu hình (DRAFT)</option>
          </select>

          {/* Academic Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-medium text-slate-700"
          >
            <option value="ALL">Tất cả năm học</option>
            {uniqueYears.map((y) => (
              <option key={y} value={y}>
                Năm học {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Academic Terms */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-14">STT</th>
                <th className="py-3.5 px-4">Học kỳ / Mã</th>
                <th className="py-3.5 px-4">Năm học</th>
                <th className="py-3.5 px-4">Thời gian học kỳ</th>
                <th className="py-3.5 px-4">Dữ liệu liên kết</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy học kỳ nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term, idx) => {
                  const statusConf = STATUS_CONFIG[term.status] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = statusConf.icon;
                  const isCurrentActive = term.status === 'ACTIVE';

                  return (
                    <tr key={term._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{term.name}</div>
                        <div className="text-[11px] font-mono font-medium text-indigo-600 mt-0.5">
                          {term.code}
                        </div>
                      </td>

                      {/* Year */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {term.academicYear}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {formatDate(term.startDate)} — {formatDate(term.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Attached Counts */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-100"
                            title="Số hồ sơ thực tập"
                          >
                            <Briefcase className="w-3 h-3" /> {term.internshipCount || 0} TTDN
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[11px] border border-purple-100"
                            title="Số đề tài khóa luận"
                          >
                            <Layers className="w-3 h-3" /> {term.thesisCount || 0} KLTN
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConf.badge}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusConf.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingTerm(term);
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Xem chi tiết các mốc thời gian"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(term)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Chỉnh sửa thông tin học kỳ"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Activate */}
                          {!isCurrentActive && (
                            <button
                              type="button"
                              onClick={() => handleActivate(term)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Đặt làm học kỳ hiện tại (ACTIVE)"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Close */}
                          {term.status !== 'CLOSED' && (
                            <button
                              type="button"
                              onClick={() => handleClose(term)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Đóng học kỳ (Chuyển sang chỉ xem)"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(term)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Xóa học kỳ (Chỉ khi chưa có dữ liệu)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Mới / Chỉnh Sửa Học Kỳ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">
                  {editingTerm ? `Chỉnh sửa Học kỳ: ${editingTerm.code}` : 'Tạo mới Học kỳ & Năm học'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Core Information */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  1. Thông tin chung học kỳ
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên học kỳ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Học kỳ 1, Học kỳ 2..."
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          name: val,
                          code: editingTerm ? formData.code : handleAutoCode(val, formData.academicYear),
                        });
                      }}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Năm học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 2026-2027"
                      value={formData.academicYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          academicYear: val,
                          code: editingTerm ? formData.code : handleAutoCode(formData.name, val),
                        });
                      }}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã học kỳ (Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: HK1-2026-2027"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Trạng thái <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                    >
                      <option value="DRAFT">Nháp cấu hình (DRAFT)</option>
                      <option value="UPCOMING">Sắp diễn ra (UPCOMING)</option>
                      <option value="ACTIVE">Đang diễn ra (ACTIVE)</option>
                      <option value="CLOSED">Đã đóng (CLOSED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày bắt đầu học kỳ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    {formData.startDate && (
                      <div className="text-[11px] font-semibold text-indigo-700 mt-1 flex items-center gap-1 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                        <span>📅</span>
                        <span>{formatFullDateVN(formData.startDate)} ({formatDateVN(formData.startDate)})</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày kết thúc học kỳ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    {formData.endDate && (
                      <div className="text-[11px] font-semibold text-indigo-700 mt-1 flex items-center gap-1 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                        <span>📅</span>
                        <span>{formatFullDateVN(formData.endDate)} ({formatDateVN(formData.endDate)})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Date Presets & Suggestion Helper */}
                <div className="mt-3 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-[11px] text-indigo-900 leading-tight">
                    💡 <span className="font-semibold">Quy ước chuẩn:</span> HK1 (01/08 → 31/12), HK2 (01/01 → 31/05).
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const years = formData.academicYear.split('-');
                        const startYear = years[0]?.trim() || new Date().getFullYear();
                        setFormData({
                          ...formData,
                          name: formData.name || 'Học kỳ 1',
                          startDate: `${startYear}-08-01`,
                          endDate: `${startYear}-12-31`,
                          code: handleAutoCode('Học kỳ 1', formData.academicYear),
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition cursor-pointer"
                    >
                      Áp dụng mẫu HK1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const years = formData.academicYear.split('-');
                        const endYear = years[1]?.trim() || (parseInt(years[0] || new Date().getFullYear(), 10) + 1);
                        setFormData({
                          ...formData,
                          name: formData.name || 'Học kỳ 2',
                          startDate: `${endYear}-01-01`,
                          endDate: `${endYear}-05-31`,
                          code: handleAutoCode('Học kỳ 2', formData.academicYear),
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition cursor-pointer"
                    >
                      Áp dụng mẫu HK2
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading
                    ? editingTerm
                      ? 'Đang cập nhật...'
                      : 'Đang tạo...'
                    : editingTerm
                    ? 'Lưu Thay Đổi'
                    : 'Tạo Học Kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Học Kỳ */}
      {detailModalOpen && viewingTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-scale-up">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">
                  Chi tiết: {viewingTerm.name} — {viewingTerm.code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Năm học</div>
                  <div className="font-bold text-slate-800 mt-1">{viewingTerm.academicYear}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Trạng thái</div>
                  <div className="font-bold text-indigo-600 mt-1">{viewingTerm.status}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-600">Hồ sơ TTDN</div>
                  <div className="font-bold text-blue-900 text-sm mt-0.5">{viewingTerm.internshipCount || 0}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                  <div className="text-[10px] uppercase font-bold text-purple-600">Đề tài KLTN</div>
                  <div className="font-bold text-purple-900 text-sm mt-0.5">{viewingTerm.thesisCount || 0}</div>
                </div>
              </div>

              {/* TTDN Milestones */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Kế hoạch Thực tập Doanh nghiệp (TTDN)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Thời gian đăng ký:</span>{' '}
                    <span className="font-medium">
                      {formatDate(viewingTerm.internship?.registrationStart)} — {formatDate(viewingTerm.internship?.registrationEnd)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Thời gian nộp báo cáo:</span>{' '}
                    <span className="font-medium">
                      {formatDate(viewingTerm.internship?.reportStart)} — {formatDate(viewingTerm.internship?.reportDeadline)}
                    </span>
                  </div>
                </div>
              </div>

              {/* KLTN Milestones */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Kế hoạch Khóa luận Tốt nghiệp (KLTN)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Thời gian đăng ký:</span>{' '}
                    <span className="font-medium">
                      {formatDate(viewingTerm.thesis?.registrationStart)} — {formatDate(viewingTerm.thesis?.registrationEnd)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Phân công GVHD/PB:</span>{' '}
                    <span className="font-medium">
                      {formatDate(viewingTerm.thesis?.assignmentStart)} — {formatDate(viewingTerm.thesis?.assignmentEnd)}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Thời gian bảo vệ:</span>{' '}
                    <span className="font-medium">
                      {formatDate(viewingTerm.thesis?.defenseStart)} — {formatDate(viewingTerm.thesis?.defenseEnd)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicTermManagement;
