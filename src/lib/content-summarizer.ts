// Content Summarizer
// Smart summarization for large files while preserving context

import {
    extractMarkdownHeadings,
    generateSimpleSummary,
    countLines,
    isMarkdownContent,
} from '../utils/file-utils';
import { CONTEXT_LIMITS } from '../config/ai-config';

/**
 * Summarize file content intelligently
 * Uses different strategies based on file type and size
 */
export function summarizeContent(
    content: string,
    fileName: string,
    maxLength: number = CONTEXT_LIMITS.MAX_SUMMARY_LENGTH
): string {
    // Check if file is small enough to not need summarization
    const lineCount = countLines(content);
    if (lineCount <= CONTEXT_LIMITS.LARGE_FILE_THRESHOLD) {
        return ''; // No summary needed, use full content
    }

    // Strategy 1: Markdown files - use heading structure
    if (isMarkdownContent(content)) {
        return summarizeMarkdown(content, maxLength);
    }

    // Strategy 2: Other files - use simple summary
    return generateSimpleSummary(content, maxLength);
}

/**
 * Summarize markdown content using heading structure
 */
function summarizeMarkdown(content: string, maxLength: number): string {
    const headings = extractMarkdownHeadings(content);

    if (headings.length === 0) {
        return generateSimpleSummary(content, maxLength);
    }

    // Build hierarchical structure summary
    let summary = 'Document structure:\n\n';

    headings.forEach(heading => {
        const indent = '  '.repeat(heading.level - 1);
        const bullet = heading.level === 1 ? '##' : '-';
        summary += `${indent}${bullet} ${heading.text} (L${heading.lineNumber})\n`;
    });

    // Add content overview
    const totalLines = countLines(content);
    const words = content.split(/\s+/).length;
    summary += `\nTotal: ${totalLines} lines, ~${words} words`;

    // Truncate if needed
    if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
}

/**
 * Generate a summary with key excerpts from the content
 */
export function summarizeWithExcerpts(
    content: string,
    maxLength: number = CONTEXT_LIMITS.MAX_SUMMARY_LENGTH
): string {
    const paragraphs = content
        .split(/\n\n+/)
        .filter(p => p.trim().length > 0)
        .map(p => p.trim());

    if (paragraphs.length === 0) {
        return 'Empty file';
    }

    let summary = 'Key excerpts:\n\n';

    // Add first paragraph
    if (paragraphs[0]) {
        const firstPara = paragraphs[0].substring(0, 200);
        summary += `"${firstPara}${paragraphs[0].length > 200 ? '...' : ''}"\n\n`;
    }

    // Add middle paragraphs if available
    if (paragraphs.length > 2) {
        const middleIndex = Math.floor(paragraphs.length / 2);
        const middlePara = paragraphs[middleIndex].substring(0, 200);
        summary += `"${middlePara}${paragraphs[middleIndex].length > 200 ? '...' : ''}"\n\n`;
    }

    // Add last paragraph if different from first
    if (paragraphs.length > 1) {
        const lastPara = paragraphs[paragraphs.length - 1].substring(0, 200);
        summary += `"${lastPara}${paragraphs[paragraphs.length - 1].length > 200 ? '...' : ''}"\n`;
    }

    // Truncate to max length
    if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
}

/**
 * Create a summary focused on a specific section
 */
export function summarizeAroundSection(
    content: string,
    targetLineStart: number,
    targetLineEnd: number,
    contextLines: number = 50
): string {
    const lines = content.split('\n');

    const startLine = Math.max(0, targetLineStart - contextLines - 1);
    const endLine = Math.min(lines.length, targetLineEnd + contextLines);

    const beforeContext = lines.slice(startLine, targetLineStart - 1);
    const targetSection = lines.slice(targetLineStart - 1, targetLineEnd);
    const afterContext = lines.slice(targetLineEnd, endLine);

    let summary = `Focused on lines ${targetLineStart}-${targetLineEnd}:\n\n`;

    if (beforeContext.length > 0) {
        summary += `[Context before]\n${beforeContext.join('\n')}\n\n`;
    }

    summary += `[Target section]\n${targetSection.join('\n')}\n\n`;

    if (afterContext.length > 0) {
        summary += `[Context after]\n${afterContext.join('\n')}`;
    }

    return summary;
}

/**
 * Decide whether a file needs summarization
 */
export function needsSummarization(
    content: string,
    threshold: number = CONTEXT_LIMITS.LARGE_FILE_THRESHOLD
): boolean {
    return countLines(content) > threshold;
}

/**
 * Get a compact summary suitable for UI tooltips
 */
export function getCompactSummary(content: string, maxLength: number = 100): string {
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        return 'Empty file';
    }

    const firstLine = lines[0].trim();

    if (firstLine.length <= maxLength) {
        return firstLine;
    }

    return firstLine.substring(0, maxLength - 3) + '...';
}

/**
 * Summarize multiple files into a combined summary
 */
export function summarizeMultipleFiles(
    files: Array<{ fileName: string; content: string }>
): string {
    let summary = `Including ${files.length} file(s):\n\n`;

    files.forEach((file, index) => {
        const lineCount = countLines(file.content);
        const isLarge = lineCount > CONTEXT_LIMITS.LARGE_FILE_THRESHOLD;

        summary += `${index + 1}. ${file.fileName} (${lineCount} lines${isLarge ? ', summarized' : ''})\n`;
    });

    return summary;
}

/**
 * Extract key topics from content
 */
export function extractKeyTopics(content: string, topicCount: number = 5): string[] {
    if (isMarkdownContent(content)) {
        const headings = extractMarkdownHeadings(content);
        return headings
            .slice(0, topicCount)
            .map(h => h.text);
    }

    const words = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    const wordCounts = new Map<string, number>();
    words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    const topics = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topicCount)
        .map(([word]) => word);

    return topics;
}

/**
 * Create metadata summary for a file
 */
export function createFileMetadata(
    fileName: string,
    content: string
): {
    fileName: string;
    lineCount: number;
    wordCount: number;
    charCount: number;
    isLarge: boolean;
    topics: string[];
} {
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(w => w.length > 0);

    return {
        fileName,
        lineCount: lines.length,
        wordCount: words.length,
        charCount: content.length,
        isLarge: lines.length > CONTEXT_LIMITS.LARGE_FILE_THRESHOLD,
        topics: extractKeyTopics(content),
    };
}
