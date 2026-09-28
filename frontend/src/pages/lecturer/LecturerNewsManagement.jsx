import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import newsApi from '../../api/newsApi';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  User,
  Tag,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  FileText,
} from 'lucide-react';
import IUHLogo from '../../components/common/IUHLogo';

const LecturerNewsManagement = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [selectedNews, setSelectedNews] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    title: '',
    category: 'THONG_BAO',
    summary: '',
    content: '',
    isPublished: true,
  });

  const fetchNews = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await newsApi.getMyNews({
        page,
        limit: 10,
        search,
        category: categoryFilter !== 'ALL' ? categoryFilter : '',
        status: statusFilter !== 'ALL' ? statusFilter : '',
      });
      if (res.success) {
        setNewsList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tin tức', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchNews(1);
  }, [fetchNews]);

  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setSelectedNews(null);
    setFormData({
      title: '',
      category: 'THONG_BAO',
      summary: '',
      content: '',
      isPublished: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (news) => {
    setModalMode('EDIT');
    setSelectedNews(news);
    setFormData({
      title: news.title || '',
      category: news.category || 'THONG_BAO',
      summary: news.summary || '',
      content: news.content || '',
      isPublished: news.isPublished !== undefined ? news.isPublished : true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tiêu đề tin tức', 'error');
      return;
    }
    if (!formData.content.trim()) {
      showToast('Vui lòng nhập nội dung tin tức', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'CREATE') {
        const res = await newsApi.createNews(formData);
        if (res.success) {
          showToast('Tạo tin tức mới thành công!', 'success');
          setModalOpen(false);
          fetchNews(1);
        }
      } else {
        const res = await newsApi.updateNews(selectedNews._id, formData);
        if (res.success) {
          showToast('Cập nhật tin tức thành công!', 'success');
          setModalOpen(false);
          fetchNews(pagination.page);
        }
      }
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra khi lưu tin tức', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id, currentStatus) => {
    try {
      const res = await newsApi.togglePublish(id);
      if (res.success) {
        showToast(res.message || `Đã ${!currentStatus ? 'hiển thị' : 'ẩn'} bài viết`, 'success');
        fetchNews(pagination.page);
      }
    } catch (err) {
      showToast(err.message || 'Không thể đổi trạng thái bài viết', 'error');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}"?`)) {
      return;
    }
    try {
      const res = await newsApi.deleteNews(id);
      if (res.success) {
        showToast('Đã xóa tin tức thành công', 'success');
        fetchNews(pagination.page);
      }
    } catch (err) {
      showToast(err.message || 'Không thể xóa bài viết', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'THONG_BAO':
        return { label: 'Thông Báo', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'SU_KIEN':
        return { label: 'Sự Kiện', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'TIN_TUC':
      default:
        return { label: 'Tin Tức', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-xs border border-white/15">
            <Newspaper className="w-3.5 h-3.5 text-blue-300" />
            <span>Khoa Công Nghệ Thông Tin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Quản Lý Tin Tức & Sự Kiện Trang Chủ
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Tạo và quản lý các thông báo, sự kiện và tin tức hiển thị trực tiếp trên Cổng thông tin công khai.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#123891] hover:bg-[#123891] text-white text-xs font-bold shadow-lg shadow-blue-900/10 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Tin Tức Mới</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung..."
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#123891] cursor-pointer"
          >
            <option value="ALL">Tất cả danh mục</option>
            <option value="THONG_BAO">Thông báo</option>
            <option value="TIN_TUC">Tin tức</option>
            <option value="SU_KIEN">Sự kiện</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#123891] cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đang hiển thị</option>
            <option value="HIDDEN">Đang ẩn</option>
          </select>

          <button
            type="button"
            onClick={() => fetchNews(1)}
            title="Làm mới"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. News Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Tiêu đề bài viết</th>
                <th className="px-4 py-3.5">Danh mục</th>
                <th className="px-4 py-3.5">Người đăng</th>
                <th className="px-4 py-3.5">Ngày đăng</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5 text-center">Lượt xem</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin" />
                      <span>Đang tải danh sách tin tức...</span>
                    </div>
                  </td>
                </tr>
              ) : newsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Newspaper className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-slate-600 text-sm">Chưa có tin tức nào</div>
                    <div className="text-xs text-slate-400 mt-1">Bấm nút "Tạo Tin Tức Mới" để đăng bài viết đầu tiên.</div>
                  </td>
                </tr>
              ) : (
                newsList.map((item) => {
                  const cat = getCategoryBadge(item.category);
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-semibold text-slate-900 max-w-xs sm:max-w-md truncate">
                        <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                        {item.summary && (
                          <div className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                            {item.summary}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${cat.bg}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-700">
                        {item.authorName || item.authorId?.fullName || 'Khoa CNTT'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-mono">
                        {formatDate(item.publishedAt || item.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(item._id, item.isPublished)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer ${
                            item.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.isPublished ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Hiển thị</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Đang ẩn</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center font-mono text-slate-500">
                        {item.views || 0}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          title="Chỉnh sửa"
                          className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id, item.title)}
                          title="Xóa bài viết"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Create / Edit News */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => !submitting && setModalOpen(false)} />

          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#102d7d] flex items-center justify-center font-bold">
                  <Newspaper className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modalMode === 'CREATE' ? 'Tạo Tin Tức / Sự Kiện Mới' : 'Chỉnh Sửa Tin Tức'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tin tức sẽ được hiển thị trên Trang chủ Cổng thông tin
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Danh mục tin <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                  >
                    <option value="THONG_BAO">Thông Báo (Quan trọng)</option>
                    <option value="TIN_TUC">Tin Tức Đào Tạo & Hoạt Động</option>
                    <option value="SU_KIEN">Sự Kiện & Hội Thảo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Trạng thái hiển thị
                  </label>
                  <select
                    value={formData.isPublished ? 'TRUE' : 'FALSE'}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.value === 'TRUE' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                  >
                    <option value="TRUE">Hiển thị ngay trên Trang Chủ</option>
                    <option value="FALSE">Lưu bản nháp (Ẩn bài)</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tiêu đề bài viết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Thông báo kế hoạch đăng ký đề tài Khóa luận tốt nghiệp HK1 2026-2027"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tóm tắt ngắn (Mô tả hiển thị trên thẻ bài viết)
                </label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Tóm tắt ngắn gọn 1-2 câu về nội dung chính của thông báo..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-none"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={7}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập đầy đủ nội dung thông báo, mốc thời gian, yêu cầu, liên hệ..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold shadow-md shadow-blue-900/10 transition duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>{modalMode === 'CREATE' ? 'Đăng Bài Viết' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerNewsManagement;
