import { useState, useEffect, useCallback } from "react";

// Icon Components
const AppIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="16"
      height="16"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M6 10L9 13L14 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="text-[var(--text-tertiary)] shrink-0"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9 9L12 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M2 6H10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const MaximizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <rect
      x="2"
      y="2"
      width="8"
      height="8"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const RestoreIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <rect
      x="2"
      y="3"
      width="7"
      height="7"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <rect
      x="3"
      y="2"
      width="7"
      height="7"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M3 3L9 9M9 3L3 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * TopBar component - Custom title bar with app branding, search, and window controls
 */
export function TopBar() {
  const [searchValue, setSearchValue] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  // Safely detect platform with fallback
  const isMac = (() => {
    try {
      // Try to use exposed platform API
      if (typeof window !== "undefined" && (window as any).platform) {
        return (window as any).platform.isMac === true;
      }
      // Fallback: detect from user agent
      return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    } catch (error) {
      // Fallback to user agent detection on error
      return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    }
  })();

  // Initialize and listen to window state changes
  useEffect(() => {
    // Safely check if windowControls is available
    if (typeof window !== "undefined" && (window as any).windowControls) {
      try {
        // Get initial window state
        (window as any).windowControls
          .getState()
          .then((state: { isMaximized: boolean }) => {
            setIsMaximized(state.isMaximized);
          })
          .catch((error: Error) => {
            console.error("Failed to get initial window state:", error);
          });

        // Listen to window state changes
        const unsubscribe = (window as any).windowControls.onStateChange(
          (state: { isMaximized: boolean }) => {
            setIsMaximized(state.isMaximized);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Window controls not available:", error);
      }
    }
  }, []);

  // Window control handlers with error handling
  const handleMinimize = useCallback(() => {
    try {
      if ((window as any).windowControls) {
        (window as any).windowControls.minimize();
      }
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  }, []);

  const handleMaximize = useCallback(() => {
    try {
      if ((window as any).windowControls) {
        (window as any).windowControls.maximize();
      }
    } catch (error) {
      console.error("Failed to maximize window:", error);
    }
  }, []);

  const handleClose = useCallback(() => {
    try {
      if ((window as any).windowControls) {
        (window as any).windowControls.close();
      }
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  }, []);

  return (
    <div
      className="flex items-center justify-between h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-2 select-none drag-region"
      style={{ paddingLeft: isMac ? "78px" : "8px" }}
    >
      {/* Left: App branding - Only show if not Mac (Mac has system controls on left) */}
      {!isMac && (
        <div className="flex items-center gap-2 min-w-[200px] [&>*]:no-drag">
          <div
            className="flex items-center justify-center w-5 h-5 text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            <AppIcon />
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
            Intellirite
          </span>
        </div>
      )}

      {/* Mac: Show app branding in center-left area (after system controls) */}
      {isMac && (
        <div className="flex items-center gap-2 [&>*]:no-drag">
          <div
            className="flex items-center justify-center w-5 h-5 text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            <AppIcon />
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
            Intellirite
          </span>
        </div>
      )}

      {/* Middle: Search input */}
      <div className="flex-1 flex justify-center max-w-[600px] mx-auto [&>*]:no-drag">
        <div className="flex items-center gap-2 w-full max-w-[400px] h-7 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-md transition-all duration-100 focus-within:bg-[var(--bg-primary)] focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_0_1px_var(--accent-primary)]">
          <SearchIcon />
          <input
            type="text"
            className="flex-1 text-xs text-[var(--text-primary)] bg-transparent border-none outline-none p-0 placeholder:text-[var(--text-tertiary)]"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right: Window controls - Only show on Windows/Linux (Mac has system controls) */}
      {!isMac && (
        <div className="flex items-center gap-[2px] min-w-[200px] justify-end [&>*]:no-drag">
          <button
            className="flex items-center justify-center w-10 h-10 text-[var(--text-secondary)] bg-transparent border-none cursor-pointer transition-all duration-100 rounded-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] active:bg-[var(--bg-active)] [&_svg]:pointer-events-none"
            onClick={handleMinimize}
            aria-label="Minimize window"
            type="button"
          >
            <MinimizeIcon />
          </button>

          <button
            className="flex items-center justify-center w-10 h-10 text-[var(--text-secondary)] bg-transparent border-none cursor-pointer transition-all duration-100 rounded-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] active:bg-[var(--bg-active)] [&_svg]:pointer-events-none"
            onClick={handleMaximize}
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
            type="button"
          >
            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>

          <button
            className="flex items-center justify-center w-10 h-10 text-[var(--text-secondary)] bg-transparent border-none cursor-pointer transition-all duration-100 rounded-none hover:bg-[#e81123] hover:text-white active:bg-[#c50f1f] [&_svg]:pointer-events-none"
            onClick={handleClose}
            aria-label="Close window"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Mac: Right side can have settings/actions in the future */}
      {isMac && <div className="min-w-[200px]" />}
    </div>
  );
}
