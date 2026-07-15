import { PrismaClient, UserRole } from '@prisma/client';

export class PrismaAuthRepository {
  constructor(private prisma: PrismaClient) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    name: string | null;
    avatar: string | null;
    role: UserRole;
    organizationId: string;
  }) {
    return this.prisma.user.create({ data });
  }

  async createOrganization(data: {
    name: string;
    slug: string;
    domain?: string | null;
    logo?: string | null;
    description?: string | null;
    industry?: string | null;
    size?: string | null;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  }) {
    return this.prisma.organization.create({ data });
  }

  async createOrganizationMember(data: {
    userId: string;
    organizationId: string;
    role: UserRole;
    invitedBy?: string | null;
    invitedAt?: Date | null;
    acceptedAt?: Date | null;
  }) {
    return this.prisma.organizationMember.create({ data });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUserLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async createSession(data: {
    sessionToken: string;
    userId: string;
    expires: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.session.create({ data });
  }

  async findSessionByToken(token: string) {
    return this.prisma.session.findUnique({ where: { sessionToken: token } });
  }

  async deleteSession(token: string) {
    return this.prisma.session.delete({ where: { sessionToken: token } });
  }

  async deleteSessionsByUserId(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  async createPasswordResetToken(data: {
    token: string;
    userId: string;
    expires: Date;
  }) {
    return this.prisma.passwordResetToken.create({ data });
  }

  async findPasswordResetToken(token: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { token } });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async logActivity(data: {
    action: string;
    entityType: string;
    entityId?: string | null;
    organizationId?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.activity.create({ data });
  }
}