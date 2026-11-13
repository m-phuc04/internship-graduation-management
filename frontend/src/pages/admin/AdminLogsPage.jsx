import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import UserNameClickable from '../../components/common/UserNameClickable';
import {
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'ADMIN', label: 'Quản trị viên (ADMIN)' },
  { value: 'TBM', label: 'Trưởng Bộ Môn (TBM)' },
  { value: 'LECTURER', label: 'Giảng viên (LECTURER)' },
  { value: 'STUDENT', label: 'Sinh viên (STUDENT)' },
];

const formatDateTimeVN = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
};

const getRoleBadge = (role) => {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'Quản trị viên',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'TBM':
      return {
        label: 'Trưởng bộ môn',
        className: 'bg-blue-50 text-[#123891] border-blue-200',
      };
    case 'LECTURER':
      return {
        label: 'Giảng viên',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'STUDENT':
      return {
        label: 'Sinh viên',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    default:
      return {
        label: role || 'Hệ thống',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
};

const AdminLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { showToast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSystemLogs({
        page,
        limit: 15,
        role: roleFilter,
        search,
      });

      if (res.success) {
        setLogs(res.logs || []);
        setPagination(res.pagination || null);
        if (res.pagination?.page && res.pagination.page !== page) {
          setPage(res.pagination.page);
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải nhật ký hoạt động hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Nhật Ký Hoạt Động Hệ Thống
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Giám sát và kiểm toán toàn bộ hoạt động của người dùng trong hệ thống
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900 active:scale-98 transition shadow-xs cursor-pointer self-start sm:self-auto"
          title="Làm mới dữ liệu nhật ký"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo người thực hiện, hành động, chi tiết..."
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <label htmlFor="role-filter" className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">
            Lọc theo vai trò:
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={handleRoleChange}
            className="w-full sm:w-auto min-w-[220px] py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={6} cols={6} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="Không tìm thấy nhật ký hoạt động"
            description="Chưa có dữ liệu nhật ký nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4 w-44">Thời gian</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Người thực hiện</th>
                  <th className="py-3.5 px-4 text-center w-36">Vai trò</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Hành động</th>
                  <th className="py-3.5 px-4 pr-6 min-w-[260px]">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((item, idx) => {
                  const actor = item.userId;
                  const role = actor?.role || 'SYSTEM';
                  const roleBadge = getRoleBadge(role);
                  const isSuccess = item.status !== 'FAILED';

                  return (
                    <tr
                      key={item._id}
                      className="transition-colors hover:bg-slate-50/80 group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                        {(page - 1) * 15 + idx + 1}
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTimeVN(item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3.5 px-4">
                        {actor ? (
                          <UserNameClickable
                            user={actor}
                            name={actor.fullName || 'Người dùng ẩn danh'}
                            subtitle={actor.email || actor.code || ''}
                            avatarSize="w-8 h-8"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                              HT
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-700">Hệ thống</div>
                              <div className="text-[11px] text-slate-400">Tự động (System)</div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge.className}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                            {isSuccess ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            )}
                            <span>{item.action}</span>
                          </div>
                          {item.module && (
                            <span className="inline-block text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                              {item.module}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Chi tiết */}
                      <td className="py-3.5 px-4 pr-6">
                        <div className="text-xs text-slate-600 line-clamp-2" title={item.description || ''}>
                          {item.description || 'Không có mô tả chi tiết'}
                        </div>
                        {item.ipAddress && (
                          <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                            IP: {item.ipAddress}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogsPage;
