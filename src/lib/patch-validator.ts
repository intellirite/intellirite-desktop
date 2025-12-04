// Patch Validator
// Validates patches against file content and safety thresholds

import { ValidatedPatch, SafetyCheck } from '../types/ai-context';
import { SAFETY_THRESHOLDS } from '../config/ai-config';
import { countLines } from '../utils/file-utils';

/**
 * Patch Validator
 * Performs safety checks and validation on patches
 */
export class PatchValidator {
    /**
     * Perform comprehensive safety check on a patch
     */
    performSafetyCheck(
        patch: ValidatedPatch,
        fileContent: string
    ): SafetyCheck {
        const reasons: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let requiresApproval = false;

        // Check 1: Change percentage
        const percentageRisk = this.assessPercentageRisk(patch.changePercentage);
        if (percentageRisk.level !== 'low') {
            riskLevel = this.escalateRisk(riskLevel, percentageRisk.level);
            reasons.push(percentageRisk.reason);
            requiresApproval = true;
        }

        // Check 2: Line count
        const lineRisk = this.assessLineCountRisk(patch, fileContent);
        if (lineRisk.level !== 'low') {
            riskLevel = this.escalateRisk(riskLevel, lineRisk.level);
            reasons.push(lineRisk.reason);
            requiresApproval = true;
        }

        // Check 3: File size
        const fileSize = countLines(fileContent);
        if (fileSize < SAFETY_THRESHOLDS.MIN_FILE_SIZE_FOR_CHECKS) {
            // Small files are safer
            riskLevel = 'low';
        }

        // Check 4: Full file rewrite detection
        if (patch.changePercentage > SAFETY_THRESHOLDS.RISK_LEVELS.CRITICAL * 100) {
            riskLevel = 'critical';
            reasons.push('Modifying more than 80% of the file');
            requiresApproval = true;
        }

        const isSafe = riskLevel === 'low';
        const recommendation = this.getRecommendation(riskLevel, reasons);

        return {
            isSafe,
            riskLevel,
            reasons,
            requiresApproval,
            recommendation,
        };
    }

    /**
     * Assess risk based on change percentage
     */
    private assessPercentageRisk(changePercentage: number): {
        level: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
    } {
        const percentage = changePercentage / 100; // Convert to 0-1 scale

        if (percentage > SAFETY_THRESHOLDS.RISK_LEVELS.CRITICAL) {
            return {
                level: 'critical',
                reason: `Very large change (${changePercentage.toFixed(1)}% of file)`,
            };
        } else if (percentage > SAFETY_THRESHOLDS.RISK_LEVELS.HIGH) {
            return {
                level: 'high',
                reason: `Large change (${changePercentage.toFixed(1)}% of file)`,
            };
        } else if (percentage > SAFETY_THRESHOLDS.RISK_LEVELS.MEDIUM) {
            return {
                level: 'medium',
                reason: `Moderate change (${changePercentage.toFixed(1)}% of file)`,
            };
        }

        return {
            level: 'low',
            reason: 'Small change',
        };
    }

    /**
     * Assess risk based on line count
     */
    private assessLineCountRisk(
        patch: ValidatedPatch,
        fileContent: string
    ): {
        level: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
    } {
        let linesAffected = 0;

        if (patch.type === 'insert') {
            linesAffected = (patch.content || '').split('\n').length;
        } else if (patch.target) {
            linesAffected = patch.target.endLine - patch.target.startLine + 1;
        }

        if (linesAffected > SAFETY_THRESHOLDS.MAX_AUTO_CHANGE_LINES * 2) {
            return {
                level: 'high',
                reason: `Very large line count (${linesAffected} lines)`,
            };
        } else if (linesAffected > SAFETY_THRESHOLDS.MAX_AUTO_CHANGE_LINES) {
            return {
                level: 'medium',
                reason: `Large line count (${linesAffected} lines)`,
            };
        }

        return {
            level: 'low',
            reason: 'Acceptable line count',
        };
    }

