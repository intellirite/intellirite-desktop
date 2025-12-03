import { useState, useRef, useEffect } from "react";
import { ChevronRightIcon } from "./Icons";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onInsertToEditor?: (content: string) => void;
  onReplaceInEditor?: (content: string) => void;
}

/**
 * ChatPanel - AI Chat Panel UI (UI only, no backend)
 */
export function ChatPanel({
  isCollapsed = false,
  onToggleCollapse,
  onInsertToEditor,
  onReplaceInEditor,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm Intellirite AI. How can I help you with your writing today?",
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    },
    {
      id: "2",
      role: "user",
      content: "Can you help me write a blog post about TypeScript?",
      timestamp: new Date(Date.now() - 240000), // 4 minutes ago
    },
    {
      id: "3",
      role: "assistant",
      content:
        "Of course! I'd be happy to help you write a blog post about TypeScript. Here's a great starting point:\n\n# Introduction to TypeScript\n\nTypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript. It adds optional type annotations, interfaces, and other features that help developers write more maintainable code.\n\n## Key Benefits\n\n- **Type Safety**: Catch errors at compile time\n- **Better IDE Support**: Enhanced autocomplete and refactoring\n- **Improved Code Quality**: Self-documenting code with types",
      timestamp: new Date(Date.now() - 180000), // 3 minutes ago
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    // Simulate AI response (UI only)
    setTimeout(() => {
      const aiResponse: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content:
          "This is a placeholder response. In a real implementation, this would be an AI-generated response based on your message.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded transition-colors"
          aria-label="Expand chat panel"
        >
          <ChevronRightIcon className="w-4 h-4 text-[var(--text-secondary)] rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] flex flex-col h-full">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border-primary)] shrink-0">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Intellirite Chat
        </h2>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded transition-colors"
          aria-label="Collapse chat panel"
        >
          <ChevronRightIcon className="w-3 h-3 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            formatTime={formatTime}
            onInsert={onInsertToEditor}
            onReplace={onReplaceInEditor}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border-primary)] p-3 shrink-0">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Intellirite AI..."
            className="w-full px-3 py-2 pr-20 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            rows={1}
            style={{ maxHeight: "120px", minHeight: "40px" }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Mic Button */}
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Voice input"
              title="Voice input (UI only)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="w-3.5 h-3.5"
              >
                <path
                  d="M7 2V6M7 8V12M7 6C8.10457 6 9 5.10457 9 4C9 2.89543 8.10457 2 7 2C5.89543 2 5 2.89543 5 4C5 5.10457 5.89543 6 7 6ZM7 8C8.10457 8 9 8.89543 9 10C9 11.1046 8.10457 12 7 12C5.89543 12 5 11.1046 5 10C5 8.89543 5.89543 8 7 8Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-7 h-7 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Expand input"
              title="Expand input"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="w-3.5 h-3.5"
              >
                <path
                  d="M3 3L11 11M11 3L3 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-7 h-7 flex items-center justify-center bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
              title="Send (Enter)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="w-3.5 h-3.5"
              >
                <path
                  d="M1 7L13 1M13 1L9 13M13 1L1 7L9 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  formatTime: (date: Date) => string;
  onInsert?: (content: string) => void;
  onReplace?: (content: string) => void;
}

/**
 * MessageBubble - Individual chat message component
 */
function MessageBubble({
  message,
  formatTime,
  onInsert,
  onReplace,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", message.content);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const isUser = message.role === "user";

  return (
    <div
      className={`group flex flex-col ${isUser ? "items-end" : "items-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      draggable={!isUser}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Message Bubble */}
      <div
        className={`
          relative max-w-[85%] rounded-lg px-3 py-2
          ${
            isUser
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-primary)]"
          }
          ${isDragging ? "opacity-50" : ""}
        `}
      >
        {/* Action Buttons (hover) */}
        {!isUser && showActions && (
          <div className="absolute -right-12 top-0 flex items-center gap-1">
            <button
              onClick={() => onInsert?.(message.content)}
              className="w-6 h-6 flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-primary)] transition-colors"
              title="Insert into editor"
            >
              +
            </button>
            <button
              onClick={() => onReplace?.(message.content)}
              className="w-6 h-6 flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-primary)] transition-colors"
              title="Replace in editor"
            >
              ↻
            </button>
          </div>
        )}

        {/* Message Content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
