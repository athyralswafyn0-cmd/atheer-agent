'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { GlassCard, CrystalButton, Button } from '@/components/design-system';
import { LivingCanvas, GrainOverlay } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { Building2, Users, DollarSign, CheckCircle, Plus, ChevronLeft, Search, Filter } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  industry?: string;
  size?: string;
  status: string;
  partners: number;
  totalRevenue: number;
}

export default function OrganizationsPage() {
  const { user, token } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch('https://atheer-agent-api.onrender.com/api/v1/organizations', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('فشل في جلب البيانات');

        const data = await res.json();
        setOrganizations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchOrganizations();
  }, [token]);

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && org.status === 'active') ||
                         (statusFilter === 'inactive' && org.status !== 'active');
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="font-display text-4xl sm:text-5xl font-light text-ink mb-2">المنظمات</h1>
              <p className="text-ink/60">إدارة المنظمات والشركاء التابعين لها</p>
            </div>
            <CrystalButton href="/organizations/new" size="lg" leftIcon={<Plus className="w-5 h-5" />}>
              منظمة جديدة
            </CrystalButton>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform" hover>
              <Building2 className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">{organizations.length}</div>
              <div className="text-sm text-ink/60">إجمالي المنظمات</div>
            </GlassCard>
            <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform" hover>
              <Users className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">
                {organizations.reduce((sum, org) => sum + (org.partners || 0), 0)}
              </div>
              <div className="text-sm text-ink/60">إجمالي الشركاء</div>
            </GlassCard>
            <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform" hover>
              <DollarSign className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">
                ${organizations.reduce((sum, org) => sum + (org.totalRevenue || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-ink/60">إجمالي الإيرادات</div>
            </GlassCard>
            <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform" hover>
              <CheckCircle className="w-8 h-8 mx-auto text-gold mb-2" />
              <div className="font-display text-3xl sm:text-4xl font-bold text-gold mb-1">
                {organizations.filter(o => o.status === 'active').length}
              </div>
              <div className="text-sm text-ink/60">منظمات نشطة</div>
            </GlassCard>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
              <input
                type="text"
                placeholder="البحث بالاسم أو النطاق..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-white/3 border border-white/10 rounded-xl text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-3 bg-white/3 border border-white/10 rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all cursor-pointer"
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {/* Organizations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org) => (
              <GlassCard key={org.id} className="p-6 hover:scale-[1.02] transition-transform" hover>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/20 to-amethyst/20 flex items-center justify-center text-gold text-xl font-bold">
                        {org.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display font-medium text-lg text-ink">{org.name}</h3>
                      <p className="text-sm text-ink/50">{org.domain}</p>
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

                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-white/3 border border-white/10 rounded-xl">
                    <div className="font-display text-lg font-bold text-gold">{org.partners || 0}</div>
                    <div className="text-xs text-ink/50">شركاء</div>
                  </div>
                  <div className="p-3 bg-white/3 border border-white/10 rounded-xl">
                    <div className="font-display text-lg font-bold text-gold">{org.industry || '—'}</div>
                    <div className="text-xs text-ink/50">قطاع</div>
                  </div>
                  <div className="p-3 bg-white/3 border border-white/10 rounded-xl">
                    <div className="font-display text-lg font-bold text-gold">{org.size || '—'}</div>
                    <div className="text-xs text-ink/50">الحجم</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronLeft className="w-4 h-4" />}>
                    عرض التفاصيل
                  </Button>
                  <Button variant="outline" size="sm">
                    تعديل
                  </Button>
                </div>
              </GlassCard>
            ))}

            {filteredOrganizations.length === 0 && organizations.length > 0 && (
              <GlassCard className="col-span-full p-12 text-center">
                <Search className="w-16 h-16 mx-auto text-ink/30 mb-4" />
                <h3 className="font-display text-xl font-medium text-ink mb-2">لا توجد نتائج</h3>
                <p className="text-ink/50 mb-4">جرب تغيير معايير البحث أو الفلترة</p>
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                  مسح الفلاتر
                </Button>
              </GlassCard>
            )}

            {organizations.length === 0 && (
              <GlassCard className="col-span-full p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-ink/30 mb-4" />
                <h3 className="font-display text-xl font-medium text-ink mb-2">لا توجد منظمات</h3>
                <p className="text-ink/50 mb-6">ابدأ بإنشاء أول منظمة لك</p>
                <CrystalButton href="/organizations/new" size="lg" leftIcon={<Plus className="w-5 h-5" />}>
                  إنشاء منظمة
                </CrystalButton>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}