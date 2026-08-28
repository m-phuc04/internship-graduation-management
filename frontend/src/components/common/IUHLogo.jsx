import React from 'react';
import { IUH_LOGO_URL } from '../../constants/assets';

export default function IUHLogo({ className = 'w-9 h-9 object-contain', alt = 'IUH' }) {
  return (
    <img
      src={IUH_LOGO_URL}
      alt={alt}
      className={`object-contain shrink-0 ${className}`}
      loading="eager"
    />
  );
}
