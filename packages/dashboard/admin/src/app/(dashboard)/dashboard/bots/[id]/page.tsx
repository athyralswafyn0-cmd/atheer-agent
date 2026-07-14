'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Bot, Edit, Trash2, ExternalLink, Copy, Eye, ArrowLeft, Loader2, MessageSquare, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { EmbedScriptGenerator } from '@/components/dashboard/EmbedScriptGenerator';

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
  welcomeMessage?: string;
  avatar?: string;
  showBranding: boolean;
  supportedLanguages: string[];
  collectLeads: boolean;
  leadFields: Array<{ key: string; label: string; type: string; required: boolean }>;
}

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  if (!params || !params.id) {
    router.push('/dashboard/bots');
    return null;
  }
  
  const botId = params.id as string;
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'embed' | 'conversations' | 'leads' | 'settings'>('overview');

  const fetchBot = async () => {
    try {
      const response = await fetch(`/api/v1/bots/${botId}`);
      const data = await response.json();
      if (data.bot) {
        setBot(data.bot);
      } else {
        router.push('/dashboard/bots');
      }
    } catch (error) {
      console.error('Failed to fetch bot:', error);
      router.push('/dashboard/bots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBot();
  }, [botId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bot) {
    return null;
  }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
            <p className="text-gray-500 mt-1">{bot.description || 'لا يوجد وصف'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn(statusColors[bot.status])}>
            {statusLabels[bot.status as keyof typeof statusLabels] || bot.status}
          </Badge>
          <Link href={`/dashboard/bots/${botId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي المحادثات</p>
                <p className="text-2xl font-bold text-gray-900">{bot.totalConversations}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي الرسائل</p>
                <p className="text-2xl font-bold text-gray-900">{bot.totalMessages}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">اللغة</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{bot.language}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">النموذج</p>
                <p className="text-2xl font-bold text-gray-900 truncate max-w-xs">{bot.model}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="embed">التضمين</TabsTrigger>
          <TabsTrigger value="conversations">المحادثات</TabsTrigger>
          <TabsTrigger value="leads">العملاء المحتملون</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>معلومات المساعد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">رسالة الترحيب</label>
                  <p className="mt-1 text-gray-900">{bot.welcomeMessage || 'مرحباً! كيف يمكنني مساعدتك اليوم?'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">اللغات المدعومة</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {bot.supportedLanguages?.map(lang => (
                      <Badge key={lang} variant="secondary">{lang.toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">جمع العملاء المحتملين</label>
                  <Badge variant={bot.collectLeads ? 'default' : 'secondary'}>
                    {bot.collectLeads ? 'مفعل' : 'معطل'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">إظهار العلامة التجارية</label>
                  <Badge variant={bot.showBranding ? 'default' : 'secondary'}>
                    {bot.showBranding ? 'نعم' : 'لا'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الحقول المطلوبة للعملاء المحتملين</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {bot.leadFields?.map((field, i) => (
                      <Badge key={i} variant="outline">
                        {field.label} ({field.key}) {field.required && '*'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معلومات تقنية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-mono text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="bg-muted p-3 rounded">
                    <span className="text-gray-500">Bot ID: </span>
                    <span className="font-medium">{bot.id}</span>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <span className="text-gray-500">Created: </span>
                    <span className="font-medium">{new Date(bot.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="embed" className="mt-6">
          {bot && (
            <EmbedScriptGenerator
              botId={bot.id}
              botName={bot.name}
              apiUrl={process.env.NEXT_PUBLIC_API_URL || 'https://api.atheer-agent.com'}
              cdnUrl={process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.atheer-agent.com'}
            />
          )}
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المحادثات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>قائمة المحادثات ستظهر هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>العملاء المحتملون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>قائمة العملاء المحتملين ستظهر هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات المساعد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>إعدادات المساعد ستظهر هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}