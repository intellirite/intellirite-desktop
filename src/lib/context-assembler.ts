// Context Assembler
// Combines all context sources into a structured prompt for AI

import {
    AIContext,
    FileContext,
    SelectionContext,
    ChatMessage,
    ContextOptions,
    FileReference,
} from '../types/ai-context';
import {
    CONTEXT_LIMITS,
    DEFAULT_OPTIONS,
    TOKEN_ESTIMATION,
    CONTEXT_TEMPLATE,
} from '../config/ai-config';
import { summarizeContent, needsSummarization } from './content-summarizer';
import { extractWithContext } from '../utils/file-utils';

/**
 * Context Assembler
 * Responsible for combining all context sources into a unified prompt
 */
export class ContextAssembler {
    /**
     * Assemble complete AI context from all sources
     */
    async assembleContext(params: {
        activeFile: FileContext;
        selection?: SelectionContext;
        referencedFiles?: FileContext[];
        chatHistory?: ChatMessage[];
        userRequest: string;
        systemRules?: string[];
        options?: ContextOptions;
    }): Promise<AIContext> {
        const options = { ...DEFAULT_OPTIONS, ...params.options };

        // Prepare active file (with potential summarization)
        const activeFile = await this.prepareFileContext(
            params.activeFile,
            options,
            true // is active
        );

        // Prepare referenced files
        const referencedFiles = params.referencedFiles
            ? await Promise.all(
                params.referencedFiles
                    .slice(0, options.maxFiles)
                    .map(file => this.prepareFileContext(file, options, false))
            )
            : [];

        // Limit chat history
        const chatHistory = params.chatHistory
            ? params.chatHistory.slice(-options.chatHistoryCount)
            : [];

        // Build context object
        const context: AIContext = {
            activeFile,
            selection: params.selection,
            referencedFiles,
            chatHistory,
            userRequest: params.userRequest,
            systemRules: params.systemRules || [],
            estimatedTokens: 0, // Will be calculated
        };

        // Calculate total tokens
        context.estimatedTokens = this.estimateContextTokens(context);

        // If too large, optimize
        if (context.estimatedTokens > options.maxTokens!) {
            return this.optimizeContext(context, options);
        }

        return context;
    }

    /**
     * Prepare a file context with potential summarization
     */
    private async prepareFileContext(
        file: FileContext,
        options: ContextOptions,
        isActive: boolean
    ): Promise<FileContext> {
        // Active file might be shown in full or with context window
        if (isActive) {
            return file; // Keep full for now, optimize later if needed
        }

        // Referenced files - summarize if needed
        if (options.summarizeLargeFiles && needsSummarization(file.content, options.largeFileThreshold)) {
            const summary = summarizeContent(file.content, file.fileName);
            return {
                ...file,
                summary,
            };
        }

        return file;
    }

    /**
     * Optimize context if it exceeds token limits
     */
    private optimizeContext(
        context: AIContext,
        options: ContextOptions
    ): AIContext {
        const optimized = { ...context };

        // Strategy 1: Summarize active file if very large
        if (context.activeFile.lineCount > CONTEXT_LIMITS.LARGE_FILE_THRESHOLD) {
            const summary = summarizeContent(
                context.activeFile.content,
                context.activeFile.fileName
            );
            optimized.activeFile = {
                ...context.activeFile,
                summary,
            };
        }

        // Strategy 2: Reduce referenced files
        if (context.referencedFiles.length > 0) {
            optimized.referencedFiles = context.referencedFiles
                .slice(0, Math.floor(options.maxFiles! / 2))
                .map(file => ({
                    ...file,
                    summary: summarizeContent(file.content, file.fileName),
                }));
        }

        // Strategy 3: Further reduce chat history
        if (context.chatHistory.length > 0) {
            optimized.chatHistory = context.chatHistory.slice(-3);
        }

        // Recalculate tokens
        optimized.estimatedTokens = this.estimateContextTokens(optimized);

        return optimized;
    }

    /**
     * Estimate total tokens in context
     */
    private estimateContextTokens(context: AIContext): number {
        let totalChars = 0;

        // Active file
        totalChars += context.activeFile.content.length;
        if (context.activeFile.summary) {
            totalChars += context.activeFile.summary.length;
        }

        // Selection
        if (context.selection) {
            totalChars += context.selection.text.length;
        }

        // Referenced files
        context.referencedFiles.forEach(file => {
            if (file.summary) {
                totalChars += file.summary.length;
            } else {
                totalChars += file.content.length;
            }
        });

        // Chat history
        context.chatHistory.forEach(msg => {
            totalChars += msg.content.length;
        });

        // User request
        totalChars += context.userRequest.length;

        // System rules
        totalChars += context.systemRules.reduce((sum, rule) => sum + rule.length, 0);

        return TOKEN_ESTIMATION.estimateTokens(String(totalChars));
    }

