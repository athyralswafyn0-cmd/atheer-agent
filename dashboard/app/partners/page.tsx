'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import GlassCard from '@/components/ui/GlassCard';
import { AuroraBackground } from '@/components/ui/AuroraBackground';

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
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPartners() {
      if (!user) return;
      try {
        const res = await fetch('http://localhost:3001/api/v1/partners', {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
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
    
    if (user) fetchPartners();
  }, [user]);

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
            Retry
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
              <h1 className="text-4xl font-bold gradient-text">Partners</h1>
              <p className="text-text-secondary mt-2">Manage your partnership network</p>
            </div>
            <button className="btn btn-solid">
              New Partner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <GlassCard key={partner.id} className="p-6 hover:scale-[1.02] transition-transform cursor-pointer" 
                onClick={() => window.location.href = `/partners/${partner.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-soft-indigo/10 flex items-center justify-center text-soft-indigo text-xl font-bold">
                      {partner.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{partner.name}</h3>
                      <p className="text-sm text-text-light">{partner.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    partner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {partner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2">
                  {partner.organizations.map((org) => (
                    <div key={org.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-soft-blue/20 flex items-center justify-center text-sm font-medium text-soft-blue">
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{org.name}</p>
                        <p className="text-xs text-text-light">/{org.slug}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-glass-border text-right text-sm text-text-light">
                  Joined: {new Date(partner.createdAt).toLocaleDateString()}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}