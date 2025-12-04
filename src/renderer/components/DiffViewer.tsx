import { useState } from 'react';

interface DiffLine {
  lineNumber?: number;
  type: 'unchanged' | 'added' | 'removed' | 'context';
  content: string;
}

interface DiffViewerProps {
  originalContent: string;
  modifiedContent: string;
  fileName?: string;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  startLine?: number;
  endLine?: number;
}

/**
 * DiffViewer - Shows side-by-side or unified diff view
 * Displays changes with add/remove highlighting like Cursor IDE
 */
export function DiffViewer({
  originalContent,
  modifiedContent,
  fileName,
  onAccept,
  onReject,
  showActions = true,
  startLine = 1,
  endLine,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  // Generate diff lines
  const diffLines = generateDiff(originalContent, modifiedContent, startLine);

  return (
    <div className="diff-viewer border border-[var(--border-primary)] rounded-lg overflow-hidden bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="diff-header flex items-center justify-between px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2">
          {fileName && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              📄 {fileName}
            </span>
          )}
          {startLine && endLine && (
            <span className="text-xs text-[var(--text-tertiary)]">
              Lines {startLine}-{endLine}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded p-1">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'unified'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'split'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Split
            </button>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              <button
                onClick={onReject}
                className="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onAccept}
                className="px-3 py-1 text-xs font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded transition-colors"
              >
                Accept
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="diff-content overflow-auto max-h-[400px]">
        {viewMode === 'unified' ? (
          <UnifiedDiffView lines={diffLines} />
        ) : (
          <SplitDiffView
            originalContent={originalContent}
            modifiedContent={modifiedContent}
            startLine={startLine}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Unified diff view (like git diff)
 */
function UnifiedDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="unified-diff font-mono text-xs">
      {lines.map((line, index) => (
        <div
          key={index}
          className={`diff-line flex ${
            line.type === 'added'
              ? 'bg-green-500/10 text-green-600'
              : line.type === 'removed'
              ? 'bg-red-500/10 text-red-600'
              : 'text-[var(--text-primary)]'
          }`}
        >
          <div className="line-number w-12 flex-shrink-0 px-2 py-1 text-right text-[var(--text-tertiary)] select-none">
            {line.lineNumber || ''}
          </div>
          <div className="line-marker w-6 flex-shrink-0 px-1 py-1 font-bold select-none">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </div>
          <div className="line-content flex-1 px-2 py-1 whitespace-pre overflow-x-auto">
            {line.content}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Split diff view (side-by-side)
 */
function SplitDiffView({
  originalContent,
  modifiedContent,
  startLine,
}: {
  originalContent: string;
  modifiedContent: string;
  startLine: number;
}) {
  const originalLines = originalContent.split('\n');
  const modifiedLines = modifiedContent.split('\n');
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  return (
    <div className="split-diff grid grid-cols-2 gap-0 font-mono text-xs">
      {/* Original (left) */}
      <div className="original border-r border-[var(--border-primary)]">
        <div className="header px-4 py-1 bg-red-500/10 text-red-600 font-medium text-xs border-b border-[var(--border-primary)]">
          Original
        </div>
        {originalLines.map((line, index) => (
          <div key={index} className="diff-line flex bg-red-500/5">
            <div className="line-number w-12 flex-shrink-0 px-2 py-1 text-right text-[var(--text-tertiary)] select-none">
              {startLine + index}
            </div>
            <div className="line-content flex-1 px-2 py-1 whitespace-pre overflow-x-auto text-[var(--text-primary)]">
              {line}
            </div>
          </div>
        ))}
      </div>

      {/* Modified (right) */}
      <div className="modified">
        <div className="header px-4 py-1 bg-green-500/10 text-green-600 font-medium text-xs border-b border-[var(--border-primary)]">
          Modified
        </div>
        {modifiedLines.map((line, index) => (
          <div key={index} className="diff-line flex bg-green-500/5">
            <div className="line-number w-12 flex-shrink-0 px-2 py-1 text-right text-[var(--text-tertiary)] select-none">
              {startLine + index}
            </div>
            <div className="line-content flex-1 px-2 py-1 whitespace-pre overflow-x-auto text-[var(--text-primary)]">
              {line}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Generate unified diff lines
 */
function generateDiff(
  original: string,
  modified: string,
  startLine: number = 1
): DiffLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const diffLines: DiffLine[] = [];

  // Simple line-by-line diff (can be enhanced with proper diff algorithm)
  const maxLength = Math.max(originalLines.length, modifiedLines.length);
  
  let lineNumber = startLine;
  
  for (let i = 0; i < maxLength; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];

    if (origLine === modLine) {
      // Unchanged line
      diffLines.push({
        lineNumber: lineNumber++,
        type: 'unchanged',
        content: origLine || '',
      });
    } else {
      // Changed line - show both removed and added
      if (origLine !== undefined) {
        diffLines.push({
          lineNumber: lineNumber,
          type: 'removed',
          content: origLine,
        });
      }
      if (modLine !== undefined) {
        diffLines.push({
          lineNumber: lineNumber,
          type: 'added',
          content: modLine,
        });
      }
      lineNumber++;
    }
  }

  return diffLines;
}

