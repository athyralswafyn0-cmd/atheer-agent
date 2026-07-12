'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-soft-indigo border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading partner dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {partner?.name || 'Partner'}!</p>
      </div>

      {/* Partner Profile */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Partner Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{partner?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{partner?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Organization ID</p>
            <p className="font-medium text-sm">{partner?.organizationId || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium">{partner?.role || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-soft-indigo">{usage.totalOrganizations}</p>
            <p className="text-sm text-gray-500">Organizations</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-soft-indigo">{usage.totalBots}</p>
            <p className="text-sm text-gray-500">Bots</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-soft-indigo">{usage.totalConversations}</p>
            <p className="text-sm text-gray-500">Conversations</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-soft-indigo">{usage.totalMessages}</p>
            <p className="text-sm text-gray-500">Messages</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-soft-indigo">{usage.totalLeads}</p>
            <p className="text-sm text-gray-500">Leads</p>
          </div>
        </div>
      )}

      {/* License & Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* License */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">License</h2>
          {license ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium capitalize">{license.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium capitalize ${license.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {license.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Started</span>
                <span className="font-medium">{new Date(license.startsAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expires</span>
                <span className="font-medium">{new Date(license.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No license information available.</p>
          )}
        </div>

        {/* Organizations */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Organizations</h2>
          {organizations.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-gray-500">{org.slug}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${org.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {org.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{org.plan}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No organizations found.</p>
          )}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-500">Invoice</th>
                  <th className="text-left py-2 font-semibold text-gray-500">Amount</th>
                  <th className="text-left py-2 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-2 font-semibold text-gray-500">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-sm">{invoice.id.slice(0, 8)}</td>
                    <td className="py-2">${invoice.amount.toFixed(2)}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
