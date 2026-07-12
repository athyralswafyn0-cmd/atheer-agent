import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

interface KnowledgeBaseJobData {
  knowledgeBaseId: string;
}

export class KnowledgeProcessor {
  private prisma: PrismaClient;
  private openai: OpenAI;

  constructor(prisma: PrismaClient, openai: OpenAI) {
    this.prisma = prisma;
    this.openai = openai;
  }

  async processKnowledgeBase(job: Job<KnowledgeBaseJobData>) {
    const { knowledgeBaseId } = job.data;

    await this.prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { status: 'processing' },
    });

    try {
      const kb = await this.prisma.knowledgeBase.findUnique({
        where: { id: knowledgeBaseId },
        include: { bot: true },
      });

      if (!kb) throw new Error('Knowledge base not found');

      let content: string;
      let chunksCount = 0;

      switch (kb.type) {
        case 'PDF':
          content = await this.extractPDFContent(kb.source);
          chunksCount = await this.chunkAndStore(kb, content);
          break;
        case 'URL':
          content = await this.extractURLContent(kb.source);
          chunksCount = await this.chunkAndStore(kb, content);
          break;
        case 'SITEMAP':
          content = await this.extractSitemapContent(kb.source);
          chunksCount = await this.chunkAndStore(kb, content);
          break;
        case 'TEXT':
          content = kb.content || '';
          chunksCount = await this.chunkAndStore(kb, content);
          break;
        case 'QA':
          content = kb.content || '';
          chunksCount = await this.processQA(kb);
          break;
        default:
          throw new Error(`Unsupported knowledge base type: ${kb.type}`);
      }

      await this.prisma.knowledgeBase.update({
        where: { id: knowledgeBaseId },
        data: {
          status: 'completed',
          chunksCount,
          content: content.substring(0, 10000),
        },
      });

      return { success: true, chunksCount };
    } catch (error: any) {
      await this.prisma.knowledgeBase.update({
        where: { id: knowledgeBaseId },
        data: {
          status: 'failed',
          error: error.message,
        },
      });
      throw error;
    }
  }

  private async extractPDFContent(_url: string): Promise<string> {
    // TODO: Implement proper PDF text extraction using a library like pdf-parse or pdfjs-dist
    // For now, return empty string to avoid TypeScript errors
    return '';
  }

  private async extractURLContent(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, nav, footer, header, aside
      $('script, style, nav, footer, header, aside').remove();

      // Get main content
      const mainContent = $('main, article, .content, .post, #content').first();
      return mainContent.length ? mainContent.text() : $('body').text();
    } catch (error) {
      console.warn(`Failed to fetch URL ${url}:`, error);
      return '';
    }
  }

  private async extractSitemapContent(sitemapUrl: string): Promise<string> {
    try {
      const response = await fetch(sitemapUrl);
      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      const urls = $('url > loc')
        .map((_, el) => $(el).text())
        .get();
      let combinedContent = '';

      for (const url of urls.slice(0, 50)) {
        // Limit to 50 pages
        try {
          const pageContent = await this.extractURLContent(url);
          combinedContent += pageContent + '\n\n';
        } catch (e) {
          console.warn(`Failed to extract ${url}:`, e);
        }
      }

      return combinedContent;
    } catch (error) {
      console.warn(`Failed to fetch sitemap ${sitemapUrl}:`, error);
      return '';
    }
  }

  private async chunkAndStore(kb: any, content: string): Promise<number> {
    const chunks = this.chunkText(content, 1000, 200);

    // Generate embeddings
    const embeddings = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: chunks,
    });

    // Store chunks with embeddings - handle potential undefined values
    const embeddingData = embeddings.data.map((emb, index) => ({
      knowledgeBaseId: kb.id,
      content: chunks[index],
      chunkIndex: index,
      embedding: emb.embedding || [], // Provide default empty array if undefined
    }));

    await (this.prisma.knowledgeChunk as any).createMany({
      data: embeddingData,
    });

    return chunks.length;
  }

  private async processQA(kb: any): Promise<number> {
    // Parse Q&A content
    const qaPairs = this.parseQA(kb.content || '');

    await (this.prisma.knowledgeChunk as any).createMany({
      data: qaPairs.map((pair, i) => ({
        knowledgeBaseId: kb.id,
        content: `Q: ${pair.question}\nA: ${pair.answer}`,
        chunkIndex: i,
        embedding: [], // Will be generated by worker
        metadata: { type: 'qa', question: pair.question },
      })),
    });

    return qaPairs.length;
  }

  private parseQA(content: string): Array<{ question: string; answer: string }> {
    const pairs: Array<{ question: string; answer: string }> = [];
    const lines = content.split('\n');
    let currentQ = '';
    let currentA = '';

    for (const line of lines) {
      if (line.startsWith('Q:') || line.startsWith('س:')) {
        if (currentQ && currentA) {
          pairs.push({ question: currentQ, answer: currentA });
        }
        currentQ = line.substring(2).trim();
        currentA = '';
      } else if (line.startsWith('A:') || line.startsWith('ج:')) {
        currentA = line.substring(2).trim();
      } else if (currentA) {
        currentA += ' ' + line.trim();
      }
    }

    if (currentQ && currentA) {
      pairs.push({ question: currentQ, answer: currentA });
    }

    return pairs;
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      if (end < text.length) {
        // Try to break at sentence boundary
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > start) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter(c => c.length > 50);
  }
}

// Worker setup
export const createKnowledgeWorker = (prisma: PrismaClient, openai: OpenAI, _queue: Queue) => {
  const processor = new KnowledgeProcessor(prisma, openai);

  const worker = new Worker('process-knowledge-base', async (job) => {
    return processor.processKnowledgeBase(job);
  }, {
    connection: { host: 'redis', port: 6379 },
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(`Knowledge base ${job.data.knowledgeBaseId} processed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Knowledge base ${job?.data?.knowledgeBaseId} failed:`, err);
  });

  return worker;
};