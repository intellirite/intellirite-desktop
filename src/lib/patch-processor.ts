// Patch Processor
// Processes validated patches and prepares them for editor application

import { ValidatedPatch, DiffInfo, DiffLine, PatchResult } from '../types/ai-context';
import {
    lineNumbersToOffsets,
    replaceLineRange,
    insertAtLine,
    deleteLineRange,
    calculateChangeStats,
} from '../utils/file-utils';

/**
 * Patch Processor
 * Prepares patches for application and generates diffs
 */
export class PatchProcessor {
    /**
     * Generate diff information for a patch
     */
    generateDiff(
        patch: ValidatedPatch,
        fileContent: string
    ): DiffInfo {
        let afterContent: string;

        try {
            afterContent = this.applyPatchToContent(patch, fileContent);
        } catch (error) {
            // If application fails, use original content
            afterContent = fileContent;
        }

        const diff = this.computeLineDiff(fileContent, afterContent);
        const stats = this.computeDiffStats(diff);

        return {
            filePath: patch.file,
            before: fileContent,
            after: afterContent,
            diff,
            stats,
        };
    }

    /**
     * Apply a patch to content (without modifying the actual file)
     */
    applyPatchToContent(
        patch: ValidatedPatch,
        fileContent: string
    ): string {
        if (patch.type === 'insert') {
            return insertAtLine(
                fileContent,
                patch.line!,
                patch.content || ''
            );
        } else if (patch.type === 'replace') {
            return replaceLineRange(
                fileContent,
                patch.target!.startLine,
                patch.target!.endLine,
                patch.replacement || ''
            );
        } else if (patch.type === 'delete') {
            return deleteLineRange(
                fileContent,
                patch.target!.startLine,
                patch.target!.endLine
            );
        }

        return fileContent;
    }

    /**
     * Compute line-by-line diff
     */
    private computeLineDiff(before: string, after: string): DiffLine[] {
        const beforeLines = before.split('\n');
        const afterLines = after.split('\n');
        const diff: DiffLine[] = [];

        // Simple line-based diff (can be enhanced with more sophisticated algorithm)
        const maxLines = Math.max(beforeLines.length, afterLines.length);

        let beforeIndex = 0;
        let afterIndex = 0;

        while (beforeIndex < beforeLines.length || afterIndex < afterLines.length) {
            const beforeLine = beforeLines[beforeIndex];
            const afterLine = afterLines[afterIndex];

            if (beforeLine === afterLine) {
                // Unchanged line
                diff.push({
                    lineNumber: beforeIndex + 1,
                    type: 'unchanged',
                    content: beforeLine,
                    newLineNumber: afterIndex + 1,
                });
                beforeIndex++;
                afterIndex++;
            } else if (beforeIndex >= beforeLines.length) {
                // Added line
                diff.push({
                    lineNumber: beforeIndex + 1,
                    type: 'added',
                    content: afterLine,
                    newLineNumber: afterIndex + 1,
                });
                afterIndex++;
            } else if (afterIndex >= afterLines.length) {
                // Removed line
                diff.push({
                    lineNumber: beforeIndex + 1,
                    type: 'removed',
                    content: beforeLine,
                });
                beforeIndex++;
            } else {
                // Modified or different line
                // Try to match next lines to detect modifications vs additions/removals
                const nextBeforeLine = beforeLines[beforeIndex + 1];
                const nextAfterLine = afterLines[afterIndex + 1];

                if (nextBeforeLine === afterLine) {
                    // Current before line was removed
                    diff.push({
                        lineNumber: beforeIndex + 1,
                        type: 'removed',
                        content: beforeLine,
                    });
                    beforeIndex++;
                } else if (nextAfterLine === beforeLine) {
                    // Current after line was added
                    diff.push({
                        lineNumber: beforeIndex + 1,
                        type: 'added',
                        content: afterLine,
                        newLineNumber: afterIndex + 1,
                    });
                    afterIndex++;
                } else {
                    // Line was modified
                    diff.push({
                        lineNumber: beforeIndex + 1,
                        type: 'modified',
                        content: afterLine,
                        newLineNumber: afterIndex + 1,
                    });
                    beforeIndex++;
                    afterIndex++;
                }
            }
        }

        return diff;
    }

    /**
     * Compute diff statistics
     */
    private computeDiffStats(diff: DiffLine[]): {
        additions: number;
        deletions: number;
        modifications: number;
    } {
        let additions = 0;
        let deletions = 0;
        let modifications = 0;

        diff.forEach(line => {
            if (line.type === 'added') additions++;
            else if (line.type === 'removed') deletions++;
            else if (line.type === 'modified') modifications++;
        });

        return { additions, deletions, modifications };
    }

