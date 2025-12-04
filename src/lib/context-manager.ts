// Context Manager - Core context gathering for AI operations
// Extracts current file, selection, and cursor contexts

import { FileContext, SelectionContext } from '../types/ai-context';
import { countLines, getFileExtension, normalizeLineEndings } from '../utils/file-utils';

/**
 * Context Manager
 * Responsible for gathering context about the current editor state
 */
export class ContextManager {
    /**
     * Get context for the currently active file
     * @param filePath - Full path to the file
     * @param fileName - Name of the file
     * @param content - Full file content
     * @param summary - Optional pre-generated summary
     * @returns FileContext object
     */
    getCurrentFileContext(
        filePath: string,
        fileName: string,
        content: string,
        summary?: string
    ): FileContext {
        // Normalize line endings
        const normalizedContent = normalizeLineEndings(content);

        return {
            filePath,
            fileName,
            content: normalizedContent,
            summary,
            lineCount: countLines(normalizedContent),
            isActive: true,
            extension: getFileExtension(fileName),
        };
    }

    /**
     * Get context for a referenced file (not currently active)
     * @param filePath - Full path to the file
     * @param fileName - Name of the file
     * @param content - Full file content
     * @param summary - Optional pre-generated summary
     * @returns FileContext object
     */
    getReferencedFileContext(
        filePath: string,
        fileName: string,
        content: string,
        summary?: string
    ): FileContext {
        const normalizedContent = normalizeLineEndings(content);

        return {
            filePath,
            fileName,
            content: normalizedContent,
            summary,
            lineCount: countLines(normalizedContent),
            isActive: false,
            extension: getFileExtension(fileName),
        };
    }

    /**
     * Get selection context from editor selection
     * @param selectedText - The selected text
     * @param startLine - Starting line (1-indexed)
     * @param endLine - Ending line (1-indexed)
     * @param startOffset - Character offset from start
     * @param endOffset - Character offset from end
     * @param startColumn - Starting column (0-indexed)
     * @param endColumn - Ending column (0-indexed)
     * @returns SelectionContext object
     */
    getSelectionContext(
        selectedText: string,
        startLine: number,
        endLine: number,
        startOffset: number,
        endOffset: number,
        startColumn: number = 0,
        endColumn: number = 0
    ): SelectionContext {
        return {
            text: selectedText,
            startLine,
            endLine,
            startOffset,
            endOffset,
            startColumn,
            endColumn,
        };
    }

    /**
     * Get selection context from editor with automatic offset calculation
     * This is a convenience method that calculates offsets from the content
     */
    getSelectionContextFromContent(
        content: string,
        selectedText: string,
        startLine: number,
        endLine: number
    ): SelectionContext {
        const lines = content.split('\n');

        // Calculate offsets
        let startOffset = 0;
        for (let i = 0; i < startLine - 1; i++) {
            startOffset += lines[i].length + 1; // +1 for newline
        }

        // Find column position (0-indexed)
        const startLineContent = lines[startLine - 1];
        const startColumn = startLineContent.indexOf(selectedText.split('\n')[0]);

        // Calculate end offset
        let endOffset = startOffset;
        for (let i = startLine - 1; i < endLine; i++) {
            endOffset += lines[i].length;
            if (i < endLine - 1) endOffset += 1; // +1 for newline
        }

        // Calculate end column
        const endLineContent = lines[endLine - 1];
        const lastSelectionLine = selectedText.split('\n').pop() || '';
        const endColumn = endLineContent.indexOf(lastSelectionLine) + lastSelectionLine.length;

        return {
            text: selectedText,
            startLine,
            endLine,
            startOffset,
            endOffset,
            startColumn: Math.max(0, startColumn),
            endColumn: Math.max(0, endColumn),
        };
    }

