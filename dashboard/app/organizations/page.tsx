'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import GlassCard from '@/components/ui/GlassCard';
import { AuroraBackground } from '@/components/ui/AuroraBackground';

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

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch('http://localhost:3001/api/v1/organizations', {
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

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <GlassCard key={i} className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 btn btn-glass"
          >
            إعادة المحاولة
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <>
      <AuroraBackground />
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold gradient-text">المنظمات</h1>
              <p className="text-text-secondary mt-2">إدارة المنظمات والشركاء التابعين لها</p>
            </div>
            <button className="btn btn-solid">
              منظمة جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-soft-indigo">{organizations.length}</div>
              <div className="text-sm text-text-light">إجمالي المنظمات</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-soft-indigo">
                {organizations.reduce((sum, org) => sum + (org.partners || 0), 0)}
              </div>
              <div className="text-sm text-text-light">إجمالي الشركاء</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-soft-indigo">
                ${organizations.reduce((sum, org) => sum + (org.totalRevenue || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-text-light">إجمالي الإيرادات</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-soft-indigo">
                {organizations.filter(o => o.status === 'active').length}
              </div>
              <div className="text-sm text-text-light">منظمات نشطة</div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <GlassCard key={org.id} className="p-6 hover:scale-[1.02] transition-transform">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-soft-indigo/10 flex items-center justify-center text-soft-indigo text-xl font-bold">
                        {org.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{org.name}</h3>
                      <p className="text-sm text-text-light">{org.domain}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    org.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {org.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-soft-indigo">{org.partners || 0}</div>
                    <div className="text-xs text-text-light">شركاء</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-soft-indigo">{org.industry || '—'}</div>
                    <div className="text-xs text-text-light">قطاع</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-soft-indigo">{org.size || '—'}</div>
                    <div className="text-xs text-text-light">الحجم</div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-glass-border flex justify-between">
                  <button className="text-sm text-soft-indigo hover:underline">
                    عرض التفاصيل
                  </button>
                  <button className="text-sm text-soft-indigo hover:underline">
                    <i className="fas fa-chevron-left"></i>
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}