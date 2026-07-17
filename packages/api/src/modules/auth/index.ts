import { ModuleContext, AuthModuleInterface } from './interfaces.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export function createAuthModule(context: ModuleContext): AuthModuleInterface {
  const { prisma, config } = context;

  return {
    async login(email: string, password: string) {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('INVALID_CREDENTIALS');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash || '');
      if (!isValid) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginAttempts: 0,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
      };
    },

    async register(data: { email: string; password: string; name: string; organizationName?: string }) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }

      const passwordHash = await bcrypt.hash(data.password, config.BCRYPT_ROUNDS || 12);

      // If organizationName is provided, create an organization for the user
      let organizationId: string | undefined;
      if (data.organizationName) {
        const org = await prisma.organization.create({
          data: {
            name: data.organizationName,
            slug: data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            plan: 'starter',
          },
        });
        organizationId = org.id;
      }

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          organizationId,
          role: organizationId ? 'OWNER' : 'MEMBER', // If they created an org, they're owner
        },
      });

      // If no organization was provided but we want to assign a default one? Not needed.
      // For now, if no organizationName, the user won't have an organizationId.

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      };
    },

    async me(userId: string) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          avatar: true,
        },
      });

      if (!user) {
        return null;
      }

      return user;
    },

    async refresh(userId: string) {
      // In a real app, you would validate a refresh token here.
      // For simplicity, we just return the user data (like `me`).
      return this.me(userId);
    },

    async healthCheck() {
      try {
        await prisma.user.count();
        return { status: 'ok' };
      } catch (error) {
        return { status: 'error', message: error.message };
      }
    },

    async requestPasswordReset(email: string) {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // For security, we don't reveal that the user doesn't exist
        return { message: 'If your email is registered, you will receive a password reset link' };
      }

      const token = uuidv4();
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          token,
          expires,
          userId: user.id,
        },
      });

      // In a real app, you would send an email here.
      // For now, we just log it.
      console.log(`Password reset token for ${email}: ${token}`);

      return { message: 'If your email is registered, you will receive a password reset link' };
    },

    async resetPassword(token: string, password: string) {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      if (!resetToken || resetToken.expires < new Date()) {
        throw new Error('INVALID_OR_EXPIRED_TOKEN');
      }

      const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS || 12);

      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return { message: 'Password has been reset' };
    },

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash || '');
      if (!isValid) {
        throw new Error('CURRENT_PASSWORD_INCORRECT');
      }

      const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS || 12);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return { message: 'Password changed successfully' };
    },

    async getUserSessions(userId: string) {
      // In a real app, you would have a sessions table.
      // For now, we return an empty array.
      return [];
    },

    async revokeSession(userId: string, sessionId: string) {
      // In a real app, you would delete the session.
      // For now, we do nothing.
      return { message: 'Session revoked' };
    },

    async revokeAllSessions(userId: string) {
      // In a real app, you would delete all sessions for the user.
      // For now, we do nothing.
      return { message: 'All sessions revoked' };
    },
  };
}