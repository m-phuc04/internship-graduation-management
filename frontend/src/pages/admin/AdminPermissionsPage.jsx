import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Check,
  ChevronDown,
} from 'lucide-react';

const RoleDropdown = ({ lecturer, onRoleChange, isUpdating, isLast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isTbm = lecturer.user?.role === 'TBM';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (role) => {
    setIsOpen(false);
    if (role !== lecturer.user?.role) {
      onRoleChange(lecturer, role);
    }
  };

  return (
    <div className="relative inline-block w-44 text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setIsOpen(!isOpen)}
        title="Nhấn để chọn vai trò"
        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border select-none ${
          isOpen
            ? isLast
              ? 'rounded-b-xl rounded-t-none'
              : 'rounded-t-xl rounded-b-none'
            : 'rounded-xl shadow-xs'
        } ${
          isTbm
            ? 'bg-blue-50 text-[#123891] border-blue-300 ring-1 ring-blue-500/20'
            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 hover:border-slate-300'
        } ${isUpdating ? 'opacity-60 cursor-wait' : ''}`}
      >
        <span className="truncate">
          {isTbm ? 'Trưởng Bộ Môn' : 'Giảng viên'}
        </span>
        {isUpdating ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 ml-1.5" />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#123891]' : ''
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 w-full bg-white shadow-xl border border-slate-300 z-50 animate-in fade-in-50 duration-100 overflow-hidden ${
            isLast
              ? 'bottom-full rounded-t-xl border-b-0'
              : 'top-full rounded-b-xl border-t-0'
          }`}
        >
          <div className="p-1 space-y-0.5">
            {/* Option 1: LECTURER */}
            <button
              type="button"
              onClick={() => handleSelect('LECTURER')}
              className={`w-full px-3 py-2 rounded-lg text-xs text-left transition cursor-pointer flex items-center justify-between ${
                !isTbm
                  ? 'bg-blue-50 text-[#123891] font-bold'
                  : 'text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Giảng viên</span>
              {!isTbm && <Check className="w-3.5 h-3.5 text-[#123891] stroke-[2.5]" />}
            </button>

            {/* Option 2: TBM */}
            <button
              type="button"
              onClick={() => handleSelect('TBM')}
              className={`w-full px-3 py-2 rounded-lg text-xs text-left transition cursor-pointer flex items-center justify-between ${
                isTbm
                  ? 'bg-blue-50 text-[#123891] font-bold'
                  : 'text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Trưởng Bộ Môn</span>
              {isTbm && <Check className="w-3.5 h-3.5 text-[#123891] stroke-[2.5]" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPermissionsPage = () => {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingLecId, setUpdatingLecId] = useState(null);
  const { showToast } = useToast();

  const fetchPermissionsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPermissionsList();
      if (res.success) {
        setLecturers(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPermissionsList();
  }, [fetchPermissionsList]);

  const handleRoleChange = async (lecturer, newRole) => {
    setUpdatingLecId(lecturer._id);
    try {
      const res = await adminApi.updateLecturerPermissions(lecturer._id, {
        role: newRole,
        permissions: lecturer.permissions || ['GVHD', 'GVPB_KIN', 'GVPB_HOIDONG'],
      });

      if (res.success) {
        showToast(
          `Đã đổi vai trò của ${lecturer.user?.fullName || 'giảng viên'} thành ${
            newRole === 'TBM' ? 'Trưởng Bộ Môn' : 'Giảng viên'
          }!`,
          'success'
        );

        // Optimistic local state update
        setLecturers((prev) =>
          prev.map((item) => {
            if (item._id === lecturer._id) {
              return {
                ...item,
                user: {
                  ...item.user,
                  role: newRole,
                },
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      showToast(err.message || 'Không thể đổi vai trò', 'error');
    } finally {
      setUpdatingLecId(null);
    }
  };

  // Filter list by search
  const filteredLecturers = lecturers.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = l.user?.fullName?.toLowerCase() || '';
    const code = l.lecturerCode?.toLowerCase() || '';
    const spec = l.specialization?.toLowerCase() || '';
    return name.includes(term) || code.includes(term) || spec.includes(term);
  });

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#123891] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Phân quyền Giảng viên & Trưởng Bộ Môn
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chỉ định và chuyển đổi trực tiếp vai trò Giảng viên và Trưởng Bộ Môn
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchPermissionsList}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Filter / Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên GV, Mã GV, Chuyên môn..."
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Tổng cộng: <strong>{filteredLecturers.length}</strong> giảng viên
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs min-h-[300px] overflow-visible pb-10">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={5} />
          </div>
        ) : filteredLecturers.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không tìm thấy giảng viên"
              description="Không có giảng viên nào phù hợp với điều kiện tìm kiếm."
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible min-h-[260px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Mã GV</th>
                  <th className="py-3.5 px-4">Vai Trò (Role)</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLecturers.map((item, idx) => {
                  const isLast = idx >= Math.max(1, filteredLecturers.length - 1);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Name & Academic Title */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {item.academicTitle ? `${item.academicTitle} ` : ''}
                          {item.user?.fullName || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.specialization || 'Chưa cập nhật chuyên môn'}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {item.lecturerCode}
                      </td>

                      {/* Role (Inline Interactive Dropdown) */}
                      <td className="py-3.5 px-4">
                        <RoleDropdown
                          lecturer={item}
                          onRoleChange={handleRoleChange}
                          isUpdating={updatingLecId === item._id}
                          isLast={isLast}
                        />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {item.user?.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPermissionsPage;
