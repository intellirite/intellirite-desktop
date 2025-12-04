// AI-Aware Chat Hook
// Connects chat to the AI engine with context awareness

import { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { editorBridge, type EditorContext } from '../../lib/editor-bridge';
import { contextAssembler } from '../../lib/context-assembler';
import { promptBuilder } from '../../lib/prompt-builder';
import { aiClient } from '../../lib/ai-client';
import { responseValidator } from '../../lib/response-validator';
import { patchParser } from '../../lib/patch-parser';
import { patchValidator } from '../../lib/patch-validator';
import { patchProcessor } from '../../lib/patch-processor';
import { contextManager } from '../../lib/context-manager';
import type { FileContext, ChatMessage as AIChatMessage } from '../../types/ai-context';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        filesReferenced?: string[];
        hasPatches?: boolean;
        model?: string;
    };
}

export interface AIMessageOptions {
    editor?: Editor;
    currentFilePath?: string;
    currentFileName?: string;
    cursorInfo?: { line: number; column: number };
    workspacePath?: string; // For resolving @file references
}

/**
 * Hook for AI-aware chat functionality
 */
export function useAIChat() {
    const [isProcessing, setIsProcessing] = useState(false);

    /**
     * Extract file references from user message
     * Supports @filename.md syntax (like Cursor)
     */
    const extractFileReferences = useCallback((message: string): string[] => {
        const regex = /@([\w-]+\.[\w]+)/g;
        const matches = message.matchAll(regex);
        return Array.from(matches, m => m[1]);
    }, []);

    /**
   * Load file content with smart chunking
   * Returns first 60 lines to avoid sending huge files
   */
    const loadFileContent = useCallback(async (fileName: string, workspacePath?: string): Promise<string | null> => {
        try {
            // Build file path
            let filePath = fileName;
            if (workspacePath && !fileName.startsWith('/')) {
                filePath = `${workspacePath}/${fileName}`;
            }

            // Load file via Electron
            const content = await (window as any).fileSystem?.readFile(filePath);

            if (!content) {
                console.warn('File not found or empty:', fileName);
                return null;
            }

            // Smart chunking: Get first 60 lines
            const lines = content.split('\n');
            const CHUNK_SIZE = 60;

            if (lines.length <= CHUNK_SIZE) {
                // Small file, send all
                return content;
            }

            // Large file, send chunk with summary
            const chunk = lines.slice(0, CHUNK_SIZE).join('\n');
            const totalLines = lines.length;

            const summary = `\n\n[... ${totalLines - CHUNK_SIZE} more lines (${totalLines} total). Showing first ${CHUNK_SIZE} lines]`;

            console.log(`📄 Loaded ${fileName}: ${totalLines} lines (showing first ${CHUNK_SIZE})`);

            return chunk + summary;
        } catch (error: any) {
            console.error('Error loading file:', fileName, error);
            return null;
        }
    }, []);

    /**
     * Send AI-aware message with context
     */
    const sendAIMessage = useCallback(async function* (
        userMessage: string,
        chatHistory: ChatMessage[],
        options: AIMessageOptions
    ): AsyncGenerator<string, void, unknown> {
        setIsProcessing(true);

        try {
            const { editor, currentFilePath, currentFileName, cursorInfo } = options;

            // 1. Extract context from editor if available
            let editorContext: EditorContext | undefined;
            let activeFile: FileContext | undefined;

            if (editor && currentFileName) {
                editorContext = editorBridge.extractContext(editor, cursorInfo);

                activeFile = contextManager.getCurrentFileContext(
                    currentFilePath || currentFileName,
                    currentFileName,
                    editorContext.content
                );

                // Add selection if exists
                if (editorContext.selection) {
                    activeFile.summary = `Selected text from lines ${editorContext.selection.startLine}-${editorContext.selection.endLine}`;
                }
                
                console.log('📝 Current file context:', {
                    file: currentFileName,
                    lines: editorContext.content.split('\n').length,
                    hasSelection: !!editorContext.selection
                });
            }

            // 2. Extract file references from message
            const fileRefs = extractFileReferences(userMessage);
            const referencedFiles: FileContext[] = [];

            // Try to load referenced files
            for (const fileName of fileRefs) {
                const content = await loadFileContent(fileName, options.workspacePath);
                if (content) {
                    const fileContext = contextManager.getReferencedFileContext(
                        fileName,
                        fileName,
                        content
                    );
                    referencedFiles.push(fileContext);
                    console.log(`📄 Loaded referenced file: @${fileName}`);
                } else {
                    console.warn(`⚠️ Could not load @${fileName}`);
                }
            }

            // 3. Build context-aware prompt
            let finalPrompt = userMessage;

            if (activeFile) {
                // Convert chat history to AI format
                const aiChatHistory: AIChatMessage[] = chatHistory.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    timestamp: msg.timestamp.getTime(),
                }));

                // Assemble full context
                const context = await contextAssembler.assembleContext({
                    activeFile,
                    selection: editorContext?.selection,
                    referencedFiles,
                    chatHistory: aiChatHistory,
                    userRequest: userMessage,
                });

                // Detect task type and build structured prompt
                const taskType = promptBuilder.detectTaskType(userMessage);
                finalPrompt = promptBuilder.buildSystemPrompt(context, taskType);

                console.log('📊 Context assembled:', {
                    file: activeFile.fileName,
                    lines: activeFile.lineCount,
                    selection: editorContext?.selection?.text?.length || 0,
                    references: referencedFiles.length,
                    tokens: context.estimatedTokens,
                });
            }

            // 4. Stream from AI
            const chatMessages: AIChatMessage[] = chatHistory.map(msg => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: msg.timestamp.getTime(),
            }));

            chatMessages.push({
                id: `${Date.now()}`,
                role: 'user',
                content: userMessage,
                timestamp: Date.now(),
            });

            for await (const chunk of aiClient.streamRequest(
                finalPrompt,
                chatMessages.slice(0, -1) // Don't include the latest user message since it's in the prompt
            )) {
                yield chunk;
            }

        } catch (error: any) {
            console.error('AI processing error:', error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, [extractFileReferences, loadFileContent]);

    /**
     * Apply AI-generated patches to editor
     */
    const applyAIPatches = useCallback(async (
        response: string,
        editor: Editor
    ): Promise<{ success: boolean; message: string }> => {
        try {
            // 1. Validate response
            const validation = responseValidator.validateResponse(response);

            if (!validation.isValid) {
                return {
                    success: false,
                    message: `Invalid response: ${validation.errors.join(', ')}`,
                };
            }

            if (!validation.patches || validation.patches.length === 0) {
                // No patches, just text response
                return { success: true, message: 'No edits to apply' };
            }

            // 2. Parse and enrich patches
            const fileContents = new Map([[
                'current',
                editor.getText(),
            ]]);

            const enrichedPatches = patchParser.parsePatches(
                validation.patches,
                fileContents
            );

            // 3. Safety check
            const validatedPatches = patchValidator.validatePatches(
                enrichedPatches,
                fileContents
            );

            const batchSafety = patchValidator.getBatchSafetyCheck(validatedPatches);

            if (batchSafety.requiresApproval) {
                return {
                    success: false,
                    message: `⚠️ Changes require approval: ${batchSafety.recommendation}`,
                };
            }

            // 4. Apply patches
            const results = await editorBridge.applyPatches(editor, enrichedPatches);

            const successCount = results.filter((r: any) => r.success).length;

            return {
                success: successCount > 0,
                message: `✅ Applied ${successCount} change(s)`,
            };

        } catch (error: any) {
            return {
                success: false,
                message: `Error applying changes: ${error.message}`,
            };
        }
    }, []);

    return {
        sendAIMessage,
        applyAIPatches,
        isProcessing,
        extractFileReferences,
    };
}
