import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InputJsonValue } from '@prisma/client/runtime/library';

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const organizationId = request.user?.organizationId ?? '';
    const integrations = await app.prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return { integrations };
  });

  app.post('/', async (request, reply) => {
    const data = createIntegrationSchema.parse(request.body);
    const organizationId = request.user?.organizationId ?? '';

    const integration = await app.prisma.integration.create({
      data: {
        ...data,
        organization: { connect: { id: organizationId } },
        config: (data.config ?? {}) as InputJsonValue,
      } as any,
    });

    return reply.code(201).send({ integration });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = request.user?.organizationId ?? '';

    const integration = await app.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      return reply.code(404).send({ error: 'Integration not found' });
    }

    return { integration };
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateIntegrationSchema.parse(request.body);
    const organizationId = request.user?.organizationId ?? '';

    const integration = await app.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      return reply.code(404).send({ error: 'Integration not found' });
    }

    const currentConfig = (integration.config ?? {}) as Record<string, unknown>;
    const newConfig: InputJsonValue = data.config
      ? { ...currentConfig, ...data.config } as InputJsonValue
      : integration.config as InputJsonValue;

    const updated = await app.prisma.integration.update({
      where: { id },
      data: {
        ...data,
        config: newConfig,
      },
    });

    return { integration: updated };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = request.user?.organizationId ?? '';

    const integration = await app.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      return reply.code(404).send({ error: 'Integration not found' });
    }

    await app.prisma.integration.delete({ where: { id } });

    return { message: 'Integration deleted' };
  });

  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = request.user?.organizationId ?? '';

    const integration = await app.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      return reply.code(404).send({ error: 'Integration not found' });
    }

    try {
      await app.testIntegration(integration);
      return { message: 'Test successful' };
    } catch (error) {
      return reply.code(500).send({ error: 'Test failed', details: error instanceof Error ? error.message : String(error) });
    }
  });
};

const createIntegrationSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['EMAIL', 'TELEGRAM', 'SLACK', 'WEBHOOK', 'HUBSPOT', 'PIPEDRIVE']),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});