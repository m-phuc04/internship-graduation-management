import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { Building2, MapPin, Mail, Phone, Globe, UserCheck, Users, Briefcase } from 'lucide-react';

const CompanyDetailModal = ({ isOpen, onClose, company }) => {
  if (!company) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết Doanh nghiệp Đối tác"
      subtitle={`Mã DN: ${company.code || 'Chưa đặt mã'} • ${company.name}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {company.name}
              </h4>
              <StatusBadge
                status={company.status}
                label={company.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm ngưng'}
                size="sm"
              />
            </div>
            {company.code && (
              <div className="text-xs text-indigo-600 font-mono font-bold mt-0.5">
                Mã: {company.code}
              </div>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Địa chỉ & Liên lạc Doanh nghiệp
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{company.address}</span>
            </div>
            {company.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{company.email}</span>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-2 text-indigo-600">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={company.website} target="_blank" rel="noreferrer" className="hover:underline">
                  {company.website}
                </a>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Đại diện phụ trách / Tuyển dụng
            </div>
            {company.contactPerson ? (
              <div className="flex items-center gap-2 text-slate-700">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-semibold">{company.contactPerson}</span>
              </div>
            ) : (
              <div className="text-slate-400 italic">Chưa cập nhật người liên hệ</div>
            )}
            {company.contactEmail && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{company.contactEmail}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200/60 mt-2 flex items-center gap-2 text-slate-700">
              <Users className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Tổng số SV thực tập tiếp nhận:{' '}
                <strong className="text-indigo-600">
                  {company.totalInternshipsCount || company.totalInternsCount || 0} SV
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {company.description && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 mb-1">Mô tả doanh nghiệp:</div>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {company.description}
            </p>
          </div>
        )}

        {/* Close Action */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CompanyDetailModal;
