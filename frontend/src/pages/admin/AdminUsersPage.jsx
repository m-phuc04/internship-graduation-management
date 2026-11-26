import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import {
  Users,
  KeyRound,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'TBM', label: 'Trưởng Bộ Môn' },
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'STUDENT', label: 'Sinh viên' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
];

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllUsers({ role: roleFilter, status: statusFilter, search, page, limit });
      if (res.success) {
        setUsers(res.users || []);
        const meta = res.pagination || {
          total: res.total ?? (res.users || []).length,
          page: res.page ?? page,
          limit: res.limit ?? limit,
          totalPages: res.totalPages ?? (Math.ceil((res.total ?? (res.users || []).length) / limit) || 1),
        };
        setPagination(meta);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, page, limit, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilterChange = (val) => {
    setRoleFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(Number(val));
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const getPageNumbers = (curr, totalP) => {
    if (totalP <= 7) {
      return Array.from({ length: totalP }, (_, i) => i + 1);
    }
    if (curr <= 4) {
      return [1, 2, 3, 4, 5, '...', totalP];
    }
    if (curr >= totalP - 3) {
      return [1, '...', totalP - 4, totalP - 3, totalP - 2, totalP - 1, totalP];
    }
    return [1, '...', curr - 1, curr, curr + 1, '...', totalP];
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await adminApi.toggleUserStatus(user._id);
      if (res.success) {
        showToast(res.message, 'success');
        fetchUsers();
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const handleOpenResetPassword = (user) => {
    if (user.role === 'ADMIN') {
      showToast('Không được phép đặt lại mật khẩu cho tài khoản Quản trị viên', 'warning');
      return;
    }
    if (!['STUDENT', 'LECTURER', 'TBM'].includes(user.role)) {
      showToast('Chức năng đặt lại mật khẩu chỉ áp dụng cho tài khoản Sinh viên, Giảng viên hoặc Trưởng bộ môn', 'warning');
      return;
    }
    setResetTargetUser(user);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">ADMIN</span>;
      case 'TBM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">TBM</span>;
      case 'LECTURER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#102d7d]">LECTURER</span>;
      case 'STUDENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">STUDENT</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Banner tiêu đề trang */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Quản lý Toàn bộ Tài khoản Người dùng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Xem danh sách tài khoản, trạng thái hoạt động, khóa/mở khóa và đặt lại mật khẩu
            </p>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="w-full lg:w-80">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo họ tên, email, mã..."
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-end">
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap text-right sm:text-left">
            Tổng cộng: <strong>{pagination.total}</strong> tài khoản
          </div>
        </div>
      </div>

      {/* 3. Bảng / Danh sách thẻ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={5} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 sm:p-12">
            <EmptyState
              title="Không có tài khoản nào"
              description="Không tìm thấy người dùng phù hợp với bộ lọc."
            />
          </div>
        ) : (
          <>
            {/* Bảng hiển thị cho Desktop & Tablet (>= 768px) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs min-w-[880px]">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center w-14 shrink-0">STT</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Họ và Tên</th>
                    <th className="py-3.5 px-4 min-w-[190px]">Email / Mã</th>
                    <th className="py-3.5 px-4 min-w-[100px]">Role</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Số điện thoại</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right min-w-[170px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((item, idx) => {
                    const rowStt = (pagination.page - 1) * pagination.limit + idx + 1;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-500 whitespace-nowrap">
                          {rowStt}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {item.fullName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-slate-800 font-medium">{item.email || '—'}</div>
                          {item.code && (
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              Mã: {item.code}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{getRoleBadge(item.role)}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {item.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 shrink-0" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3 shrink-0" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2 shrink-0">
                            {['STUDENT', 'LECTURER', 'TBM'].includes(item.role) && (
                              <button
                                type="button"
                                onClick={() => handleOpenResetPassword(item)}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                                title="Đặt lại mật khẩu & gửi email"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reset PW</span>
                              </button>
                            )}

                            {item.role !== 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                className={`inline-flex items-center justify-center min-w-[78px] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs ${
                                  item.isActive !== false
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                                }`}
                              >
                                {item.isActive !== false ? 'Khóa' : 'Kích hoạt'}
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

            {/* Hiển thị thẻ Mobile (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {users.map((item, idx) => {
                const rowStt = (pagination.page - 1) * pagination.limit + idx + 1;
                return (
                  <div key={item._id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                    {/* Dòng trên: STT + Họ tên + Huy hiệu vai trò */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {rowStt}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-sm block truncate">
                            {item.fullName}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">{getRoleBadge(item.role)}</div>
                    </div>

                    {/* Thông tin: Email, Mã, Điện thoại */}
                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Email:</span>
                        <span className="font-medium text-slate-800 truncate text-[11px]">
                          {item.email || '—'}
                        </span>
                      </div>
                      {item.code && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-[11px]">Mã định danh:</span>
                          <span className="font-mono text-slate-800 font-semibold text-[11px]">
                            {item.code}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Số điện thoại:</span>
                        <span className="font-mono text-slate-700 text-[11px]">
                          {item.phone || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Dòng dưới: Trạng thái + Thao tác */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div>
                        {item.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {['STUDENT', 'LECTURER', 'TBM'].includes(item.role) && (
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                            title="Đặt lại mật khẩu & gửi email"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset PW</span>
                          </button>
                        )}

                        {item.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                              item.isActive !== false
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.isActive !== false ? 'Khóa' : 'Kích hoạt'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Khu vực phân trang (Pagination) */}
            <div className="bg-slate-50/60 border-t border-slate-200/80 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3.5 text-xs">
              {/* Bên trái: Thông tin hiển thị & Bộ chọn số bản ghi/trang */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-slate-500 w-full md:w-auto justify-between sm:justify-start">
                <div>
                  Hiển thị{' '}
                  <span className="font-bold text-slate-800">
                    {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  trên tổng số <span className="font-bold text-slate-800">{pagination.total}</span> tài khoản
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Hiển thị:</span>
                  <select
                    value={limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 cursor-pointer shadow-2xs"
                  >
                    <option value={10}>10 tài khoản / trang</option>
                    <option value={20}>20 tài khoản / trang</option>
                    <option value={50}>50 tài khoản / trang</option>
                  </select>
                </div>
              </div>

              {/* Bên phải: Nút Trước, Các số trang, Nút Tiếp theo */}
              <div className="flex items-center gap-1.5 w-full md:w-auto justify-center md:justify-end">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Trước</span>
                </button>

                {/* Danh sách các số trang */}
                <div className="flex items-center gap-1">
                  {getPageNumbers(pagination.page, pagination.totalPages).map((p, pIdx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${pIdx}`} className="px-1.5 py-1 text-slate-400 font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === pagination.page;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-[#123891] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                  title="Trang tiếp theo"
                >
                  <span className="hidden sm:inline">Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Reset mật khẩu tài khoản an toàn */}
      <ResetPasswordModal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => setResetTargetUser(null)}
        targetUser={resetTargetUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default AdminUsersPage;
