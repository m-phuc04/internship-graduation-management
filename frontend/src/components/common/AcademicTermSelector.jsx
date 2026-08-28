import React, { useState, useRef, useEffect } from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { GraduationCap, ChevronDown, Check, Sparkles, Clock, Lock, FileEdit } from 'lucide-react';

const getStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Đang diễn ra',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: Sparkles,
      };
    case 'UPCOMING':
      return {
        label: 'Sắp diễn ra',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
      };
    case 'CLOSED':
      return {
        label: 'Đã đóng (Lịch sử)',
        dot: 'bg-blue-500',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Lock,
      };
    case 'DRAFT':
    default:
      return {
        label: 'Nháp cấu hình',
        dot: 'bg-slate-400',
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: FileEdit,
      };
  }
};

const AcademicTermSelector = () => {
  const { terms, currentTerm, setCurrentTerm, loading } = useAcademicTerm();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading && !currentTerm) {
    return (
      <div className="h-9 px-3 bg-slate-100 rounded-xl animate-pulse flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-slate-200" />
        <div className="w-24 h-3 bg-slate-200 rounded" />
      </div>
    );
  }

  const currentBadge = getStatusBadge(currentTerm?.status);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
        title="Chọn học kỳ làm việc của hệ thống"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
          <GraduationCap className="w-4 h-4" />
        </div>

        <div className="text-left hidden md:block">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
            Học kỳ làm việc
          </div>
          <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5 flex items-center gap-1.5">
            <span>{currentTerm?.code || 'Chưa chọn học kỳ'}</span>
            {currentTerm && (
              <span className={`w-2 h-2 rounded-full ${currentBadge.dot} inline-block animate-pulse`} />
            )}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in divide-y divide-slate-100">
          {/* Header */}
          <div className="px-4 py-2.5 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-900">Phạm Vi Học Kỳ & Năm Học</div>
            <div className="text-[11px] text-slate-500">
              Dữ liệu Thực tập & Khóa luận sẽ được lọc theo học kỳ bạn chọn.
            </div>
          </div>

          {/* List of Terms */}
          <div className="p-1.5 max-h-72 overflow-y-auto space-y-1">
            {terms.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa có học kỳ nào được tạo
              </div>
            ) : (
              terms.map((term) => {
                const isSelected = currentTerm?._id === term._id;
                const badge = getStatusBadge(term.status);
                const BadgeIcon = badge.icon;

                return (
                  <button
                    key={term._id}
                    type="button"
                    onClick={() => {
                      setCurrentTerm(term);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 text-indigo-900 border border-indigo-200/80 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">
                          {term.name} — Năm học {term.academicYear}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-mono font-medium text-indigo-600 bg-indigo-50 px-1 rounded text-[10px]">
                          {term.code}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.badge}`}>
                          <BadgeIcon className="w-2.5 h-2.5" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicTermSelector;
