import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Lớp phủ nền (Backdrop) */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Lớp bọc căn giữa và tránh tràn thanh cuộn */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        {/* Khung chứa nội dung Modal */}
        <div
          className={`relative w-full ${maxWidth} bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-fade-in my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col z-10 text-left`}
        >
          {/* Tiêu đề */}
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/50 shrink-0 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight break-words">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nội dung */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
