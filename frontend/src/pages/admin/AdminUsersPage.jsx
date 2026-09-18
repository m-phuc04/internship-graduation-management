import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import {
  Users,
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  Shield,
  Building,
  User,
  GraduationCap,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'ADMIN', label: 'Quản trị viên (ADMIN)' },
  { value: 'TBM', label: 'Trưởng Bộ Môn (TBM)' },
  { value: 'LECTURER', label: 'Giảng viên (LECTURER)' },
  { value: 'STUDENT', label: 'Sinh viên (STUDENT)' },
  { value: 'COMPANY', label: 'Doanh nghiệp (COMPANY)' },
];

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllUsers({ role: roleFilter, search, limit: 50 });
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho ${user.fullName} về mặc định (1111)?`)) {
      return;
    }
    try {
      const res = await adminApi.resetPassword(user._id);
      if (res.success) {
        showToast(`Đã đặt lại mật khẩu cho ${user.fullName} thành 1111!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi đặt lại mật khẩu', 'error');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">ADMIN</span>;
      case 'TBM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">TBM</span>;
      case 'LECTURER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">LECTURER</span>;
      case 'STUDENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">STUDENT</span>;
      case 'COMPANY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">COMPANY</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Toàn bộ Tài khoản Người dùng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Xem danh sách tài khoản, trạng thái hoạt động, khóa/mở khóa và đặt lại mật khẩu
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo họ tên, email, mã..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Tổng cộng: <strong>{users.length}</strong> tài khoản
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={5} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không có tài khoản nào"
              description="Không tìm thấy người dùng phù hợp với bộ lọc."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Email / Mã</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Số điện thoại</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((item, idx) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.fullName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800">{item.email || '—'}</div>
                      {item.code && (
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          Mã: {item.code}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(item.role)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleResetPassword(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                        title="Đặt lại mật khẩu về 1111"
                      >
                        Reset PW
                      </button>

                      {item.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                            item.isActive !== false
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.isActive !== false ? 'Khóa' : 'Kích hoạt'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
