import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const authMiddleware = async (app: FastifyInstance) => {
  if (!app.hasRequestDecorator('user')) {
    app.decorateRequest('user', null);
  }

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('[AUTH MIDDLEWARE] URL:', request.url, 'Auth header:', request.headers.authorization ? 'present' : 'missing');
    // Skip auth for public routes
    const publicPaths = [
      '/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
    ];

    const isWidgetPublic = request.url.startsWith('/widget/bots/') && 
      (request.url.includes('/conversations') || request.url.includes('/chat') || request.url.includes('/config') || request.url.includes('/leads'));
    
    const isEmbedPublic = request.url.startsWith('/embed/bots/');

    if (publicPaths.some(path => request.url.startsWith(path)) || isWidgetPublic || isEmbedPublic) {
      return;
    }

    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const decoded = app.jwt.verify(token) as { userId: string; organizationId: string; role: string };
      
      const user = await app.prisma!.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true, organizationId: true },
      });

      if (!user) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'User not found' });
      }

      request.user = {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      };
    } catch (err) {
      if ((err as any).name === 'JsonWebTokenError') {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid token' });
      }
      if ((err as any).name === 'TokenExpiredError') {
        return reply.code(401).send({ error: 'TOKEN_EXPIRED', message: 'Token has expired' });
      }
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication failed' });
    }
  });
};