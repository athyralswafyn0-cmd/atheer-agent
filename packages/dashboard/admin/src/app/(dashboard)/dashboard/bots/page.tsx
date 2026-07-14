'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Bot, Edit, Trash2, ExternalLink, Copy, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Bot {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRAINING' | 'ERROR';
  primaryColor: string;
  language: string;
  model: string;
  totalConversations: number;
  totalMessages: number;
  createdAt: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/v1/bots');
      const data = await response.json();
      setBots(data.bots || []);
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bot.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    TRAINING: 'bg-yellow-100 text-yellow-800',
    ERROR: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    ACTIVE: 'نشط',
    INACTIVE: 'غير نشط',
    TRAINING: 'قيد التدريب',
    ERROR: 'خطأ',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المساعدون</h1>
          <p className="text-gray-500 mt-1">إدارة مساعدي الذكاء الاصطناعي</p>
        </div>
        <Link href="/dashboard/bots/new">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            مساعد جديد
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>قائمة المساعدين</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="training">قيد التدريب</option>
              <option value="error">خطأ</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : filteredBots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا يوجد مساعدين. <Link href="/dashboard/bots/new" className="text-primary hover:underline">أنشئ أول مساعد</Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBots.map(bot => (
                <Card key={bot.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: bot.primaryColor }} />
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{bot.description || 'لا يوجد وصف'}</p>
                        </div>
                      </div>
                      <Badge className={cn(statusColors[bot.status])}>
                        {statusLabels[bot.status as keyof typeof statusLabels] || bot.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bot.primaryColor }} />
                        <span>اللون الأساسي</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>اللغة: </span>
                        <span className="font-medium">{bot.language.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>النموذج: </span>
                        <span className="font-medium">{bot.model}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{bot.totalConversations} محادثة</span>
                        <span>{bot.totalMessages} رسالة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(`/embed/${bot.id}`)}>
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">نسخ كود التضمين</span>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/bots/${bot.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/bots/${bot.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}