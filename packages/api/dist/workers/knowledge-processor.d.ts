import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
interface KnowledgeBaseJobData {
    knowledgeBaseId: string;
}
export declare class KnowledgeProcessor {
    private prisma;
    private openai;
    private queue;
    constructor(prisma: PrismaClient, openai: OpenAI, queue: Queue);
    processKnowledgeBase(job: Job<KnowledgeBaseJobData>): Promise<{
        success: boolean;
        chunksCount: number;
    }>;
    private extractPDFContent;
    private extractURLContent;
    private extractSitemapContent;
    private chunkAndStore;
    private processQA;
    private parseQA;
    private chunkText;
}
export declare const createKnowledgeWorker: (prisma: PrismaClient, openai: OpenAI, queue: Queue) => Worker<any, any, string>;
export {};
//# sourceMappingURL=knowledge-processor.d.ts.map