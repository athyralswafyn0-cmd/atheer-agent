'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GlassCard, CrystalButton, Button } from '@/components/design-system';
import { LivingCanvas, GrainOverlay } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { Building2, Users, Mail, Calendar, ChevronLeft, ArrowLeft, Settings, MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';

interface Partner {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  organizations: {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
  }[];
  createdAt: string;
}

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await fetch(`https://atheer-agent-api.onrender.com/api/v1/partners/${id}`);
        if (!res.ok) throw new Error('Failed to fetch partner');
        const data = await res.json();
        setPartner(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchPartner();
  }, [id]);

  if (loading) {
    return (
      <>
        <LivingCanvas />
        <GrainOverlay />
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <GlassCard key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-white/5 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-white/5 rounded w-2/3"></div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <LivingCanvas />
        <GrainOverlay />
        <div className="min-h-screen p-8 flex items-center justify-center">
          <GlassCard className="p-8 text-center max-w-md">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} size="md">
              إعادة المحاولة
            </Button>
          </GlassCard>
        </div>
      </>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <>
      <LivingCanvas />
      <GrainOverlay />
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/partners">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                العودة للشركاء
              </Button>
            </Link>
            <div className="flex-1">
              <p className="text-ink/50 text-sm">تفاصيل الشريك</p>
              <h1 className="font-display text-4xl sm:text-5xl font-light text-ink">{partner.name}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
                إعدادات
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<MessageSquare className="w-4 h-4" />}>
                تواصل
              </Button>
            </div>
          </div>

          {/* Partner Profile Card */}
          <GlassCard className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/20 to-amethyst/20 flex items-center justify-center text-gold text-3xl font-bold">
                  {partner.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-medium text-ink">{partner.name}</h2>
                  <p className="text-ink/60 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {partner.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  partner.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                )}>
                  {partner.isActive ? 'نشط' : 'غير نشط'}
                </span>
                <p className="text-sm text-ink/50">
                  عضو منذ {new Date(partner.createdAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Organizations */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-medium text-ink">المنظمات ({partner.organizations?.length || 0})</h2>
              <CrystalButton href={`/organizations/new?partner=${partner.id}`} size="sm" leftIcon={<Building2 className="w-4 h-4" />}>
                إضافة منظمة
              </CrystalButton>
            </div>

            {partner.organizations && partner.organizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partner.organizations.map((org) => (
                  <GlassCard key={org.id} className="p-5 hover:scale-[1.02] transition-transform" hover>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-amethyst/20 flex items-center justify-center text-gold font-bold">
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-display font-medium text-lg text-ink">{org.name}</h3>
                          <p className="text-sm text-ink/50">{org.slug}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        org.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      )}>
                        {org.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-sm text-ink/50 flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {org.plan}
                      </span>
                      <Button variant="ghost" size="sm" rightIcon={<ChevronLeft className="w-4 h-4" />}>
                        عرض
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-ink/30 mb-3" />
                <h3 className="font-display text-lg font-medium text-ink mb-1">لا توجد منظمات</h3>
                <p className="text-ink/50 mb-4">هذا الشريك ليس لديه منظمات مسجلة بعد</p>
                <CrystalButton href={`/organizations/new?partner=${partner.id}`} size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  إضافة أول منظمة
                </CrystalButton>
              </GlassCard>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-5 text-center">
              <Users className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-2xl font-bold text-gold">{partner.organizations?.length || 0}</div>
              <div className="text-sm text-ink/60">منظمات</div>
            </GlassCard>
            <GlassCard className="p-5 text-center">
              <Calendar className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-2xl font-bold text-gold">
                {new Date(partner.createdAt).getFullYear()}
              </div>
              <div className="text-sm text-ink/60">سنة الانضمام</div>
            </GlassCard>
            <GlassCard className="p-5 text-center">
              <Mail className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-2xl font-bold text-gold">1</div>
              <div className="text-sm text-ink/60">بريد إلكتروني</div>
            </GlassCard>
            <GlassCard className="p-5 text-center">
              <Building2 className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-2xl font-bold text-gold">
                {partner.organizations?.filter(o => o.status === 'active').length || 0}
              </div>
              <div className="text-sm text-ink/60">منظمات نشطة</div>
            </GlassCard>
          </div>
        </div>
      </div>
    </>
  );
}