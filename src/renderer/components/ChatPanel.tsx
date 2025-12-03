import { useState, useRef, useEffect } from "react";
import { ChevronRightIcon } from "./Icons";
import {
  streamMessageToGemini,
  GEMINI_MODELS,
  listAvailableModels,
  type GeminiModel,
} from "../services/gemini";
import ReactMarkdown from "react-markdown";

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
        "Hello! I'm Intellirite AI powered by Gemini. How can I help you with your writing today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState<GeminiModel>("gemini-2.5-flash");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // List available models on mount
  useEffect(() => {
    listAvailableModels().then((models) => {
      if (models.length > 0) {
        console.log("Available Gemini models:", models);
      }
    });
  }, []);

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

  // Close model selector on outside click
  useEffect(() => {
    if (!showModelSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".relative")) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showModelSelector]);

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

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Create a placeholder assistant message that will be updated with streaming
    const assistantMessageId = `msg-${Date.now()}-ai`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Convert messages to Gemini format (all previous messages + new user message)
      // Filter out empty messages and ensure we only send complete conversation pairs
      const previousMessages = messages
        .filter((m) => m.content.trim().length > 0) // Only non-empty messages
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // Add the new user message
      const chatMessages = [
        ...previousMessages,
        { role: "user" as const, content: userInput },
      ];

      // Stream response from Gemini
      let fullResponse = "";
      abortControllerRef.current = new AbortController();

      for await (const chunk of streamMessageToGemini(
        chatMessages,
        selectedModel
      )) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        fullResponse += chunk;

        // Update the assistant message with streaming content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse }
              : msg
          )
        );
      }
    } catch (error: any) {
      console.error("Error getting AI response:", error);

      // Update message with error
      const errorMsg = error?.message || "Failed to get response from AI";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `❌ Error: ${errorMsg}\n\nPlease check:\n- Your internet connection\n- API key is valid\n- Model name is correct`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Intellirite Chat
          </h2>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModelSelector(!showModelSelector);
              }}
              className="text-xs px-2 py-0.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Select AI model"
            >
              {GEMINI_MODELS.find((m) => m.id === selectedModel)?.name ||
                "Model"}
            </button>

            {/* Model Selector Dropdown */}
            {showModelSelector && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg py-1 min-w-[200px] z-50">
                {GEMINI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModel(model.id);
                      setShowModelSelector(false);
                    }}
                    className={`
                      w-full text-left px-3 py-1.5 text-xs transition-colors
                      ${
                        selectedModel === model.id
                          ? "bg-[var(--accent-primary)] text-white"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                      }
                    `}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-[var(--text-tertiary)] text-[10px]">
                      {model.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded transition-colors shrink-0"
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
            disabled={isLoading}
            className="w-full px-3 py-2 pr-20 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
            {/* Stop/Send Button */}
            {isLoading ? (
              <button
                onClick={() => {
                  abortControllerRef.current?.abort();
                  setIsLoading(false);
                }}
                className="w-7 h-7 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded transition-colors text-white"
                aria-label="Stop generation"
                title="Stop"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="w-3.5 h-3.5"
                >
                  <rect
                    x="3"
                    y="3"
                    width="8"
                    height="8"
                    rx="1"
                    fill="currentColor"
                  />
                </svg>
              </button>
            ) : (
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
            )}
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
        <div className="text-sm break-words">
          {message.content ? (
            message.role === "assistant" ? (
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-[var(--text-primary)]">
                      {children}
                    </p>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-xs font-mono text-[var(--accent-primary)]">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-[var(--bg-secondary)] p-2 rounded text-xs font-mono overflow-x-auto text-[var(--text-primary)] my-2">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-[var(--bg-secondary)] p-2 rounded text-xs font-mono overflow-x-auto mb-2 text-[var(--text-primary)]">
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1 text-[var(--text-primary)]">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1 text-[var(--text-primary)]">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--text-primary)]">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-[var(--text-primary)]">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold mb-2 mt-3 first:mt-0 text-[var(--text-primary)]">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0 text-[var(--text-primary)]">
                      {children}
                    </h3>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[var(--border-primary)] pl-3 italic my-2 text-[var(--text-secondary)]">
                      {children}
                    </blockquote>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      className="text-[var(--accent-primary)] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="whitespace-pre-wrap text-[var(--text-primary)]">
                {message.content}
              </div>
            )
          ) : (
            <span className="text-[var(--text-tertiary)] italic">
              Thinking...
            </span>
          )}
        </div>

        {/* Loading indicator for streaming */}
        {!message.content && message.role === "assistant" && (
          <div className="flex items-center gap-1 mt-2">
            <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse delay-75" />
            <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse delay-150" />
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
