import React, { useState, useEffect, useCallback } from 'react';
import companyApi from '../../api/companyApi';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CompanyFormModal from '../../components/companies/CompanyFormModal';
import CompanyDetailModal from '../../components/companies/CompanyDetailModal';
import {
  Building2,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Globe,
  Mail,
  MapPin,
  RefreshCw,
  Users,
} from 'lucide-react';

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyApi.getAll({
        page,
        limit: 10,
        search,
        status,
      });

      if (res.success) {
        setCompanies(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách doanh nghiệp', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, showToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  const handleFormSubmit = async (formData) => {
    setActionLoading(true);
    try {
      if (selectedCompany) {
        await companyApi.update(selectedCompany._id, formData);
        showToast('Cập nhật thông tin doanh nghiệp thành công!', 'success');
      } else {
        await companyApi.create(formData);
        showToast('Thêm mới doanh nghiệp thành công!', 'success');
      }
      setFormModalOpen(false);
      setSelectedCompany(null);
      fetchCompanies();
    } catch (err) {
      showToast(err.message || 'Thao tác không thành công', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCompany) return;
    setActionLoading(true);
    try {
      await companyApi.delete(selectedCompany._id);
      showToast('Xóa doanh nghiệp thành công!', 'success');
      setDeleteDialogOpen(false);
      setSelectedCompany(null);
      fetchCompanies();
    } catch (err) {
      showToast(err.message || 'Không thể xóa doanh nghiệp', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Danh sách Doanh nghiệp Đối tác
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý đơn vị hợp tác tiếp nhận thực tập, người phụ trách và tình trạng liên kết
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCompanies()}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setSelectedCompany(null);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm doanh nghiệp</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => handleFilterChange(setSearch, val)}
              placeholder="Tìm theo Tên, Mã code, Email, Người liên hệ..."
            />
          </div>

          {/* Filter: Status */}
          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
              <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            title="Không tìm thấy doanh nghiệp"
            description="Không có doanh nghiệp nào khớp với bộ lọc hoặc từ khóa tìm kiếm."
            actionText="Thêm doanh nghiệp mới"
            onAction={() => {
              setSelectedCompany(null);
              setFormModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4">Doanh nghiệp</th>
                  <th className="py-3.5 px-4">Địa chỉ</th>
                  <th className="py-3.5 px-4">Liên hệ & Email</th>
                  <th className="py-3.5 px-4">Người đại diện</th>
                  <th className="py-3.5 px-4">SV thực tập</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {companies.map((comp, idx) => (
                  <tr
                    key={comp._id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                      {(page - 1) * 10 + idx + 1}
                    </td>

                    {/* Company Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {comp.name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            {comp.code && (
                              <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-[11px]">
                                {comp.code}
                              </span>
                            )}
                            {comp.website && (
                              <a
                                href={comp.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-600 truncate max-w-[120px]"
                              >
                                {comp.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-[200px] truncate">
                      <div className="flex items-center gap-1.5" title={comp.address}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{comp.address}</span>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{comp.email || '—'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {comp.phone || '—'}
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                      <div>{comp.contactPerson || '—'}</div>
                      {comp.contactEmail && (
                        <div className="text-[11px] text-slate-400">
                          {comp.contactEmail}
                        </div>
                      )}
                    </td>

                    {/* Active Interns Count */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        <Users className="w-3 h-3 text-indigo-500" />
                        {comp.activeInternsCount || 0} đang TT
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={comp.status}
                        label={comp.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm ngưng'}
                        size="sm"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedCompany(comp);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCompany(comp);
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCompany(comp);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa doanh nghiệp"
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

        {/* Pagination */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Form Modal */}
      <CompanyFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedCompany(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedCompany}
        loading={actionLoading}
      />

      {/* Detail Modal */}
      <CompanyDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedCompany(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa doanh nghiệp"
        message={`Bạn có chắc chắn muốn xóa doanh nghiệp "${selectedCompany?.name}" (${selectedCompany?.code || ''}) khỏi hệ thống?`}
        confirmText="Xác nhận xóa"
        loading={actionLoading}
      />
    </div>
  );
};

export default CompanyManagement;
