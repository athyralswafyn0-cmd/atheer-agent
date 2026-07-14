import { FastifyInstance } from 'fastify';
import { UniversalAIService, createAIService } from './universal-ai.js';
import { config } from '../config/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    ai: UniversalAIService;
  }
}

export const aiPlugin = async (app: FastifyInstance) => {
  const ai = createAIService();
  app.decorate('ai', ai);
};