import { FastifyInstance } from 'fastify';
import { AuthService } from '../modules/auth/service.js';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, resetPasswordSchema, forgotPasswordSchema } from '../modules/auth/schemas.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export async function authRoutes(app: FastifyInstance) {
  const authService = app.authService;

  // POST /api/v1/auth/register
  app.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          name: { type: 'string', minLength: 2, maxLength: 100 },
          organizationName: { type: 'string', minLength: 2, maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await authService.register(request.body as any);

      const accessToken = signAccessToken({
        userId: result.user.id,
        organizationId: result.user.organizationId,
        role: result.user.role,
        email: result.user.email,
      });

      const refreshToken = signRefreshToken(result.user.id);

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
  app.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await authService.login(request.body as any);

      const accessToken = signAccessToken({
        userId: result.user.id,
        organizationId: result.user.organizationId,
        role: result.user.role,
        email: result.user.email,
      });

      const refreshToken = signRefreshToken(result.user.id);

      return reply.code(200).send({
        user: result.user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 7 * 24 * 60 * 60,
        },
      });
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/refresh
  app.post('/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    const user = await app.prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    const accessToken = signAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });

    const newRefreshToken = signRefreshToken(user.id);

    return reply.code(200).send({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60,
    });
  });

  // POST /api/v1/auth/change-password
  app.post('/auth/change-password', {
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 8 },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = request.user as { userId: string };
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    try {
      await authService.changePassword(userId, currentPassword, newPassword);
      return reply.code(200).send({ message: 'Password changed successfully' });
    } catch (error: any) {
      if (error.message === 'CURRENT_PASSWORD_INCORRECT') {
        return reply.code(400).send({ error: 'Current password is incorrect' });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/forgot-password
  app.post('/auth/forgot-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = request.body as { email: string };

    await authService.requestPasswordReset(email);
    return reply.code(200).send({ message: 'If the email exists, a reset token has been sent' });
  });

  // POST /api/v1/auth/reset-password
  app.post('/auth/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string };

    try {
      await authService.resetPassword(token, newPassword);
      return reply.code(200).send({ message: 'Password has been reset' });
    } catch (error: any) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return reply.code(400).send({ error: 'Invalid or expired token' });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/logout
  app.post('/auth/logout', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = request.user as { userId: string };
    const { refreshToken } = request.body as { refreshToken: string };

    await authService.logout(userId);
    return reply.code(200).send({ message: 'Logged out successfully' });
  });
}