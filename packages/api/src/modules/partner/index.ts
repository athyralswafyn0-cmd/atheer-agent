import { fetch } from 'undici';

export function createPartnerModule(context: any) {
  const partnerServiceURL = process.env.PARTNER_SERVICE_URL || 'http://localhost:3003';

  return {
    // ============================================
    // PARTNER CRUD
    // ============================================

    async createPartner(input: any, ownerId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, ownerId })
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Creation failed');
      }
      return response.json();
    },

    async getPartner(partnerId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Fetch failed');
      }
      return response.json();
    },

    async updatePartner(partnerId: string, input: any, userId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, userId })
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Update failed');
      }
      return response.json();
    },

    async deletePartner(partnerId: string, userId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        throw new Error('Delete failed: ' + response.status);
      }
      return response.json();
    },

    async listPartners(query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${partnerServiceURL}/api/v1/partner/partners?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('List partners failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // PARTNER CLIENTS
    // ============================================

    async createClient(partnerId: string, input: any) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/clients`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Create client failed: ' + response.status);
      }
      return response.json();
    },

    async getClients(partnerId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/clients`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Get clients failed: ' + response.status);
      }
      return response.json();
    },

    async updateClient(partnerId: string, clientId: string, input: any) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/clients/${clientId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Update client failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // INTEGRATIONS & WEBHOOKS
    // ============================================

    async createIntegration(partnerId: string, input: any) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/integrations`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Create integration failed: ' + response.status);
      }
      return response.json();
    },

    async getIntegrations(partnerId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/integrations`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Get integrations failed: ' + response.status);
      }
      return response.json();
    },

    async createWebhook(partnerId: string, input: any) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/webhooks`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Create webhook failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // PAYOUTS
    // ============================================

    async getPayouts(partnerId: string) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/payouts`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Get payouts failed: ' + response.status);
      }
      return response.json();
    },

    async requestPayout(partnerId: string, input: any) {
      const url = `${partnerServiceURL}/api/v1/partner/partners/${partnerId}/payouts`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Request payout failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
      const url = `${partnerServiceURL}/health`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Health check failed: ' + response.status);
      }
      return response.json();
    }
  };
}