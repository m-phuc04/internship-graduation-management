import React from 'react';
import IUHLogo from '../common/IUHLogo';
import { Mail, MapPin } from 'lucide-react';

const Footer = ({ className = '', dark = false }) => {
  return (
    <footer
      className={`w-full py-4 sm:py-5 px-4 sm:px-6 lg:px-8 mt-auto border-t transition-colors ${
        dark
          ? 'bg-slate-950/85 backdrop-blur-xs border-white/10 text-slate-400'
          : 'bg-white border-slate-200/90 text-slate-600'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3.5">
        {/* TẦNG 1 – Thông tin chính */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
          {/* Khu vực bên trái (khoảng 45–50% chiều rộng): Logo & Hệ thống nhận diện */}
          <div className="flex items-center gap-3 sm:gap-4 md:w-1/2 shrink-0">
            <IUHLogo className="h-10 sm:h-11 w-auto object-contain shrink-0" />
            <div className="flex flex-col">
              <span
                className={`font-bold text-xs sm:text-sm tracking-tight leading-tight ${
                  dark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH
              </span>
              <span
                className={`text-[11px] sm:text-xs font-semibold tracking-normal mt-0.5 leading-snug ${
                  dark ? 'text-blue-400' : 'text-[#123891]'
                }`}
              >
                KHOA CÔNG NGHỆ THÔNG TIN
              </span>
              <span
                className={`text-[11px] sm:text-xs font-medium tracking-normal mt-0.5 leading-snug ${
                  dark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                CỔNG THÔNG TIN TTDN & KLTN
              </span>
            </div>
          </div>

          {/* Khu vực bên phải (khoảng 50–55% chiều rộng): Thông tin liên hệ */}
          <div className="flex flex-col justify-center gap-2 md:w-1/2 w-full text-xs text-left">
            {/* Email hỗ trợ */}
            <div className="flex items-start sm:items-center gap-2">
              <Mail
                className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                  dark ? 'text-blue-400' : 'text-[#123891]'
                }`}
              />
              <div className="leading-snug">
                <span className={dark ? 'text-slate-400' : 'text-slate-600'}>
                  Email hỗ trợ:{' '}
                </span>
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
            </div>

            {/* Địa chỉ */}
            <div className="flex items-start sm:items-center gap-2">
              <MapPin
                className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                  dark ? 'text-blue-400' : 'text-[#123891]'
                }`}
              />
              <span
                className={`leading-snug break-words ${
                  dark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Địa chỉ: Số 12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP. Hồ Chí Minh.
              </span>
            </div>
          </div>
        </div>

        {/* TẦNG 2 – Thông tin bổ sung */}
        <div
          className={`border-t pt-3 flex flex-col gap-2 ${
            dark ? 'border-white/10' : 'border-slate-200/70'
          }`}
        >
          {/* Hàng ngang: Bản quyền bên trái & Sinh viên thực hiện bên phải */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            {/* Bên trái: Bản quyền */}
            <div className={dark ? 'text-slate-400' : 'text-slate-600'}>
              Bản quyền © 2026 IUH. Tất cả các quyền được bảo lưu.
            </div>

            {/* Bên phải: Sinh viên thực hiện */}
            <div
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${
                dark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <span
                className={`font-medium ${
                  dark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Sinh viên thực hiện:
              </span>
              <span className="inline-flex items-center gap-1">
                <strong
                  className={`font-semibold ${
                    dark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Lê Minh Phúc
                </strong>
                <span
                  className={`font-mono text-[11px] ${
                    dark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  – 22635271
                </span>
              </span>
              <span className={dark ? 'text-slate-600' : 'text-slate-300'}>•</span>
              <span className="inline-flex items-center gap-1">
                <strong
                  className={`font-semibold ${
                    dark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Nguyễn Thị Kim Tuyến
                </strong>
                <span
                  className={`font-mono text-[11px] ${
                    dark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  – 22638131
                </span>
              </span>
            </div>
          </div>

          {/* Dòng ghi chú đồ án: Đặt ở một dòng riêng phía dưới, căn giữa */}
          <div
            className={`text-center text-[11px] sm:text-[11.5px] italic leading-relaxed pt-1 ${
              dark ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            "Đây là website chỉ phục vụ cho mục đích đồ án, không đại diện cho Trường Đại học Công nghiệp TP. Hồ Chí Minh."
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
