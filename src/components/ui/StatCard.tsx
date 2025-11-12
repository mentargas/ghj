import React from 'react';
import { DivideIcon as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down';
    label: string;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  className?: string;
}

const StatCard = React.memo(function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  className = ''
}: StatCardProps) {
  const colorClasses = {
    blue: {
      icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
      border: 'border-blue-100',
      trend: 'text-blue-600'
    },
    green: {
      icon: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
      border: 'border-green-100',
      trend: 'text-green-600'
    },
    orange: {
      icon: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
      border: 'border-orange-100',
      trend: 'text-orange-600'
    },
    purple: {
      icon: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
      border: 'border-purple-100',
      trend: 'text-purple-600'
    },
    red: {
      icon: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
      border: 'border-red-100',
      trend: 'text-red-600'
    }
  };

  const trendColorClasses = {
    up: 'text-success-600 bg-success-50',
    down: 'text-danger-600 bg-danger-50'
  };

  return (
    <div className={`relative overflow-hidden bg-white p-6 rounded-2xl border ${colorClasses[color].border} shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 group ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity" style={{ color: colorClasses[color].trend }}></div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">{value}</p>

          {trend && (
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${trendColorClasses[trend.direction]}`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${colorClasses[color].icon} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
});

export default StatCard;