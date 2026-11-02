import React from 'react';

export const MetronomeIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.2 3.2l-6 16c-.3.8.3 1.8 1.2 1.8h13.2c.9 0 1.5-1 1.2-1.8l-6-16a1.7 1.7 0 0 0-3.2 0z" />
    <path d="M12 14v7" />
    <path d="M12 14l-4-6" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);
