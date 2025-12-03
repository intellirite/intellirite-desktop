/**
 * Icon Components for Intellirite
 */

interface IconProps {
  className?: string;
}

interface FileIconProps extends IconProps {
  extension?: string;
}

/**
 * Chevron Right Icon - Used for expand/collapse indicators
 */
export function ChevronRightIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 3L7.5 6L4.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Folder Icon
 */
export function FolderIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 4C2 3.44772 2.44772 3 3 3H6.58579C6.851 3 7.10536 3.10536 7.29289 3.29289L8.70711 4.70711C8.89464 4.89464 9.149 5 9.41421 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

/**
 * File Icon - Changes color based on file extension
 */
export function FileIcon({ className = "", extension }: FileIconProps) {
  // Determine color based on file extension
  const getColor = () => {
    switch (extension?.toLowerCase()) {
      case "md":
      case "markdown":
        return "text-blue-400";
      case "txt":
        return "text-gray-400";
      case "json":
        return "text-yellow-400";
      case "pdf":
        return "text-red-400";
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
        return "text-blue-300";
      default:
        return "text-[var(--text-tertiary)]";
    }
  };

  return (
    <svg
      className={`${className} ${getColor()}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 2C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V5.41421C13 5.149 12.8946 4.89464 12.7071 4.70711L10.2929 2.29289C10.1054 2.10536 9.851 2 9.58579 2H4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M9 2V5H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Plus Icon - For "New" actions
 */
export function PlusIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3V11M3 7H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Edit/Pencil Icon - For rename actions
 */
export function EditIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 2L12 6L5 13H2V10L8 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Trash Icon - For delete actions
 */
export function TrashIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 3.5H12M5 3.5V2.5C5 2.22386 5.22386 2 5.5 2H8.5C8.77614 2 9 2.22386 9 2.5V3.5M3.5 3.5L4 11.5C4 11.7761 4.22386 12 4.5 12H9.5C9.77614 12 10 11.7761 10 11.5L10.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

