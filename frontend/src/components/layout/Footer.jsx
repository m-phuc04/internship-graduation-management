import React from 'react';
import IUHLogo from '../common/IUHLogo';

const Footer = ({ className = '', dark = false }) => {
  return (
    <footer
      className={`w-full py-3 px-4 sm:px-6 lg:px-8 mt-auto border-t transition-colors ${
        dark
          ? 'bg-slate-950/60 border-white/10 text-slate-400'
          : 'bg-white/90 backdrop-blur-xs border-slate-200/80 text-slate-500'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2 text-xs">
        {/* Hàng trên: Thương hiệu & Thông tin sinh viên thực hiện */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Bên trái: Thương hiệu hệ thống */}
          <div className="flex items-center gap-2.5">
            <IUHLogo className="h-5 w-auto object-contain shrink-0" />
            <span className={`font-black text-sm tracking-wide ${dark ? 'text-blue-400' : 'text-[#123891]'}`}>
              IT.FIT.IUH
            </span>
            <span className={dark ? 'text-slate-700 hidden sm:inline' : 'text-slate-300 hidden sm:inline'}>|</span>
            <span className={`hidden md:inline text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp
            </span>
          </div>

          {/* Bên phải: Thông tin sinh viên */}
          <div className={`flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1 text-[11px] ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className={`font-medium hidden lg:inline ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              Sinh viên thực hiện:
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${dark ? 'bg-blue-400' : 'bg-[#123891]'}`} />
              <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>Lê Minh Phúc</strong>
              <span className={`font-mono ${dark ? 'text-slate-400' : 'text-slate-500'}`}>– 22635271</span>
            </div>
            <span className={dark ? 'text-slate-700 hidden sm:inline' : 'text-slate-300 hidden sm:inline'}>•</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${dark ? 'bg-blue-400' : 'bg-[#123891]'}`} />
              <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>Nguyễn Thị Kim Tuyến</strong>
              <span className={`font-mono ${dark ? 'text-slate-400' : 'text-slate-500'}`}>– 22638131</span>
            </div>
          </div>
        </div>

        {/* Hàng dưới: Thông tin liên hệ hỗ trợ */}
        <div className={`pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-center sm:text-left ${
          dark ? 'border-white/10 text-slate-400' : 'border-slate-200/60 text-slate-500'
        }`}>
          <div>
            <span>Mọi thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ: </span>
            <a
              href="mailto:admin.it.fit@gmail.com"
              className={`font-semibold underline underline-offset-2 transition-colors ${
                dark
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-[#123891] hover:text-[#0e2c73]'
              }`}
            >
              admin.it.fit@gmail.com
            </a>
          </div>
          <div className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Khoa Công nghệ Thông tin – Trường Đại học Công nghiệp TP. Hồ Chí Minh
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
