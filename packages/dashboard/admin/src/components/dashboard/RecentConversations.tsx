'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  visitorName: string;
  lastMessage: string;
  status: 'active' | 'closed' | 'pending';
  startedAt: string;
  messageCount: number;
}

export function RecentConversations() {
  const conversations: Conversation[] = [
    { id: '1', visitorName: 'أحمد محمد', lastMessage: 'شكراً للمساعدة!', status: 'closed', startedAt: '2024-01-15T10:30:00Z', messageCount: 8 },
    { id: '2', visitorName: 'سارة أحمد', lastMessage: 'متى تفتحون؟', status: 'active', startedAt: '2024-01-15T11:45:00Z', messageCount: 3 },
    { id: '3', visitorName: 'خالد عبدالله', lastMessage: 'أريد معرفة الأسعار', status: 'active', startedAt: '2024-01-15T12:15:00Z', messageCount: 5 },
    { id: '4', visitorName: 'فاطمة علي', lastMessage: 'هل يوجد توصيل؟', status: 'pending', startedAt: '2024-01-15T13:00:00Z', messageCount: 2 },
    { id: '5', visitorName: 'محمد حسن', lastMessage: 'تم الحجز بنجاح', status: 'closed', startedAt: '2024-01-15T14:30:00Z', messageCount: 12 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">أحدث المحادثات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conversations.map((conv) => (
            <div key={conv.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{conv.visitorName}</p>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', {
                  'bg-green-100 text-green-800': conv.status === 'closed',
                  'bg-blue-100 text-blue-800': conv.status === 'active',
                  'bg-yellow-100 text-yellow-800': conv.status === 'pending',
                })}>
                  {conv.status === 'closed' && <CheckCircle className="h-3 w-3 ml-1" />}
                  {conv.status === 'active' && <MessageSquare className="h-3 w-3 ml-1" />}
                  {conv.status === 'pending' && <Clock className="h-3 w-3 ml-1" />}
                  {conv.status === 'closed' && 'مغلقة'}
                  {conv.status === 'active' && 'نشطة'}
                  {conv.status === 'pending' && 'معلقة'}
                </span>
                <span className="text-xs text-gray-500 hidden sm:block">{formatRelativeTime(conv.startedAt)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Button variant="outline" className="w-full sm:w-auto">
            عرض جميع المحادثات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}