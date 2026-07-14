import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

let redisClient: Redis | null = null;

export async function setupRedis(fastify: FastifyInstance): Promise<any> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) {
        console.error('Redis max retries reached');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  client.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  client.on('ready', () => {
    console.log('Redis ready');
  });

  client.on('reconnecting', () => {
    console.log('Redis reconnecting...');
  });

  await client.connect();
  redisClient = client;

  // Decorate fastify instance
  fastify.decorate('redis', client);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    if (client.status === 'ready') {
      await client.quit();
      console.log('Redis connection closed');
    }
  });

  return client;
}

export function getRedisClient(): any {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call setupRedis first.');
  }
  return redisClient;
}

export default setupRedis;