import React from 'react';
import IUHLogo from '../common/IUHLogo';

const Footer = ({ className = '', dark = false }) => {
  return (
    <footer
      className={`w-full py-4 sm:py-5 px-4 sm:px-6 lg:px-8 mt-auto border-t transition-colors ${
        dark
          ? 'bg-slate-950/80 backdrop-blur-xs border-white/10 text-slate-400'
          : 'bg-white/95 backdrop-blur-xs border-slate-200/80 text-slate-500'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8 text-xs">
        {/* Khu vực bên trái: Logo, Tên trường và Tên đơn vị */}
        <div className="flex items-center gap-3 shrink-0">
          <IUHLogo className="h-9 sm:h-10 w-auto object-contain shrink-0" />
          <div className="flex flex-col">
            <span
              className={`font-bold text-xs sm:text-sm tracking-tight ${
                dark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH
            </span>
            <span
              className={`text-[11px] sm:text-xs font-medium tracking-normal mt-0.5 ${
                dark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              KHOA CÔNG NGHỆ THÔNG TIN - HỆ THỐNG QUẢN LÝ TTDN & KLTN
            </span>
          </div>
        </div>

        {/* Khu vực bên phải: Thông tin liên hệ, địa chỉ, bản quyền, SV thực hiện, ghi chú */}
        <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-left md:text-right w-full md:w-auto">
          {/* Thông tin hỗ trợ */}
          <div className="leading-relaxed">
            <span>Mọi thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ: </span>
            <a
              href="mailto:admin.it.fit@gmail.com"
              className={`font-semibold underline underline-offset-2 transition-colors break-all ${
                dark
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-[#123891] hover:text-[#0e2c73]'
              }`}
            >
              admin.it.fit@gmail.com
            </a>
          </div>

          {/* Địa chỉ */}
          <div className={`leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Địa chỉ: Số 12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP. Hồ Chí Minh.
          </div>

          {/* Bản quyền */}
          <div className={`leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Bản quyền © 2026 IUH. Tất cả các quyền được bảo lưu.
          </div>

          {/* Thông tin sinh viên thực hiện */}
          <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 justify-start md:justify-end leading-relaxed ${
              dark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <span className={`font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sinh viên thực hiện:
            </span>
            <span className="inline-flex items-center gap-1">
              <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>
                Lê Minh Phúc
              </strong>
              <span className={`font-mono text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                – 22635271
              </span>
            </span>
            <span className={dark ? 'text-slate-600' : 'text-slate-300'}>•</span>
            <span className="inline-flex items-center gap-1">
              <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>
                Nguyễn Thị Kim Tuyến
              </strong>
              <span className={`font-mono text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                – 22638131
              </span>
            </span>
          </div>

          {/* Ghi chú đồ án */}
          <div
            className={`text-[10px] sm:text-[11px] italic leading-relaxed mt-0.5 ${
              dark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Đây là website chỉ phục vụ cho mục đích đồ án, không đại diện cho Trường Đại học Công nghiệp TP. Hồ Chí Minh.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
