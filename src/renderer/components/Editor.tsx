import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import { useEffect, useState } from "react";

// Import languages for syntax highlighting
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import markdown from "highlight.js/lib/languages/markdown";

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

interface EditorProps {
  content: string;
  onChange?: (content: string) => void;
  onUpdate?: (isModified: boolean) => void;
  editable?: boolean;
}

/**
 * Editor component using TipTap
 */
export function Editor({
  content,
  onChange,
  onUpdate,
  editable = true,
}: EditorProps) {
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
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
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`
        px-2 py-1 rounded text-sm transition-colors
        ${
          isActive
            ? "bg-[var(--accent-primary)] text-white"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        }
      `}
    >
      {children}
    </button>
  );

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]"
      onMouseEnter={() => setIsToolbarVisible(true)}
      onMouseLeave={() => setIsToolbarVisible(false)}
    >
      {/* Inline Toolbar */}
      {isToolbarVisible && editable && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-[var(--border-primary)] pr-2 mr-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Bold (Cmd+B)"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italic (Cmd+I)"
            >
              <em>I</em>
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
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r border-[var(--border-primary)] pr-2 mr-2">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              H3
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-[var(--border-primary)] pr-2 mr-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Bullet List"
            >
              •
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Numbered List"
            >
              1.
            </ToolbarButton>
          </div>

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
              "
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              ─
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
