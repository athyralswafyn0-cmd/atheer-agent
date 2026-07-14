import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient, RedisClientType } from 'redis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType;
    cache: CacheManager;
  }
}

export interface CacheOptions {
  ttl?: number; // seconds
  keyPrefix?: string;
  tags?: string[];
  varyBy?: string[]; // Headers to vary cache by
  condition?: (request: FastifyRequest) => boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export class CacheManager {
  private client: RedisClientType;
  private defaultTtl: number;
  private keyPrefix: string;

  constructor(client: RedisClientType, defaultTtl = 300, keyPrefix = 'cache:') {
    this.client = client;
    this.defaultTtl = defaultTtl;
    this.keyPrefix = keyPrefix;
  }

  // Generate cache key from request
  generateKey(request: FastifyRequest, options: CacheOptions = {}): string {
    const parts = [
      this.keyPrefix,
      request.method,
      request.url,
    ];

    // Add query params
    const queryObj = request.query as Record<string, unknown>;
    if (Object.keys(queryObj).length > 0) {
      parts.push(JSON.stringify(queryObj));
    }

    // Add vary headers
    if (options.varyBy) {
      const varyValues = options.varyBy
        .map(header => request.headers[header.toLowerCase()])
        .filter(Boolean)
        .join(':');
      if (varyValues) parts.push(varyValues);
    }

    // Add user/org context for private caches
    const user = (request as any).user;
    if (user?.organizationId) {
      parts.push(`org:${user.organizationId}`);
    }
    if (user?.userId) {
      parts.push(`user:${user.userId}`);
    }

    return parts.join(':').replace(/[^a-zA-Z0-9:_:-]/g, '_');
  }

  // Get cached response
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(this.keyPrefix + key);
      if (!cached) return null;

      const entry: CacheEntry<any> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.client.del(this.keyPrefix + key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cache with TTL and tags
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTtl;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.defaultTtl,
      tags: options.tags || [],
    };

    try {
      await this.client.setEx(this.keyPrefix + key, ttl, JSON.stringify(entry));

      // Index by tags for invalidation
      for (const tag of options.tags || []) {
        await this.client.sAdd(this.keyPrefix + 'tag:' + tag, key);
        await this.client.expire(this.keyPrefix + 'tag:' + tag, 86400 * 30); // 30 days
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Delete specific key
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.keyPrefix + key;
      
      // Get tags first for cleanup
      const cached = await this.client.get(this.keyPrefix + key);
      if (cached) {
        const entry: CacheEntry<any> = JSON.parse(cached);
        for (const tag of entry.tags || []) {
          await this.client.sRem(this.keyPrefix + 'tag:' + tag, key);
        }
      }

      await this.client.del(this.keyPrefix + key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Invalidate by tag
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.client.sMembers(this.keyPrefix + 'tag:' + tag);
      if (keys.length === 0) return 0;

      const fullKeys = keys.map(key => this.keyPrefix + key);
      await this.client.del(fullKeys);
      await this.client.del(this.keyPrefix + 'tag:' + tag);
      
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
      return 0;
    }
  }

  // Invalidate by pattern
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({ match: this.keyPrefix + pattern, count: 100 })) {
        keys.push(key.replace(this.keyPrefix, ''));
      }

      if (keys.length === 0) return 0;

      const fullKeys = keys.map(key => this.keyPrefix + key);
      await this.client.del(fullKeys);
      
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate by pattern error:', error);
      return 0;
    }
  }

  // Invalidate by organization
  async invalidateByOrganization(orgId: string): Promise<number> {
    return this.invalidateByPattern(`*org:${orgId}*`);
  }

  // Invalidate by user
  async invalidateByUser(userId: string): Promise<number> {
    return this.invalidateByPattern(`*user:${userId}*`);
  }

  // Clear all cache
  async clear(): Promise<void> {
    const keys: string[] = [];
    for await (const key of this.client.scanIterator({ match: this.keyPrefix + '*', count: 100 })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  // Get cache stats
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    const info = await this.client.info('memory');
    const keys = await this.client.keys(this.keyPrefix + '*');
    
    return {
      totalKeys: keys.length,
      memoryUsage: info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown',
    };
  }
}

// Fastify plugin
export async function cachePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize Redis client
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const { createClient } = await import('redis');
  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
    },
  });

  client.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
  });

  await client.connect();
  fastify.decorate('redis', client);

  const cache = new CacheManager(
    client,
    parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
    'atheer:cache:'
  );

  fastify.decorate('cache', cache);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await client.quit();
  });

  console.log('Cache manager initialized');
}

// Cache middleware factory
export function createCacheMiddleware(options: CacheOptions = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check condition
    if (options.condition && !options.condition(request)) {
      return;
    }

    const cache = request.server.cache;
    const key = cache.generateKey(request, options);

    // Try to get from cache
    const cached = await cache.get(key);
    if (cached !== null) {
      reply.header('X-Cache', 'HIT');
      reply.header('X-Cache-Key', key);
      return reply.send(cached);
    }

    // Cache miss - continue to handler
    reply.header('X-Cache', 'MISS');

    // Hook to cache response after handler
    request.raw.on('end', async () => {
      // Only cache successful GET requests
      if (request.method === 'GET' && reply.statusCode === 200) {
        const payload = reply.sent ? (reply as any).body : null;
        if (payload) {
          await cache.set(cache.generateKey(request, options), payload, options);
        }
      }
    });
  };
}

// Helper to invalidate cache on mutations
export async function invalidateCacheOnMutation(
  fastify: FastifyInstance,
  options: {
    organizationId?: string;
    userId?: string;
    tags?: string[];
    patterns?: string[];
  }
): Promise<void> {
  if (options.organizationId) {
    await fastify.cache.invalidateByOrganization(options.organizationId);
  }

  if (options.userId) {
    await fastify.cache.invalidateByUser(options.userId);
  }

  if (options.tags) {
    for (const tag of options.tags) {
      await fastify.cache.invalidateByTag(tag);
    }
  }

  if (options.patterns) {
    for (const pattern of options.patterns) {
      await fastify.cache.invalidateByPattern(pattern);
    }
  }
}

// Decorator for cacheable routes
export function Cacheable(options: CacheOptions = {}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const request = args[0];
      const reply = args[1];
      const cache = request.server.cache;
      const key = this.cache?.generateKey?.(request, options) || `route:${request.method}:${request.url}`;

      // Try cache first
      const cached = await this.cache?.get(key);
      if (cached !== null) {
        return reply.send(cached);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache successful GET responses
      if (request.method === 'GET' && reply.statusCode === 200) {
        await this.cache?.set(key, result, options);
      }

      return result;
    };

    return descriptor;
  };
}

export default cachePlugin;