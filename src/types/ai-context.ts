// AI Context Types for Intellirite
// These types define the structure for AI-powered file editing and context management

/**
 * Represents the context of a single file
 */
export interface FileContext {
    /** Full file path */
    filePath: string;
    /** File name with extension */
    fileName: string;
    /** Full content of the file */
    content: string;
    /** Summary of the file content (for large files) */
    summary?: string;
    /** Total number of lines in the file */
    lineCount: number;
    /** Whether this is the currently active/open file */
    isActive: boolean;
    /** File extension (without dot) */
    extension?: string;
}

/**
 * Represents a text selection or cursor position in a file
 */
export interface SelectionContext {
    /** Selected text content */
    text: string;
    /** Starting line number (1-indexed) */
    startLine: number;
    /** Ending line number (1-indexed) */
    endLine: number;
    /** Character offset from start of document */
    startOffset: number;
    /** Character offset from start of document */
    endOffset: number;
    /** Column position for start (0-indexed) */
    startColumn: number;
    /** Column position for end (0-indexed) */
    endColumn: number;
}

/**
 * Chat message for AI context
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    /** Optional metadata like tokens used, model, etc */
    metadata?: Record<string, any>;
}

/**
 * File reference parsed from user input (e.g., #chapter1.md)
 */
export interface FileReference {
    /** Original reference string (e.g., "#chapter1.md") */
    original: string;
    /** Resolved file path */
    filePath: string;
    /** File name */
    fileName: string;
    /** Whether the file exists */
    exists: boolean;
}

/**
 * Complete context assembled for AI request
 */
export interface AIContext {
    /** Currently active file */
    activeFile: FileContext;
    /** Current selection (if any) */
    selection?: SelectionContext;
    /** Additional referenced files */
    referencedFiles: FileContext[];
    /** Recent chat messages for conversation memory */
    chatHistory: ChatMessage[];
    /** User's current request/instruction */
    userRequest: string;
    /** System instructions/rules */
    systemRules: string[];
    /** Total estimated token count */
    estimatedTokens: number;
}

// ============================================================================
// PATCH OPERATION TYPES
// ============================================================================

/**
 * Type of patch operation
 */
export type PatchOperationType = 'insert' | 'replace' | 'delete';

/**
 * Target range for a patch operation
 */
export interface PatchTarget {
    /** Starting line number (1-indexed) */
    startLine: number;
    /** Ending line number (1-indexed) */
    endLine: number;
}

/**
 * Single patch operation to be applied to a file
 */
export interface PatchOperation {
    /** File to apply the patch to */
    file: string;
    /** Type of operation */
    type: PatchOperationType;
    /** Target range (for replace and delete) */
    target?: PatchTarget;
    /** Line number (for insert) */
    line?: number;
    /** New content to insert or replace with */
    content?: string;
    /** Replacement content (for replace operations) */
    replacement?: string;
}

/**
 * Single patch payload (matches AI response format)
 */
export interface PatchPayload {
    file: string;
    type: PatchOperationType;
    target?: {
        startLine: number;
        endLine: number;
    };
    line?: number;
    content?: string;
    replacement?: string;
}

/**
 * Multiple patches from AI response
 */
export type MultiPatchPayload = PatchPayload[];

/**
 * Parsed and validated patch ready for application
 */
export interface ValidatedPatch extends PatchOperation {
    /** Whether this patch passed validation */
    isValid: boolean;
    /** Validation errors (if any) */
    errors: string[];
    /** The actual content that will be changed */
    originalContent?: string;
    /** Size of change in characters */
    changeSize: number;
    /** Percentage of file being changed (0-100) */
    changePercentage: number;
}

/**
 * Result of applying a patch
 */
export interface PatchResult {
    /** Whether the patch was successfully applied */
    success: boolean;
    /** Error message if failed */
    error?: string;
    /** The file that was modified */
    filePath: string;
    /** Number of lines affected */
    linesAffected: number;
    /** New content after patch */
    newContent?: string;
    /** Whether user approval was required */
    requiredApproval: boolean;
}

/**
 * Diff information for preview
 */
export interface DiffInfo {
    /** File path */
    filePath: string;
    /** Original content */
    before: string;
    /** New content after patch */
    after: string;
    /** Line-by-line diff array */
    diff: DiffLine[];
    /** Summary statistics */
    stats: {
        additions: number;
        deletions: number;
        modifications: number;
    };
}

/**
 * Single line in a diff
 */
export interface DiffLine {
    /** Line number in original file */
    lineNumber: number;
    /** Type of change */
    type: 'added' | 'removed' | 'unchanged' | 'modified';
    /** Line content */
    content: string;
    /** Corresponding line number in new file (for unchanged/modified) */
    newLineNumber?: number;
}

// ============================================================================
// CONTEXT BUILDING TYPES
// ============================================================================

/**
 * Options for context assembly
 */
export interface ContextOptions {
    /** Maximum tokens to include in context */
    maxTokens?: number;
    /** Maximum number of referenced files to include */
    maxFiles?: number;
    /** Number of chat messages to include */
    chatHistoryCount?: number;
    /** Whether to summarize large files */
    summarizeLargeFiles?: boolean;
    /** Threshold for considering a file "large" (in lines) */
    largeFileThreshold?: number;
    /** Number of lines of context around selection */
    contextWindowLines?: number;
}

/**
 * Task type for AI operations
 */
export type AITaskType =
    | 'rewrite'
    | 'insert'
    | 'replace'
    | 'delete'
    | 'explain'
    | 'summarize'
    | 'improve'
    | 'fix-grammar'
    | 'make-academic'
    | 'expand'
    | 'custom';

/**
 * AI task configuration
 */
export interface AITask {
    /** Type of task */
    type: AITaskType;
    /** Task description/instruction */
    instruction: string;
    /** Target selection (if specific) */
    targetSelection?: SelectionContext;
    /** Additional parameters */
    params?: Record<string, any>;
}

/**
 * Model selection and configuration
 */
export interface ModelConfig {
    /** Model ID to use */
    modelId: string;
    /** Model name for display */
    modelName: string;
    /** Whether model was auto-selected */
    autoSelected: boolean;
    /** Reason for model selection */
    selectionReason?: string;
    /** Estimated cost tier (1-4) */
    costTier: number;
}

/**
 * Safety check result
 */
export interface SafetyCheck {
    /** Whether the operation is considered safe */
    isSafe: boolean;
    /** Risk level (low, medium, high, critical) */
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    /** Reasons for risk assessment */
    reasons: string[];
    /** Whether user approval is required */
    requiresApproval: boolean;
    /** Recommended action */
    recommendation?: string;
}
