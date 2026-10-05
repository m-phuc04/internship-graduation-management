import React from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { GraduationCap } from 'lucide-react';

const AcademicTermSelector = () => {
  const { activeTerm, currentTerm, loading } = useAcademicTerm();
  const displayTerm = activeTerm || currentTerm;

  if (loading && !displayTerm) {
    return (
      <div className="h-9 px-3 bg-slate-100 rounded-xl animate-pulse flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-slate-200" />
        <div className="w-24 h-3 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs select-none"
      title="Học kỳ làm việc hiện tại của hệ thống"
    >
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#123891] border border-blue-100 shrink-0">
        <GraduationCap className="w-4 h-4" />
      </div>

      <div className="text-left hidden md:block">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
          Học kỳ làm việc
        </div>
        <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5 flex items-center gap-1.5">
          <span>{displayTerm?.code || 'Chưa có học kỳ'}</span>
          {displayTerm && (
            <span
              className={`w-2 h-2 rounded-full ${
                displayTerm.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
              } inline-block animate-pulse`}
              title={displayTerm.status === 'ACTIVE' ? 'Đang diễn ra (ACTIVE)' : displayTerm.status}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicTermSelector;
