// Editor Bridge
// Connects the AI engine with the TipTap editor

import { Editor } from '@tiptap/react';
import { ValidatedPatch, PatchResult } from '../types/ai-context';
import { patchProcessor } from './patch-processor';
import {
    lineNumbersToOffsets,
    replaceLineRange,
    insertAtLine,
    deleteLineRange
} from '../utils/file-utils';

/**
 * Editor context extracted from TipTap
 */
export interface EditorContext {
    /** Full content as markdown */
    content: string;
    /** Lines of content */
    lines: string[];
    /** Total line count */
    lineCount: number;
    /** Current selection (if any) */
    selection?: {
        text: string;
        startLine: number;
        endLine: number;
        startOffset: number;
        endOffset: number;
    };
    /** Current cursor position */
    cursorPosition: {
        line: number;
        column: number;
    };
}

/**
 * Editor Bridge
 * Interfaces between TipTap editor and AI engine
 */
export class EditorBridge {
    /**
     * Extract context from TipTap editor
     */
    extractContext(editor: Editor, cursorInfo?: { line: number; column: number }): EditorContext {
        // Get content as text (TipTap can export as text)
        const textContent = editor.getText();
        const lines = textContent.split('\n');
        const lineCount = lines.length;

        // Get selection if exists
        const { from, to } = editor.state.selection;
        let selection: EditorContext['selection'] | undefined;

        if (from !== to) {
            const selectedText = editor.state.doc.textBetween(from, to, '\n');

            // Calculate line numbers for selection
            const textBefore = editor.state.doc.textBetween(0, from, '\n');
            const textBeforeLines = textBefore.split('\n');
            const startLine = textBeforeLines.length;

            const selectedLines = selectedText.split('\n');
            const endLine = startLine + selectedLines.length - 1;

            selection = {
                text: selectedText,
                startLine,
                endLine,
                startOffset: from,
                endOffset: to,
            };
        }

        // Cursor position
        const cursorPosition = cursorInfo || { line: 1, column: 1 };

        return {
            content: textContent,
            lines,
            lineCount,
            selection,
            cursorPosition,
        };
    }

    /**
     * Apply a patch to the editor
     */
    async applyPatch(
        editor: Editor,
        patch: ValidatedPatch,
        options?: {
            preview?: boolean;
            highlight?: boolean;
        }
    ): Promise<PatchResult> {
        try {
            // Get current content as text
            const currentContent = editor.getText();

            // Apply patch to text content
            const newContent = patchProcessor.applyPatchToContent(patch, currentContent);

            // If not preview mode, update editor
            if (!options?.preview) {
                // Create a transaction to make the change undoable as a single unit
                editor.chain()
                    .focus()
                    .setContent(newContent)
                    .run();
            }

            // Calculate lines affected
            let linesAffected = 0;
            if (patch.type === 'insert') {
                linesAffected = (patch.content || '').split('\n').length;
            } else if (patch.target) {
                linesAffected = patch.target.endLine - patch.target.startLine + 1;
            }

            return {
                success: true,
                filePath: patch.file,
                linesAffected,
                newContent,
                requiredApproval: false,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to apply patch',
                filePath: patch.file,
                linesAffected: 0,
                requiredApproval: false,
            };
        }
    }

    /**
     * Apply multiple patches to the editor
     */
    async applyPatches(
        editor: Editor,
        patches: ValidatedPatch[],
        options?: {
            preview?: boolean;
        }
    ): Promise<PatchResult[]> {
        const results: PatchResult[] = [];

        // For now, only handle single-file patches
        // Multi-file support would require file system integration
        const currentFilePatches = patches.filter(p => {
            // Assume all patches are for current file in single-file mode
            return true;
        });

        // Apply patches sequentially
        for (const patch of currentFilePatches) {
            const result = await this.applyPatch(editor, patch, options);
            results.push(result);

            // If any patch fails, stop
            if (!result.success) {
                break;
            }
        }

        return results;
    }

    /**
     * Get line range from editor content
     */
    getLineRange(editor: Editor, startLine: number, endLine: number): string {
        const lines = editor.getText().split('\n');
        return lines.slice(startLine - 1, endLine).join('\n');
    }

    /**
     * Scroll editor to a specific line
     */
    scrollToLine(editor: Editor, line: number) {
        // Get position at start of line
        const lines = editor.getText().split('\n');
        const charsBefore = lines.slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);

        // Set cursor position
        editor.chain()
            .focus()
            .setTextSelection(charsBefore)
            .run();

        // The editor will auto-scroll to cursor position
    }

    /**
     * Highlight a line range in the editor
     */
    highlightRange(editor: Editor, startLine: number, endLine: number) {
        const lines = editor.getText().split('\n');

        // Calculate character offsets
        const startOffset = lines.slice(0, startLine - 1).join('\n').length + (startLine > 1 ? 1 : 0);
        const endOffset = lines.slice(0, endLine).join('\n').length;

        // Select the range
        editor.chain()
            .focus()
            .setTextSelection({ from: startOffset, to: endOffset })
            .run();
    }

    /**
     * Get preview of what a patch will do
     */
    getPatchPreview(
        editor: Editor,
        patch: ValidatedPatch
    ): {
        before: string;
        after: string;
        diff: string;
    } {
        const currentContent = editor.getText();
        const diff = patchProcessor.generateDiff(patch, currentContent);

        return {
            before: diff.before,
            after: diff.after,
            diff: patchProcessor.generateUnifiedDiff(diff),
        };
    }

    /**
     * Create undo point for AI changes
     */
    createUndoPoint(editor: Editor, metadata?: Record<string, any>) {
        // TipTap automatically creates undo points for transactions
        // We can add metadata if needed in the future
        editor.chain()
            .focus()
            .run();
    }

    /**
     * Check if editor has unsaved changes
     */
    hasUnsavedChanges(editor: Editor, originalContent: string): boolean {
        return editor.getText() !== originalContent;
    }

    /**
     * Get editor statistics
     */
    getStatistics(editor: Editor): {
        characters: number;
        words: number;
        lines: number;
        paragraphs: number;
    } {
        const text = editor.getText();
        const lines = text.split('\n');
        const words = text.split(/\s+/).filter(w => w.length > 0);

        // Count paragraphs (non-empty blocks)
        let paragraphs = 0;
        editor.state.doc.descendants((node) => {
            if (node.isBlock && node.content.size > 0) {
                paragraphs++;
            }
        });

        return {
            characters: text.length,
            words: words.length,
            lines: lines.length,
            paragraphs,
        };
    }
}

/**
 * Singleton instance
 */
export const editorBridge = new EditorBridge();

/**
 * Helper to quickly extract context
 */
export function extractEditorContext(
    editor: Editor,
    cursorInfo?: { line: number; column: number }
): EditorContext {
    return editorBridge.extractContext(editor, cursorInfo);
}

/**
 * Helper to quickly apply a patch
 */
export async function applyPatchToEditor(
    editor: Editor,
    patch: ValidatedPatch
): Promise<PatchResult> {
    return editorBridge.applyPatch(editor, patch);
}
