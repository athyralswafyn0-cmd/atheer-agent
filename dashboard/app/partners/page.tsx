'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { GlassCard, CrystalButton, Button } from '@/components/design-system';
import { LivingCanvas, GrainOverlay } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { Plus, Building2, Users, Mail, Calendar, ChevronLeft, Eye, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Partner {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export default function PartnersPage() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPartners() {
      if (!user || !token) return;
      try {
        const res = await fetch('https://atheer-agent-api.onrender.com/api/v1/partners', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch partners');

        const data = await res.json();
        setPartners(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (user && token) fetchPartners();
  }, [user]);

  if (loading) {
    return (
      <>
        <LivingCanvas />
        <GrainOverlay />
        <div className="min-h-screen p-8">
          <div className="max-w-7xl mx-auto">
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

  return (
    <>
      <LivingCanvas />
      <GrainOverlay />
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-light text-ink mb-2">الشركاء</h1>
              <p className="text-ink/60">إدارة الشركاء ومؤسساتهم</p>
            </div>
            <CrystalButton href="/partners/new" size="lg" rightIcon={<Plus className="w-5 h-5" />}>
              شريك جديد
            </CrystalButton>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-6 text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">{partners.length}</div>
              <div className="text-sm text-ink/60">إجمالي الشركاء</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">
                {partners.filter(p => p.isActive).length}
              </div>
              <div className="text-sm text-ink/60">شركاء نشطين</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">
                {partners.reduce((sum, p) => sum + (p.organizations?.length || 0), 0)}
              </div>
              <div className="text-sm text-ink/60">إجمالي المنظمات</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">
                {partners.filter(p => !p.isActive).length}
              </div>
              <div className="text-sm text-ink/60">شركاء غير نشطين</div>
            </GlassCard>
          </div>

          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <GlassCard key={partner.id} className="p-6 hover:scale-[1.02] transition-transform" hover>
                <Link href={`/partners/${partner.id}`} className="block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-amethyst/20 flex items-center justify-center text-gold text-xl font-bold">
                        {partner.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-display font-medium text-lg text-ink">{partner.name}</h3>
                        <p className="text-sm text-ink/50">{partner.email}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      partner.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    )}>
                      {partner.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-ink/60 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تم الإنشاء: {new Date(partner.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                    <p className="text-sm text-ink/60 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {partner.organizations?.length || 0} منظمة
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-sm text-ink/50">عرض التفاصيل</span>
                    <ArrowRight className="w-5 h-5 text-gold" />
                  </div>
                </Link>
              </GlassCard>
            ))}

            {partners.length === 0 && (
              <GlassCard className="col-span-full p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-ink/30 mb-4" />
                <h3 className="font-display text-xl font-medium text-ink mb-2">لا يوجد شركاء</h3>
                <p className="text-ink/50 mb-6">ابدأ بإضافة شريك جديد</p>
                <CrystalButton href="/partners/new" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                  إضافة شريك
                </CrystalButton>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}