import { FastifyInstance } from 'fastify';

// Use any to completely bypass ioredis type issues
type RedisClient = any;

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClient;
  }
}

let redisClient: RedisClient | null = null;

export async function setupRedis(fastify: FastifyInstance): Promise<RedisClient> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Import dynamically using require to avoid TS constructor issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const ioredis: any = require('ioredis');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const RedisClass: any = ioredis.default || ioredis;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-new
  const client = new RedisClass(redisUrl, {
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
  fastify.decorate('redis', redisClient);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    if (client.status === 'ready') {
      await client.quit();
      console.log('Redis connection closed');
    }
  });

  return redisClient;
}

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call setupRedis first.');
  }
  return redisClient;
}

export default setupRedis;