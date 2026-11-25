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
  Filter,
  FilterX,
  Calendar,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'TBM', label: 'Trưởng bộ môn' },
  { value: 'LECTURER', label: 'Giảng viên' },
  { value: 'STUDENT', label: 'Sinh viên' },
  { value: 'SYSTEM', label: 'Hệ thống tự động' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'FAILED', label: 'Thất bại' },
];

const MODULE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả phân hệ' },
  { value: 'AUTH', label: 'Xác thực & Tài khoản' },
  { value: 'USER', label: 'Quản lý người dùng' },
  { value: 'INTERNSHIP', label: 'Thực tập doanh nghiệp' },
  { value: 'INTERNSHIP_REPORT', label: 'Báo cáo thực tập' },
  { value: 'THESIS', label: 'Khóa luận tốt nghiệp' },
  { value: 'THESIS_PROGRESS', label: 'Tiến độ khóa luận' },
  { value: 'AI_ANALYSIS', label: 'Phân tích AI' },
  { value: 'EVALUATION', label: 'Đánh giá & Điểm số' },
  { value: 'NOTIFICATION', label: 'Thông báo & Tin tức' },
  { value: 'SCHEDULE', label: 'Lịch trình & Học kỳ' },
  { value: 'SYSTEM', label: 'Cấu hình hệ thống' },
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
    case 'SYSTEM':
      return {
        label: 'Hệ thống',
        className: 'bg-slate-100 text-slate-700 border-slate-300 font-bold',
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
  const [availableActions, setAvailableActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc đa điều kiện
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { showToast } = useToast();

  // Đếm số lượng bộ lọc đang hoạt động
  const activeFiltersCount = [
    search.trim() ? 1 : 0,
    roleFilter !== 'ALL' ? 1 : 0,
    statusFilter !== 'ALL' ? 1 : 0,
    moduleFilter !== 'ALL' ? 1 : 0,
    actionFilter !== 'ALL' ? 1 : 0,
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSystemLogs({
        page,
        limit: 15,
        role: roleFilter,
        status: statusFilter,
        module: moduleFilter,
        action: actionFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search.trim() || undefined,
      });

      if (res.success) {
        setLogs(res.logs || []);
        setPagination(res.pagination || null);
        if (Array.isArray(res.availableActions)) {
          setAvailableActions(res.availableActions);
        }
        if (res.pagination?.page && res.pagination.page !== page) {
          setPage(res.pagination.page);
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải nhật ký hoạt động hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, moduleFilter, actionFilter, dateFrom, dateTo, search, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setModuleFilter('ALL');
    setActionFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Banner trên cùng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <History className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Nhật Ký Hoạt Động Hệ Thống
              </h1>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#123891] text-white">
                  {activeFiltersCount} bộ lọc
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Giám sát, kiểm toán và truy vết các hoạt động thực tế của người dùng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer flex-1 sm:flex-initial"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <FilterX className="w-4 h-4 text-rose-600" />
              <span>Đặt lại</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchLogs}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900 active:scale-98 transition shadow-xs cursor-pointer flex-1 sm:flex-initial"
            title="Làm mới dữ liệu nhật ký"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Khu vực Bộ lọc đa điều kiện */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
        {/* Hàng 1: Tìm kiếm + Vai trò + Trạng thái */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Tìm theo người thực hiện, hành động, chi tiết..."
            />
          </div>

          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                title="Lọc theo vai trò người thực hiện"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
                title="Lọc theo trạng thái thực hiện"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hàng 2: Phân hệ + Hành động + Từ ngày + Đến ngày */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center pt-1 border-t border-slate-100">
          {/* Phân hệ */}
          <div className="lg:col-span-3">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
              title="Lọc theo phân hệ nghiệp vụ"
            >
              {MODULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hành động */}
          <div className="lg:col-span-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
              title="Lọc theo hành động cụ thể"
            >
              <option value="ALL">Tất cả hành động</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Từ ngày */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Từ:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer"
                title="Lọc từ ngày (00:00:00 UTC+7)"
              />
            </div>
          </div>

          {/* Đến ngày */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Đến:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer"
                title="Lọc đến ngày (23:59:59 UTC+7)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu / Danh sách thẻ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
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
          <>
            {/* Bảng hiển thị cho Desktop & Tablet (>= 768px) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[920px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center w-14 shrink-0">STT</th>
                    <th className="py-3.5 px-4 w-44">Thời gian</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Người thực hiện</th>
                    <th className="py-3.5 px-4 text-center w-36">Vai trò</th>
                    <th className="py-3.5 px-4 min-w-[190px]">Hành động</th>
                    <th className="py-3.5 px-4 pr-6 min-w-[260px]">Chi tiết & Mạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map((item, idx) => {
                    const actor = item.userId;
                    const role = item.role || actor?.role || 'SYSTEM';
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
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                HT
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-700">Hệ thống</div>
                                <div className="text-[11px] text-slate-400">Tác vụ tự động</div>
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
                            <div className="flex items-center gap-1 flex-wrap">
                              {item.module && (
                                <span className="inline-block text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                                  {item.module}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isSuccess
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Chi tiết */}
                        <td className="py-3.5 px-4 pr-6">
                          <div className="text-xs text-slate-700 font-medium line-clamp-2" title={item.description || ''}>
                            {item.description || 'Không có mô tả chi tiết'}
                          </div>
                          {item.errorMessage && (
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                              Lỗi: {item.errorMessage}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-400 mt-1 flex-wrap">
                            {item.ipAddress && <span>IP: {item.ipAddress}</span>}
                            {item.method && (
                              <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-bold">
                                {item.method}
                              </span>
                            )}
                            {item.endpoint && (
                              <span className="truncate max-w-[200px]" title={item.endpoint}>
                                {item.endpoint}
                              </span>
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
              {logs.map((item, idx) => {
                const actor = item.userId;
                const role = item.role || actor?.role || 'SYSTEM';
                const roleBadge = getRoleBadge(role);
                const isSuccess = item.status !== 'FAILED';

                return (
                  <div key={item._id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition">
                    {/* Hàng tiêu đề: Người thực hiện + Vai trò + STT */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(page - 1) * 15 + idx + 1}
                        </span>
                        <div className="min-w-0">
                          {actor ? (
                            <UserNameClickable
                              user={actor}
                              name={actor.fullName || 'Người dùng ẩn danh'}
                              subtitle={actor.email || actor.code || ''}
                              avatarSize="w-7 h-7"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                HT
                              </div>
                              <span className="text-xs font-bold text-slate-700">Hệ thống</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${roleBadge.className}`}
                      >
                        {roleBadge.label}
                      </span>
                    </div>

                    {/* Hành động & Phân hệ */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className="break-words">{item.action}</span>
                        {item.module && (
                          <span className="ml-auto text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 uppercase tracking-wider shrink-0">
                            {item.module}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-slate-600 break-words leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {item.errorMessage && (
                        <p className="text-[11px] text-rose-600 font-semibold break-words">
                          Lỗi: {item.errorMessage}
                        </p>
                      )}
                    </div>

                    {/* Chân thẻ: Thời gian, IP, Method */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5 flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTimeVN(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.ipAddress && <span>IP: {item.ipAddress}</span>}
                        {item.method && <span className="font-bold">{item.method}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Chân trang phân trang */}
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