    /**
     * Build the final prompt string from context
     */
    buildPrompt(context: AIContext, taskType?: string): string {
        // Prepare current file content (use summary if available and large)
        const currentFileContent = context.activeFile.summary &&
            context.activeFile.lineCount > CONTEXT_LIMITS.LARGE_FILE_THRESHOLD
            ? `${context.activeFile.summary}\n\n[Full content available but summarized for brevity]`
            : context.activeFile.content;

        // Prepare referenced files
        const referencedFiles = context.referencedFiles.map(file => ({
            name: file.fileName,
            content: file.summary || file.content,
            summary: file.summary,
        }));

        // Build using template
        return CONTEXT_TEMPLATE.buildPrompt({
            currentFile: {
                name: context.activeFile.fileName,
                content: currentFileContent,
            },
            selection: context.selection,
            referencedFiles,
            userRequest: context.userRequest,
            taskType,
        });
    }

    /**
     * Get context summary for debugging/display
     */
    getContextSummary(context: AIContext): string {
        let summary = '=== Context Summary ===\n\n';

        summary += `Active File: ${context.activeFile.fileName}\n`;
        summary += `  Lines: ${context.activeFile.lineCount}\n`;
        summary += `  ${context.activeFile.summary ? 'Summarized' : 'Full content'}\n\n`;

        if (context.selection) {
            summary += `Selection: Lines ${context.selection.startLine}-${context.selection.endLine}\n`;
            summary += `  ${context.selection.text.length} characters\n\n`;
        }

        if (context.referencedFiles.length > 0) {
            summary += `Referenced Files (${context.referencedFiles.length}):\n`;
            context.referencedFiles.forEach((file, i) => {
                summary += `  ${i + 1}. ${file.fileName} (${file.lineCount} lines${file.summary ? ', summarized' : ''})\n`;
            });
            summary += '\n';
        }

        if (context.chatHistory.length > 0) {
            summary += `Chat History: ${context.chatHistory.length} messages\n\n`;
        }

        summary += `Estimated Tokens: ${context.estimatedTokens.toLocaleString()}\n`;
        summary += `Max Tokens: ${CONTEXT_LIMITS.MAX_TOKENS.toLocaleString()}\n`;
        summary += `Usage: ${((context.estimatedTokens / CONTEXT_LIMITS.MAX_TOKENS) * 100).toFixed(1)}%\n`;

        return summary;
    }

    /**
     * Validate assembled context
     */
    validateContext(context: AIContext): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!context.activeFile) {
            errors.push('Active file is required');
        }

        if (!context.userRequest || context.userRequest.trim().length === 0) {
            errors.push('User request is required');
        }

        if (context.estimatedTokens > CONTEXT_LIMITS.MAX_TOKENS * 1.5) {
            errors.push(`Context too large: ${context.estimatedTokens} tokens (max: ${CONTEXT_LIMITS.MAX_TOKENS})`);
        }

        if (context.referencedFiles.length > CONTEXT_LIMITS.MAX_REFERENCED_FILES) {
            errors.push(`Too many referenced files: ${context.referencedFiles.length} (max: ${CONTEXT_LIMITS.MAX_REFERENCED_FILES})`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Create a minimal context (for quick tasks)
     */
    createMinimalContext(
        activeFile: FileContext,
        userRequest: string
    ): AIContext {
        return {
            activeFile,
            referencedFiles: [],
            chatHistory: [],
            userRequest,
            systemRules: [],
            estimatedTokens: TOKEN_ESTIMATION.estimateTokens(
                activeFile.content + userRequest
            ),
        };
    }
}

/**
 * Default export - singleton instance
 */
export const contextAssembler = new ContextAssembler();

/**
 * Helper function to quickly assemble context
 */
export async function quickAssembleContext(params: {
    activeFile: FileContext;
    selection?: SelectionContext;
    referencedFiles?: FileContext[];
    chatHistory?: ChatMessage[];
    userRequest: string;
}): Promise<AIContext> {
    return contextAssembler.assembleContext(params);
}
