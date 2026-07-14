/// <reference path="../fastify.d.ts" />

import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { ChatCompletion } from 'openai/resources/chat/completions';

export const embedRoutes: FastifyPluginAsync = async (app) => {
  // Public bot config endpoint (for widget)
  app.get('/bots/:botId/config', async (request, reply) => {
    const { botId } = request.params as { botId: string };

    const bot = await app.prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        name: true,
        welcomeMessage: true,
        avatar: true,
        primaryColor: true,
        language: true,
        fallbackMessage: true,
        model: true,
      },
    });

    if (!bot) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    return { bot };
  });

  // Public chat endpoint (for widget)
  app.post('/bots/:botId/chat', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const { message, conversationId, sessionId } = request.body as {
      message: string;
      conversationId?: string;
      sessionId?: string;
    };

    if (!message || message.trim().length === 0) {
      return reply.code(400).send({ error: 'Message is required' });
    }

    const bot = await app.prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        name: true,
        model: true,
        temperature: true,
        maxTokens: true,
        systemPrompt: true,
        welcomeMessage: true,
        fallbackMessage: true,
      },
    });

    if (!bot) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    // Find or create conversation
    let conv;
    if (conversationId) {
      conv = await app.prisma.conversation.findFirst({
        where: { id: conversationId, botId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    } else if (sessionId) {
      conv = await app.prisma.conversation.findFirst({
        where: { sessionId, botId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    if (!conv) {
      conv = await app.prisma.conversation.create({
        data: {
          botId,
          sessionId: sessionId || crypto.randomUUID(),
          status: 'ACTIVE',
          metadata: { source: 'widget' } as Prisma.InputJsonValue,
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    // Create user message
    await app.prisma.message.create({
      data: {
        conversationId: conv.id,
        role: 'USER',
        content: message,
      },
    });

    // Build messages array for AI
    const messages = conv.messages.map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Add system prompt if bot has one
    const systemPrompt = bot.systemPrompt || 'You are a helpful AI assistant.';
    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
      { role: 'user' as const, content: message },
    ];

    let assistantMessage;
    try {
      const aiResponse = await app.ai.generateResponse({
        messages: allMessages,
        model: bot.model || 'gpt-4-turbo-preview',
        temperature: bot.temperature ?? 0.7,
        maxTokens: bot.maxTokens ?? 2000,
      });

      const response = aiResponse as ChatCompletion;
      assistantMessage = await app.prisma.message.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: response.choices[0]?.message?.content || 'No response generated',
        },
      });

      await app.prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() },
      });
    } catch (error) {
      app.log.error({ err: error as Error }, 'OpenAI error');

      const fallbackContent = bot.fallbackMessage || 'I apologize, but I am unable to process your request at the moment. Please try again later.';

      assistantMessage = await app.prisma.message.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: fallbackContent,
        },
      });
    }

    // Check if we should show lead form
    let showLeadForm = false;
    let leadFields: string[] = [];

    if (conv.visitorId && conv.messages.length > 3) {
      const leadInfo = await app.ai.extractLeadInfo(
        [...conv.messages, { role: 'user', content: message }, { role: 'assistant', content: assistantMessage.content }],
        bot.model || 'gpt-4-turbo-preview'
      );

      if (leadInfo && Object.keys(leadInfo).length > 0) {
        showLeadForm = true;
        leadFields = Object.keys(leadInfo);
      }
    }

    return {
      message: assistantMessage,
      conversationId: conv.id,
      showLeadForm,
      leadFields,
    };
  });

  // Capture lead from widget
  app.post('/bots/:botId/leads', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const { conversationId, name, email, phone, company, metadata } = request.body as {
      conversationId: string;
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      metadata?: Record<string, any>;
    };

    if (!name || !email) {
      return reply.code(400).send({ error: 'Name and email are required' });
    }

    const bot = await app.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    const lead = await app.prisma.lead.create({
      data: {
        name,
        email,
        phone,
        company,
        status: 'NEW',
        botId,
        customData: metadata || {},
      },
    });

    await app.prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        lead: { connect: { id: lead.id } }
      },
    });

    return reply.code(201).send({ lead });
  });
};