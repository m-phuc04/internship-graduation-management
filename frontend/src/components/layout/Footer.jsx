import React from 'react';
import IUHLogo from '../common/IUHLogo';

const Footer = ({ className = '', dark = false }) => {
  return (
    <footer
      className={`w-full py-3.5 px-4 sm:px-6 lg:px-8 mt-auto border-t transition-colors ${
        dark
          ? 'bg-slate-950/60 border-white/10 text-slate-400'
          : 'bg-white/90 backdrop-blur-xs border-slate-200/80 text-slate-500'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Left: System Branding */}
        <div className="flex items-center gap-2.5">
          <IUHLogo className="h-5 w-auto object-contain shrink-0" />
          <span className="font-black text-sm tracking-wide text-[#123891] dark:text-blue-400">
            IT.FIT.IUH
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <span className="text-slate-500 dark:text-slate-400 hidden md:inline text-[11px]">
            Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp
          </span>
        </div>

        {/* Right: Students Information */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="text-slate-400 dark:text-slate-500 font-medium hidden lg:inline">
            Sinh viên thực hiện:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#123891] dark:bg-blue-400 inline-block" />
            <strong className="text-slate-800 dark:text-slate-200">Lê Minh Phúc</strong>
            <span className="font-mono text-slate-500 dark:text-slate-400">– 22635271</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#123891] dark:bg-blue-400 inline-block" />
            <strong className="text-slate-800 dark:text-slate-200">Nguyễn Thị Kim Tuyến</strong>
            <span className="font-mono text-slate-500 dark:text-slate-400">– 22638131</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
