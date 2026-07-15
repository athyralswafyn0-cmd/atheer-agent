import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';

export class VectorSearchService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async addChunks(chunks: Array<{
    knowledgeBaseId: string;
    content: string;
    chunkIndex: number;
    embedding: number[];
    tokens: number;
    metadata?: Record<string, any>;
  }>) {
    // Store embeddings as JSON array instead of pgvector
    return this.prisma.knowledgeChunk.createMany({
      data: chunks.map(c => ({
        knowledgeBaseId: c.knowledgeBaseId,
        content: c.content,
        chunkIndex: c.chunkIndex,
        embedding: c.embedding, // Prisma will serialize JSON array automatically
        tokens: c.tokens,
        metadata: c.metadata || {},
      })),
      skipDuplicates: false,
    });
  }

  async searchSimilar(params: {
    botId: string;
    queryEmbedding: number[];
    limit?: number;
    threshold?: number;
    knowledgeBaseIds?: string[];
  }) {
    const { botId, queryEmbedding, limit = 5, threshold = 0.7, knowledgeBaseIds } = params;

    // Fetch all chunks for the bot (or filtered by knowledgeBaseIds)
    // In production, consider pagination for large datasets
    const whereClause: any = {
      knowledgeBase: {
        botId,
      },
    };

    if (knowledgeBaseIds?.length) {
      whereClause.knowledgeBaseId = { in: knowledgeBaseIds };
    }

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        embedding: true,
        metadata: true,
        knowledgeBase: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    // Calculate cosine similarity in JavaScript
    const results = chunks
      .map(chunk => {
        const embedding = chunk.embedding as number[] | null;
        if (!embedding || embedding.length === 0) {
          return null;
        }
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return {
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata as Record<string, any>,
          knowledgeBaseName: chunk.knowledgeBase.name,
          knowledgeBaseType: chunk.knowledgeBase.type,
          similarity,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
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

    // Vector search (using JS cosine similarity)
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