// Patch Parser
// Parses validated patch operations and prepares them for application

import { PatchOperation, ValidatedPatch } from '../types/ai-context';
import { validateLineRange, countLines, calculateChangeStats } from '../utils/file-utils';
import { SAFETY_THRESHOLDS } from '../config/ai-config';

/**
 * Patch Parser
 * Takes validated patch operations and prepares them with additional metadata
 */
export class PatchParser {
    /**
     * Parse and enrich a patch operation with metadata
     */
    parsePatch(
        patch: PatchOperation,
        fileContent: string
    ): ValidatedPatch {
        const errors: string[] = [];
        let originalContent: string | undefined;
        let changeSize = 0;
        let changePercentage = 0;

        // Perform type-specific parsing
        if (patch.type === 'insert') {
            const result = this.parseInsert(patch, fileContent);
            errors.push(...result.errors);
            changeSize = patch.content?.length || 0;
            changePercentage = this.calculateInsertPercentage(fileContent, changeSize);
        } else if (patch.type === 'replace') {
            const result = this.parseReplace(patch, fileContent);
            errors.push(...result.errors);
            originalContent = result.originalContent;
            changeSize = patch.replacement?.length || 0;

            if (originalContent) {
                const stats = calculateChangeStats(originalContent, patch.replacement || '');
                changePercentage = stats.changePercentage;
            }
        } else if (patch.type === 'delete') {
            const result = this.parseDelete(patch, fileContent);
            errors.push(...result.errors);
            originalContent = result.originalContent;
            changeSize = originalContent?.length || 0;
            changePercentage = this.calculateDeletePercentage(fileContent, changeSize);
        }

        return {
            ...patch,
            isValid: errors.length === 0,
            errors,
            originalContent,
            changeSize,
            changePercentage,
        };
    }

    /**
     * Parse insert operation
     */
    private parseInsert(
        patch: PatchOperation,
        fileContent: string
    ): { errors: string[]; } {
        const errors: string[] = [];
        const lineCount = countLines(fileContent);

        if (!patch.line || patch.line < 1) {
            errors.push('Insert line must be >= 1');
        } else if (patch.line > lineCount + 1) {
            errors.push(`Insert line ${patch.line} exceeds file length (${lineCount} lines) + 1`);
        }

        if (patch.content === undefined || patch.content === null) {
            errors.push('Insert content is required');
        }

        return { errors };
    }

    /**
     * Parse replace operation
     */
    private parseReplace(
        patch: PatchOperation,
        fileContent: string
    ): { errors: string[]; originalContent?: string } {
        const errors: string[] = [];
        let originalContent: string | undefined;

        if (!patch.target) {
            errors.push('Replace target is required');
            return { errors };
        }

        // Validate line range
        const validation = validateLineRange(
            fileContent,
            patch.target.startLine,
            patch.target.endLine
        );

        if (!validation.isValid) {
            errors.push(...(validation.error ? [validation.error] : []));
        } else {
            // Extract original content
            const lines = fileContent.split('\n');
            originalContent = lines
                .slice(patch.target.startLine - 1, patch.target.endLine)
                .join('\n');
        }

        if (patch.replacement === undefined || patch.replacement === null) {
            errors.push('Replace replacement content is required');
        }

        return { errors, originalContent };
    }

    /**
     * Parse delete operation
     */
    private parseDelete(
        patch: PatchOperation,
        fileContent: string
    ): { errors: string[]; originalContent?: string } {
        const errors: string[] = [];
        let originalContent: string | undefined;

        if (!patch.target) {
            errors.push('Delete target is required');
            return { errors };
        }

        // Validate line range
        const validation = validateLineRange(
            fileContent,
            patch.target.startLine,
            patch.target.endLine
        );

        if (!validation.isValid) {
            errors.push(...(validation.error ? [validation.error] : []));
        } else {
            // Extract content that will be deleted
            const lines = fileContent.split('\n');
            originalContent = lines
                .slice(patch.target.startLine - 1, patch.target.endLine)
                .join('\n');
        }

        return { errors, originalContent };
    }

    /**
     * Calculate change percentage for insert
     */
    private calculateInsertPercentage(fileContent: string, insertSize: number): number {
        const currentSize = fileContent.length;
        if (currentSize === 0) return 100;
        return (insertSize / currentSize) * 100;
    }

