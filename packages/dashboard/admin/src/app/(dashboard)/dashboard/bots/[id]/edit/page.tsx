'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

const models = [{ value: 'gpt-4o', label: 'GPT-4o' }];
const languages = [{ code: 'ar', name: 'العربية' }];
const positions = [{ value: 'bottom-right', label: 'Bottom Right' }];

// SVG Icons - defined first
const Loader2Icon = () => <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const ArrowLeftIcon = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const SaveIcon = () => <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const TrashIcon = () => <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlusIcon = () => <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;

interface FormData {
  name: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  primaryColor: string;
  secondaryColor: string;
  position: string;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
  fallbackMessage: string;
  showBranding: boolean;
  supportedLanguages: string[];
  collectLeads: boolean;
  leadFields: Array<{ key: string; label: string; type: string; required: boolean }>;
  notifyOnLead: boolean;
  notificationChannels: string[];
  notificationEmails: string[];
}

export default function BotEditPage() {
  const params = useParams();
  const router = useRouter();
  
  if (!params || !params.id) {
    router.push('/dashboard/bots');
    return null;
  }
  
  const botId = params.id as string;
  const isNew = botId === 'new';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '', description: '', systemPrompt: 'You are a helpful AI assistant.',
    welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك اليوم؟', primaryColor: '#2563eb',
    secondaryColor: '#ffffff', position: 'bottom-right', language: 'ar',
    model: 'gpt-4o', temperature: 0.7, maxTokens: 2000,
    fallbackMessage: 'عذراً، لم أفهم طلبك. هل يمكنك إعادة الصياغة؟',
    showBranding: true, supportedLanguages: ['ar', 'en'], collectLeads: false,
    leadFields: [{ key: 'name', label: 'الاسم', type: 'text', required: true },
      { key: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
      { key: 'phone', label: 'الهاتف', type: 'tel', required: false },
      { key: 'company', label: 'الشركة', type: 'text', required: false }],
    notifyOnLead: true, notificationChannels: ['EMAIL'], notificationEmails: [],
  });

  const fetchBot = async () => {
    if (isNew) { setLoading(false); return; }
    try {
      const response = await fetch(`/api/v1/bots/${botId}`);
      const data = await response.json();
      if (data.bot) {
        setFormData(prev => ({ ...prev, name: data.bot.name || '', description: data.bot.description || '',
          systemPrompt: data.bot.systemPrompt || 'You are a helpful AI assistant.',
          welcomeMessage: data.bot.welcomeMessage || 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
          primaryColor: data.bot.primaryColor || '#2563eb', secondaryColor: data.bot.secondaryColor || '#ffffff',
          position: data.bot.position || 'bottom-right', language: data.bot.language || 'ar',
          model: data.bot.model || 'gpt-4o', temperature: data.bot.temperature ?? 0.7,
          maxTokens: data.bot.maxTokens ?? 2000, fallbackMessage: data.bot.fallbackMessage || 'عذراً، لم أفهم طلبك. هل يمكنك إعادة الصياغة؟',
          showBranding: data.bot.showBranding ?? true, supportedLanguages: data.bot.supportedLanguages || ['ar', 'en'],
          collectLeads: data.bot.collectLeads ?? false, leadFields: data.bot.leadFields || [
            { key: 'name', label: 'الاسم', type: 'text', required: true },
            { key: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
            { key: 'phone', label: 'الهاتف', type: 'tel', required: false },
            { key: 'company', label: 'الشركة', type: 'text', required: false },
          ], notifyOnLead: data.bot.notifyOnLead ?? true, notificationChannels: data.bot.notificationChannels || ['EMAIL'],
          notificationEmails: data.bot.notificationEmails || [],
        }));
      }
    } catch (error) { console.error('Failed to fetch bot:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBot(); }, [botId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = isNew ? '/api/v1/bots' : `/api/v1/bots/${botId}`;
      const method = isNew ? 'POST' : 'PATCH';
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (response.ok) { router.push('/dashboard/bots'); router.refresh(); }
      else { const error = await response.json(); alert(error.error || 'فشل حفظ المساعد'); }
    } catch (error) { console.error('Failed to save bot:', error); alert('حدث خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2Icon /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeftIcon /></Button>
          <div><h1 className="text-2xl font-bold text-gray-900">{isNew ? 'مساعد جديد' : 'تعديل المساعد'}</h1>
            <p className="text-gray-500 mt-1">{isNew ? 'أنشئ مساعد ذكاء اصطناعي جديد' : 'عدّل إعدادات المساعد'}</p></div>
        </div>
        <Button type="submit" disabled={saving}><SaveIcon />{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>

      <Card><CardHeader><CardTitle>معلومات أساسية</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="name">اسم المساعد *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: مكتب الدعم - المطعم" required /></div>
            <div className="space-y-2"><Label htmlFor="model">نموذج الذكاء الاصطناعي</Label>
              <Select value={formData.model} onValueChange={v => setFormData({ ...formData, model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  {models.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="description">الوصف</Label>
            <Textarea id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="وصف مختصر للمساعد..." rows={3} /></div>
          <div className="space-y-2"><Label htmlFor="systemPrompt">تعليمات النظام (System Prompt)</Label>
            <Textarea id="systemPrompt" value={formData.systemPrompt} onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })} placeholder="You are a helpful AI assistant..." rows={4} />
            <p className="text-sm text-gray-500">تعليمات تحدد سلوك وشخصية المساعد</p></div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>المظهر والعلامة التجارية</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>اللون الأساسي</Label><Input type="color" value={formData.primaryColor} onChange={e => setFormData({ ...formData, primaryColor: e.target.value })} /></div>
            <div className="space-y-2"><Label>اللون الثانوي</Label><Input type="color" value={formData.secondaryColor} onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })} /></div>
            <div className="space-y-2"><Label>الموقع في الصفحة</Label>
              <Select value={formData.position} onValueChange={v => setFormData({ ...formData, position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  {positions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="welcomeMessage">رسالة الترحيب</Label>
            <Textarea id="welcomeMessage" value={formData.welcomeMessage} onChange={e => setFormData({ ...formData, welcomeMessage: e.target.value })} placeholder="مرحباً! كيف يمكنني مساعدتك اليوم؟" rows={2} /></div>
          <div className="space-y-2"><Label htmlFor="fallbackMessage">رسالة الخطأ الاحتياطية</Label>
            <Textarea id="fallbackMessage" value={formData.fallbackMessage} onChange={e => setFormData({ ...formData, fallbackMessage: e.target.value })} placeholder="عذراً، لم أفهم طلبك. هل يمكنك إعادة الصياغة؟" rows={2} /></div>
          <div className="flex items-center justify-between"><div><Label>إظهار العلامة التجارية "مدعوم بالذكاء الاصطناعي"</Label>
            <p className="text-sm text-gray-500">إخفاء العلامة التجارية للخطط المدفوعة</p></div>
            <Switch checked={formData.showBranding} onCheckedChange={checked => setFormData({ ...formData, showBranding: checked })} /></div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>اللغة وإعدادات الذكاء الاصطناعي</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="language">اللغة الافتراضية</Label>
              <Select value={formData.language} onValueChange={v => setFormData({ ...formData, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  {languages.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="temperature">درجة الحرارة (Temperature)</Label>
              <Input id="temperature" type="number" step="0.1" min="0" max="2" value={formData.temperature} onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })} />
              <p className="text-xs text-gray-500">0 = محدد، 1 = إبداعي</p></div>
            <div className="space-y-2"><Label htmlFor="maxTokens">أقصى عدد رموز (Max Tokens)</Label>
              <Input id="maxTokens" type="number" min="100" max="4000" value={formData.maxTokens} onChange={e => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })} /></div>
          </div>
          <div className="space-y-2"><Label>اللغات المدعومة</Label>
            <Select value={formData.supportedLanguages.join(',')} onValueChange={v => setFormData({ ...formData, supportedLanguages: v.split(',').filter(Boolean) })}>
              <SelectTrigger><SelectValue placeholder="اختر اللغات المدعومة" /></SelectTrigger><SelectContent>
                {languages.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent></Select>
            <p className="text-sm text-gray-500">اللغات المدعومة حالياً: {formData.supportedLanguages.join(', ').toUpperCase()}</p></div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>جمع العملاء المحتملين (Lead Capture)</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between"><div><Label>تفعيل جمع العملاء المحتملين</Label>
            <p className="text-sm text-gray-500">عرض نموذج جمع بيانات العملاء عند اكتشاف فرصة</p></div>
            <Switch checked={formData.collectLeads} onCheckedChange={checked => setFormData({ ...formData, collectLeads: checked })} /></div>
          {formData.collectLeads && (
            <div className="space-y-4"><div className="space-y-2"><Label>الحقول المطلوبة</Label>
              {formData.leadFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Input placeholder="المفتاح (مثال: name)" value={field.key} onChange={e => { const newFields = [...formData.leadFields]; newFields[index] = { ...newFields[index], key: e.target.value }; setFormData({ ...formData, leadFields: newFields }); }} className="w-32" />
                  <Input placeholder="الاسم المعروض" value={field.label} onChange={e => { const newFields = [...formData.leadFields]; newFields[index] = { ...newFields[index], label: e.target.value }; setFormData({ ...formData, leadFields: newFields }); }} className="flex-1" />
                  <Select value={field.type} onValueChange={v => { const newFields = [...formData.leadFields]; newFields[index] = { ...newFields[index], type: v }; setFormData({ ...formData, leadFields: newFields }); }}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="text">نص</SelectItem><SelectItem value="email">بريد إلكتروني</SelectItem><SelectItem value="tel">هاتف</SelectItem></SelectContent></Select>
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={field.required} onChange={e => { const newFields = [...formData.leadFields]; newFields[index] = { ...newFields[index], required: e.target.checked }; setFormData({ ...formData, leadFields: newFields }); }} /> مطلوب</label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => { const newFields = formData.leadFields.filter((_, i) => i !== index); setFormData({ ...formData, leadFields: newFields }); }}><TrashIcon /></Button>
                </div>))}
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, leadFields: [...formData.leadFields, { key: '', label: '', type: 'text', required: false }] })}><PlusIcon /> إضافة حقل</Button>
              </div></div>)}
        </CardContent></Card>

      <Card><CardHeader><CardTitle>الإشعارات</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>إشعار عند التقاط عميل محتمل</Label>
            <p className="text-sm text-gray-500">إرسال إشعار عند ملء نموذج العملاء المحتملين</p></div>
            <Switch checked={formData.notifyOnLead} onCheckedChange={checked => setFormData({ ...formData, notifyOnLead: checked })} /></div>
          {formData.notifyOnLead && (
            <div className="space-y-2"><Label>قنوات الإشعارات</Label>
              <div className="flex flex-wrap gap-2">{
                ['EMAIL', 'TELEGRAM', 'SLACK', 'WEBHOOK'].map(channel => (
                  <label key={channel} className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.notificationChannels.includes(channel)} onChange={e => { const channels = [...formData.notificationChannels]; if (e.target.checked) channels.push(channel); else channels.splice(channels.indexOf(channel), 1); setFormData({ ...formData, notificationChannels: channels }); }} />
                    <span className="text-sm">{channel}</span></label>))}
              </div>
              <div className="space-y-2"><Label>إيميلات الإشعارات (للإيميل)</Label>
                <div className="flex gap-2"><Input placeholder="email@example.com" value={formData.notificationEmails.join(', ')} onChange={e => { const emails = e.target.value.split(',').map(s => s.trim()).filter(Boolean); setFormData({ ...formData, notificationEmails: emails }); }} className="flex-1" /><p className="text-xs text-gray-500">افصل بين الإيميلات بفاصلة</p></div></div>
            </div>)}
        </CardContent></Card>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>إلغاء</Button>
        <Button type="submit" disabled={saving}><SaveIcon />{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</Button>
      </div>
    </form>
  );
}