    /**
     * Escalate risk level to higher severity
     */
    private escalateRisk(
        current: 'low' | 'medium' | 'high' | 'critical',
        newRisk: 'low' | 'medium' | 'high' | 'critical'
    ): 'low' | 'medium' | 'high' | 'critical' {
        const levels = ['low', 'medium', 'high', 'critical'];
        const currentIndex = levels.indexOf(current);
        const newIndex = levels.indexOf(newRisk);

        return levels[Math.max(currentIndex, newIndex)] as any;
    }

    /**
     * Get recommendation based on risk level
     */
    private getRecommendation(
        riskLevel: 'low' | 'medium' | 'high' | 'critical',
        reasons: string[]
    ): string {
        const recommendations = {
            low: 'Safe to apply automatically',
            medium: 'Review recommended before applying',
            high: 'Careful review required - significant changes',
            critical: 'Critical review required - major file modification',
        };

        let rec = recommendations[riskLevel];

        if (reasons.length > 0) {
            rec += `. Concerns: ${reasons.join(', ')}`;
        }

        return rec;
    }

    /**
     * Validate multiple patches with safety checks
     */
    validatePatches(
        patches: ValidatedPatch[],
        fileContents: Map<string, string>
    ): Array<{
        patch: ValidatedPatch;
        safetyCheck: SafetyCheck;
    }> {
        return patches.map(patch => {
            const content = fileContents.get(patch.file);
            if (!content) {
                return {
                    patch,
                    safetyCheck: {
                        isSafe: false,
                        riskLevel: 'critical' as const,
                        reasons: [`File not found: ${patch.file}`],
                        requiresApproval: true,
                        recommendation: 'Cannot apply - file not found',
                    },
                };
            }

            const safetyCheck = this.performSafetyCheck(patch, content);
            return { patch, safetyCheck };
        });
    }

    /**
     * Check if multi-file changes require approval
     */
    checkMultiFileApproval(patches: ValidatedPatch[]): boolean {
        const uniqueFiles = new Set(patches.map(p => p.file));
        return uniqueFiles.size > SAFETY_THRESHOLDS.MAX_AUTO_MULTI_FILE_CHANGES;
    }

    /**
     * Get overall safety assessment for batch of patches
     */
    getBatchSafetyCheck(
        patches: Array<{ patch: ValidatedPatch; safetyCheck: SafetyCheck }>
    ): SafetyCheck {
        const allReasons: string[] = [];
        let highestRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let anyRequireApproval = false;

        patches.forEach(({ safetyCheck }) => {
            allReasons.push(...safetyCheck.reasons);
            highestRisk = this.escalateRisk(highestRisk, safetyCheck.riskLevel);
            if (safetyCheck.requiresApproval) {
                anyRequireApproval = true;
            }
        });

        // Check multi-file
        const uniqueFiles = new Set(patches.map(p => p.patch.file));
        if (uniqueFiles.size > SAFETY_THRESHOLDS.MAX_AUTO_MULTI_FILE_CHANGES) {
            highestRisk = this.escalateRisk(highestRisk, 'medium');
            allReasons.push(`Modifying ${uniqueFiles.size} files`);
            anyRequireApproval = true;
        }

        return {
            isSafe: highestRisk === 'low' && !anyRequireApproval,
            riskLevel: highestRisk,
            reasons: Array.from(new Set(allReasons)), // Deduplicate
            requiresApproval: anyRequireApproval,
            recommendation: this.getRecommendation(highestRisk, allReasons),
        };
    }

    /**
     * Check if a patch should be auto-applied (no approval needed)
     */
    canAutoApply(patch: ValidatedPatch, fileContent: string): boolean {
        const safetyCheck = this.performSafetyCheck(patch, fileContent);
        return safetyCheck.isSafe && !safetyCheck.requiresApproval;
    }
}

/**
 * Default export - singleton instance
 */
export const patchValidator = new PatchValidator();

/**
 * Helper function to quickly perform safety check
 */
export function performSafetyCheck(
    patch: ValidatedPatch,
    fileContent: string
): SafetyCheck {
    return patchValidator.performSafetyCheck(patch, fileContent);
}
