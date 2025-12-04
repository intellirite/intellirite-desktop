import { useState } from 'react';
import { DiffViewer } from './DiffViewer';

export interface Patch {
  file: string;
  type: 'insert' | 'replace' | 'delete';
  line?: number;
  target?: {
    startLine: number;
    endLine: number;
  };
  content?: string;
  replacement?: string;
}

interface PatchPreviewProps {
  patches: Patch[];
  currentFileContent: string;
  currentFileName: string;
  onAcceptPatch: (patch: Patch) => void;
  onRejectPatch: (patch: Patch) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

/**
 * PatchPreview - Shows AI-suggested changes with accept/reject
 * Displays patches as visual diffs like Cursor IDE
 */
export function PatchPreview({
  patches,
  currentFileContent,
  currentFileName,
  onAcceptPatch,
  onRejectPatch,
  onAcceptAll,
  onRejectAll,
}: PatchPreviewProps) {
  const [expandedPatches, setExpandedPatches] = useState<Set<number>>(
    new Set(patches.map((_, i) => i))
  );

  const togglePatch = (index: number) => {
    setExpandedPatches((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (patches.length === 0) {
    return null;
  }

  return (
    <div className="patch-preview space-y-3">
      {/* Header with bulk actions */}
      {patches.length > 1 && (
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              🔧 {patches.length} change{patches.length > 1 ? 's' : ''} suggested
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRejectAll}
              className="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={onAcceptAll}
              className="px-3 py-1 text-xs font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      )}

      {/* Individual patches */}
      {patches.map((patch, index) => {
        const isExpanded = expandedPatches.has(index);
        const { original, modified, startLine, endLine } = extractPatchContent(
          patch,
          currentFileContent
        );

        return (
          <div key={index} className="patch-item">
            {/* Patch header */}
            <div
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-t-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              onClick={() => togglePatch(index)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {getPatchTypeLabel(patch.type)}
                  {startLine && endLine && (
                    <span className="text-xs text-[var(--text-tertiary)] ml-2">
                      Lines {startLine}-{endLine}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Patch content */}
            {isExpanded && (
              <div className="border-x border-b border-[var(--border-primary)] rounded-b-lg overflow-hidden">
                <DiffViewer
                  originalContent={original}
                  modifiedContent={modified}
                  fileName={currentFileName}
                  startLine={startLine}
                  endLine={endLine}
                  onAccept={() => onAcceptPatch(patch)}
                  onReject={() => onRejectPatch(patch)}
                  showActions={true}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Extract original and modified content for a patch
 */
function extractPatchContent(
  patch: Patch,
  fileContent: string
): {
  original: string;
  modified: string;
  startLine: number;
  endLine: number;
} {
  const lines = fileContent.split('\n');

  switch (patch.type) {
    case 'replace': {
      if (!patch.target) {
        return {
          original: '',
          modified: patch.replacement || '',
          startLine: 1,
          endLine: 1,
        };
      }

      const { startLine, endLine } = patch.target;
      const original = lines.slice(startLine - 1, endLine).join('\n');
      const modified = patch.replacement || '';

      return {
        original,
        modified,
        startLine,
        endLine,
      };
    }

    case 'insert': {
      const lineNum = patch.line || 1;
      return {
        original: '',
        modified: patch.content || '',
        startLine: lineNum,
        endLine: lineNum,
      };
    }

    case 'delete': {
      if (!patch.target) {
        return {
          original: '',
          modified: '',
          startLine: 1,
          endLine: 1,
        };
      }

      const { startLine, endLine } = patch.target;
      const original = lines.slice(startLine - 1, endLine).join('\n');

      return {
        original,
        modified: '',
        startLine,
        endLine,
      };
    }

    default:
      return {
        original: '',
        modified: '',
        startLine: 1,
        endLine: 1,
      };
  }
}

/**
 * Get human-readable label for patch type
 */
function getPatchTypeLabel(type: Patch['type']): string {
  switch (type) {
    case 'insert':
      return '➕ Insert';
    case 'replace':
      return '✏️ Replace';
    case 'delete':
      return '🗑️ Delete';
    default:
      return '📝 Change';
  }
}

