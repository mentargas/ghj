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
    default: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-soft',
    glass: 'glass-card',
    elevated: 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-elevated',
    gradient: 'bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-soft',
    bordered: 'bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600'
  };

  const hoverClasses = hover ? 'card-hover' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';
  const glowClasses = glow ? 'shadow-glow-trust dark:shadow-glow-accent' : '';

  const classes = `${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${clickableClasses} ${glowClasses} rounded-2xl transition-all duration-300 ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}