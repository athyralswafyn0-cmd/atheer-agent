'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import { AuroraBackground } from '@/components/ui/AuroraBackground';

interface Partner {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  organizations: {
    id: string;
    name: string;
    slug: string;
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
        const res = await fetch(`http://localhost:3001/api/v1/partners/${id}`);
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

  if (!partner) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-red-500">Partner not found</p>
          <button 
            onClick={() => window.location.href = '/partners'}
            /partners"}
            className="mt-4 btn btn-glass"
          >
            Back to Partners
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <>
      <AuroraBackground />
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold gradient-text">Partner Details</h1>
              <p className="text-text-secondary mt-2">View and manage partner information</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => window.location.href = `/partners/${id}/edit`}
                className="btn btn-outline"
              >
                Edit Partner
              </button>
              <button 
                onClick={() => window.location.href = '/partners'}
                className="btn btn-secondary"
              >
                Back to Partners
              </button>
            </div>
          </div>

          <GlassCard className="p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Partner Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-text-light mb-1">Name</p>
                <h2 className="text-xl font-semibold">{partner.name}</h2>
              </div>
              <div>
                <p className="text-text-light mb-1">Email</p>
                <a href={`mailto:${partner.email}`} className="text-soft-indigo hover:underline">
                  {partner.email}
                </a>
              </div>
              <div>
                <p className="text-text-light mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  partner.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {partner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-text-light mb-1">Joined</p>
                <p className="text-text-light">{new Date(partner.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </GlassCard>

          {partner.organizations.length > 0 && (
            <>
              <GlassCard className="p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">Associated Organizations</h2>
                <div className="space-y-4">
                  {partner.organizations.map((org) => (
                    <GlassCard key={org.id} className="p-4 hover:bg-glass-hover transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-soft-indigo/20 flex items-center justify-center text-soft-indigo font-medium">
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{org.name}</h3>
                          <p className="text-text-light text-sm">/{org.slug}</p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </GlassCard>
            </>
          )}

          {partner.organizations.length === 0 && (
            <GlassCard className="p-6 text-center">
              <p className="text-text-light">No organizations associated with this partner.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </>
  );
}