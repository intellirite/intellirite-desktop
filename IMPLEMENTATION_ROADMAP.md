Core Objective

Enable Gemini to:

Understand multiple files (context window)

Edit the currently open file

Add or modify content with precise patches

Write structured, literary, academic content

Modify long paragraphs safely

Handle multi-file references (#chapter1.md, #notes.md etc.)

Maintain semantic and structural integrity

1 — Architecture Overview
1.1 Components

Context Builder

Converts open files + selected files + conversation history → a compressed prompt

AI Instruction Orchestrator

Builds system prompt + task instructions

Patch Generator (AI Response)

Gemini responds with diff/patch or replacement blocks

Patch Parser

Parses the returned patch format into actual file edits

Editor Integration

Applies changes to TipTap/Monaco editor

2 — Context Sources

Gemini needs maximum context to write accurately.

Sources to include:
1. Open File

Always send full content of currently open file

Include cursor position range (start, end)

Include selected text (if exists)

2. Additional Referenced Files

If user says:

“use #chapter1.md and #notes.md”

Then include:

filenames

file contents

short summaries (auto-summarized if too long)

3. Recent Chat Messages

Keep last 4–6 messages for memory.

4. System Instructions

Your custom rules for:

academic style

structure

citations

no hallucination

patch format

3 — Context Building Logic (Very Important)
3.1 Context Assembly Flow
1. Identify open file → include full text
2. Check for explicit references (#file.md) → load them
3. Generate 1–2 sentence summaries for long referenced files
4. Identify the selected text → include separately
5. Load user’s last 5 chat messages
6. Combine into structured prompt

3.2 Use format like this:
# CURRENT FILE (chapter2.md)
<content>

# USER SELECTION
<selected_text>

# REFERENCED FILES
## file: chapter1.md (summary included / full if short)
<content or summary>

## file: notes.md (full)
<content>

# SYSTEM RULES
- You are modifying files using structured patches.
- Only respond in patch format (specified below).
- Do not rewrite entire document unless asked.
- Maintain structure.
- Do not hallucinate citations.

# USER REQUEST
Rewrite this section to be more academic.

4 — Patch Format (The Most Critical Part)

Gemini should return structured patches, NOT plain text.

Use the safest modern patch format:

4.1 Recommended Patch Format
<patch>
{
  "file": "chapter2.md",
  "type": "replace",
  "target": {
     "startLine": 45,
     "endLine": 63
  },
  "replacement": "New rewritten content here..."
}
</patch>


Or multiple:

<patches>
[
  {
    "file": "chapter2.md",
    "type": "insert",
    "line": 120,
    "content": "Inserted paragraph..."
  },
  {
    "file": "chapter1.md",
    "type": "replace",
    "target": { "startLine": 20, "endLine": 25 },
    "replacement": "Updated intro..."
  }
]
</patches>

5 — Editor Integration (Execution Layer)
5.1 Steps to Apply Patch

Parse JSON

Determine file to edit

Calculate indexes using line numbers

Apply patch inside TipTap/Editor

Highlight the changed area

Show a diff view (optional but powerful)

Allow undo via one shortcut

5.2 Safety Features

Validate JSON

Validate line range

Reject overly large rewrites unless user approves

Provide "approve → apply" flow (like Cursor's ghost changes)

6 — User Interaction UX (Cursor-Like)
6.1 Interaction Flow

User selects text → writes question → Gemini responds → patch appears → user reviews → apply.

6.2 “Apply / Discard / Edit” Popup

After response:

“Apply Changes”

“Show Diff”

“Cancel”

“Edit Patch” (allows modifying AI output)

6.3 Drag AI text → into editor

Already in your UI — now attach patch logic.

7 — Multi-File Editing Flow

When user requests multi-file editing:

“Fix grammar in all chapters.”
“Improve intro of #chapter1.md and #chapter2.md.”

Steps:

Detect referenced files

Build summaries if too long

Ask Gemini for structured multi-patch output

Show a list:

chapter1.md — 2 changes
chapter2.md — 1 change


User clicks → see diff → apply.

8 — Context Size Optimization
If files are too large:

Summarize sections beyond the selected range

Include full content of:

selected text

+/- 200 lines around cursor

Keep total context < model limit.
9 — Gemini Model Recommendations

Use:

Gemini 1.5 Flash for small, fast tasks

Gemini 1.5 Pro for:

long writing

multi-file edits

academic tasks

Implement auto-switching based on:

prompt length

file references

10 — Detailed Step-by-Step Implementation Plan
Phase 1: Context Engine

Create a “context manager” that knows:

current file

selection

referenced files

file tree

Implement file summary engine (local LLMLight or simple headings parser)

Build JSON for context block

Phase 2: Structured Prompts

Write system prompt for patch format

Force Gemini into JSON-mode with safety checks

Build templates:

rewrite selection

insert content

replace range

explain content

summarize

Phase 3: Patch Parsing

Implement JSON parser

Handle:

insert

replace

delete

Add error handling:

missing fields

invalid line numbers

Phase 4: Editor Application

Translate line numbers → editor indexes

Highlight changed areas

Add approval flow

Implement diff view

Phase 5: Multi-File Editing

Loop through patches

Show per-file diff list

Apply each independently

11 — Example Prompt to Gemini (You Will Implement This)
You are an AI writing engine for the Intellirite IDE.
You will return ONLY JSON patches, no prose.

# TASK
Rewrite the selected section to be more formal and academic.

# CURRENT FILE (chapter2.md)
<file contents>

# SELECTION (lines 45-63)
<selection>

# OUTPUT FORMAT
<patch>{
  "file": "chapter2.md",
  "type": "replace",
  "target": { "startLine": 45, "endLine": 63 },
  "replacement": "..."
}</patch>


Gemini responds in perfect patch format.