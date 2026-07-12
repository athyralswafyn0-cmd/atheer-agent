import OpenAI from 'openai';
import { FastifyInstance } from 'fastify';
export declare class AIService {
    private openai;
    constructor(openai: OpenAI);
    generateResponse(params: {
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }>;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
    }): Promise<(OpenAI.Chat.Completions.ChatCompletion & {
        _request_id?: string | null;
    }) | (import("openai/streaming.mjs").Stream<OpenAI.Chat.Completions.ChatCompletionChunk> & {
        _request_id?: string | null;
    })>;
    generateStreamingResponse(params: {
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }>;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        onChunk: (chunk: string) => void;
        onComplete: (fullResponse: string) => void;
        onError: (error: Error) => void;
    }): Promise<void>;
    createEmbedding(text: string, model?: string): Promise<number[]>;
    createEmbeddingsBatch(texts: string[], model?: string): Promise<number[][]>;
    summarizeConversation(messages: Array<{
        role: string;
        content: string;
    }>, model?: string): Promise<string | null>;
    extractLeadInfo(messages: Array<{
        role: string;
        content: string;
    }>, model?: string): Promise<any>;
    detectLanguage(text: string): Promise<string>;
    classifyIntent(message: string, intents: string[]): Promise<string>;
}
declare module 'fastify' {
    interface FastifyInstance {
        ai: AIService;
    }
}
export declare const aiPlugin: (app: FastifyInstance) => Promise<void>;
//# sourceMappingURL=ai.d.ts.map