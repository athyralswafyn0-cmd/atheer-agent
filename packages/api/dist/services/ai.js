import OpenAI from 'openai';
import { config } from '../config/index.js';
export class AIService {
    constructor(openai) {
        this.openai = openai;
    }
    async generateResponse(params) {
        const { messages, model = 'gpt-4-turbo-preview', temperature = 0.7, maxTokens = 2000, stream = false } = params;
        return this.openai.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream,
        });
    }
    async generateStreamingResponse(params) {
        const { messages, model = 'gpt-4-turbo-preview', temperature = 0.7, maxTokens = 2000, onChunk, onComplete, onError } = params;
        try {
            const stream = await this.openai.chat.completions.create({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true,
            });
            let fullResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content ?? '';
                if (content) {
                    fullResponse += content;
                    onChunk(content);
                }
            }
            onComplete(fullResponse);
        }
        catch (error) {
            onError(error);
        }
    }
    async createEmbedding(text, model = 'text-embedding-3-large') {
        const response = await this.openai.embeddings.create({
            model,
            input: text,
            encoding_format: 'float',
        });
        return response.data[0]?.embedding ?? [];
    }
    async createEmbeddingsBatch(texts, model = 'text-embedding-3-large') {
        const response = await this.openai.embeddings.create({
            model,
            input: texts,
            encoding_format: 'float',
        });
        return response.data.map((d) => d.embedding ?? []);
    }
    async summarizeConversation(messages, model = 'gpt-4-turbo-preview') {
        const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
        const response = await this.openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'Summarize this conversation in 2-3 sentences, focusing on the user\'s intent and outcome.'
                },
                {
                    role: 'user',
                    content: conversationText
                }
            ],
            max_tokens: 200,
            temperature: 0.3,
        });
        return response.choices[0]?.message?.content ?? '';
    }
    async extractLeadInfo(messages, model = 'gpt-4-turbo-preview') {
        const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
        const response = await this.openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: `Extract lead information from this conversation. Return JSON with: name, email, phone, company, intent, budget, timeline. Only include fields that are explicitly mentioned.`
                },
                {
                    role: 'user',
                    content: conversationText
                }
            ],
            max_tokens: 300,
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });
        try {
            return JSON.parse(response.choices[0]?.message?.content ?? '{}');
        }
        catch {
            return {};
        }
    }
    async detectLanguage(text) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Detect the language of the text. Return only the ISO 639-1 code (e.g., ar, en, fr, es).'
                },
                { role: 'user', content: text }
            ],
            max_tokens: 10,
            temperature: 0,
        });
        return (response.choices[0]?.message?.content?.trim().toLowerCase() ?? 'en');
    }
    async classifyIntent(message, intents) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: `Classify the user's intent into one of: ${intents.join(', ')}. Return only the intent name.`
                },
                { role: 'user', content: message }
            ],
            max_tokens: 20,
            temperature: 0,
        });
        return (response.choices[0]?.message?.content?.trim() ?? 'unknown');
    }
}
export const aiPlugin = async (app) => {
    const openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
    });
    const ai = new AIService(openai);
    app.decorate('ai', ai);
};
