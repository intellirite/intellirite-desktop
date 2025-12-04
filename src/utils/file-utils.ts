// File Utilities for AI Context System
// Helper functions for file parsing, line number conversion, and content validation

// ============================================================================
// LINE NUMBER CONVERSION
// ============================================================================

/**
 * Convert line numbers to character offsets
 * @param content - Full file content
 * @param startLine - Starting line (1-indexed)
 * @param endLine - Ending line (1-indexed)
 * @returns Object with start and end offsets
 */
export function lineNumbersToOffsets(
    content: string,
    startLine: number,
    endLine: number
): { startOffset: number; endOffset: number } {
    const lines = content.split('\n');

    // Validate line numbers
    if (startLine < 1 || endLine < startLine || endLine > lines.length) {
        throw new Error(
            `Invalid line range: ${startLine}-${endLine} (file has ${lines.length} lines)`
        );
    }

    // Calculate start offset (sum of all previous lines + newlines)
    let startOffset = 0;
    for (let i = 0; i < startLine - 1; i++) {
        startOffset += lines[i].length + 1; // +1 for newline
    }

    // Calculate end offset
    let endOffset = startOffset;
    for (let i = startLine - 1; i < endLine; i++) {
        endOffset += lines[i].length + (i < lines.length - 1 ? 1 : 0); // +1 for newline except last line
    }

    return { startOffset, endOffset };
}

/**
 * Convert character offset to line number and column
 * @param content - Full file content
 * @param offset - Character offset
 * @returns Object with line (1-indexed) and column (0-indexed)
 */
export function offsetToLineColumn(
    content: string,
    offset: number
): { line: number; column: number } {
    const lines = content.split('\n');

    let currentOffset = 0;
    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline

        if (currentOffset + lineLength > offset) {
            return {
                line: i + 1, // 1-indexed
                column: offset - currentOffset, // 0-indexed
            };
        }

        currentOffset += lineLength;
    }

    // If offset is beyond content, return last position
    return {
        line: lines.length,
        column: lines[lines.length - 1].length,
    };
}

/**
 * Get line and column from line number
 * @param lineNumber - Line number (1-indexed)
 * @param column - Column position (0-indexed), defaults to 0
 * @returns Object with line and column
 */
export function getLineColumn(lineNumber: number, column: number = 0): { line: number; column: number } {
    return { line: lineNumber, column };
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/**
 * Extract content for a specific line range
 * @param content - Full file content
 * @param startLine - Starting line (1-indexed)
 * @param endLine - Ending line (1-indexed)
 * @returns Extracted text
 */
export function extractLineRange(
    content: string,
    startLine: number,
    endLine: number
): string {
    const lines = content.split('\n');

    // Validate line numbers
    if (startLine < 1 || endLine < startLine || endLine > lines.length) {
        throw new Error(
            `Invalid line range: ${startLine}-${endLine} (file has ${lines.length} lines)`
        );
    }

    return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Extract content around a selection with context window
 * @param content - Full file content
 * @param selection - Selection to extract around
 * @param windowLines - Number of lines before and after to include
 * @returns Object with extracted content and new line numbers
 */
export function extractWithContext(
    content: string,
    selection: { startLine: number; endLine: number },
    windowLines: number = 50
): {
    content: string;
    actualStartLine: number;
    actualEndLine: number;
    selectionStartInContext: number;
    selectionEndInContext: number;
} {
    const lines = content.split('\n');
    const totalLines = lines.length;

    // Calculate context window
    const actualStartLine = Math.max(1, selection.startLine - windowLines);
    const actualEndLine = Math.min(totalLines, selection.endLine + windowLines);

    // Extract content
    const extractedContent = lines.slice(actualStartLine - 1, actualEndLine).join('\n');

    // Calculate selection position within context
    const selectionStartInContext = selection.startLine - actualStartLine + 1;
    const selectionEndInContext = selection.endLine - actualStartLine + 1;

    return {
        content: extractedContent,
        actualStartLine,
        actualEndLine,
        selectionStartInContext,
        selectionEndInContext,
    };
}

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Count total lines in content
 * @param content - File content
 * @returns Number of lines
 */
export function countLines(content: string): number {
    if (!content) return 0;
    return content.split('\n').length;
}

/**
 * Validate that line numbers are within file bounds
 * @param content - File content
 * @param startLine - Starting line (1-indexed)
 * @param endLine - Ending line (1-indexed)
 * @returns Whether the line range is valid
 */
export function validateLineRange(
    content: string,
    startLine: number,
    endLine: number
): { isValid: boolean; error?: string } {
    const lineCount = countLines(content);

    if (startLine < 1) {
        return { isValid: false, error: 'Start line must be >= 1' };
    }

    if (endLine < startLine) {
        return { isValid: false, error: 'End line must be >= start line' };
    }

    if (endLine > lineCount) {
        return {
            isValid: false,
            error: `End line ${endLine} exceeds file length (${lineCount} lines)`,
        };
    }

    return { isValid: true };
}

/**
 * Check if a file is considered "large" based on line count
 * @param content - File content
 * @param threshold - Line count threshold (default: 500)
 * @returns Whether the file is large
 */
export function isLargeFile(content: string, threshold: number = 500): boolean {
    return countLines(content) > threshold;
}

/**
 * Estimate file size in characters
 * @param content - File content
 * @returns Character count
 */
export function getFileSize(content: string): number {
    return content.length;
}

// ============================================================================
// FILE PARSING
// ============================================================================

/**
 * Extract headings from markdown content
 * @param content - Markdown content
 * @returns Array of headings with line numbers
 */
export function extractMarkdownHeadings(content: string): Array<{
    level: number;
    text: string;
    lineNumber: number;
}> {
    const lines = content.split('\n');
    const headings: Array<{ level: number; text: string; lineNumber: number }> = [];

    lines.forEach((line, index) => {
        // Match markdown headings (# to ######)
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            headings.push({
                level: match[1].length,
                text: match[2].trim(),
                lineNumber: index + 1,
            });
        }
    });

    return headings;
}

/**
 * Generate a simple summary of file content based on headings
 * @param content - File content
 * @param maxLength - Maximum summary length (default: 500)
 * @returns Summary string
 */
export function generateSimpleSummary(
    content: string,
    maxLength: number = 500
): string {
    const headings = extractMarkdownHeadings(content);

    if (headings.length === 0) {
        // No headings, use first N characters
        const truncated = content.substring(0, maxLength);
        return truncated + (content.length > maxLength ? '...' : '');
    }

    // Build summary from headings
    let summary = 'File structure:\n';
    headings.forEach(heading => {
        const indent = '  '.repeat(heading.level - 1);
        summary += `${indent}- ${heading.text} (line ${heading.lineNumber})\n`;
    });

    // Truncate if too long
    if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength) + '...';
    }

    return summary;
}

