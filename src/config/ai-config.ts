// AI Configuration for Intellirite
// Centralized configuration for AI models, context limits, and safety thresholds

import { GeminiModel } from '../renderer/services/gemini';

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

/**
 * Gemini model types and their characteristics
 */
export const MODELS = {
    FLASH: 'gemini-2.5-flash' as GeminiModel,
    PRO: 'gemini-2.5-pro' as GeminiModel,
    FLASH_2_0: 'gemini-2.0-flash' as GeminiModel,
    FLASH_EXP: 'gemini-2.0-flash-exp' as GeminiModel,
} as const;

/**
 * Model characteristics for selection logic
 */
export const MODEL_CHARACTERISTICS = {
    [MODELS.FLASH]: {
        costTier: 1,
        speed: 'fast',
        capabilities: 'standard',
        maxTokens: 1000000,
        recommendedFor: ['quick-edits', 'grammar', 'simple-rewrites'],
    },
    [MODELS.PRO]: {
        costTier: 4,
        speed: 'slower',
        capabilities: 'advanced',
        maxTokens: 2000000,
        recommendedFor: ['complex-writing', 'multi-file', 'academic', 'long-form'],
    },
    [MODELS.FLASH_2_0]: {
        costTier: 1,
        speed: 'fast',
        capabilities: 'standard',
        maxTokens: 1000000,
        recommendedFor: ['quick-edits', 'grammar'],
    },
    [MODELS.FLASH_EXP]: {
        costTier: 2,
        speed: 'medium',
        capabilities: 'experimental',
        maxTokens: 1000000,
        recommendedFor: ['testing', 'experimental-features'],
    },
} as const;

// ============================================================================
// CONTEXT SIZE LIMITS
// ============================================================================

/**
 * Maximum context sizes and limits
 */
export const CONTEXT_LIMITS = {
    /** Maximum tokens to send in a single request (with buffer) */
    MAX_TOKENS: 900000,

    /** Maximum number of referenced files to include */
    MAX_REFERENCED_FILES: 10,

    /** Maximum number of chat messages to include in history */
    MAX_CHAT_HISTORY: 6,

    /** Threshold for considering a file "large" (in lines) */
    LARGE_FILE_THRESHOLD: 500,

    /** Number of lines to include around selection for context */
    CONTEXT_WINDOW_LINES: 200,

    /** Maximum file size to process (in characters) */
    MAX_FILE_SIZE: 500000,

    /** Maximum length for file summary (in characters) */
    MAX_SUMMARY_LENGTH: 500,
} as const;

/**
 * Token estimation (rough approximation: 1 token ≈ 4 characters)
 */
