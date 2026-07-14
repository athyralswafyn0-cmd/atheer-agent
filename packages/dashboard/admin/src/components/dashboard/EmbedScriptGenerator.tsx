'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Code, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface EmbedScriptGeneratorProps {
  botId: string;
  botName: string;
  apiUrl: string;
  cdnUrl: string;
}

const languages = [
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'tr', name: 'Türkçe (Turkish)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
];

const models = [
  { value: 'gpt-4o', label: 'GPT-4o (Latest, Most Capable)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cost-Effective)' },
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast, Affordable)' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Most Capable)' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'llama-3.1-405b', label: 'Llama 3.1 405B' },
  { value: 'llama-3.1-70b', label: 'Llama 3.1 70B' },
  { value: 'llama-3.1-8b', label: 'Llama 3.1 8B' },
  { value: 'mixtral-8x7b', label: 'Mixtral 8x7B' },
];

const positions = [
  { value: 'bottom-right', label: '⬇️ أسفل اليمين (Bottom Right)' },
  { value: 'bottom-left', label: '⬇️ أسفل اليسار (Bottom Left)' },
  { value: 'top-right', label: '⬆️ أعلى اليمين (Top Right)' },
  { value: 'top-left', label: '⬆️ أعلى اليسار (Top Left)' },
];

export function EmbedScriptGenerator({ botId, botName, apiUrl, cdnUrl }: EmbedScriptGeneratorProps) {
  const [config, setConfig] = useState({
    primaryColor: '#2563eb',
    position: 'bottom-right',
    language: 'ar',
    model: 'gpt-4o',
    showBranding: true,
    customDomain: '',
    collectLeads: false,
  });
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'umd' | 'esm'>('umd');

  const scriptUrl = `${cdnUrl}/ai-assistant-widget.umd.cjs`;
  const esmUrl = `${cdnUrl}/ai-assistant-widget.js`;

  const generateScript = (format: 'umd' | 'esm' = 'umd') => {
    const url = format === 'umd' ? scriptUrl : esmUrl;
    return `<script>
  window.AICustomerAssistant = window.AICustomerAssistant || {};
  window.AICustomerAssistant.init({
    botId: '${botId}',
    apiUrl: '${apiUrl}',
    cdnUrl: '${cdnUrl}',
    primaryColor: '${config.primaryColor}',
    position: '${config.position}',
    language: '${config.language}',
    model: '${config.model}',
  });
<\/script>
<script src="${url}" async defer><\/script>`;
  };

  const generateESMImport = () => {
    return `import AICustomerAssistant from '${esmUrl}';

AICustomerAssistant.init({
  botId: '${botId}',
  apiUrl: '${apiUrl}',
  cdnUrl: '${cdnUrl}',
  primaryColor: '${config.primaryColor}',
  position: '${config.position}',
  language: '${config.language}',
  model: '${config.model}',
});`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPreviewHtml = () => {
    return `<!DOCTYPE html>
<html dir="${config.language === 'ar' ? 'rtl' : 'ltr'}" lang="${config.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; min-height: 100vh; }
    .preview-box { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .preview-text { color: #6b7280; font-size: 14px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="preview-box">
    <p class="preview-text">موقعك الإلكتروني هنا... الويدجت سيظهر في ${config.position === 'bottom-right' ? 'الزاوية اليمنى السفلى' : config.position === 'bottom-left' ? 'الزاوية اليسرى السفلى' : config.position === 'top-right' ? 'الزاوية اليمنى العليا' : 'الزاوية اليسرى العليا'}</p>
    <div style="height: 300px; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; display: flex; align-items: center; justify-content: center; color: #9ca3af;">
      محاكاة صفحة الويب
    </div>
  </div>
  <script>
    window.AICustomerAssistant = window.AICustomerAssistant || {};
    window.AICustomerAssistant.init({
      botId: '${botId}',
      apiUrl: '${apiUrl}',
      cdnUrl: '${cdnUrl}',
      primaryColor: '${config.primaryColor}',
      position: '${config.position}',
      language: '${config.language}',
      model: '${config.model}',
    });
  <\/script>
  <script src="${scriptUrl}" async defer><\/script>
</body>
</html>`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          كود التضمين لـ: {botName}
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            معاينة
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>اللون الأساسي</Label>
            <Input
              type="color"
              value={config.primaryColor}
              onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>الموقع</Label>
            <Select value={config.position} onValueChange={(v) => setConfig({ ...config, position: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>اللغة</Label>
            <Select value={config.language} onValueChange={(v) => setConfig({ ...config, language: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>نموذج الذكاء الاصطناعي</Label>
            <Select value={config.model} onValueChange={(v) => setConfig({ ...config, model: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>إظهار العلامة التجارية</Label>
            <Select value={config.showBranding.toString()} onValueChange={(v) => setConfig({ ...config, showBranding: v === 'true' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">نعم</SelectItem>
                <SelectItem value="false">لا</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>نطاق مخصص (اختياري)</Label>
            <Input
              placeholder="widget.example.com"
              value={config.customDomain}
              onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
            />
          </div>
        </div>

        {/* Script Options */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'umd' ? 'default' : 'outline'}
              onClick={() => setActiveTab('umd')}
            >
              UMD Script (موصى به)
            </Button>
            <Button
              variant={activeTab === 'esm' ? 'default' : 'outline'}
              onClick={() => setActiveTab('esm')}
            >
              ES Module (للإطارات الحديثة)
            </Button>
          </div>

          {activeTab === 'umd' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center justify-between">
                  كود التضمين (UMD)
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generateScript('umd'))}
                    className="h-8 px-3"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </Label>
                <Textarea
                  readOnly
                  value={generateScript('umd')}
                  className="font-mono text-sm bg-muted mt-2 min-h-[160px]"
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  انسخ هذا الكود وألصقه في وسم head أو قبل وسم body في موقعك
                </p>
              </div>
            </div>
          )}

          {activeTab === 'esm' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center justify-between">
                  استيراد ES Module
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generateESMImport())}
                    className="h-8 px-3"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </Label>
                <Textarea
                  readOnly
                  value={generateESMImport()}
                  className="font-mono text-sm bg-muted mt-2 min-h-[160px]"
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  للاستخدام مع React، Vue، Next.js، Nuxt، إلخ. استورد وابدأ في الكود الخاص بك
                </p>
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-medium flex items-center justify-between">
              خيارات متقدمة
              <Code className="h-4 w-4" />
            </summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>جمع العملاء المحتملين</Label>
                <Select value={config.collectLeads.toString()} onValueChange={(v) => setConfig({ ...config, collectLeads: v === 'true' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">معطل (افتراضي)</SelectItem>
                    <SelectItem value="true">مفعل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>أحداث JavaScript مخصصة</Label>
                <Textarea
                  readOnly
                  value={`// Event listeners available:
window.AICustomerAssistant.on('open', () => console.log('Widget opened'));
window.AICustomerAssistant.on('close', () => console.log('Widget closed'));
window.AICustomerAssistant.on('message', (msg) => console.log('Message:', msg));
window.AICustomerAssistant.on('lead', (lead) => console.log('Lead captured:', lead));

// Methods:
window.AICustomerAssistant.init(config);
window.AICustomerAssistant.destroy();
window.AICustomerAssistant.open();
window.AICustomerAssistant.close();`}
                  className="font-mono text-sm bg-muted min-h-[120px]"
                  rows={6}
                />
              </div>
            </div>
          </details>

          {/* Preview Modal */}
          {previewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">معاينة الويدجت</h3>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
                <div className="p-4">
                  <iframe
                    srcDoc={getPreviewHtml()}
                    style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}