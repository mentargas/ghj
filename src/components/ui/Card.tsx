import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'elevated' | 'gradient' | 'bordered';
  glow?: boolean;
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  variant = 'default',
  glow = false
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const variantClasses = {
    default: 'bg-white dark:bg-neutral-800 border border-secondary-100 dark:border-neutral-700 shadow-card hover:shadow-card-hover',
    glass: 'glass-card backdrop-blur-lg',
    elevated: 'bg-white dark:bg-neutral-800 border border-secondary-50 dark:border-neutral-700 shadow-elevated hover:shadow-elevated-lg',
    gradient: 'bg-gradient-to-br from-white via-secondary-50/30 to-secondary-100/50 dark:from-neutral-800 dark:to-neutral-900 border border-secondary-100 dark:border-neutral-700 shadow-card',
    bordered: 'bg-white dark:bg-neutral-800 border-2 border-primary-200 dark:border-neutral-600 hover:border-primary-300'
  };

  const hoverClasses = hover ? 'card-hover' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';
  const glowClasses = glow ? 'shadow-glow-primary dark:shadow-glow-secondary' : '';

  const classes = `${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${clickableClasses} ${glowClasses} rounded-2xl transition-all duration-300 ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}