// File Reference Parser
// Parses user input for #filename.md patterns and resolves file paths

import { FileReference } from '../types/ai-context';

/**
 * Parse file references from user input
 * Supports formats like: #filename.md, #chapter1.md, #notes.md
 * 
 * @param input - User input text
 * @returns Array of parsed file references
 */
export function parseFileReferences(input: string): FileReference[] {
    const references: FileReference[] = [];

    // Pattern to match #filename or #filename.ext
    // Matches: #word, #word.ext, #word-word, #word_word
    const pattern = /#([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?)/g;

    let match;
    while ((match = pattern.exec(input)) !== null) {
        const original = match[0]; // e.g., "#chapter1.md"
        const fileName = match[1]; // e.g., "chapter1.md"

        references.push({
            original,
            filePath: '', // Will be resolved later
            fileName,
            exists: false, // Will be checked later
        });
    }

    // Remove duplicates based on fileName
    const uniqueReferences = references.filter(
        (ref, index, self) =>
            index === self.findIndex((r) => r.fileName === ref.fileName)
    );

    return uniqueReferences;
}

/**
 * Resolve file path from file name
 * This should be called with the actual file system context
 * 
 * @param fileName - File name to resolve
 * @param workspaceRoot - Root directory of the workspace
 * @param fileTree - Optional file tree to search in
 * @returns Resolved file path or null if not found
 */
export function resolveFilePath(
    fileName: string,
    workspaceRoot: string,
    fileTree?: Array<{ name: string; path: string; type: 'file' | 'folder' }>
): string | null {
    if (!fileTree) {
        // If no file tree provided, construct simple path
        return `${workspaceRoot}/${fileName}`;
    }

    // Search for file in tree
    const file = findFileInTree(fileName, fileTree);
    return file ? file.path : null;
}

/**
 * Helper to find file in tree recursively
 */
function findFileInTree(
    fileName: string,
    tree: Array<{ name: string; path: string; type: 'file' | 'folder'; children?: any[] }>
): { name: string; path: string } | null {
    for (const node of tree) {
        if (node.type === 'file' && node.name === fileName) {
            return node;
        }

        if (node.type === 'folder' && node.children) {
            const found = findFileInTree(fileName, node.children);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Check if a file exists
 * This should integrate with Electron's file system API
 * 
 * @param filePath - Path to check
 * @returns Promise that resolves to true if file exists
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        // In Electron context, you would use:
        // const fs = require('fs').promises;
        // await fs.access(filePath);
        // return true;

        // For now, return a placeholder
        // This will be implemented when integrating with Electron
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Resolve all file references from user input
 * Combines parsing, path resolution, and existence checking
 * 
 * @param input - User input text
 * @param workspaceRoot - Root directory of workspace
 * @param fileTree - Optional file tree
 * @returns Promise with array of resolved file references
 */
export async function resolveFileReferences(
    input: string,
    workspaceRoot: string,
    fileTree?: Array<{ name: string; path: string; type: 'file' | 'folder' }>
): Promise<FileReference[]> {
    const parsed = parseFileReferences(input);

    const resolved = await Promise.all(
        parsed.map(async (ref) => {
            const filePath = resolveFilePath(ref.fileName, workspaceRoot, fileTree);
            const exists = filePath ? await checkFileExists(filePath) : false;

            return {
                ...ref,
                filePath: filePath || ref.fileName,
                exists,
            };
        })
    );

    return resolved;
}

/**
 * Extract unique file names from references
 * Useful for displaying to user
 */
export function extractFileNames(references: FileReference[]): string[] {
    return references.map(ref => ref.fileName);
}

/**
 * Get only valid (existing) file references
 */
export function getValidReferences(references: FileReference[]): FileReference[] {
    return references.filter(ref => ref.exists);
}

/**
 * Get only invalid (non-existing) file references
 */
export function getInvalidReferences(references: FileReference[]): FileReference[] {
    return references.filter(ref => !ref.exists);
}

/**
 * Format file references for display
 * Returns a string like: "#file1.md, #file2.md, #file3.md"
 */
export function formatFileReferences(references: FileReference[]): string {
    return references.map(ref => ref.original).join(', ');
}

/**
 * Validate file reference format
 * Returns true if the string looks like a valid file reference
 */
export function isValidFileReference(text: string): boolean {
    const pattern = /^#[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?$/;
    return pattern.test(text);
}

/**
 * Create a file reference object manually
 * Useful for programmatic reference creation
 */
export function createFileReference(
    fileName: string,
    filePath: string,
    exists: boolean = false
): FileReference {
    return {
        original: `#${fileName}`,
        fileName,
        filePath,
        exists,
    };
}

/**
 * Parse and extract file references from a chat message
 * Handles multi-line messages and complex text
 */
export function extractReferencesFromMessage(message: string): {
    references: FileReference[];
    messageWithoutRefs: string;
    hasReferences: boolean;
} {
    const references = parseFileReferences(message);

    // Remove reference tags from message for cleaner display
    let messageWithoutRefs = message;
    references.forEach(ref => {
        messageWithoutRefs = messageWithoutRefs.replace(ref.original, ref.fileName);
    });

    return {
        references,
        messageWithoutRefs,
        hasReferences: references.length > 0,
    };
}
