import { createAIService } from './universal-ai.js';
export const aiPlugin = async (app) => {
    const ai = createAIService();
    app.decorate('ai', ai);
};
