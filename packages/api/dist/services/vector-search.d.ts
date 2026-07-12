import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
export declare class VectorSearchService {
    private prisma;
    constructor(prisma: PrismaClient);
    addChunks(chunks: Array<{
        knowledgeBaseId: string;
        content: string;
        chunkIndex: number;
        embedding: number[];
        metadata?: Record<string, any>;
    }>): Promise<any>;
    searchSimilar(params: {
        botId: string;
        queryEmbedding: number[];
        limit?: number;
        threshold?: number;
        knowledgeBaseIds?: string[];
    }): Promise<{
        id: string;
        content: string;
        metadata: Record<string, any>;
        knowledgeBaseName: string;
        knowledgeBaseType: string;
        similarity: number;
    }[]>;
    hybridSearch(params: {
        botId: string;
        query: string;
        queryEmbedding: number[];
        limit?: number;
        keywordWeight?: number;
        vectorWeight?: number;
    }): Promise<any[]>;
    deleteChunks(knowledgeBaseId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getChunkCount(knowledgeBaseId: string): Promise<number>;
}
declare module 'fastify' {
    interface FastifyInstance {
        vectorSearch: VectorSearchService;
    }
}
export declare const vectorSearchPlugin: (app: FastifyInstance) => Promise<void>;
//# sourceMappingURL=vector-search.d.ts.map