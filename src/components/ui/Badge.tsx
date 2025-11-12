import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'trust' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
  icon?: LucideIcon;
}

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
  icon: Icon
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium border';

  const variantClasses = {
    success: 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800',
    warning: 'bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800',
    error: 'bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 border-error-200 dark:border-error-800',
    info: 'bg-trust-50 dark:bg-trust-900/30 text-trust-700 dark:text-trust-300 border-trust-200 dark:border-trust-800',
    neutral: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600',
    trust: 'bg-trust-100 dark:bg-trust-900/40 text-trust-700 dark:text-trust-300 border-trust-300 dark:border-trust-700',
    accent: 'bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 border-accent-300 dark:border-accent-700'
  };

  const dotColorClasses = {
    success: 'bg-success-500 dark:bg-success-400',
    warning: 'bg-warning-500 dark:bg-warning-400',
    error: 'bg-error-500 dark:bg-error-400',
    info: 'bg-trust-500 dark:bg-trust-400',
    neutral: 'bg-neutral-500 dark:bg-neutral-400',
    trust: 'bg-trust-500 dark:bg-trust-400',
    accent: 'bg-accent-500 dark:bg-accent-400'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-2xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <span className={classes}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorClasses[variant]}`}></span>
      )}
      {Icon && (
        <Icon className={iconSizeClasses[size]} />
      )}
      {children}
    </span>
  );
}