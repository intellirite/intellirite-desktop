// System Prompt Builder
// Constructs structured prompts with system rules and task instructions

import {
    SYSTEM_RULES,
    TASK_SPECIFIC_RULES,
    PATCH_TAGS,
    SINGLE_PATCH_TEMPLATE
} from '../config/ai-config';
import { AIContext, AITaskType } from '../types/ai-context';

/**
 * System Prompt Builder
 * Responsible for building structured prompts for AI requests
 */
export class PromptBuilder {
    /**
     * Build a complete system prompt with all components
     */
    buildSystemPrompt(
        context: AIContext,
        taskType?: AITaskType,
        customInstructions?: string[]
    ): string {
        // Detect if this is a conversational query or an edit request
        const isConversational = this.isConversationalRequest(context.userRequest);
        
        if (isConversational) {
            return this.buildConversationalPrompt(context);
        }
        
        // Otherwise, build edit-focused prompt
        let prompt = '';

        // Add system identity
        prompt += this.buildSystemIdentity();
        prompt += '\n\n';

        // Add current file section
        prompt += this.buildCurrentFileSection(context);
        prompt += '\n\n';

        // Add selection section (if exists)
        if (context.selection) {
            prompt += this.buildSelectionSection(context);
            prompt += '\n\n';
        }

        // Add referenced files section (if any)
        if (context.referencedFiles.length > 0) {
            prompt += this.buildReferencedFilesSection(context);
            prompt += '\n\n';
        }

        // Add system rules
        prompt += this.buildSystemRules(taskType, customInstructions);
        prompt += '\n\n';

        // Add output format instructions
        prompt += this.buildOutputFormat();
        prompt += '\n\n';

        // Add user request
        prompt += this.buildUserRequest(context);

        return prompt;
    }
    
    /**
     * Check if the user request is conversational (asking questions)
     * vs. requesting an edit
     */
    private isConversationalRequest(userRequest: string): boolean {
        const lower = userRequest.toLowerCase();
        
        // Edit keywords
        const editKeywords = [
            'rewrite', 'replace', 'change', 'fix', 'correct', 'improve',
            'edit', 'modify', 'update', 'delete', 'remove', 'add',
            'insert', 'make it', 'convert to', 'transform'
        ];
        
        // Question keywords
        const questionKeywords = [
            'what', 'why', 'how', 'when', 'where', 'who', 'which',
            'explain', 'describe', 'tell me', 'show me', 'find',
            'search', 'look for', 'can you', 'could you', 'would you',
            'is this', 'are these', 'does this', 'do these',
            'help me understand', 'what does', 'what is'
        ];
        
        // Check for question marks
        if (lower.includes('?')) {
            return true;
        }
        
        // Check for question keywords at the start
        for (const keyword of questionKeywords) {
            if (lower.startsWith(keyword)) {
                return true;
            }
        }
        
        // Check for edit keywords
        for (const keyword of editKeywords) {
            if (lower.includes(keyword)) {
                return false; // It's an edit request
            }
        }
        
        // If no clear indicators, default to conversational
        return true;
    }
    
    /**
     * Build a conversational prompt (like Cursor IDE)
     */
    private buildConversationalPrompt(context: AIContext): string {
        let prompt = '';
        
        // System identity for conversational mode
        prompt += 'You are Intellirite AI, an intelligent coding assistant built into the Intellirite IDE.\n';
        prompt += 'You help users understand their code, answer questions, and provide helpful explanations.\n';
        prompt += 'You have access to the user\'s current file and can reference other files they mention.\n';
        prompt += '\n';
        prompt += 'Key capabilities:\n';
        prompt += '- Read and understand file contents\n';
        prompt += '- Answer questions about code, structure, and logic\n';
        prompt += '- Provide explanations, suggestions, and guidance\n';
        prompt += '- Reference multiple files when mentioned with @filename\n';
        prompt += '- Be conversational, friendly, and helpful\n';
        prompt += '- Remember recent conversation context to provide coherent responses\n';
        prompt += '\n\n';
        
        // Add conversation history (last 2 turns) for context awareness
        if (context.chatHistory && context.chatHistory.length > 0) {
            prompt += '# RECENT CONVERSATION CONTEXT\n';
            prompt += 'Here is the recent conversation history for context:\n\n';
            
            context.chatHistory.forEach((msg, index) => {
                const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
                prompt += `## ${role}:\n`;
                prompt += `${msg.content}\n\n`;
            });
            
            prompt += '---\n\n';
            prompt += 'Use this conversation history to provide context-aware responses. ';
            prompt += 'Reference previous questions or answers when relevant.\n\n';
        }
        
        // Add current file context
        prompt += `# CURRENT FILE\n`;
        prompt += `File: ${context.activeFile.fileName}\n`;
        prompt += `Path: ${context.activeFile.filePath}\n`;
        prompt += `Lines: ${context.activeFile.lineCount}\n\n`;
        prompt += '```\n';
        prompt += context.activeFile.content;
        prompt += '\n```\n\n';
        
        // Add selection if exists
        if (context.selection) {
            prompt += `# SELECTED TEXT (lines ${context.selection.startLine}-${context.selection.endLine})\n`;
            prompt += '```\n';
            prompt += context.selection.text;
            prompt += '\n```\n\n';
        }
        
        // Add referenced files
        if (context.referencedFiles.length > 0) {
            prompt += '# REFERENCED FILES\n\n';
            context.referencedFiles.forEach((file, index) => {
                prompt += `## ${file.fileName}\n`;
                prompt += '```\n';
                prompt += file.content;
                prompt += '\n```\n\n';
            });
        }
        
        // Add user request
        prompt += `# USER QUESTION\n${context.userRequest}\n\n`;
        
        // Add instructions
        prompt += '# INSTRUCTIONS\n';
        prompt += '- Answer the user\'s question directly and conversationally\n';
        prompt += '- Reference specific parts of the code when relevant\n';
        prompt += '- Use conversation history to provide context-aware responses\n';
        prompt += '- Provide code examples when helpful\n';
        prompt += '- Be concise but thorough\n';
        prompt += '- Use markdown formatting for code blocks\n';
        prompt += '- If you see issues or improvements, mention them\n';
        
        return prompt;
    }

