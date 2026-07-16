import { fetch } from 'undici';

export function createAuthModule(context: any) {
  const authServiceURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  return {
    async login(email: string, password: string) {
      const url = `${authServiceURL}/api/v1/auth/login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Login failed');
      }
      return response.json();
    },

    async register(data: { email: string; password: string; name: string; organizationName?: string }) {
      const url = `${authServiceURL}/api/v1/auth/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Registration failed');
      }
      return response.json();
    },

    async me(token: string) {
      const url = `${authServiceURL}/api/v1/auth/me`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Me failed');
      }
      return response.json();
    },

    async refresh(token: string) {
      const url = `${authServiceURL}/api/v1/auth/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Refresh failed');
      }
      return response.json();
    },

    async healthCheck() {
      const url = `${authServiceURL}/health`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Health check failed: ' + response.status);
      return response.json();
    }
  };
}