    /**
     * Calculate change percentage for delete
     */
    private calculateDeletePercentage(fileContent: string, deleteSize: number): number {
        const currentSize = fileContent.length;
        if (currentSize === 0) return 0;
        return (deleteSize / currentSize) * 100;
    }

    /**
     * Parse multiple patches
     */
    parsePatches(
        patches: PatchOperation[],
        fileContents: Map<string, string>
    ): ValidatedPatch[] {
        return patches.map(patch => {
            const content = fileContents.get(patch.file);
            if (!content) {
                return {
                    ...patch,
                    isValid: false,
                    errors: [`File not found: ${patch.file}`],
                    changeSize: 0,
                    changePercentage: 0,
                };
            }

            return this.parsePatch(patch, content);
        });
    }

    /**
     * Check if patches have conflicts (overlapping line ranges)
     */
    detectConflicts(patches: ValidatedPatch[]): Array<{
        patch1Index: number;
        patch2Index: number;
        reason: string;
    }> {
        const conflicts: Array<{
            patch1Index: number;
            patch2Index: number;
            reason: string;
        }> = [];

        // Group patches by file
        const patchesByFile = new Map<string, Array<{ index: number; patch: ValidatedPatch }>>();

        patches.forEach((patch, index) => {
            if (!patchesByFile.has(patch.file)) {
                patchesByFile.set(patch.file, []);
            }
            patchesByFile.get(patch.file)!.push({ index, patch });
        });

        // Check for conflicts within each file
        patchesByFile.forEach((filePatches) => {
            for (let i = 0; i < filePatches.length; i++) {
                for (let j = i + 1; j < filePatches.length; j++) {
                    const p1 = filePatches[i].patch;
                    const p2 = filePatches[j].patch;

                    const conflict = this.checkPatchConflict(p1, p2);
                    if (conflict) {
                        conflicts.push({
                            patch1Index: filePatches[i].index,
                            patch2Index: filePatches[j].index,
                            reason: conflict,
                        });
                    }
                }
            }
        });

        return conflicts;
    }

    /**
     * Check if two patches conflict
     */
    private checkPatchConflict(
        patch1: ValidatedPatch,
        patch2: ValidatedPatch
    ): string | null {
        // Get line ranges for each patch
        const range1 = this.getPatchLineRange(patch1);
        const range2 = this.getPatchLineRange(patch2);

        if (!range1 || !range2) {
            return null;
        }

        // Check for overlap
        const overlaps = (
            (range1.start <= range2.end && range1.end >= range2.start) ||
            (range2.start <= range1.end && range2.end >= range1.start)
        );

        if (overlaps) {
            return `Patches overlap at lines ${Math.max(range1.start, range2.start)}-${Math.min(range1.end, range2.end)}`;
        }

        return null;
    }

    /**
     * Get line range affected by a patch
     */
    private getPatchLineRange(patch: ValidatedPatch): { start: number; end: number } | null {
        if (patch.type === 'insert' && patch.line) {
            return { start: patch.line, end: patch.line };
        } else if (patch.target) {
            return { start: patch.target.startLine, end: patch.target.endLine };
        }
        return null;
    }

    /**
     * Sort patches by file and line number (for safe sequential application)
     */
    sortPatches(patches: ValidatedPatch[]): ValidatedPatch[] {
        return [...patches].sort((a, b) => {
            // First sort by file
            if (a.file !== b.file) {
                return a.file.localeCompare(b.file);
            }

            // Then by starting line (descending for safe application from bottom-up)
            const aLine = this.getPatchStartLine(a);
            const bLine = this.getPatchStartLine(b);

            return bLine - aLine; // Descending order
        });
    }

    /**
     * Get starting line of a patch
     */
    private getPatchStartLine(patch: ValidatedPatch): number {
        if (patch.type === 'insert' && patch.line) {
            return patch.line;
        } else if (patch.target) {
            return patch.target.startLine;
        }
        return 0;
    }
}

/**
 * Default export - singleton instance
 */
export const patchParser = new PatchParser();

/**
 * Helper function to quickly parse a patch
 */
export function parsePatch(
    patch: PatchOperation,
    fileContent: string
): ValidatedPatch {
    return patchParser.parsePatch(patch, fileContent);
}