    /**
     * Get cursor position context
     * Useful for insert operations where there's no selection
     */
    getCursorContext(
        content: string,
        cursorLine: number,
        cursorColumn: number = 0
    ): {
        line: number;
        column: number;
        offset: number;
        currentLineContent: string;
        surroundingLines: {
            before: string[];
            current: string;
            after: string[];
        };
    } {
        const lines = content.split('\n');

        // Calculate offset
        let offset = 0;
        for (let i = 0; i < cursorLine - 1; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        offset += cursorColumn;

        // Get current line
        const currentLineContent = lines[cursorLine - 1] || '';

        // Get surrounding lines (3 before, 3 after)
        const surroundingLineCount = 3;
        const before = lines.slice(
            Math.max(0, cursorLine - 1 - surroundingLineCount),
            cursorLine - 1
        );
        const after = lines.slice(
            cursorLine,
            Math.min(lines.length, cursorLine + surroundingLineCount)
        );

        return {
            line: cursorLine,
            column: cursorColumn,
            offset,
            currentLineContent,
            surroundingLines: {
                before,
                current: currentLineContent,
                after,
            },
        };
    }

    /**
     * Extract context window around a selection
     * Returns content with surrounding lines for better AI understanding
     */
    getContextWindow(
        content: string,
        startLine: number,
        endLine: number,
        windowSize: number = 50
    ): {
        content: string;
        actualStartLine: number;
        actualEndLine: number;
        selectionStartLine: number;
        selectionEndLine: number;
    } {
        const lines = content.split('\n');
        const totalLines = lines.length;

        // Calculate window bounds
        const actualStartLine = Math.max(1, startLine - windowSize);
        const actualEndLine = Math.min(totalLines, endLine + windowSize);

        // Extract content
        const windowContent = lines.slice(actualStartLine - 1, actualEndLine).join('\n');

        // Calculate selection position within window
        const selectionStartLine = startLine - actualStartLine + 1;
        const selectionEndLine = endLine - actualStartLine + 1;

        return {
            content: windowContent,
            actualStartLine,
            actualEndLine,
            selectionStartLine,
            selectionEndLine,
        };
    }

    /**
     * Validate that a file context has all required fields
     */
    validateFileContext(context: FileContext): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!context.filePath) {
            errors.push('File path is required');
        }

        if (!context.fileName) {
            errors.push('File name is required');
        }

        if (context.content === undefined || context.content === null) {
            errors.push('File content is required');
        }

        if (context.lineCount < 0) {
            errors.push('Line count must be non-negative');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate that a selection context is valid
     */
    validateSelectionContext(
        selection: SelectionContext,
        fileContent: string
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const lineCount = countLines(fileContent);

        if (selection.startLine < 1) {
            errors.push('Start line must be >= 1');
        }

        if (selection.endLine < selection.startLine) {
            errors.push('End line must be >= start line');
        }

        if (selection.endLine > lineCount) {
            errors.push(`End line ${selection.endLine} exceeds file length (${lineCount} lines)`);
        }

        if (selection.startOffset < 0 || selection.endOffset < 0) {
            errors.push('Offsets must be non-negative');
        }

        if (selection.endOffset < selection.startOffset) {
            errors.push('End offset must be >= start offset');
        }

        if (selection.endOffset > fileContent.length) {
            errors.push('End offset exceeds file length');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Create a structured context summary for debugging/logging
     */
    createContextSummary(
        fileContext: FileContext,
        selection?: SelectionContext
    ): string {
        let summary = `File: ${fileContext.fileName}\n`;
        summary += `Path: ${fileContext.filePath}\n`;
        summary += `Lines: ${fileContext.lineCount}\n`;
        summary += `Extension: ${fileContext.extension || 'none'}\n`;

        if (selection) {
            summary += `\nSelection:\n`;
            summary += `  Lines: ${selection.startLine}-${selection.endLine}\n`;
            summary += `  Length: ${selection.text.length} characters\n`;
            summary += `  Preview: ${selection.text.substring(0, 50)}${selection.text.length > 50 ? '...' : ''}\n`;
        }

        return summary;
    }
}

/**
 * Default export - singleton instance
 */
export const contextManager = new ContextManager();
