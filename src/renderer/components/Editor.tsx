import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Focus } from "@tiptap/extension-focus";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { createLowlight } from "lowlight";
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";

// Import languages for syntax highlighting
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import markdown from "highlight.js/lib/languages/markdown";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";

// Create lowlight instance and register languages
const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("css", css);
lowlight.register("html", html);
lowlight.register("xml", html);
lowlight.register("json", json);
lowlight.register("python", python);
lowlight.register("bash", bash);
lowlight.register("sh", bash);
lowlight.register("markdown", markdown);
lowlight.register("java", java);
lowlight.register("cpp", cpp);
lowlight.register("c", cpp);
lowlight.register("go", go);
lowlight.register("rust", rust);
lowlight.register("php", php);
lowlight.register("ruby", ruby);
lowlight.register("sql", sql);
lowlight.register("yaml", yaml);
lowlight.register("yml", yaml);

interface EditorProps {
  content: string;
  onChange?: (content: string) => void;
  onUpdate?: (isModified: boolean) => void;
  onCursorChange?: (line: number, column: number) => void;
  editable?: boolean;
}

/**
 * Advanced Editor component using TipTap with extensive features
 */
export const Editor = forwardRef<any, EditorProps>(function Editor(
  {
    content,
    onChange,
    onUpdate,
    onCursorChange,
    editable = true,
  },
  ref
) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [currentLine, setCurrentLine] = useState(1);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "editor-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "editor-link",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "editor-image",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "editor-task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "editor-task-item",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Color,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Focus.configure({
        className: "editor-focused",
        mode: "all",
      }),
      Dropcursor.configure({
        color: "var(--accent-primary)",
        width: 2,
      }),
      Gapcursor,
    ],
    content: content || "",
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      onUpdate?.(html !== content);
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none px-4 py-3",
      },
    },
  });

  // Expose editor instance to parent via ref
  useImperativeHandle(ref, () => editor, [editor]);

  // Track cursor position and line count based on visual lines
  useEffect(() => {
    if (!editor || !editorContentRef.current) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let lastLine = 1;
    let lastColumn = 1;

    const updateLineNumbers = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const { state } = editor.view;
        const { selection } = state;
        const { $anchor } = selection;
        const doc = state.doc;
        const pos = $anchor.pos;

        // Get the actual DOM element to count visual lines
        const editorElement = editorContentRef.current?.querySelector(
          ".ProseMirror"
        ) as HTMLElement;

        let calculatedLineCount = 1;
        let calculatedCursorLine = 1;

        if (editorElement) {
          // Count visual lines by counting block elements (p, h1-h6, pre, etc.)
          // Each block element represents a visual line in TipTap
          const blockElements = editorElement.querySelectorAll(
            "p, h1, h2, h3, h4, h5, h6, pre, blockquote, li"
          );
          let blockCount = blockElements.length;

          // Count hard breaks (<br> tags)
          const brElements = editorElement.querySelectorAll("br");
          blockCount += brElements.length;

          // Count newlines in text content (for code blocks or pre-formatted text)
          const fullText = editorElement.textContent || "";
          const newlineCount = (fullText.match(/\n/g) || []).length;
          calculatedLineCount = Math.max(1, blockCount + newlineCount);

          // Calculate cursor line using DOM selection position
          try {
            const domSelection = window.getSelection();
            if (
              domSelection &&
              domSelection.rangeCount > 0 &&
              domSelection.anchorNode
            ) {
              const range = document.createRange();
              range.setStart(
                domSelection.anchorNode,
                Math.min(
                  domSelection.anchorOffset,
                  domSelection.anchorNode.textContent?.length || 0
                )
              );
              range.setEnd(
                domSelection.anchorNode,
                Math.min(
                  domSelection.anchorOffset,
                  domSelection.anchorNode.textContent?.length || 0
                )
              );

              const rect = range.getBoundingClientRect();
              const editorRect = editorElement.getBoundingClientRect();
              const lineHeight =
                parseFloat(getComputedStyle(editorElement).lineHeight) || 24;
              const paddingTop =
                parseFloat(getComputedStyle(editorElement).paddingTop) || 16;

              const relativeTop =
                rect.top -
                editorRect.top +
                editorElement.scrollTop -
                paddingTop;
              calculatedCursorLine = Math.max(
                1,
                Math.floor(relativeTop / lineHeight) + 1
              );
            }
          } catch (e) {
            // Fallback to document-based calculation
            const textBefore = doc.textBetween(0, pos, "\n");
            calculatedCursorLine = Math.max(
              1,
              (textBefore.match(/\n/g) || []).length + 1
            );
          }
        }

        // Fallback: count by document structure if DOM method didn't work
        if (calculatedLineCount === 1 && doc.content.size > 0) {
          // Count block nodes (each is a visual line)
          let blockCount = 0;
          doc.descendants((node) => {
            if (node.isBlock) blockCount++;
          });

          // Count newlines in text content
          const fullText = doc.textContent || "";
          const newlineCount = (fullText.match(/\n/g) || []).length;
          calculatedLineCount = Math.max(1, blockCount + newlineCount);

          const textBefore = doc.textBetween(0, pos, "\n");
          calculatedCursorLine = Math.max(
            1,
            (textBefore.match(/\n/g) || []).length + 1
          );
        }

        // Calculate column position
        const textBefore = doc.textBetween(0, pos, "\n");
        const lines = textBefore.split("\n");
        const column = (lines[lines.length - 1] || "").length + 1;

        // Update states
        setLineCount(calculatedLineCount);
        setCurrentLine(calculatedCursorLine);

        // Only update if position actually changed
        if (calculatedCursorLine !== lastLine || column !== lastColumn) {
          lastLine = calculatedCursorLine;
          lastColumn = column;
          onCursorChange?.(calculatedCursorLine, column);
        }
      }, 100); // Slightly longer debounce for DOM measurements
    };

    // Listen to selection updates and content updates
    editor.on("selectionUpdate", updateLineNumbers);
    editor.on("update", updateLineNumbers);

    // Initial update
    updateLineNumbers();

    return () => {
      clearTimeout(timeoutId);
      editor.off("selectionUpdate", updateLineNumbers);
      editor.off("update", updateLineNumbers);
    };
  }, [editor, onCursorChange]);

  useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      // Only update if content actually changed (avoid infinite loops)
      if (content !== currentContent && content !== undefined) {
        // If content is markdown (doesn't start with <), parse it
        if (
          content &&
          !content.trim().startsWith("<") &&
          content.trim().length > 0
        ) {
          // TipTap can parse markdown directly
          editor.commands.setContent(content);
        } else {
          editor.commands.setContent(content || "");
        }
      }
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
        Loading editor...
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
    disabled = false,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        px-2.5 py-1.5 rounded text-sm transition-all duration-200 ease-in-out
        flex items-center justify-center min-w-[32px]
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : isActive
            ? "bg-[var(--accent-primary)] text-white shadow-sm"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        }
      `}
    >
      {children}
    </button>
  );

  const ToolbarSeparator = () => (
    <div className="w-px h-6 bg-[var(--border-primary)] mx-1" />
  );

  const handleAddLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    setLinkUrl(previousUrl || "");
    setShowLinkDialog(true);
  };

  const handleInsertLink = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl, target: "_blank" })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  const handleAddImage = () => {
    setImageUrl("");
    setShowImageDialog(true);
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setShowImageDialog(false);
    setImageUrl("");
  };

  const handleAddTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Always Visible Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex-wrap">
          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Bold (⌘B / Ctrl+B)"
            >
              <strong className="font-bold">B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italic (⌘I / Ctrl+I)"
            >
              <em className="italic">I</em>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              title="Underline (⌘U / Ctrl+U)"
            >
              <u>U</u>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              title="Strikethrough"
            >
              <s>S</s>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              title="Inline Code"
            >
              {"</>"}
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive("highlight")}
              title="Highlight"
            >
              <span className="bg-yellow-400 text-black px-1 rounded text-xs">
                H
              </span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive("subscript")}
              title="Subscript"
            >
              <span className="text-xs">x₂</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive("superscript")}
              title="Superscript"
            >
              <span className="text-xs">x²</span>
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Headings */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <span className="font-bold">H1</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <span className="font-semibold">H2</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <span className="font-medium">H3</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={editor.isActive("paragraph")}
              title="Paragraph"
            >
              P
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Lists */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <span className="text-lg">•</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Numbered List"
            >
              <span>1.</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive("taskList")}
              title="Task List"
            >
              <span className="text-sm">☐</span>
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Text Alignment */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M2 4H14M2 8H10M2 12H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M3 4H13M4 8H12M3 12H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M2 4H14M6 8H14M2 12H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              isActive={editor.isActive({ textAlign: "justify" })}
              title="Justify"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M2 4H14M2 8H14M2 12H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Block Elements */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive("codeBlock")}
              title="Code Block"
            >
              {"{}"}
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              title="Blockquote"
            >
              <span className="text-lg">"</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              ─
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Links & Media */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleAddLink}
              isActive={editor.isActive("link")}
              title="Insert Link"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M6.5 8.5C6.5 7.11929 7.61929 6 9 6H10.5C11.8807 6 13 7.11929 13 8.5C13 9.88071 11.8807 11 10.5 11H9C7.61929 11 6.5 9.88071 6.5 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9.5 8.5C9.5 9.88071 10.6193 11 12 11H13.5C14.8807 11 16 9.88071 16 8.5C16 7.11929 14.8807 6 13.5 6H12C10.6193 6 9.5 7.11929 9.5 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 8.5H11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={handleAddImage} title="Insert Image">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <rect
                  x="2"
                  y="3"
                  width="12"
                  height="10"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="5.5" cy="7.5" r="1.5" fill="currentColor" />
                <path
                  d="M2 10L5.5 6.5L9 10L13 6L14 7V12H2V10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={handleAddTable} title="Insert Table">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <rect
                  x="2"
                  y="2"
                  width="12"
                  height="12"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M6 2V14M10 2V14M2 6H14M2 10H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* Table Controls (only show when in table) */}
          {editor.isActive("table") && (
            <>
              <div className="flex items-center gap-1">
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                  title="Add Column Before"
                >
                  <span className="text-xs">+Col←</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  title="Add Column After"
                >
                  <span className="text-xs">+Col→</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  title="Delete Column"
                >
                  <span className="text-xs">-Col</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                  title="Add Row Before"
                >
                  <span className="text-xs">+Row↑</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  title="Add Row After"
                >
                  <span className="text-xs">+Row↓</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  title="Delete Row"
                >
                  <span className="text-xs">-Row</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  title="Delete Table"
                >
                  <span className="text-xs">×Table</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() =>
                    editor.chain().focus().toggleHeaderColumn().run()
                  }
                  isActive={editor.isActive("tableHeader")}
                  title="Toggle Header Column"
                >
                  <span className="text-xs">H</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                  title="Toggle Header Row"
                >
                  <span className="text-xs">H</span>
                </ToolbarButton>
              </div>
              <ToolbarSeparator />
            </>
          )}

          {/* Color Picker */}
          <div className="flex items-center gap-1">
            <input
              type="color"
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
              value={editor.getAttributes("textStyle").color || "#cccccc"}
              className="w-8 h-8 rounded border border-[var(--border-primary)] cursor-pointer"
              title="Text Color"
            />
            <input
              type="color"
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .toggleHighlight({ color: e.target.value })
                  .run()
              }
              value="#fef08a"
              className="w-8 h-8 rounded border border-[var(--border-primary)] cursor-pointer"
              title="Highlight Color"
            />
          </div>

          <ToolbarSeparator />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (⌘Z / Ctrl+Z)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M3 8C3 5.23858 5.23858 3 8 3H11M3 8L6 5M3 8L6 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (⌘⇧Z / Ctrl+Shift+Z)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4"
              >
                <path
                  d="M13 8C13 10.7614 10.7614 13 8 13H5M13 8L10 5M13 8L10 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl p-4 min-w-[400px]">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-[var(--text-primary)]">
              Link URL:
            </label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInsertLink();
                } else if (e.key === "Escape") {
                  setShowLinkDialog(false);
                }
              }}
              placeholder="https://example.com"
              className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowLinkDialog(false)}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsertLink}
              className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded text-sm font-medium transition-colors"
            >
              Insert
            </button>
            {editor.isActive("link") && (
              <button
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setShowLinkDialog(false);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl p-4 min-w-[400px]">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-[var(--text-primary)]">
              Image URL:
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInsertImage();
                } else if (e.key === "Escape") {
                  setShowImageDialog(false);
                }
              }}
              placeholder="https://example.com/image.png"
              className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowImageDialog(false)}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsertImage}
              className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded text-sm font-medium transition-colors"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {/* Editor Content with Line Numbers */}
      <div className="flex-1 overflow-hidden flex">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="line-numbers-gutter flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] text-right select-none overflow-y-auto overflow-x-hidden"
          style={{ width: "60px", minWidth: "60px" }}
        >
          <div
            className="line-numbers-content font-mono text-xs text-[var(--text-tertiary)]"
            style={{
              paddingTop: "1rem",
              paddingBottom: "1rem",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              lineHeight: "1.5rem",
            }}
          >
            {Array.from(
              { length: Math.max(lineCount, 1) },
              (_, i) => i + 1
            ).map((lineNum) => (
              <div
                key={lineNum}
                className={`line-number flex items-center justify-end pr-3 transition-colors ${
                  lineNum === currentLine
                    ? "text-[var(--accent-primary)] font-semibold"
                    : ""
                }`}
                style={{
                  height: "1.5rem",
                  minHeight: "1.5rem",
                  lineHeight: "1.5rem",
                }}
              >
                {lineNum}
              </div>
            ))}
          </div>
        </div>

        {/* Editor Content Area */}
        <div
          ref={editorContentRef}
          className="flex-1 overflow-y-auto overflow-x-auto relative"
          onScroll={(e) => {
            // Sync line numbers scroll with editor scroll
            const lineNumbersContent = lineNumbersRef.current?.querySelector(
              ".line-numbers-content"
            ) as HTMLElement;
            if (lineNumbersContent) {
              lineNumbersContent.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});
