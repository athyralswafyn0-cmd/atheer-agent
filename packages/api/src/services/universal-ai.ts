import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { config } from '../config/index.js';

export type AIProvider = 'openai' | 'groq' | 'google';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class UniversalAIService {
  private openai: OpenAI | null = null;
  private groq: Groq | null = null;
  private googleAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    }
    if (config.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: config.GROQ_API_KEY });
    }
    if (config.GOOGLE_AI_API_KEY) {
      this.googleAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
    }
  }

  /**
   * Get the best available provider (priority: Groq > Google > OpenAI)
   */
  getDefaultProvider(): AIProvider {
    if (this.groq) return 'groq';
    if (this.googleAI) return 'google';
    if (this.openai) return 'openai';
    throw new Error('No AI provider configured');
  }

  /**
   * Generate chat completion with automatic fallback
   */
  async generateResponse(params: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: AIProvider;
  }): Promise<AIResponse> {
    const provider = params.provider || this.getDefaultProvider();

    try {
      switch (provider) {
        case 'groq':
          return await this.generateWithGroq(params);
        case 'google':
          return await this.generateWithGoogle(params);
        case 'openai':
          return await this.generateWithOpenAI(params);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`[AI] ${provider} failed:`, error);

      // Fallback chain
      const fallbacks = this.getFallbackProviders(provider);
      for (const fallback of fallbacks) {
        try {
          console.log(`[AI] Falling back to ${fallback}...`);
          return await this.generateResponse({ ...params, provider: fallback });
        } catch (fallbackError) {
          console.error(`[AI] Fallback ${fallback} failed:`, fallbackError);
        }
      }

      throw new Error('All AI providers failed');
    }
  }

  private getFallbackProviders(primary: AIProvider): AIProvider[] {
    const order: AIProvider[] = ['groq', 'google', 'openai'];
    return order.filter(p => p !== primary && this.isProviderAvailable(p));
  }

  private isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case 'groq':
        return !!this.groq;
      case 'google':
        return !!this.googleAI;
      case 'openai':
        return !!this.openai;
      default:
        return false;
    }
  }

  private async generateWithGroq(params: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    if (!this.groq) throw new Error('Groq not configured');

    const model = params.model || config.GROQ_CHAT_MODEL;
    const completion = await this.groq.chat.completions.create({
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2000,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async generateWithGoogle(params: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    if (!this.googleAI) throw new Error('Google AI not configured');

    const model = params.model || config.GOOGLE_AI_CHAT_MODEL;
    const genModel = this.googleAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens ?? 2000,
      },
    });

    // Convert messages to Google format
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const userMessages = params.messages.filter((m) => m.role !== 'system');

    const chat = genModel.startChat({
      history: userMessages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemMessage?.content,
    });

    const lastMessage = userMessages[userMessages.length - 1];
    const result = await chat.sendMessage(lastMessage?.content || '');
    const response = result.response;

    return {
      content: response.text(),
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  private async generateWithOpenAI(params: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const model = params.model || config.OPENAI_MODEL;
    const completion = await this.openai.chat.completions.create({
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2000,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(texts: string[], provider?: AIProvider): Promise<number[][]> {
    const p = provider || this.getDefaultProvider();

    switch (p) {
      case 'groq':
        throw new Error('Groq does not support embeddings yet');
      case 'google':
        return this.generateEmbeddingsGoogle(texts);
      case 'openai':
        return this.generateEmbeddingsOpenAI(texts);
      default:
        throw new Error(`Unknown provider: ${p}`);
    }
  }

  private async generateEmbeddingsGoogle(texts: string[]): Promise<number[][]> {
    if (!this.googleAI) throw new Error('Google AI not configured');

    const model = this.googleAI.getGenerativeModel({
      model: config.GOOGLE_AI_EMBEDDING_MODEL,
    });

    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    return embeddings;
  }

  private async generateEmbeddingsOpenAI(texts: string[]): Promise<number[][]> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const response = await this.openai.embeddings.create({
      model: config.OPENAI_EMBEDDING_MODEL,
      input: texts,
    });

    return response.data.map((d) => d.embedding);
  }

  /**
   * Get available models for UI
   */
  getAvailableModels(): Array<{
    id: string;
    name: string;
    provider: AIProvider;
    capabilities: string[];
  }> {
    const models: Array<{
      id: string;
      name: string;
      provider: AIProvider;
      capabilities: string[];
    }> = [];

    if (this.groq) {
      models.push(
        { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', provider: 'groq', capabilities: ['chat', 'fast'] },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', capabilities: ['chat', 'fast'] },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', capabilities: ['chat', 'fast'] },
      );
    }

    if (this.googleAI) {
      models.push(
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', capabilities: ['chat', 'vision', 'long-context'] },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', capabilities: ['chat', 'vision', 'long-context'] },
      );
    }

    if (this.openai) {
      models.push(
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', capabilities: ['chat', 'vision', 'function-calling'] },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', capabilities: ['chat', 'vision', 'function-calling'] },
      );
    }

    return models;
  }
}

// Singleton instance
let aiServiceInstance: UniversalAIService | null = null;

export function getAIService(): UniversalAIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new UniversalAIService();
  }
  return aiServiceInstance;
}

export function createAIService(): UniversalAIService {
  return new UniversalAIService();
}