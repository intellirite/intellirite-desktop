# 🎯 How to Use the Cursor-Style Diff Feature

## Overview

IntelliRite now has a **professional diff viewer** just like Cursor IDE! When the AI suggests changes, you'll see a beautiful visual diff with line-by-line highlighting and Accept/Reject buttons.

---

## 🚀 Quick Start

### Step 1: Open a File

1. Click **"Open Folder"** in IntelliRite
2. Select your project folder
3. Click on a file to open it (e.g., `baby.md`)

### Step 2: Ask AI to Edit

In the chat panel, ask the AI to make changes:

**Examples:**

```
"Rewrite this to be more professional"
"Fix all grammar errors"
"Make this sound more formal"
"Improve the writing quality"
"Add a proper introduction"
```

### Step 3: See the Diff

You'll see a beautiful diff viewer appear:

```
┌────────────────────────────────────────────────┐
│ 🔧 1 Change Suggested                          │
│ Review and apply changes to your file          │
│                          [✕ Reject] [✓ Accept] │
├────────────────────────────────────────────────┤
│ ▶ ✏️ Replace Text       Lines 1-3              │
│ ┌──────────────────────────────────────────┐   │
│ │ 📄 baby.md    Lines 1-3 [Unified][Split] │   │
│ │ ──────────────────────────────────────── │   │
│ │  1  - Old text here                      │   │
│ │  1  + New professional text              │   │
│ │  2  - More old content                   │   │
│ │  2  + Improved version                   │   │
│ │                                           │   │
│ │ +2 additions • -2 deletions               │   │
│ │                       [✕ Reject][✓Accept]│   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

### Step 4: Accept or Reject

- Click **"✓ Accept"** to apply the changes to your file
- Click **"✕ Reject"** to dismiss the suggestion
- For multiple patches, use **"Accept All"** or **"Reject All"**

---

## 🎨 UI Features

### Visual Highlights

- 🟢 **Green background** = Added lines
- 🔴 **Red background** = Removed lines
- **Line numbers** on the left
- **+/−** markers in the middle
- **Actual content** on the right

### Two View Modes

#### 1. **Unified View** (Default)

Shows old and new lines together with +/− markers

```
1  - Old line
1  + New line
2    Unchanged line
```

#### 2. **Split View**

Shows original and modified side-by-side

```
Original          │  Modified
──────────────────┼──────────────────
1  Old content    │  1  New content
2  More old       │  2  Improved
```

### Smart Statistics

At the bottom of each diff:

```
+5 additions • -3 deletions
```

---

## 💡 Advanced Usage

### Multiple File Edits

If you have multiple files open or reference them with `@filename`:

```
"Compare @config.json with the current file and update both"
```

You'll see multiple diff viewers, one for each file.

### Line-Specific Edits

The AI can target specific line ranges:

```
"Improve lines 5-10"
"Rewrite the introduction (first 3 paragraphs)"
```

### Partial Acceptance

- Expand patches individually (click the ▶ arrow)
- Accept only the changes you want
- Reject the rest

---

## 🔧 Technical Details

### How It Works

1. **AI generates a patch** in XML format:

   ```xml
   <patch>
   {
     "file": "baby.md",
     "type": "replace",
     "target": { "startLine": 1, "endLine": 3 },
     "replacement": "New content..."
   }
   </patch>
   ```

2. **Parser extracts the patch** from the response
3. **DiffViewer shows the changes** visually
4. **User accepts** → Content updates in editor
5. **Auto-save** triggers → File saved to disk

### Patch Types

| Type      | Icon | What It Does                        |
| --------- | ---- | ----------------------------------- |
| `replace` | ✏️   | Replaces lines X-Y with new content |
| `insert`  | ✨   | Inserts content at line X           |
| `delete`  | 🗑️   | Removes lines X-Y                   |

### Content Conversion

- Editor uses HTML (TipTap)
- Patches use plain text
- Conversion happens automatically
- Markdown, code, and formatting preserved

---

## 🐛 Troubleshooting

### "Nothing happens when I click Accept"

**Check the console** (F12) for these logs:

```
🔧 Applying patch: { file: "baby.md", ... }
📄 Current content length: 123
✨ New content length: 456
✅ Patch applied via TipTap commands
```

**If you see:**

- `❌ Cannot apply patch: no editor instance` → Editor ref not set
- `❌ No method to update editor` → Editor API issue
- `Error applying patch:` → Patch format problem

**Solutions:**

1. Make sure a file is open in the editor
2. Refresh the page and try again
3. Check that `editorRef` is connected in App.tsx

### "Diff doesn't show, just see raw XML"

**Check for:**

- `🎨 Rendering PatchPreview` in console
- `hasPatches: true` in the parsed response

**Solutions:**

1. Verify the response contains `<patch>` tags
2. Check that patches are being extracted
3. Refresh and try again

### "UI looks broken"

**Try:**

1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear cache and reload
3. Check for console errors

---

## 🎉 Success Indicators

When everything works, you should see:

✅ **Console logs:**

```
📦 Found patch matches: 1
✅ Parsed patch data: { ... }
✅ Added normalized patch: { ... }
📊 Parse complete: { hasPatches: true, patchCount: 1 }
💬 Rendering message with patches: { ... }
🎨 PatchPreview rendering: { ... }
🎯 Accept button clicked for patch: { ... }
🔧 Applying patch: { ... }
✅ Patch applied via TipTap commands
```

✅ **Visual UI:**

- Beautiful diff viewer appears
- Green/red highlighting
- Accept/Reject buttons work
- Changes apply immediately

✅ **Editor updates:**

- Content changes in real-time
- Auto-save triggers
- File saved to disk

---

## 📝 Pro Tips

1. **Ask clearly**: "Rewrite this" works better than "maybe change it"
2. **Be specific**: "Make it more formal" > "improve it"
3. **Review changes**: Always review the diff before accepting
4. **Use Split view**: For large changes, split view is clearer
5. **Accept selectively**: You don't have to accept all patches

---

## 🎨 Customization

The diff colors match your theme:

- **Dark theme**: Subtle green/red with good contrast
- **Light theme**: Bright, clear colors
- **Grey theme**: Muted, professional look

All colors use CSS variables, so they adapt automatically!

---

## ✨ What Makes This Amazing

✅ **Visual clarity** - See exactly what will change
✅ **Full control** - Accept or reject individual changes
✅ **Professional UI** - Looks like Cursor IDE
✅ **Smart parsing** - Automatically detects patches
✅ **Fast** - Real-time updates
✅ **Reliable** - Handles edge cases
✅ **Beautiful** - Smooth animations and polish

**Enjoy your new diff feature!** 🚀