/**
 * Get file extension from filename
 * @param fileName - File name
 * @returns Extension without dot, or undefined
 */
export function getFileExtension(fileName: string): string | undefined {
    const parts = fileName.split('.');
    if (parts.length > 1) {
        return parts[parts.length - 1].toLowerCase();
    }
    return undefined;
}

/**
 * Check if content appears to be markdown
 * @param content - File content
 * @returns Whether content is likely markdown
 */
export function isMarkdownContent(content: string): boolean {
    // Simple heuristic: check for common markdown patterns
    const markdownPatterns = [
        /^#{1,6}\s+/m,        // Headings
        /\*\*[^*]+\*\*/,      // Bold
        /\*[^*]+\*/,          // Italic
        /\[.+\]\(.+\)/,       // Links
        /^[-*+]\s+/m,         // Lists
        /^>\s+/m,             // Blockquotes
        /```[\s\S]*```/,      // Code blocks
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
}

// ============================================================================
// CONTENT MANIPULATION
// ============================================================================

/**
 * Replace content in a specific line range
 * @param content - Original content
 * @param startLine - Starting line (1-indexed)
 * @param endLine - Ending line (1-indexed)
 * @param replacement - Replacement text
 * @returns New content with replacement applied
 */
export function replaceLineRange(
    content: string,
    startLine: number,
    endLine: number,
    replacement: string
): string {
    const lines = content.split('\n');

    // Validate
    const validation = validateLineRange(content, startLine, endLine);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    // Replace lines
    const before = lines.slice(0, startLine - 1);
    const after = lines.slice(endLine);
    const replacementLines = replacement.split('\n');

    return [...before, ...replacementLines, ...after].join('\n');
}

/**
 * Insert content at a specific line
 * @param content - Original content
 * @param lineNumber - Line number to insert at (1-indexed)
 * @param insertion - Text to insert
 * @returns New content with insertion applied
 */
export function insertAtLine(
    content: string,
    lineNumber: number,
    insertion: string
): string {
    const lines = content.split('\n');

    if (lineNumber < 1 || lineNumber > lines.length + 1) {
        throw new Error(
            `Invalid line number: ${lineNumber} (file has ${lines.length} lines)`
        );
    }

    const before = lines.slice(0, lineNumber - 1);
    const after = lines.slice(lineNumber - 1);
    const insertionLines = insertion.split('\n');

    return [...before, ...insertionLines, ...after].join('\n');
}

/**
 * Delete a line range
 * @param content - Original content
 * @param startLine - Starting line (1-indexed)
 * @param endLine - Ending line (1-indexed)
 * @returns New content with lines deleted
 */
export function deleteLineRange(
    content: string,
    startLine: number,
    endLine: number
): string {
    const lines = content.split('\n');

    // Validate
    const validation = validateLineRange(content, startLine, endLine);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    const before = lines.slice(0, startLine - 1);
    const after = lines.slice(endLine);

    return [...before, ...after].join('\n');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize line endings to \n
 * @param content - Content with mixed line endings
 * @returns Content with normalized line endings
 */
export function normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Calculate change statistics
 * @param original - Original content
 * @param modified - Modified content
 * @returns Statistics about the change
 */
export function calculateChangeStats(
    original: string,
    modified: string
): {
    originalLines: number;
    modifiedLines: number;
    linesChanged: number;
    changePercentage: number;
    charDifference: number;
} {
    const originalLines = countLines(original);
    const modifiedLines = countLines(modified);
    const linesChanged = Math.abs(modifiedLines - originalLines);
    const changePercentage = originalLines > 0
        ? (linesChanged / originalLines) * 100
        : 0;
    const charDifference = modified.length - original.length;

    return {
        originalLines,
        modifiedLines,
        linesChanged,
        changePercentage,
        charDifference,
    };
}
