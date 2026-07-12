import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';

export class VectorSearchService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async addChunks(chunks: Array<{
    knowledgeBaseId: string;
    content: string;
    chunkIndex: number;
    embedding: number[];
    metadata?: Record<string, any>;
  }>) {
    // Use raw SQL since embedding is an unsupported type (pgvector)
    const query = `
      INSERT INTO "KnowledgeChunk" ("knowledgeBaseId", content, "chunkIndex", embedding, metadata, "createdAt")
      VALUES ${chunks.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}::vector, $${i * 6 + 5}, NOW())`).join(', ')}
    `;
    
    const params = chunks.flatMap(c => [
      c.knowledgeBaseId,
      c.content,
      c.chunkIndex,
      `[${c.embedding.join(',')}]`,
      JSON.stringify(c.metadata || {}),
    ]);
    
    return this.prisma.$executeRawUnsafe(query, ...params);
  }

  async searchSimilar(params: {
    botId: string;
    queryEmbedding: number[];
    limit?: number;
    threshold?: number;
    knowledgeBaseIds?: string[];
  }) {
    const { botId, queryEmbedding, limit = 5, threshold = 0.7, knowledgeBaseIds } = params;

    // Build the query with pgvector
    const whereClause = knowledgeBaseIds?.length
      ? `WHERE kb."botId" = $1 AND kc."knowledgeBaseId" IN (${knowledgeBaseIds.map((_, i) => `$${i + 2}`).join(',')})`
      : 'WHERE kb."botId" = $1';

    const params_list = knowledgeBaseIds
      ? [botId, ...knowledgeBaseIds]
      : [botId];

    const query = `
      SELECT 
        kc.id,
        kc.content,
        kc.metadata,
        kb.name as "knowledgeBaseName",
        kb.type as "knowledgeBaseType",
        1 - (kc.embedding <=> $${params_list.length + 1}::vector) as similarity
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeBase" kb ON kc."knowledgeBaseId" = kb.id
      ${whereClause}
        AND 1 - (kc.embedding <=> $${params_list.length + 1}::vector) > $${params_list.length + 2}
      ORDER BY similarity DESC
      LIMIT $${params_list.length + 3}
    `;

    const results = await this.prisma.$queryRawUnsafe(
      query,
      ...params_list,
      `[${queryEmbedding.join(',')}]`,
      threshold,
      limit
    );

    return results as Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
      knowledgeBaseName: string;
      knowledgeBaseType: string;
      similarity: number;
    }>;
  }

  async hybridSearch(params: {
    botId: string;
    query: string;
    queryEmbedding: number[];
    limit?: number;
    keywordWeight?: number;
    vectorWeight?: number;
  }) {
    const { botId, query, queryEmbedding, limit = 5, keywordWeight = 0.3, vectorWeight = 0.7 } = params;

    // Vector search
    const vectorResults = await this.searchSimilar({
      botId,
      queryEmbedding,
      limit: limit * 2,
      threshold: 0.5,
    });

    // Keyword search (using PostgreSQL full text search)
    const keywordResults = await this.prisma.$queryRaw`
      SELECT 
        kc.id,
        kc.content,
        kc.metadata,
        kb.name as "knowledgeBaseName",
        kb.type as "knowledgeBaseType",
        ts_rank_cd(to_tsvector('arabic', kc.content), plainto_tsquery('arabic', ${query})) as rank
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeBase" kb ON kc."knowledgeBaseId" = kb.id
      WHERE kb."botId" = ${botId}
        AND to_tsvector('arabic', kc.content) @@ plainto_tsquery('arabic', ${query})
      ORDER BY rank DESC
      LIMIT ${limit * 2}
    ` as Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
      knowledgeBaseName: string;
      knowledgeBaseType: string;
      rank: number;
    }>;

    // Combine and re-rank
    const combined = new Map<string, any>();

    // Add vector results
    for (const r of vectorResults) {
      combined.set(r.id, {
        ...r,
        vectorScore: r.similarity,
        keywordScore: 0,
        combinedScore: r.similarity * vectorWeight,
      });
    }

    // Add keyword results
    for (const r of keywordResults) {
      const existing = combined.get(r.id);
      if (existing) {
        existing.keywordScore = r.rank;
        existing.combinedScore = existing.vectorScore * vectorWeight + r.rank * keywordWeight;
      } else {
        combined.set(r.id, {
          ...r,
          vectorScore: 0,
          keywordScore: r.rank,
          combinedScore: r.rank * keywordWeight,
        });
      }
    }

    // Sort by combined score and return top results
    return Array.from(combined.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit);
  }

  async deleteChunks(knowledgeBaseId: string) {
    return this.prisma.knowledgeChunk.deleteMany({
      where: { knowledgeBaseId },
    });
  }

  async getChunkCount(knowledgeBaseId: string) {
    return this.prisma.knowledgeChunk.count({
      where: { knowledgeBaseId },
    });
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    vectorSearch: VectorSearchService;
  }
}

export const vectorSearchPlugin = async (app: FastifyInstance) => {
  const vectorSearch = new VectorSearchService(app.prisma);
  app.decorate('vectorSearch', vectorSearch);
};