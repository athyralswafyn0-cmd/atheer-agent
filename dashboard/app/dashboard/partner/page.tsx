'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { GlassCard, CrystalButton, Button } from '@/components/design-system';
import { LivingCanvas, GrainOverlay } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { Building2, Users, MessageSquare, Bot, DollarSign, TrendingUp, ArrowRight, Settings, Bell } from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface License {
  plan: string;
  status: string;
  startsAt: string;
  expiresAt: string;
}

interface Usage {
  totalOrganizations: number;
  totalBots: number;
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
}

export default function PartnerDashboardPage() {
  const { user } = useSession();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [license, setLicense] = useState<License | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partnerRes, orgsRes, licenseRes, usageRes, invoicesRes] = await Promise.all([
          api.getPartnerProfile(),
          api.getPartnerOrganizations(),
          api.getPartnerLicense(),
          api.getPartnerUsage(),
          api.getPartnerInvoices(),
        ]);

        setPartner(partnerRes.data);
        setOrganizations(orgsRes.data);
        setLicense(licenseRes.data);
        setUsage(usageRes.data);
        setInvoices(invoicesRes.data);
      } catch (error) {
        console.error('Failed to fetch partner data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <LivingCanvas />
        <GrainOverlay />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-ink/60">جاري تحميل لوحة التحكم...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LivingCanvas />
      <GrainOverlay />
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-light text-ink mb-1">لوحة تحكم الشريك</h1>
              <p className="text-ink/60">مرحباً بعودتك، {partner?.name || 'شريك'}!</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" leftIcon={<Bell className="w-4 h-4" />}>
                إشعارات
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
                الإعدادات
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          {usage && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <GlassCard className="p-5 text-center hover:scale-[1.02] transition-transform" hover>
                <Building2 className="w-8 h-8 mx-auto text-gold mb-2" />
                <div className="font-display text-2xl sm:text-3xl font-bold text-gold mb-1">{usage.totalOrganizations}</div>
                <div className="text-sm text-ink/60">منظمات</div>
              </GlassCard>
              <GlassCard className="p-5 text-center hover:scale-[1.02] transition-transform" hover>
                <Bot className="w-8 h-8 mx-auto text-gold mb-2" />
                <div className="font-display text-2xl sm:text-3xl font-bold text-gold mb-1">{usage.totalBots}</div>
                <div className="text-sm text-ink/60">بوتات</div>
              </GlassCard>
              <GlassCard className="p-5 text-center hover:scale-[1.02] transition-transform" hover>
                <MessageSquare className="w-8 h-8 mx-auto text-gold mb-2" />
                <div className="font-display text-2xl sm:text-3xl font-bold text-gold mb-1">{usage.totalConversations}</div>
                <div className="text-sm text-ink/60">محادثات</div>
              </GlassCard>
              <GlassCard className="p-5 text-center hover:scale-[1.02] transition-transform" hover>
                <TrendingUp className="w-8 h-8 mx-auto text-gold mb-2" />
                <div className="font-display text-2xl sm:text-3xl font-bold text-gold mb-1">{usage.totalMessages.toLocaleString()}</div>
                <div className="text-sm text-ink/60">رسائل</div>
              </GlassCard>
              <GlassCard className="p-5 text-center hover:scale-[1.02] transition-transform" hover>
                <Users className="w-8 h-8 mx-auto text-gold mb-2" />
                <div className="font-display text-2xl sm:text-3xl font-bold text-gold mb-1">{usage.totalLeads}</div>
                <div className="text-sm text-ink/60">عملاء محتملون</div>
              </GlassCard>
            </div>
          )}

          {/* License & Organizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* License */}
            <GlassCard className="p-6">
              <h2 className="font-display text-xl font-medium text-ink mb-4">الترخيص</h2>
              {license ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/3 border border-white/10 rounded-xl">
                    <span className="text-ink/70">الخطة</span>
                    <span className="font-medium capitalize text-gold">{license.plan}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/3 border border-white/10 rounded-xl">
                    <span className="text-ink/70">الحالة</span>
                    <span className={cn(
                      'font-medium capitalize px-3 py-1 rounded-full text-sm',
                      license.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    )}>
                      {license.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/3 border border-white/10 rounded-xl">
                    <span className="text-ink/70">تاريخ البداية</span>
                    <span className="font-medium">{new Date(license.startsAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/3 border border-white/10 rounded-xl">
                    <span className="text-ink/70">تاريخ الانتهاء</span>
                    <span className="font-medium">{new Date(license.expiresAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              ) : (
                <p className="text-ink/50">لا توجد معلومات ترخيص متاحة.</p>
              )}
            </GlassCard>

            {/* Organizations */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-medium text-ink">المنظمات</h2>
                <CrystalButton href="/organizations/new" size="sm" leftIcon={<Building2 className="w-4 h-4" />}>
                  إضافة
                </CrystalButton>
              </div>
              {organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                      <div>
                        <p className="font-medium text-ink">{org.name}</p>
                        <p className="text-sm text-ink/50">{org.slug}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'inline-block px-2 py-1 text-xs rounded-full',
                          org.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        )}>
                          {org.status}
                        </span>
                        <p className="text-xs text-ink/50 mt-1 capitalize">{org.plan}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink/50 text-center py-4">لا توجد منظمات.</p>
              )}
            </GlassCard>
          </div>

          {/* Invoices */}
          {invoices.length > 0 && (
            <GlassCard className="p-6">
              <h2 className="font-display text-xl font-medium text-ink mb-4">الفواتير الأخيرة</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 font-semibold text-ink/50">الفاتورة</th>
                      <th className="text-left py-3 font-semibold text-ink/50">المبلغ</th>
                      <th className="text-left py-3 font-semibold text-ink/50">الحالة</th>
                      <th className="text-left py-3 font-semibold text-ink/50">تاريخ الاستحقاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="py-3 font-mono text-ink/70">{invoice.id.slice(0, 8)}</td>
                        <td className="py-3 text-ink">${invoice.amount.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={cn(
                            'inline-block px-2 py-1 text-xs rounded-full',
                            invoice.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          )}>
                            {invoice.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                          </span>
                        </td>
                        <td className="py-3 text-ink/60">{new Date(invoice.dueDate).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </>
  );
}