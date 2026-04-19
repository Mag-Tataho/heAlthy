import React from 'react';
import heAIthyLogo from '../assets/branding/heAIthy_logo.png';

const SIZE_CLASS = {
  sm: 'h-[7.03125rem] w-[7.03125rem]',
  md: 'h-[8.203125rem] w-[8.203125rem]',
  lg: 'h-[14.0625rem] w-[14.0625rem]',
};

export default function BrandLogo({ size = 'md', className = '' }) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  return (
    <img
      src={heAIthyLogo}
      alt="heAIthy logo"
      className={`${sizeClass} object-contain object-center ${className}`}
      loading="eager"
    />
  );
}
