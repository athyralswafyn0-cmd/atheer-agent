'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Mail, Phone, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  createdAt: string;
}

export function LeadsOverview() {
  const leads: Lead[] = [
    { id: '1', name: 'أحمد محمد', email: 'ahmed@example.com', phone: '+966501234567', company: 'شركة التقنية', status: 'new', source: 'الشات بوت', createdAt: '2024-01-15T10:30:00Z' },
    { id: '2', name: 'سارة أحمد', email: 'sara@example.com', company: 'مؤسسة الإبداع', status: 'contacted', source: 'الموقع', createdAt: '2024-01-15T11:45:00Z' },
    { id: '3', name: 'خالد عبدالله', email: 'khalid@example.com', phone: '+966507654321', status: 'qualified', source: 'الإحالات', createdAt: '2024-01-15T12:15:00Z' },
    { id: '4', name: 'فاطمة علي', email: 'fatima@example.com', company: 'شركة المستقبل', status: 'converted', source: 'الشات بوت', createdAt: '2024-01-15T13:00:00Z' },
    { id: '5', name: 'محمد حسن', email: 'mohammed@example.com', status: 'lost', source: 'إعلانات', createdAt: '2024-01-15T14:30:00Z' },
  ];

  const statusLabels = {
    new: { label: 'جديد', className: 'bg-blue-100 text-blue-800' },
    contacted: { label: 'تم التواصل', className: 'bg-yellow-100 text-yellow-800' },
    qualified: { label: 'مؤهل', className: 'bg-purple-100 text-purple-800' },
    converted: { label: 'محول', className: 'bg-green-100 text-green-800' },
    lost: { label: 'مفقود', className: 'bg-red-100 text-red-800' },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">العملاء المحتملين الجدد</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                  <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusLabels[lead.status].className)}>
                  {statusLabels[lead.status].label}
                </span>
                <span className="text-xs text-gray-500 hidden sm:block">{formatRelativeTime(lead.createdAt)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Button variant="outline" className="w-full sm:w-auto">
            عرض جميع العملاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}