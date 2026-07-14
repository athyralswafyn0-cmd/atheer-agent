/// <reference path="../fastify.d.ts" />

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  organizationName: z.string().min(2).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);

    const existingUser = await app.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Generate slug from organization name
    const slug = (data.organizationName || `${data.name}'s Organization`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const organization = await app.prisma.organization.create({
      data: {
        name: data.organizationName || `${data.name}'s Organization`,
        slug,
      },
    });

    const user = await app.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        organizationId: organization.id,
        role: 'ADMIN', // First user in organization is admin
      },
    });

    const token = app.jwt.sign({ userId: user.id, organizationId: organization.id, role: user.role });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
      },
      token,
    };
  });

  app.post('/login', async (request, reply) => {
      const data = loginSchema.parse(request.body);

      const user = await app.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        console.log('[LOGIN DEBUG] User not found for email:', data.email);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      if (!user.passwordHash) {
        console.log('[LOGIN DEBUG] User has no passwordHash:', user.id);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      console.log('[LOGIN DEBUG] Attempting login for:', data.email);
      console.log('[LOGIN DEBUG] User found:', user.id);
      console.log('[LOGIN DEBUG] Password hash:', user.passwordHash);
      console.log('[LOGIN DEBUG] Password hash length:', user.passwordHash?.length);
      console.log('[LOGIN DEBUG] Input password:', data.password);
      console.log('[LOGIN DEBUG] Direct bcrypt available:', typeof bcrypt);

      const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
      console.log('[LOGIN DEBUG] Direct bcrypt compare:', passwordValid);

      if (!passwordValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
        // Ensure the user has an organizationId
        if (!user.organizationId) {
          return reply.code(500).send({ error: 'Internal server error: user missing organization' });
        }

        const token = app.jwt.sign({ 
      userId: user.id, 
      organizationId: user.organizationId, 
      role: user.role,
      iss: 'atheer-agent'
    });

        await app.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await app.prisma.activity.create({
          data: {
            action: 'user_login',
            entityType: 'user',
            entityId: user.id,
            organizationId: user.organizationId,
            userId: user.id,
          },
        });

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            avatar: user.avatar,
          },
          token,
        };
      });

  app.post('/forgot-password', async (request, reply) => {
    const data = forgotPasswordSchema.parse(request.body);

    const user = await app.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return reply.code(200).send({ message: 'If your email is registered, you will receive a password reset link' });
    }

    // Generate a token that expires in 1 hour
    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '1h' });

    // Store the token in the user record (or better, in a separate table for password reset tokens)
    // For simplicity, we'll just update the user with a reset token and expiry
    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // In a real app, send email here
    // await app.email.sendMail({
    //   to: user.email,
    //   subject: 'Password Reset',
    //   text: `You requested a password reset. Click the link to reset your password: ${process.env.FRONTEND_URL}/reset-password/${token}`
    // });

    return reply.code(200).send({ message: 'If your email is registered, you will receive a password reset link' });
  });

  app.post('/reset-password', async (request, reply) => {
    const data = resetPasswordSchema.parse(request.body);

    const user = await app.prisma.user.findFirst({
      where: {
        passwordResetToken: data.token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return reply.code(400).send({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return reply.code(200).send({ message: 'Password has been reset' });
  });
};