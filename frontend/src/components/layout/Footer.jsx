import React from 'react';
import IUHLogo from '../common/IUHLogo';

const Footer = ({ className = '', dark = false }) => {
  return (
    <footer
      className={`w-full py-4 px-4 sm:px-6 lg:px-8 mt-auto border-t transition-colors ${
        dark
          ? 'bg-slate-950/40 border-white/10 text-slate-400'
          : 'bg-white/80 backdrop-blur-xs border-slate-200/80 text-slate-500'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-end gap-2.5 text-xs">
        <IUHLogo className="h-5 w-auto object-contain shrink-0" />
        <span className={`font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          © Đại học Công nghiệp TP.HCM - IUH
        </span>
      </div>
    </footer>
  );
};

export default Footer;

