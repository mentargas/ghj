import React from 'react';
import { DivideIcon as LucideIcon, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down';
    label: string;
  };
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  loading?: boolean;
}

const StatCard = React.memo(function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  className = '',
  loading = false
}: StatCardProps) {
  const colorClasses = {
    primary: {
      icon: 'bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-lg shadow-primary-600/30',
      iconRing: 'ring-primary-100 dark:ring-primary-900/50',
      border: 'border-primary-100 dark:border-primary-900/50',
      glow: 'group-hover:shadow-primary-600/40',
      accent: 'text-primary-600 dark:text-primary-400'
    },
    secondary: {
      icon: 'bg-gradient-to-br from-secondary-500 to-secondary-700 text-white shadow-lg shadow-secondary-500/30',
      iconRing: 'ring-secondary-100 dark:ring-secondary-900/50',
      border: 'border-secondary-100 dark:border-secondary-900/50',
      glow: 'group-hover:shadow-secondary-500/40',
      accent: 'text-secondary-600 dark:text-secondary-400'
    },
    accent: {
      icon: 'bg-gradient-to-br from-accent-400 to-accent-600 text-primary-900 shadow-lg shadow-accent-500/30',
      iconRing: 'ring-accent-100 dark:ring-accent-900/50',
      border: 'border-accent-100 dark:border-accent-900/50',
      glow: 'group-hover:shadow-accent-500/40',
      accent: 'text-accent-600 dark:text-accent-400'
    },
    success: {
      icon: 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30',
      iconRing: 'ring-success-100 dark:ring-success-900/50',
      border: 'border-success-100 dark:border-success-900/50',
      glow: 'group-hover:shadow-success-500/40',
      accent: 'text-success-600 dark:text-success-400'
    },
    warning: {
      icon: 'bg-gradient-to-br from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/30',
      iconRing: 'ring-warning-100 dark:ring-warning-900/50',
      border: 'border-warning-100 dark:border-warning-900/50',
      glow: 'group-hover:shadow-warning-500/40',
      accent: 'text-warning-600 dark:text-warning-400'
    },
    error: {
      icon: 'bg-gradient-to-br from-error-500 to-error-600 text-white shadow-lg shadow-error-500/30',
      iconRing: 'ring-error-100 dark:ring-error-900/50',
      border: 'border-error-100 dark:border-error-900/50',
      glow: 'group-hover:shadow-error-500/40',
      accent: 'text-error-600 dark:text-error-400'
    },
    info: {
      icon: 'bg-gradient-to-br from-secondary-400 to-secondary-600 text-white shadow-lg shadow-secondary-500/30',
      iconRing: 'ring-secondary-100 dark:ring-secondary-900/50',
      border: 'border-secondary-100 dark:border-secondary-900/50',
      glow: 'group-hover:shadow-secondary-500/40',
      accent: 'text-secondary-600 dark:text-secondary-400'
    }
  };

  const trendColorClasses = {
    up: 'text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-800',
    down: 'text-error-700 dark:text-error-400 bg-error-50 dark:bg-error-900/30 border-error-200 dark:border-error-800'
  };

  if (loading) {
    return (
      <div className={`stat-card group ${colorClasses[color].border} ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="skeleton h-4 w-24 rounded"></div>
            <div className="skeleton h-8 w-32 rounded"></div>
            <div className="skeleton h-5 w-20 rounded-full"></div>
          </div>
          <div className="skeleton w-16 h-16 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`stat-card group ${colorClasses[color].border} ${colorClasses[color].glow} ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-30 transition-opacity ${colorClasses[color].accent}"></div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">{title}</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 tracking-tight">{value}</p>

          {trend && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${trendColorClasses[trend.direction]}`}>
              {trend.direction === 'up' ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ring-4 ${colorClasses[color].icon} ${colorClasses[color].iconRing} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
          <Icon className="w-8 h-8" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
});

export default StatCard;