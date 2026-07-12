/// <reference path="../fastify.d.ts" />

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Prisma, ConversationStatus, MessageRole } from '@prisma/client';
import logger from '../utils/logger.js';

const createConversationSchema = z.object({
  botId: z.string().cuid(),
  visitorId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.unknown().optional(),
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().cuid().optional(),
});

export const conversationRoutes: FastifyPluginAsync = async (app) => {
  app.post('/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = createConversationSchema.parse(request.body);

    const bot = await app.prisma.bot.findUnique({
      where: { id: data.botId },
      select: { welcomeMessage: true, model: true, temperature: true, maxTokens: true, systemPrompt: true, fallbackMessage: true },
    });

    const conversation = await app.prisma.conversation.create({
      data: {
        botId: data.botId,
        visitorId: data.visitorId ?? null,
        sessionId: data.sessionId ?? crypto.randomUUID(),
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        status: 'ACTIVE' as ConversationStatus,
      },
    });

    if (bot?.welcomeMessage) {
      await app.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT' as MessageRole,
          content: bot.welcomeMessage,
        },
      });
    }

    return reply.code(201).send({ conversation });
  });

  app.get('/conversations/bot/:botId', async (request: FastifyRequest) => {
    const { botId } = request.params as { botId: string };
    const { page = 1, limit = 20, status } = request.query as { page?: number; limit?: number; status?: string };

    await app.validateBotAccess(botId, request.user?.organizationId ?? '');

    const where = {
      botId,
      ...(status && { status: status as ConversationStatus }),
    };

    const [items, total] = await Promise.all([
      app.prisma.conversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { bot: { select: { name: true } } },
      }),
      app.prisma.conversation.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  app.get('/conversations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const conversation = await app.prisma.conversation.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
      include: { 
        bot: { select: { name: true } }, 
        messages: { orderBy: { createdAt: 'asc' } } 
      },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    return { conversation };
  });

  app.post('/conversations/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = sendMessageSchema.parse(request.body);

    const conversation = await app.prisma.conversation.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
      include: { 
        bot: { select: { model: true, temperature: true, maxTokens: true, systemPrompt: true, fallbackMessage: true } },
        messages: { orderBy: { createdAt: 'asc' } } 
      },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    const userMessage = await app.prisma.message.create({
      data: {
        conversationId: id,
        role: 'USER' as MessageRole,
        content: data.message,
      },
    });

    logger.info({ conversationId: id }, 'User message received');

    const messages = conversation.messages.map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const systemPrompt = conversation.bot.systemPrompt || 'You are a helpful AI assistant.';
    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
      { role: 'user' as const, content: data.message },
    ];

    let aiResponse;
    try {
      aiResponse = await app.ai.generateResponse({
        messages: allMessages,
        model: conversation.bot.model || 'gpt-4-turbo-preview',
        temperature: conversation.bot.temperature ?? 0.7,
        maxTokens: conversation.bot.maxTokens ?? 2000,
      });
    } catch {
      const fallbackContent = conversation.bot.fallbackMessage || 'I apologize, but I am unable to process your request at the moment. Please try again later.';
      
      const botMessage = await app.prisma.message.create({
        data: {
          conversationId: id,
          role: 'ASSISTANT' as MessageRole,
          content: fallbackContent,
        },
      });

      await app.prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      });

      return reply.code(201).send({ message: botMessage, userMessage });
    }

    const botMessage = await app.prisma.message.create({
      data: {
        conversationId: id,
        role: 'ASSISTANT' as MessageRole,
        content: aiResponse.choices[0]?.message?.content ?? 'No response generated',
      },
    });

    await app.prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    if (conversation.visitorId) {
      await app.notifyNewLead({
        visitorId: conversation.visitorId,
        message: data.message,
        response: aiResponse.choices[0]?.message?.content,
      }, conversation.bot);
    }

    return reply.code(201).send({ message: botMessage, userMessage });
  });

  app.patch('/conversations/:id/close', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const conversation = await app.prisma.conversation.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    const updated = await app.prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED' as ConversationStatus },
    });

    return { conversation: updated };
  });

  app.delete('/conversations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const conversation = await app.prisma.conversation.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    await app.prisma.message.deleteMany({ where: { conversationId: id } });
    await app.prisma.conversation.delete({ where: { id } });

    return { message: 'Conversation deleted' };
  });
};