    /**
     * Build system identity section (for edit mode)
     */
    private buildSystemIdentity(): string {
        return 'You are Intellirite AI, an intelligent editing assistant for the Intellirite IDE.\nWhen users request edits, you provide structured patches. When users ask questions, you respond conversationally.';
    }

    /**
     * Build current file section
     */
    private buildCurrentFileSection(context: AIContext): string {
        let section = '';
        
        // Add conversation history (last 2 turns) for context awareness in edit mode too
        if (context.chatHistory && context.chatHistory.length > 0) {
            section += '# RECENT CONVERSATION CONTEXT\n';
            section += 'Recent conversation history for context:\n\n';
            
            context.chatHistory.forEach((msg) => {
                const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
                section += `${role}: ${msg.content}\n\n`;
            });
            
            section += '---\n\n';
        }
        
        section += `# CURRENT FILE (${context.activeFile.fileName})\n`;

        // Use summary if available and file is large
        if (context.activeFile.summary && context.activeFile.lineCount > 500) {
            section += '## File Summary\n';
            section += context.activeFile.summary;
            section += '\n\n## Note\n';
            section += 'Full content available but summarized for brevity. Focus on the selection or referenced sections.\n';
        } else {
            section += context.activeFile.content;
        }

        return section;
    }

    /**
     * Build selection section
     */
    private buildSelectionSection(context: AIContext): string {
        const selection = context.selection!;
        let section = `# USER SELECTION (lines ${selection.startLine}-${selection.endLine})\n`;
        section += '```\n';
        section += selection.text;
        section += '\n```';
        return section;
    }

    /**
     * Build referenced files section
     */
    private buildReferencedFilesSection(context: AIContext): string {
        let section = '# REFERENCED FILES\n\n';

        context.referencedFiles.forEach((file, index) => {
            section += `## ${index + 1}. ${file.fileName}`;

            if (file.summary) {
                section += ' (summarized)\n\n';
                section += file.summary;
            } else {
                section += '\n\n';
                section += '```\n';
                section += file.content;
                section += '\n```';
            }

            section += '\n\n';
        });

        return section.trim();
    }

    /**
     * Build system rules section
     */
    private buildSystemRules(
        taskType?: AITaskType,
        customInstructions?: string[]
    ): string {
        let section = '# SYSTEM RULES\n\n';

        // Add core system rules
        SYSTEM_RULES.forEach(rule => {
            section += `- ${rule}\n`;
        });

        // Add task-specific rules if task type is provided
        if (taskType && taskType in TASK_SPECIFIC_RULES) {
            section += '\n## Additional Rules for This Task\n\n';
            const taskRules = TASK_SPECIFIC_RULES[taskType as keyof typeof TASK_SPECIFIC_RULES];
            taskRules.forEach(rule => {
                section += `- ${rule}\n`;
            });
        }

        // Add custom instructions if provided
        if (customInstructions && customInstructions.length > 0) {
            section += '\n## Custom Instructions\n\n';
            customInstructions.forEach(instruction => {
                section += `- ${instruction}\n`;
            });
        }

        return section;
    }

