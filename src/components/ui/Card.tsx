import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'elevated';
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  variant = 'default'
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-soft',
    glass: 'glass-card',
    elevated: 'bg-white border border-gray-100 shadow-elevated'
  };

  const hoverClasses = hover ? 'card-hover cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const classes = `${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${clickableClasses} rounded-xl transition-all duration-300 ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}