    /**
     * Get editor positions for a patch (line numbers to character offsets)
     */
    getEditorPositions(
        patch: ValidatedPatch,
        fileContent: string
    ): {
        startOffset: number;
        endOffset: number;
        startLine: number;
        endLine: number;
    } {
        let startLine: number;
        let endLine: number;

        if (patch.type === 'insert') {
            startLine = patch.line!;
            endLine = patch.line!;
        } else {
            startLine = patch.target!.startLine;
            endLine = patch.target!.endLine;
        }

        const offsets = lineNumbersToOffsets(fileContent, startLine, endLine);

        return {
            startLine,
            endLine,
            ...offsets,
        };
    }

    /**
     * Prepare patch result after application
     */
    preparePatchResult(
        patch: ValidatedPatch,
        fileContent: string,
        success: boolean,
        error?: string,
        requiredApproval: boolean = false
    ): PatchResult {
        let linesAffected = 0;
        let newContent: string | undefined;

        if (success) {
            try {
                newContent = this.applyPatchToContent(patch, fileContent);

                if (patch.type === 'insert') {
                    linesAffected = (patch.content || '').split('\n').length;
                } else if (patch.target) {
                    linesAffected = patch.target.endLine - patch.target.startLine + 1;
                }
            } catch (err: any) {
                return {
                    success: false,
                    error: err.message || 'Failed to apply patch',
                    filePath: patch.file,
                    linesAffected: 0,
                    requiredApproval,
                };
            }
        }

        return {
            success,
            error,
            filePath: patch.file,
            linesAffected,
            newContent,
            requiredApproval,
        };
    }

    /**
     * Generate unified diff format (for display)
     */
    generateUnifiedDiff(diffInfo: DiffInfo): string {
        let unified = `--- ${diffInfo.filePath} (before)\n`;
        unified += `+++ ${diffInfo.filePath} (after)\n`;

        unified += `@@ -1,${diffInfo.before.split('\n').length} +1,${diffInfo.after.split('\n').length} @@\n`;

        diffInfo.diff.forEach(line => {
            if (line.type === 'added') {
                unified += `+${line.content}\n`;
            } else if (line.type === 'removed') {
                unified += `-${line.content}\n`;
            } else if (line.type === 'modified') {
                unified += `-${diffInfo.before.split('\n')[line.lineNumber - 1]}\n`;
                unified += `+${line.content}\n`;
            } else {
                unified += ` ${line.content}\n`;
            }
        });

        return unified;
    }

    /**
     * Process batch of patches and generate diffs
     */
    processBatch(
        patches: ValidatedPatch[],
        fileContents: Map<string, string>
    ): Array<{
        patch: ValidatedPatch;
        diff: DiffInfo;
        positions: ReturnType<PatchProcessor['getEditorPositions']>;
    }> {
        return patches.map(patch => {
            const content = fileContents.get(patch.file) || '';

            return {
                patch,
                diff: this.generateDiff(patch, content),
                positions: this.getEditorPositions(patch, content),
            };
        });
    }

    /**
     * Generate preview summary for UI
     */
    generatePreviewSummary(
        patches: ValidatedPatch[],
        fileContents: Map<string, string>
    ): {
        totalFiles: number;
        totalChanges: number;
        byFile: Map<string, {
            additions: number;
            deletions: number;
            modifications: number;
        }>;
    } {
        const byFile = new Map<string, {
            additions: number;
            deletions: number;
            modifications: number;
        }>();

        patches.forEach(patch => {
            const content = fileContents.get(patch.file) || '';
            const diff = this.generateDiff(patch, content);

            if (!byFile.has(patch.file)) {
                byFile.set(patch.file, {
                    additions: 0,
                    deletions: 0,
                    modifications: 0,
                });
            }

            const stats = byFile.get(patch.file)!;
            stats.additions += diff.stats.additions;
            stats.deletions += diff.stats.deletions;
            stats.modifications += diff.stats.modifications;
        });

        const totalChanges = Array.from(byFile.values()).reduce(
            (sum, stats) => sum + stats.additions + stats.deletions + stats.modifications,
            0
        );

        return {
            totalFiles: byFile.size,
            totalChanges,
            byFile,
        };
    }
}

/**
 * Default export - singleton instance
 */
export const patchProcessor = new PatchProcessor();

/**
 * Helper function to quickly generate diff
 */
export function generateDiff(
    patch: ValidatedPatch,
    fileContent: string
): DiffInfo {
    return patchProcessor.generateDiff(patch, fileContent);
}
