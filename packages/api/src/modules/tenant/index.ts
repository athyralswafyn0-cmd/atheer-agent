import { fetch } from 'undici';

export function createTenantModule(context: any) {
  const tenantServiceURL = process.env.TENANT_SERVICE_URL || 'http://localhost:3002';

  return {
    // ============================================
    // ORGANIZATION CRUD
    // ============================================

    async createOrganization(input: any, ownerId: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations';
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

    async getOrganization(orgId: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Fetch failed');
      }
      return response.json();
    },

    async updateOrganization(orgId: string, input: any, userId: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId;
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

    async deleteOrganization(orgId: string, userId: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId;
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

    // ============================================
    // MEMBERS & RBAC
    // ============================================

    async getMembers(orgId: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/members';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Get members failed: ' + response.status);
      }
      return response.json();
    },

    async addMember(input: { userId: string; organizationId: string; role: string }) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + input.organizationId + '/members';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Add member failed: ' + response.status);
      }
      return response.json();
    },

    async removeMember(userId: string, orgId: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/members/' + userId;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Remove member failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // BRAND MANAGEMENT
    // ============================================

    async createBrand(orgId: string, input: any) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/brands';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Create brand failed: ' + response.status);
      }
      return response.json();
    },

    async getBrand(orgId: string, domain: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/brands/' + domain;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Get brand failed: ' + response.status);
      }
      return response.json();
    },

    async updateBrand(orgId: string, domain: string, input: any) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/brands/' + domain;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Update brand failed: ' + response.status);
      }
      return response.json();
    },

    async deleteBrand(orgId: string, domain: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/brands/' + domain;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Delete brand failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // PERMISSION CHECK
    // ============================================

    async checkMember(orgId: string, userId: string, requiredRole?: string) {
      const url = tenantServiceURL + '/api/v1/tenant/organizations/' + orgId + '/members?userId=' + userId;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return false;
        throw new Error('Check member failed: ' + response.status);
      }
      const members = await response.json() as any[];
      if (members.length === 0) return false;
      if (requiredRole) {
        return members.some((m: any) => m.role === requiredRole);
      }
      return true;
    },

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
      const url = tenantServiceURL + '/health';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Health check failed: ' + response.status);
      }
      return response.json();
    }
  };
}