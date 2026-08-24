import React from 'react';

interface Props {
  className?: string;
  variant?: 'header' | 'logo' | 'default' | 'light';
  showText?: boolean;
}

export function Logo({ className = '', variant = 'header' }: Props) {
  if (variant === 'logo') {
    return (
      <img
        src="/logo.png"
        alt="Arreda"
        className={`h-12 w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src="/header-logo.png"
      alt="Arreda"
      className={`h-9 w-auto object-contain ${className}`}
    />
  );
}

export default Logo;
