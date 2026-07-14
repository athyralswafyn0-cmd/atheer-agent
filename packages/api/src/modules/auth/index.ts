import { z } from 'zod';
import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import type {
  AuthModuleInterface,
  AuthTokens,
  JWTPayload,
  RegisterInput,
  LoginInput,
  ModuleContext,
} from '../interfaces.js';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
  organizationName: z.string().min(2).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// ============================================
// AUTH MODULE IMPLEMENTATION
// ============================================

export function createAuthModule(context: ModuleContext): AuthModuleInterface {
  const { prisma, config } = context;
  const { bcryptRounds } = config;

  // Helper: Generate slug from name
  const generateSlug = (name: string): string => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suffix = Date.now().toString(36);
    return `${base}-${suffix}`;
  };

  return {
    // ============================================
    // CORE AUTH OPERATIONS
    // ============================================
    
    async register(input: RegisterInput) {
      const data = registerSchema.parse(input);
      
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }

      const passwordHash = await bcrypt.hash(data.password, bcryptRounds);
      
      const slug = generateSlug(data.organizationName || `${data.name}'s Organization`);
      
      const organization = await prisma.organization.create({
        data: {
          name: data.organizationName || `${data.name}'s Organization`,
          slug,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          role: 'ADMIN',
          organizationMembers: {
            create: {
              organizationId: organization.id,
              role: 'OWNER',
            },
          },
        },
        include: {
          organizationMembers: {
            take: 1,
            select: { organizationId: true }
          }
        }
      });

      const tokens: AuthTokens = {
        accessToken: '',
        refreshToken: '',
        expiresIn: 7 * 24 * 60 * 60,
      };

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          organizationId: user.organizationMembers[0]?.organizationId ?? '',
          avatar: user.avatar,
          emailVerified: user.emailVerified ?? undefined,
          lastLoginAt: user.lastLoginAt ?? undefined,
        },
        tokens,
      };
    },

    async login(input: LoginInput) {
      const data = loginSchema.parse(input);
      
      const user = await prisma.user.findUnique({ 
        where: { email: data.email },
        include: {
          organizationMembers: {
            take: 1,
            select: { organizationId: true }
          }
        }
      });
      if (!user || !user.passwordHash) {
        throw new Error('INVALID_CREDENTIALS');
      }

      const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
      if (!passwordValid) {
        throw new Error('INVALID_CREDENTIALS');
      }

      const organizationId = user.organizationMembers[0]?.organizationId ?? '';
      if (!organizationId) {
        throw new Error('USER_MISSING_ORGANIZATION');
      }

      const tokens: AuthTokens = {
        accessToken: '',
        refreshToken: '',
        expiresIn: 7 * 24 * 60 * 60,
      };

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await prisma.activity.create({
        data: {
          action: 'user_login',
          entityType: 'user',
          entityId: user.id,
          organizationId,
          userId: user.id,
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          organizationId,
          avatar: user.avatar,
          emailVerified: user.emailVerified ?? undefined,
          lastLoginAt: user.lastLoginAt ?? undefined,
        },
        tokens,
      };
    },

    async refreshToken(_refreshToken: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async logout(_userId: string) {
      // TODO: Invalidate refresh token
    },

    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================
    
    async requestPasswordReset(email: string) {
      const data = forgotPasswordSchema.parse({ email });
      
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user) {
        return;
      }

      const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + 3600000),
        },
      });
    },

    async resetPassword(token: string, newPassword: string) {
      const data = resetPasswordSchema.parse({ token, password: newPassword });
      
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: data.token,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        throw new Error('INVALID_OR_EXPIRED_TOKEN');
      }

      const passwordHash = await bcrypt.hash(data.password, bcryptRounds);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
    },

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
      const data = changePasswordSchema.parse({ currentPassword, newPassword });
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.passwordHash) {
        throw new Error('USER_NOT_FOUND');
      }

      const passwordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!passwordValid) {
        throw new Error('CURRENT_PASSWORD_INCORRECT');
      }

      const passwordHash = await bcrypt.hash(data.newPassword, bcryptRounds);
      
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    },

    // ============================================
    // 2FA / MFA
    // ============================================
    
    async enable2FA(_userId: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async verify2FA(_userId: string, _token: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async disable2FA(_userId: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    // ============================================
    // OAUTH / OIDC
    // ============================================
    
    async getOAuthUrl(_provider: 'google' | 'github', _redirectUri: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async handleOAuthCallback(_provider: 'google' | 'github', _code: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    // ============================================
    // PASSKEYS / WEBAUTHN
    // ============================================
    
    async startPasskeyRegistration(_userId: string) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async finishPasskeyRegistration(_userId: string, _credential: any) {
      throw new Error('NOT_IMPLEMENTED');
    },

    async startPasskeyAuthentication() {
      throw new Error('NOT_IMPLEMENTED');
    },

    async finishPasskeyAuthentication(_credential: any) {
      throw new Error('NOT_IMPLEMENTED');
    },

    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    async getUserSessions(userId: string) {
      const sessions = await prisma.session.findMany({
        where: { userId, expires: { gt: new Date() } },
        orderBy: { expires: 'desc' },
      });

      return sessions.map(s => ({
        id: s.id,
        device: 'Unknown',
        browser: 'Unknown',
        ip: undefined,
        location: undefined,
        createdAt: new Date(s.expires.getTime() - 7 * 24 * 60 * 60 * 1000),
        lastActiveAt: new Date(),
        current: false,
      }));
    },

    async revokeSession(userId: string, sessionId: string) {
      await prisma.session.delete({
        where: { id: sessionId, userId },
      });
    },

    async revokeAllSessions(userId: string) {
      await prisma.session.deleteMany({ where: { userId } });
    },

    // ============================================
    // TOKEN VALIDATION (for other modules)
    // ============================================
    
    async validateToken(_token: string): Promise<JWTPayload | null> {
      return null;
    },

    verifyToken(_token: string): JWTPayload {
      throw new Error('NOT_IMPLEMENTED_USE_FASTIFY_JWT');
    },

    signToken(_payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
      throw new Error('NOT_IMPLEMENTED_USE_FASTIFY_JWT');
    },
  };
}

// ============================================
// AUTH ROUTES (Fastify Plugin)
// ============================================

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authModule = app.modules.auth;

  // POST /api/v1/auth/register
  app.post('/register', async (request, reply) => {
    try {
      const result = await authModule.register(request.body as RegisterInput);
      
      const accessToken = app.jwt.sign({
        userId: result.user.id,
        organizationId: result.user.organizationId,
        role: result.user.role,
        email: result.user.email,
      }, { expiresIn: '7d' });

      const refreshToken = app.jwt.sign({
        userId: result.user.id,
        type: 'refresh',
      }, { expiresIn: '30d' });

      return reply.code(201).send({
        user: result.user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 7 * 24 * 60 * 60,
        },
      });
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_REGISTERED') {
        return reply.code(409).send({ error: 'Email already registered' });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/login
  app.post('/login', async (request, reply) => {
    try {
      const result = await authModule.login(request.body as LoginInput);
      
      const accessToken = app.jwt.sign({
        userId: result.user.id,
        organizationId: result.user.organizationId,
        role: result.user.role,
        email: result.user.email,
        iss: 'atheer-agent',
      }, { expiresIn: '7d' });

      const refreshToken = app.jwt.sign({
        userId: result.user.id,
        type: 'refresh',
      }, { expiresIn: '30d' });

      return {
        user: result.user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 7 * 24 * 60 * 60,
        },
      };
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS' || error.message === 'USER_MISSING_ORGANIZATION') {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    
    try {
      const decoded = app.jwt.verify(refreshToken) as { userId: string; type: string };
      if (decoded.type !== 'refresh') {
        return reply.code(401).send({ error: 'Invalid token type' });
      }

      const user = await app.prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      const accessToken = app.jwt.sign({
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        email: user.email,
        iss: 'atheer-agent',
      }, { expiresIn: '7d' });

      const newRefreshToken = app.jwt.sign({
        userId: user.id,
        type: 'refresh',
      }, { expiresIn: '30d' });

      return { accessToken, refreshToken: newRefreshToken, expiresIn: 7 * 24 * 60 * 60 };
    } catch {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
  });

  // POST /api/v1/auth/logout
  app.post('/logout', { preHandler: [app.authenticate] }, async (request, _reply) => {
    await authModule.logout(request.user!.userId);
    return { message: 'Logged out successfully' };
  });

  // POST /api/v1/auth/forgot-password
  app.post('/forgot-password', async (request, _reply) => {
    await authModule.requestPasswordReset((request.body as any).email);
    return { message: 'If your email is registered, you will receive a password reset link' };
  });

  // POST /api/v1/auth/reset-password
  app.post('/reset-password', async (request, reply) => {
    try {
      await authModule.resetPassword((request.body as any).token, (request.body as any).password);
      return { message: 'Password has been reset' };
    } catch (error: any) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return reply.code(400).send({ error: 'Invalid or expired token' });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/change-password
  app.post('/change-password', { preHandler: [app.authenticate] }, async (request, _reply) => {
    try {
      await authModule.changePassword(request.user!.userId, (request.body as any).currentPassword, (request.body as any).newPassword);
      return { message: 'Password changed successfully' };
    } catch (error: any) {
      if (error.message === 'CURRENT_PASSWORD_INCORRECT') {
        return _reply.code(400).send({ error: 'Current password is incorrect' });
      }
      throw error;
    }
  });

  // GET /api/v1/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        avatar: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return { user };
  });

  // GET /api/v1/auth/profile (alias for /me)
  app.get('/profile', { preHandler: [app.authenticate] }, async (request) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        avatar: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return { user };
  });

  // GET /api/v1/auth/sessions
  app.get('/sessions', { preHandler: [app.authenticate] }, async (request) => {
    const sessions = await authModule.getUserSessions(request.user!.userId);
    return { sessions };
  });

  // DELETE /api/v1/auth/sessions/:sessionId
  app.delete('/sessions/:sessionId', { preHandler: [app.authenticate] }, async (request, _reply) => {
    const { sessionId } = request.params as { sessionId: string };
    await authModule.revokeSession(request.user!.userId, sessionId);
    return { message: 'Session revoked' };
  });
};

export default authRoutes;