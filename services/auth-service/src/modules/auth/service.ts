import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { PrismaAuthRepository } from './repository.js';

export class AuthService {
  constructor(
    private authRepo: PrismaAuthRepository,
    private bcryptRounds: number = 12
  ) {}

  async register(data: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
  }) {
    // Check if user exists
    const existingUser = await this.authRepo.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.bcryptRounds);

    // Generate organization slug
    const orgName = data.organizationName || `${data.name}'s Organization`;
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    // Create organization
    const organization = await this.authRepo.createOrganization({
      name: orgName,
      slug,
    });

    // Create user
    const user = await this.authRepo.createUser({
      email: data.email,
      passwordHash,
      name: data.name,
      avatar: null,
      role: 'ADMIN',
      organizationId: organization.id,
    });

    // Make user owner of organization
    await this.authRepo.createOrganizationMember({
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
    });

    // Log activity
    await this.authRepo.logActivity({
      action: 'user_register',
      entityType: 'user',
      entityId: user.id,
      organizationId: organization.id,
      userId: user.id,
    });

    // Generate JWT tokens
    const accessToken = signAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });

    const refreshToken = signRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.authRepo.findUserByEmail(data.email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.passwordHash || '');
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last login
    await this.authRepo.updateUserLastLogin(user.id);

    // Log activity
    await this.authRepo.logActivity({
      action: 'user_login',
      entityType: 'user',
      entityId: user.id,
      organizationId: user.organizationId,
      userId: user.id,
    });

    // Generate JWT tokens
    const accessToken = signAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });

    const refreshToken = signRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    const user = await this.authRepo.findUserById(decoded.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Generate new tokens
    const accessToken = signAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });

    const newRefreshToken = signRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken, expiresIn: 7 * 24 * 60 * 60 };
  }

  async logout(userId: string) {
    // In a real app, we would invalidate the refresh token in a database or use a denylist.
    // For now, we just log the activity.
    await this.authRepo.logActivity({
      action: 'user_logout',
      entityType: 'user',
      entityId: userId,
      userId: userId,
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    // We don't have a PasswordResetToken model in the current schema, so we skip saving.
    // In a real app, you would save the token and expiry to the user or a separate table.

    // TODO: Send email with reset token
    console.log(`Password reset token for ${email}: ${resetToken}`); // For development only
  }

  async resetPassword(token: string, newPassword: string) {
    // In a real app, we would find the user by the reset token and check expiry.
    // Since we don't have a token storage, we'll skip the implementation for now.
    throw new Error('NOT_IMPLEMENTED');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!isValid) {
      throw new Error('CURRENT_PASSWORD_INCORRECT');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.authRepo.updatePassword(userId, passwordHash);

    // Log activity
    await this.authRepo.logActivity({
      action: 'password_change',
      entityType: 'user',
      entityId: userId,
      userId: userId,
    });
  }

  async getUserSessions(userId: string) {
    // TODO: Implement using session model
    return [];
  }

  async revokeSession(userId: string, sessionId: string) {
    // TODO: Implement
  }

  async revokeAllSessions(userId: string) {
    // TODO: Implement
  }
}