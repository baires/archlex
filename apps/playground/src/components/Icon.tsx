export type IconName =
  | "book"
  | "github"
  | "chevron-down"
  | "clipboard"
  | "download"
  | "upload"
  | "link"
  | "file"
  | "enter-fullscreen"
  | "exit-fullscreen"
  | "fit"
  | "moon"
  | "settings"
  | "sun"
  | "warning"
  | "error"
  | "info"
  | "zoom-in"
  | "zoom-out";

interface IconProps {
  name: IconName;
  size?: number;
}

function glyph(name: IconName) {
  switch (name) {
    case "book":
      return (
        <>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </>
      );
    case "github":
      return (
        <path
          fill="currentColor"
          stroke="none"
          d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
        />
      );
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" />;
    case "clipboard":
      return (
        <>
          <path d="M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M9 4V3h6v1M9 9h6M9 13h6" />
        </>
      );
    case "download":
      return (
        <>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
        </>
      );
    case "upload":
      return (
        <>
          <path d="M12 21V9m0 0-4 4m4-4 4 4M5 3h14" />
        </>
      );
    case "link":
      return (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6M12 11v6m-3-3h6" />
        </>
      );
    case "enter-fullscreen":
      return <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m18 0v5h-5" />;
    case "exit-fullscreen":
      return <path d="M8 3v5H3m18-5v5h-5M3 21v-5h5m8 5v-5h5" />;
    case "fit":
      return (
        <>
          <path d="M6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
          <path d="M9 9h6v6H9z" />
        </>
      );
    case "moon":
      return (
        <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z" />
      );
    case "settings":
      return (
        <>
          <path d="M4 7h10m4 0h2M4 17h2m4 0h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </>
      );
    case "warning":
      return (
        <>
          <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4m0 3h.01" />
        </>
      );
    case "error":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6m0-6-6 6" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5m0-8h.01" />
        </>
      );
    case "zoom-in":
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4M10.5 7.5v6m-3-3h6" />
        </>
      );
    case "zoom-out":
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4M7.5 10.5h6" />
        </>
      );
  }
}

export function Icon({ name, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      {glyph(name)}
    </svg>
  );
}