    /**
     * Build output format section
     */
    private buildOutputFormat(): string {
        let section = '# OUTPUT FORMAT\n\n';
        section += 'You MUST respond ONLY with a JSON patch wrapped in XML tags. Do not include any explanatory text, prose, or comments.\n\n';
        section += `For single file edits, use:\n${PATCH_TAGS.SINGLE_PATCH_OPEN}...${PATCH_TAGS.SINGLE_PATCH_CLOSE}\n\n`;
        section += `For multiple file edits, use:\n${PATCH_TAGS.MULTI_PATCH_OPEN}...${PATCH_TAGS.MULTI_PATCH_CLOSE}\n\n`;
        section += '## Example Format\n\n';
        section += '```\n';
        section += SINGLE_PATCH_TEMPLATE;
        section += '\n```\n\n';
        section += '## Patch Types\n\n';
        section += '- **insert**: Add content at a specific line\n';
        section += '  - Required: `file`, `type: "insert"`, `line`, `content`\n';
        section += '- **replace**: Replace a line range with new content\n';
        section += '  - Required: `file`, `type: "replace"`, `target: {startLine, endLine}`, `replacement`\n';
        section += '- **delete**: Remove a line range\n';
        section += '  - Required: `file`, `type: "delete"`, `target: {startLine, endLine}`\n';

        return section;
    }

    /**
     * Build user request section
     */
    private buildUserRequest(context: AIContext): string {
        return `# USER REQUEST\n\n${context.userRequest}`;
    }

    /**
     * Build a quick prompt for simple tasks (no full context)
     */
    buildQuickPrompt(
        fileContent: string,
        fileName: string,
        userRequest: string,
        selection?: { text: string; startLine: number; endLine: number }
    ): string {
        let prompt = this.buildSystemIdentity();
        prompt += '\n\n';

        prompt += `# FILE: ${fileName}\n`;
        prompt += fileContent;
        prompt += '\n\n';

        if (selection) {
            prompt += `# SELECTION (lines ${selection.startLine}-${selection.endLine})\n`;
            prompt += selection.text;
            prompt += '\n\n';
        }

        prompt += '# RULES\n';
        prompt += '- Return ONLY a JSON patch in XML tags\n';
        prompt += '- No explanations or prose\n';
        prompt += '- Use the exact patch format specified\n';
        prompt += '\n\n';

        prompt += this.buildOutputFormat();
        prompt += '\n\n';

        prompt += `# REQUEST\n${userRequest}`;

        return prompt;
    }

    /**
     * Build a prompt for a specific task type
     */
    buildTaskPrompt(
        context: AIContext,
        taskType: AITaskType,
        additionalInstructions?: string
    ): string {
        const taskInstruction = this.getTaskInstruction(taskType);
        const userRequest = additionalInstructions
            ? `${taskInstruction}\n\n${additionalInstructions}`
            : taskInstruction;

        return this.buildSystemPrompt(
            { ...context, userRequest },
            taskType
        );
    }

    /**
     * Get instruction text for common task types
     */
    private getTaskInstruction(taskType: AITaskType): string {
        const instructions: Record<AITaskType, string> = {
            'rewrite': 'Rewrite the selected text to improve clarity and coherence.',
            'insert': 'Insert additional content at the specified location.',
            'replace': 'Replace the selected content with improved text.',
            'delete': 'Remove the selected content.',
            'explain': 'This is a read-only request. Explain the selected content in plain text.',
            'summarize': 'This is a read-only request. Summarize the content in plain text.',
            'improve': 'Improve the selected text for better readability and impact.',
            'fix-grammar': 'Fix all grammatical errors in the selected text.',
            'make-academic': 'Rewrite the selected text in a formal, academic style.',
            'expand': 'Expand the selected text with additional details and examples.',
            'custom': 'Follow the custom instructions provided.',
        };

        return instructions[taskType] || instructions['custom'];
    }

    /**
     * Extract task type from user request (simple heuristic)
     */
    detectTaskType(userRequest: string): AITaskType {
        const lower = userRequest.toLowerCase();

        if (lower.includes('grammar') || lower.includes('fix')) {
            return 'fix-grammar';
        }
        if (lower.includes('academic') || lower.includes('formal')) {
            return 'make-academic';
        }
        if (lower.includes('improve') || lower.includes('better')) {
            return 'improve';
        }
        if (lower.includes('expand') || lower.includes('add more')) {
            return 'expand';
        }
        if (lower.includes('rewrite')) {
            return 'rewrite';
        }
        if (lower.includes('explain')) {
            return 'explain';
        }
        if (lower.includes('summarize') || lower.includes('summary')) {
            return 'summarize';
        }

        return 'custom';
    }
}

/**
 * Default export - singleton instance
 */
export const promptBuilder = new PromptBuilder();

/**
 * Helper function to quickly build a prompt
 */
export function buildPrompt(
    context: AIContext,
    taskType?: AITaskType
): string {
    return promptBuilder.buildSystemPrompt(context, taskType);
}
