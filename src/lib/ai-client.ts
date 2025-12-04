// AI Client - Wrapper around Gemini service with intelligent model selection
// Integrates with existing Gemini service and adds AI context capabilities

import {
    streamMessageToGemini,
    GeminiModel,
    ChatMessage as GeminiChatMessage
} from '../renderer/services/gemini';
import {
    MODELS,
    MODEL_SELECTION,
    MODEL_CHARACTERISTICS
} from '../config/ai-config';
import { AIContext, ModelConfig } from '../types/ai-context';

/**
 * AI Client for Intellirite
 * Wraps Gemini service with intelligent model selection and context handling
 */
export class AIClient {
    private defaultModel: GeminiModel = MODELS.FLASH;
    private userPreferredModel?: GeminiModel;

    /**
     * Set user's preferred model
     */
    setPreferredModel(model: GeminiModel) {
        this.userPreferredModel = model;
    }

    /**
     * Get user's preferred model or default
     */
    getPreferredModel(): GeminiModel {
        return this.userPreferredModel || this.defaultModel;
    }

    /**
     * Auto-select the best model based on context
     */
    selectModel(context: AIContext): ModelConfig {
        const model = MODEL_SELECTION.autoSelect({
            estimatedTokens: context.estimatedTokens,
            numReferencedFiles: context.referencedFiles.length,
            taskType: undefined, // Can be enhanced with task type detection
            userPreference: this.userPreferredModel,
        });

        const characteristics = MODEL_CHARACTERISTICS[model];
        const reason = MODEL_SELECTION.getSelectionReason(model, {
            estimatedTokens: context.estimatedTokens,
            numReferencedFiles: context.referencedFiles.length,
        });

        return {
            modelId: model,
            modelName: this.getModelDisplayName(model),
            autoSelected: !this.userPreferredModel,
            selectionReason: reason,
            costTier: characteristics.costTier,
        };
    }

    /**
     * Get human-readable model name
     */
    private getModelDisplayName(model: GeminiModel): string {
        switch (model) {
            case MODELS.FLASH:
                return 'Gemini 2.5 Flash';
            case MODELS.PRO:
                return 'Gemini 2.5 Pro';
            case MODELS.FLASH_2_0:
                return 'Gemini 2.0 Flash';
            case MODELS.FLASH_EXP:
                return 'Gemini 2.0 Flash (Experimental)';
            default:
                return model;
        }
    }

    /**
     * Stream a request to Gemini
     * Returns an async generator for streaming responses
     */
    async *streamRequest(
        prompt: string,
        chatHistory: GeminiChatMessage[] = [],
        modelId?: GeminiModel
    ): AsyncGenerator<string, void, unknown> {
        const model = modelId || this.defaultModel;

        // Build messages array
        const messages: GeminiChatMessage[] = [
            ...chatHistory,
            {
                role: 'user',
                content: prompt,
            },
        ];

        // Stream from Gemini service
        try {
            for await (const chunk of streamMessageToGemini(messages, model)) {
                yield chunk;
            }
        } catch (error) {
            console.error('AI Client streaming error:', error);
            throw error;
        }
    }

    /**
     * Send a complete request (non-streaming)
     * Collects all chunks and returns complete response
     */
    async sendRequest(
        prompt: string,
        chatHistory: GeminiChatMessage[] = [],
        modelId?: GeminiModel
    ): Promise<string> {
        let fullResponse = '';

        for await (const chunk of this.streamRequest(prompt, chatHistory, modelId)) {
            fullResponse += chunk;
        }

        return fullResponse;
    }

    /**
     * Send a request with auto model selection based on context
     */
    async sendWithContext(
        prompt: string,
        context: AIContext,
        chatHistory: GeminiChatMessage[] = []
    ): Promise<{
        response: string;
        modelUsed: ModelConfig;
    }> {
        const modelConfig = this.selectModel(context);

        const response = await this.sendRequest(
            prompt,
            chatHistory,
            modelConfig.modelId as GeminiModel
        );

        return {
            response,
            modelUsed: modelConfig,
        };
    }

    /**
     * Stream a request with auto model selection based on context
     */
    async *streamWithContext(
        prompt: string,
        context: AIContext,
        chatHistory: GeminiChatMessage[] = []
    ): AsyncGenerator<string, ModelConfig, unknown> {
        const modelConfig = this.selectModel(context);

        for await (const chunk of this.streamRequest(
            prompt,
            chatHistory,
            modelConfig.modelId as GeminiModel
        )) {
            yield chunk;
        }

        return modelConfig;
    }

    /**
     * Get model characteristics for display
     */
    getModelCharacteristics(model: GeminiModel) {
        return MODEL_CHARACTERISTICS[model];
    }

    /**
     * Get all available models
     */
    getAvailableModels(): Array<{
        id: GeminiModel;
        name: string;
        costTier: number;
        speed: string;
        capabilities: string;
    }> {
        return Object.entries(MODELS).map(([key, modelId]) => {
            const characteristics = MODEL_CHARACTERISTICS[modelId];
            return {
                id: modelId,
                name: this.getModelDisplayName(modelId),
                costTier: characteristics.costTier,
                speed: characteristics.speed,
                capabilities: characteristics.capabilities,
            };
        });
    }
}

/**
 * Default export - singleton instance
 */
export const aiClient = new AIClient();

/**
 * Helper to quickly send a request
 */
export async function quickSendRequest(
    prompt: string,
    model?: GeminiModel
): Promise<string> {
    return aiClient.sendRequest(prompt, [], model);
}
