import React, { useState } from 'react';
import { IUH_LOGO_ONLINE_URL, IUH_LOGO_LOCAL_URL } from '../../constants/assets';

export default function IUHLogo({ className = 'w-9 h-9 object-contain', alt = 'IUH' }) {
  const [imgSrc, setImgSrc] = useState(IUH_LOGO_ONLINE_URL);

  const handleError = () => {
    // Chuyển sang ảnh local nếu không tải được URL online (khi offline hoặc URL lỗi)
    if (imgSrc !== IUH_LOGO_LOCAL_URL) {
      setImgSrc(IUH_LOGO_LOCAL_URL);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`object-contain shrink-0 ${className}`}
      loading="eager"
      onError={handleError}
    />
  );
}
