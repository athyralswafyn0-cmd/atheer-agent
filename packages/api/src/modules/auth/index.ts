import { fetch } from 'undici';
import { jwtVerify, SignJWT } from 'jose';

// This is a proxy module that forwards all calls to the auth-service
export function createAuthModule(context: any) {
  const authServiceURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-in-production');

  return {
    // ============================================
    // CORE AUTH OPERATIONS
    // ============================================

    async register(input: any) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Registration failed');
      }
      return response.json();
    },

    async login(input: any) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Login failed');
      }
      return response.json();
    },

    async refreshToken(refreshToken: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Token refresh failed');
      }
      return response.json();
    },

    async logout(userId: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Logout failed');
      }
      return response.json();
    },

    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================

    async requestPasswordReset(email: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Password reset request failed');
      }
      return response.json();
    },

    async resetPassword(token: string, newPassword: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Password reset failed');
      }
      return response.json();
    },

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
      throw new Error('Change password via service-to-service not implemented');
    },

    // ============================================
    // 2FA / MFA
    // ============================================

    async enable2FA(userId: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async verify2FA(userId: string, token: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async disable2FA(userId: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    // ============================================
    // OAUTH / OIDC
    // ============================================

    async getOAuthUrl(provider: 'google' | 'github', redirectUri: string) {
      const url = authServiceURL + '/api/v1/auth/oauth/' + provider + '?redirectUri=' + encodeURIComponent(redirectUri);
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Failed to get OAuth URL');
      }
      return response.json();
    },

    async handleOAuthCallback(provider: 'google' | 'github', code: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/oauth/${provider}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'OAuth callback failed');
      }
      return response.json();
    },

    // ============================================
    // PASSKEYS / WEBAUTHN
    // ============================================

    async startPasskeyRegistration(userId: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async finishPasskeyRegistration(userId: string, credential: any) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async startPasskeyAuthentication() {
      throw new Error('NOT_IMPLEMENTED');
    },

    async finishPasskeyAuthentication(credential: any) {
      throw new Error('NOT_IMPLEMENTED');
    },

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    async getUserSessions(userId: string) {
      const url = authServiceURL + '/api/v1/auth/sessions?userId=' + userId;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Failed to get sessions');
      }
      return response.json();
    },

    async revokeSession(userId: string, sessionId: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Failed to revoke session');
      }
      return response.json();
    },

    async revokeAllSessions(userId: string) {
      const response = await fetch(`${authServiceURL}/api/v1/auth/sessions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Failed to revoke all sessions');
      }
      return response.json();
    },

    // ============================================
    // TOKEN VALIDATION (for other modules)
    // ============================================

    async validateToken(token: string) {
      try {
        const { payload } = await jwtVerify(token, jwtSecret);
        return payload as any;
      } catch {
        return null;
      }
    },

    verifyToken(token: string) {
      try {
        // This is sync - we need to use a different approach
        // For now, throw an error directing to use validateToken
        throw new Error('Use validateToken async method instead');
      } catch {
        throw new Error('Invalid token');
      }
    },

    async signToken(payload: any) {
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(jwtSecret);
      return token;
    },
  };
}