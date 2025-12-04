// Response Validator
// Parses and validates AI responses in patch format

import {
    PatchPayload,
    MultiPatchPayload,
    PatchOperation,
    PatchOperationType
} from '../types/ai-context';
import { PATCH_TAGS } from '../config/ai-config';

/**
 * Response validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    patches?: PatchOperation[];
}

/**
 * Response Validator
 * Validates that AI responses conform to expected patch format
 */
export class ResponseValidator {
    /**
     * Validate and parse AI response
     */
    validateResponse(response: string): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if response is empty
        if (!response || response.trim().length === 0) {
            errors.push('Response is empty');
            return { isValid: false, errors, warnings };
        }

        // Try to extract and parse patches
        const extractionResult = this.extractPatches(response);

        if (!extractionResult.success) {
            errors.push(...extractionResult.errors);
            return { isValid: false, errors, warnings };
        }

        // Validate extracted patches
        const patches = extractionResult.patches!;
        const validationErrors = this.validatePatches(patches);

        if (validationErrors.length > 0) {
            errors.push(...validationErrors);
        }

        // Check for warnings (non-critical issues)
        const validationWarnings = this.checkWarnings(response, patches);
        warnings.push(...validationWarnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            patches: errors.length === 0 ? patches : undefined,
        };
    }

    /**
     * Extract patches from response
     */
    private extractPatches(response: string): {
        success: boolean;
        patches?: PatchOperation[];
        errors: string[];
    } {
        const errors: string[] = [];

        // Try single patch first
        const singleMatch = this.extractSinglePatch(response);
        if (singleMatch.success) {
            return {
                success: true,
                patches: [singleMatch.patch!],
                errors: [],
            };
        }

        // Try multi-patch
        const multiMatch = this.extractMultiPatch(response);
        if (multiMatch.success) {
            return {
                success: true,
                patches: multiMatch.patches!,
                errors: [],
            };
        }

        // Neither format found
        errors.push('Response does not contain valid patch format');
        errors.push(`Expected ${PATCH_TAGS.SINGLE_PATCH_OPEN}...${PATCH_TAGS.SINGLE_PATCH_CLOSE} or ${PATCH_TAGS.MULTI_PATCH_OPEN}...${PATCH_TAGS.MULTI_PATCH_CLOSE}`);

        return { success: false, errors };
    }

    /**
     * Extract single patch from response
     */
    private extractSinglePatch(response: string): {
        success: boolean;
        patch?: PatchOperation;
    } {
        const pattern = new RegExp(
            `${this.escapeRegex(PATCH_TAGS.SINGLE_PATCH_OPEN)}([\\s\\S]*?)${this.escapeRegex(PATCH_TAGS.SINGLE_PATCH_CLOSE)}`,
            'i'
        );

        const match = response.match(pattern);
        if (!match) {
            return { success: false };
        }

        const jsonStr = match[1].trim();

        try {
            const parsed = JSON.parse(jsonStr) as PatchPayload;
            return {
                success: true,
                patch: this.normalizePatch(parsed),
            };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Extract multiple patches from response
     */
    private extractMultiPatch(response: string): {
        success: boolean;
        patches?: PatchOperation[];
    } {
        const pattern = new RegExp(
            `${this.escapeRegex(PATCH_TAGS.MULTI_PATCH_OPEN)}([\\s\\S]*?)${this.escapeRegex(PATCH_TAGS.MULTI_PATCH_CLOSE)}`,
            'i'
        );

        const match = response.match(pattern);
        if (!match) {
            return { success: false };
        }

        const jsonStr = match[1].trim();

        try {
            const parsed = JSON.parse(jsonStr) as MultiPatchPayload;

            if (!Array.isArray(parsed)) {
                return { success: false };
            }

            const patches = parsed.map(p => this.normalizePatch(p));
            return {
                success: true,
                patches,
            };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Normalize patch payload to PatchOperation
     */
    private normalizePatch(payload: PatchPayload): PatchOperation {
        const operation: PatchOperation = {
            file: payload.file,
            type: payload.type,
        };

        if (payload.type === 'insert') {
            operation.line = payload.line;
            operation.content = payload.content || '';
        } else if (payload.type === 'replace') {
            operation.target = payload.target;
            operation.replacement = payload.replacement || '';
        } else if (payload.type === 'delete') {
            operation.target = payload.target;
        }

        return operation;
    }

    /**
     * Validate patches for completeness and correctness
     */
    private validatePatches(patches: PatchOperation[]): string[] {
        const errors: string[] = [];

        patches.forEach((patch, index) => {
            const patchNum = index + 1;

            // Validate file field
            if (!patch.file || patch.file.trim().length === 0) {
                errors.push(`Patch ${patchNum}: Missing or empty 'file' field`);
            }

            // Validate type field
            const validTypes: PatchOperationType[] = ['insert', 'replace', 'delete'];
            if (!validTypes.includes(patch.type)) {
                errors.push(`Patch ${patchNum}: Invalid type '${patch.type}'. Must be one of: ${validTypes.join(', ')}`);
            }

            // Type-specific validation
            if (patch.type === 'insert') {
                if (patch.line === undefined || patch.line < 1) {
                    errors.push(`Patch ${patchNum}: Insert operation requires valid 'line' field (>= 1)`);
                }
                if (patch.content === undefined) {
                    errors.push(`Patch ${patchNum}: Insert operation requires 'content' field`);
                }
            } else if (patch.type === 'replace') {
                if (!patch.target) {
                    errors.push(`Patch ${patchNum}: Replace operation requires 'target' field`);
                } else {
                    if (patch.target.startLine < 1) {
                        errors.push(`Patch ${patchNum}: target.startLine must be >= 1`);
                    }
                    if (patch.target.endLine < patch.target.startLine) {
                        errors.push(`Patch ${patchNum}: target.endLine must be >= target.startLine`);
                    }
                }
                if (patch.replacement === undefined) {
                    errors.push(`Patch ${patchNum}: Replace operation requires 'replacement' field`);
                }
            } else if (patch.type === 'delete') {
                if (!patch.target) {
                    errors.push(`Patch ${patchNum}: Delete operation requires 'target' field`);
                } else {
                    if (patch.target.startLine < 1) {
                        errors.push(`Patch ${patchNum}: target.startLine must be >= 1`);
                    }
                    if (patch.target.endLine < patch.target.startLine) {
                        errors.push(`Patch ${patchNum}: target.endLine must be >= target.startLine`);
                    }
                }
            }
        });

        return errors;
    }

    /**
     * Check for non-critical warnings
     */
    private checkWarnings(response: string, patches: PatchOperation[]): string[] {
        const warnings: string[] = [];

        // Check if response contains prose outside of patch tags
        const patchContent = this.extractPatchContent(response);
        const remainingContent = response.replace(patchContent, '').trim();

        if (remainingContent.length > 50) {
            warnings.push('Response contains text outside of patch tags (should be patch-only)');
        }

        // Check for very large replacements
        patches.forEach((patch, index) => {
            if (patch.type === 'replace' && patch.replacement) {
                const lines = patch.replacement.split('\n').length;
                if (lines > 200) {
                    warnings.push(`Patch ${index + 1}: Very large replacement (${lines} lines)`);
                }
            }
        });

        return warnings;
    }

    /**
     * Extract all patch content from response
     */
    private extractPatchContent(response: string): string {
        const singlePattern = new RegExp(
            `${this.escapeRegex(PATCH_TAGS.SINGLE_PATCH_OPEN)}[\\s\\S]*?${this.escapeRegex(PATCH_TAGS.SINGLE_PATCH_CLOSE)}`,
            'gi'
        );

        const multiPattern = new RegExp(
            `${this.escapeRegex(PATCH_TAGS.MULTI_PATCH_OPEN)}[\\s\\S]*?${this.escapeRegex(PATCH_TAGS.MULTI_PATCH_CLOSE)}`,
            'gi'
        );

        const singleMatches = response.match(singlePattern) || [];
        const multiMatches = response.match(multiPattern) || [];

        return [...singleMatches, ...multiMatches].join('\n');
    }

    /**
     * Escape regex special characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Check if response contains valid patch format (quick check)
     */
    hasValidFormat(response: string): boolean {
        const hasSingle = response.includes(PATCH_TAGS.SINGLE_PATCH_OPEN) &&
            response.includes(PATCH_TAGS.SINGLE_PATCH_CLOSE);
        const hasMulti = response.includes(PATCH_TAGS.MULTI_PATCH_OPEN) &&
            response.includes(PATCH_TAGS.MULTI_PATCH_CLOSE);

        return hasSingle || hasMulti;
    }
}

/**
 * Default export - singleton instance
 */
export const responseValidator = new ResponseValidator();

/**
 * Helper function to quickly validate a response
 */
export function validateResponse(response: string): ValidationResult {
    return responseValidator.validateResponse(response);
}
