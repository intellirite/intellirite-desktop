---
description: Complete development workflow for Intellirite AI Writing IDE
---

# Intellirite Development Workflow

This workflow breaks down the Intellirite implementation into optimized, sequential phases. Each phase builds upon the previous one, ensuring stable incremental progress.

---

## Phase 1: Foundation & Architecture Setup

**Goal**: Set up core utilities, types, and basic infrastructure

### Step 1.1: Create Type Definitions
Create `/src/types/ai-context.ts`:
- Define `FileContext`, `SelectionContext`, `ChatMessage` interfaces
- Define `PatchOperation` types (`insert`, `replace`, `delete`)
- Define `PatchPayload` and `MultiPatchPayload` structures

### Step 1.2: Create Configuration
Create `/src/config/ai-config.ts`:
- Define Gemini model constants (Flash vs Pro)
- Set context size limits (max tokens, max files)
- Define patch format templates
- Set safety thresholds (max rewrite size, approval triggers)

### Step 1.3: Set Up Utilities
Create `/src/utils/file-utils.ts`:
- Implement file parsing functions
- Line number to index conversion utilities
- File content validation

---

## Phase 2: Context Engine (The Brain)

**Goal**: Build the system that gathers and structures context for Gemini

### Step 2.1: Context Manager Core
Create `/src/lib/context-manager.ts`:
- Implement `ContextManager` class
- `getCurrentFileContext()` - extract full file content
- `getSelectionContext()` - extract selected text + line numbers
- `getCursorContext()` - get cursor position and surrounding lines

### Step 2.2: File Reference Parser
Create `/src/lib/reference-parser.ts`:
- Parse user input for `#filename.md` patterns
- Extract all referenced files
- Validate file existence
- Return list of `FileReference` objects

### Step 2.3: Content Summarizer
Create `/src/lib/content-summarizer.ts`:
- Implement smart summarization for long files
- Extract headings/structure for navigation
- Keep full content for files < 500 lines
- Generate 1-2 sentence summaries for others
- Preserve context around referenced sections

### Step 2.4: Context Assembler
Create `/src/lib/context-assembler.ts`:
- Combine all context sources into structured prompt
- Implement the exact format from roadmap section 3.2
- Add chat history (last 4-6 messages)
- Add system rules
- Calculate total token count
- Implement smart truncation if needed

---

## Phase 3: AI Integration & Prompt Engineering

**Goal**: Connect to Gemini and enforce structured output

### Step 3.1: Gemini Client Setup
Create `/src/lib/gemini-client.ts`:
- Initialize Gemini API client
- Implement model selection logic (Flash vs Pro)
- Auto-switch based on:
  - Context size
  - Number of referenced files
  - Task complexity
- Add retry logic and error handling

### Step 3.2: System Prompt Builder
Create `/src/lib/prompt-builder.ts`:
- Implement master system prompt from roadmap section 11
- Force JSON-only responses (no prose)
- Include safety rules:
  - No hallucinations
  - Maintain structure
  - Use patch format exclusively
- Define task-specific templates:
  - Rewrite selection
  - Insert content
  - Replace range
  - Explain/summarize

### Step 3.3: Response Validator
Create `/src/lib/response-validator.ts`:
- Validate Gemini returns valid JSON
- Check patch structure completeness
- Verify line numbers are valid
- Validate file references exist
- Return detailed error messages

---

## Phase 4: Patch System (The Engine)

**Goal**: Parse AI responses and prepare them for application

### Step 4.1: Patch Parser
Create `/src/lib/patch-parser.ts`:
- Parse `<patch>` and `<patches>` XML tags
- Extract JSON from response
- Handle single and multi-patch formats
- Normalize to standard `PatchOperation[]` array

### Step 4.2: Patch Validator
Create `/src/lib/patch-validator.ts`:
- Validate each patch operation:
  - File exists
  - Line numbers are valid (within file bounds)
  - Ranges are logical (start < end)
- Check for conflicts (overlapping patches)
- Calculate change size (for safety approval)

### Step 4.3: Patch Processor
Create `/src/lib/patch-processor.ts`:
- Convert line numbers to editor indices
- Calculate exact positions in TipTap/Monaco
- Generate preview/diff data
- Prepare undo/redo information

---

## Phase 5: Editor Integration

**Goal**: Apply changes safely to the editor with user control

### Step 5.1: Editor Bridge
Create `/src/lib/editor-bridge.ts`:
- Abstract layer for TipTap operations
- Implement methods:
  - `applyInsert(line, content)`
  - `applyReplace(startLine, endLine, content)`
  - `applyDelete(startLine, endLine)`
  - `highlightRange(start, end)`
  - `scrollToLine(line)`

### Step 5.2: Diff Generator
Create `/src/lib/diff-generator.ts`:
- Generate unified diff format
- Create before/after preview
- Highlight additions (green) and deletions (red)
- Support inline and side-by-side views

### Step 5.3: Change Applicator
Create `/src/lib/change-applicator.ts`:
- Main orchestrator for applying patches
- Implement transaction-based changes (all or nothing)
- Track change history for undo
- Emit events for UI updates

---

## Phase 6: User Interface Components

**Goal**: Build the UX for AI interactions

### Step 6.1: AI Chat Panel Enhancement
Update existing chat component:
- Add file reference autocomplete for `#` symbol
- Show referenced files as chips/tags
- Display context size indicator
- Show model selection (Flash/Pro) with auto-detection

