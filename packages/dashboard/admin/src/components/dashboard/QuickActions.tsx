'use client';

import { Button } from '@/components/ui/button';
import { Plus, Bot, FileText, BarChart3, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { label: 'مساعد جديد', description: 'إنشاء مساعد ذكي جديد', icon: Bot, color: 'bg-blue-500', href: '/dashboard/bots/new' },
  { label: 'قاعدة معرفة', description: 'إضافة مستندات وروابط', icon: FileText, color: 'bg-green-500', href: '/dashboard/knowledge' },
  { label: 'تحليلات', description: 'عرض التقارير والإحصائيات', icon: BarChart3, color: 'bg-purple-500', href: '/dashboard/analytics' },
  { label: 'الأتمتة', description: 'إعداد سير العمل', icon: Zap, color: 'bg-orange-500', href: '/dashboard/automation' },
  { label: 'فريق العمل', description: 'إدارة الأعضاء والصلاحيات', icon: Users, color: 'bg-pink-500', href: '/dashboard/team' },
];

export function QuickActions() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action, index) => (
          <a key={index} href={action.href} className="group p-4 border border-gray-200 rounded-xl hover:border-primary/50 hover:bg-gray-50 transition-all">
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-3', action.color)}>
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">{action.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}