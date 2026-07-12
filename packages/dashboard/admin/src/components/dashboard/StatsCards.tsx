'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MessageSquare, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, color }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn('text-xs mt-1', changeType === 'positive' && 'text-green-600', changeType === 'negative' && 'text-red-600', changeType === 'neutral' && 'text-gray-500')}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const stats = [
    {
      title: 'إجمالي المحادثات',
      value: '2,847',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: <MessageSquare className="h-4 w-4 text-white" />,
      color: 'bg-blue-500',
    },
    {
      title: 'العملاء المحتملين',
      value: '423',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: <Users className="h-4 w-4 text-white" />,
      color: 'bg-green-500',
    },
    {
      title: 'معدل التحويل',
      value: '24.7%',
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: <TrendingUp className="h-4 w-4 text-white" />,
      color: 'bg-purple-500',
    },
    {
      title: 'الإيرادات المقدرة',
      value: '$12,450',
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: <DollarSign className="h-4 w-4 text-white" />,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}