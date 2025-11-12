import React from 'react';
import { DivideIcon as LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'right',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  fullWidth = false
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 focus:ring-primary-500 shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40',
    secondary: 'bg-secondary-100 dark:bg-neutral-700 text-primary-700 dark:text-neutral-200 hover:bg-secondary-200 dark:hover:bg-neutral-600 focus:ring-secondary-500 border border-secondary-200',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-success-600/20 hover:shadow-lg hover:shadow-success-600/30',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 shadow-warning-600/20 hover:shadow-lg hover:shadow-warning-600/30',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 shadow-error-600/20 hover:shadow-lg hover:shadow-error-600/30',
    ghost: 'text-primary-600 dark:text-neutral-300 hover:bg-secondary-50 dark:hover:bg-neutral-800 focus:ring-primary-500 shadow-none',
    accent: 'bg-gradient-to-r from-accent-500 to-accent-400 text-primary-900 hover:from-accent-600 hover:to-accent-500 focus:ring-accent-500 shadow-lg shadow-accent-500/30 hover:shadow-xl hover:shadow-accent-500/40 font-bold',
    outline: 'bg-transparent border-2 border-primary-500 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
    xl: 'px-6 py-4 text-lg'
  };

  const disabledClasses = disabled || loading
    ? 'opacity-50 cursor-not-allowed'
    : 'hover:transform hover:scale-105 active:scale-95';

  const widthClasses = fullWidth ? 'w-full' : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClasses} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {loading && (
        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
      )}

      {Icon && iconPosition === 'right' && !loading && (
        <Icon className="w-4 h-4 ml-2" />
      )}

      <span>{children}</span>

      {Icon && iconPosition === 'left' && !loading && (
        <Icon className="w-4 h-4 mr-2" />
      )}
    </button>
  );
}