### Step 6.2: Patch Preview Modal
Create `/src/components/PatchPreviewModal.tsx`:
- Display diff view
- Show list of files affected
- Per-file change count
- "Apply All" / "Apply Selected" / "Cancel" buttons
- "Show Diff" toggle
- Line-by-line review

### Step 6.3: Inline Change Indicator
Create `/src/components/InlineChangeIndicator.tsx`:
- Ghost text overlay (like Cursor)
- Highlight proposed changes in editor
- Accept/reject buttons inline
- Keyboard shortcuts (Tab to accept, Esc to reject)

### Step 6.4: Multi-File Change Dashboard
Create `/src/components/MultiFileChangeDashboard.tsx`:
- List all affected files
- Show change summary per file
- Allow selective application
- Batch operations

---

## Phase 7: Safety & Approval Flow

**Goal**: Ensure user control and prevent destructive changes

### Step 7.1: Change Size Analyzer
Create `/src/lib/safety-analyzer.ts`:
- Calculate change percentage
- Detect "risky" operations:
  - Full file rewrites (>80% changed)
  - Multiple file edits
  - Large deletions
- Require explicit approval for risky changes

### Step 7.2: Approval Flow Manager
Create `/src/lib/approval-manager.ts`:
- Queue changes requiring approval
- Track approval state
- Implement timeout for auto-discard
- Store approved patches temporarily

### Step 7.3: Undo/Redo System
Create `/src/lib/history-manager.ts`:
- Track all AI-applied changes separately
- Implement atomic undo (revert entire AI operation)
- Persist history across sessions
- Keyboard shortcuts (Cmd+Z for AI undo)

---

## Phase 8: Multi-File Operations

**Goal**: Enable complex cross-file editing

### Step 8.1: Multi-File Context Builder
Extend context assembler:
- Support multiple file contexts
- Smart deduplication
- Priority-based inclusion (referenced files first)
- Summarize non-critical files

### Step 8.2: Batch Patch Processor
Create `/src/lib/batch-processor.ts`:
- Process multiple patches in dependency order
- Detect file dependencies
- Apply patches atomically per file
- Rollback on failure

### Step 8.3: Cross-File Validation
Create `/src/lib/cross-file-validator.ts`:
- Check references remain valid after changes
- Validate internal links (#references)
- Ensure structural consistency

---

## Phase 9: Advanced Features

**Goal**: Polish and optimize the experience

### Step 9.1: Smart Context Optimization
Enhance context manager:
- Implement sliding window for large files
- Keep full content for ± 200 lines around selection
- Summarize rest
- Dynamic context based on available tokens

### Step 9.2: Task Templates
Create `/src/lib/task-templates.ts`:
- Pre-built prompts for common tasks:
  - "Make more academic"
  - "Fix grammar"
  - "Improve structure"
  - "Add citations"
  - "Summarize"
  - "Expand section"
- One-click application

### Step 9.3: Conversation Memory
Create `/src/lib/conversation-memory.ts`:
- Store last 4-6 messages per file
- Maintain context across sessions
- Implement smart summarization for old messages
- Clear memory on file switch

### Step 9.4: Performance Optimization
- Implement debouncing for real-time requests
- Cache file summaries
- Lazy-load referenced files
- Background context pre-building

---

## Phase 10: Testing & Validation

**Goal**: Ensure reliability and correctness

### Step 10.1: Unit Tests
Create tests for:
- Context assembly
- Patch parsing
- Line number conversion
- Validation logic

### Step 10.2: Integration Tests
Test full flows:
- Single file edit
- Multi-file edit
- Large file handling
- Error recovery

### Step 10.3: User Testing
- Test with real documents
- Verify academic writing quality
- Test edge cases (empty files, binary files)
- Performance benchmarks

---

## Phase 11: Polish & Documentation

**Goal**: Production-ready system

### Step 11.1: Error Handling
- User-friendly error messages
- Graceful degradation
- Offline mode handling
- API quota management

### Step 11.2: Settings & Configuration
Create user settings:
- Model preference (always Flash, always Pro, auto)
- Approval thresholds
- Context size preferences
- Keyboard shortcuts customization

### Step 11.3: Documentation
- User guide for AI features
- Keyboard shortcuts reference
- Best practices for prompts
- Troubleshooting guide

---

## Implementation Order (Recommended)

Execute phases in this order with verification at each step:

1. **Phase 1** → Set foundation ✓
2. **Phase 2** → Build context engine ✓
3. **Phase 3** → Connect Gemini ✓
4. **Phase 4** → Implement patch system ✓
5. **Phase 5** → Integrate with editor ✓
6. **Phase 6** → Build UI components ✓
7. **Phase 7** → Add safety features ✓
8. **Phase 8** → Enable multi-file editing ✓
9. **Phase 9** → Advanced features ✓
10. **Phase 10** → Testing ✓
11. **Phase 11** → Polish ✓

---

## Testing After Each Phase

After completing each phase, verify:
- All new modules have tests
- No regressions in existing features
- Performance is acceptable
- UI is responsive

---

## Notes

- **Atomic Development**: Each step should be independently testable
- **No Skipping**: Don't skip to UI before backend is solid
- **Incremental**: Always have a working version
- **Document**: Update docs as you build
- **User Feedback**: Test with real content early and often