export const TOKEN_ESTIMATION = {
    CHARS_PER_TOKEN: 4,

    /** Estimate tokens from character count */
    estimateTokens: (text: string): number => {
        return Math.ceil(text.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
    },

    /** Estimate tokens from multiple texts */
    estimateMultiple: (texts: string[]): number => {
        const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
        return Math.ceil(totalChars / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
    },
} as const;

// ============================================================================
// PATCH FORMAT TEMPLATES
// ============================================================================

/**
 * XML tags for patch format
 */
export const PATCH_TAGS = {
    SINGLE_PATCH_OPEN: '<patch>',
    SINGLE_PATCH_CLOSE: '</patch>',
    MULTI_PATCH_OPEN: '<patches>',
    MULTI_PATCH_CLOSE: '</patches>',
} as const;

/**
 * Template for single patch response
 */
export const SINGLE_PATCH_TEMPLATE = `${PATCH_TAGS.SINGLE_PATCH_OPEN}
{
  "file": "filename.md",
  "type": "replace",
  "target": {
    "startLine": 45,
    "endLine": 63
  },
  "replacement": "New content here..."
}
${PATCH_TAGS.SINGLE_PATCH_CLOSE}`;

/**
 * Template for multiple patches response
 */
export const MULTI_PATCH_TEMPLATE = `${PATCH_TAGS.MULTI_PATCH_OPEN}
[
  {
    "file": "chapter2.md",
    "type": "replace",
    "target": { "startLine": 45, "endLine": 63 },
    "replacement": "Updated content..."
  },
  {
    "file": "chapter1.md",
    "type": "insert",
    "line": 120,
    "content": "Inserted paragraph..."
  }
]
${PATCH_TAGS.MULTI_PATCH_CLOSE}`;

// ============================================================================
// SAFETY THRESHOLDS
// ============================================================================

/**
 * Safety thresholds for change validation
 */
export const SAFETY_THRESHOLDS = {
    /** Maximum percentage of file that can be changed without approval (0-100) */
    MAX_AUTO_CHANGE_PERCENTAGE: 30,

    /** Maximum number of lines that can be changed without approval */
    MAX_AUTO_CHANGE_LINES: 100,

    /** Minimum file size (lines) to enforce safety checks */
    MIN_FILE_SIZE_FOR_CHECKS: 10,

    /** Maximum number of files that can be changed without approval */
    MAX_AUTO_MULTI_FILE_CHANGES: 3,

    /** Risk levels based on change percentage */
    RISK_LEVELS: {
        LOW: 0.2,      // < 20% change
        MEDIUM: 0.5,   // 20-50% change
        HIGH: 0.8,     // 50-80% change
        CRITICAL: 0.8, // > 80% change
    },
} as const;

// ============================================================================
// SYSTEM RULES
// ============================================================================

/**
 * Core system rules for AI instruction
 */
export const SYSTEM_RULES = [
    'You are an AI writing engine for the Intellirite IDE.',
    'You will return ONLY JSON patches wrapped in XML tags, no prose or explanations.',
    'Do not rewrite entire documents unless explicitly requested.',
    'Maintain the existing structure and formatting style.',
    'Do not hallucinate citations, references, or facts.',
    'Use the exact patch format specified in the instructions.',
    'Preserve markdown formatting and heading structure.',
    'Maintain consistent voice and tone with the existing content.',
    'Only modify the specific content requested by the user.',
    'If unclear about the request, ask for clarification instead of guessing.',
] as const;

/**
 * Additional rules for specific task types
 */
export const TASK_SPECIFIC_RULES = {
    academic: [
        'Use formal, academic language and tone.',
        'Include proper citations and references where appropriate.',
        'Follow academic writing conventions.',
        'Use precise terminology and avoid colloquialisms.',
    ],
    grammar: [
        'Fix grammatical errors while preserving meaning.',
        'Maintain the original voice and style.',
        'Correct punctuation and spelling.',
        'Do not change the structure unless necessary for clarity.',
    ],
    improve: [
        'Enhance clarity and readability.',
        'Improve word choice and sentence structure.',
        'Maintain the original meaning and intent.',
        'Keep the same overall length unless expansion is needed.',
    ],
    expand: [
        'Add relevant details and examples.',
        'Maintain coherence with surrounding content.',
        'Match the existing writing style.',
        'Expand on the core ideas without deviating.',
    ],
} as const;

// ============================================================================
// MODEL SELECTION LOGIC
// ============================================================================

/**
 * Determine which model to use based on context
 */
export const MODEL_SELECTION = {
    /**
     * Auto-select model based on context characteristics
     */
    autoSelect: (params: {
        estimatedTokens: number;
        numReferencedFiles: number;
        taskType?: string;
        userPreference?: GeminiModel;
    }): GeminiModel => {
        // User preference takes priority
        if (params.userPreference) {
            return params.userPreference;
        }

        // Use Pro for complex scenarios
        const shouldUsePro = (
            params.estimatedTokens > 100000 ||
            params.numReferencedFiles > 3 ||
            params.taskType === 'academic' ||
            params.taskType === 'complex-writing'
        );

        return shouldUsePro ? MODELS.PRO : MODELS.FLASH;
    },

    /**
     * Get selection reason for transparency
     */
    getSelectionReason: (model: GeminiModel, params: {
        estimatedTokens: number;
        numReferencedFiles: number;
    }): string => {
        if (model === MODELS.PRO) {
            if (params.estimatedTokens > 100000) {
                return 'Large context size requires Pro model';
            }
            if (params.numReferencedFiles > 3) {
                return 'Multiple file references require Pro model';
            }
            return 'Complex task requires Pro model';
        }
        return 'Quick task suitable for Flash model';
    },
} as const;

// ============================================================================
// CONTEXT ASSEMBLY FORMAT
// ============================================================================

/**
 * Template for context assembly (sent to AI)
 */
export const CONTEXT_TEMPLATE = {
    /**
     * Build the structured prompt for AI
     */
    buildPrompt: (params: {
        currentFile: { name: string; content: string };
        selection?: { text: string; startLine: number; endLine: number };
        referencedFiles?: Array<{ name: string; content: string; summary?: string }>;
        userRequest: string;
        taskType?: string;
    }): string => {
        let prompt = '';

        // Current file
        prompt += `# CURRENT FILE (${params.currentFile.name})\n`;
        prompt += `${params.currentFile.content}\n\n`;

        // Selection (if exists)
        if (params.selection) {
            prompt += `# USER SELECTION (lines ${params.selection.startLine}-${params.selection.endLine})\n`;
            prompt += `${params.selection.text}\n\n`;
        }

        // Referenced files (if any)
        if (params.referencedFiles && params.referencedFiles.length > 0) {
            prompt += `# REFERENCED FILES\n`;
            params.referencedFiles.forEach(file => {
                prompt += `## file: ${file.name}${file.summary ? ' (summary included)' : ' (full)'}\n`;
                prompt += file.summary || file.content;
                prompt += '\n\n';
            });
        }

        // System rules
        prompt += `# SYSTEM RULES\n`;
        SYSTEM_RULES.forEach(rule => {
            prompt += `- ${rule}\n`;
        });

        // Task-specific rules
        if (params.taskType && params.taskType in TASK_SPECIFIC_RULES) {
            prompt += '\n# ADDITIONAL RULES FOR THIS TASK\n';
            const taskRules = TASK_SPECIFIC_RULES[params.taskType as keyof typeof TASK_SPECIFIC_RULES];
            taskRules.forEach(rule => {
                prompt += `- ${rule}\n`;
            });
        }

        // Output format
        prompt += `\n# OUTPUT FORMAT\n`;
        prompt += `You MUST respond ONLY with a JSON patch wrapped in XML tags.\n`;
        prompt += `Use ${PATCH_TAGS.SINGLE_PATCH_OPEN}...${PATCH_TAGS.SINGLE_PATCH_CLOSE} for single file edits.\n`;
        prompt += `Use ${PATCH_TAGS.MULTI_PATCH_OPEN}...${PATCH_TAGS.MULTI_PATCH_CLOSE} for multiple file edits.\n\n`;
        prompt += `Example format:\n${SINGLE_PATCH_TEMPLATE}\n\n`;

        // User request
        prompt += `# USER REQUEST\n`;
        prompt += `${params.userRequest}\n`;

        return prompt;
    },
} as const;

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default configuration options
 */
export const DEFAULT_OPTIONS = {
    maxTokens: CONTEXT_LIMITS.MAX_TOKENS,
    maxFiles: CONTEXT_LIMITS.MAX_REFERENCED_FILES,
    chatHistoryCount: CONTEXT_LIMITS.MAX_CHAT_HISTORY,
    summarizeLargeFiles: true,
    largeFileThreshold: CONTEXT_LIMITS.LARGE_FILE_THRESHOLD,
    contextWindowLines: CONTEXT_LIMITS.CONTEXT_WINDOW_LINES,
} as const;
