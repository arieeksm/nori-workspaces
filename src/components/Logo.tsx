import { useId } from "react";

export const LOGO_VIEWBOX = "0 0 32 32";
const BRAND_FROM = "#1F1F1F";
const BRAND_TO = "#1F1F1F";

/** Geometric "N": two stems joined by a diagonal. */
const MARK_PATH = "M10.5 22V10L21.5 22V10";

function LogoArt({ gradientId }: { gradientId: string }) {
  return (
    <>
      {/* Tile */}
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      {/* Mark */}
      <path d={MARK_PATH} fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

interface LogoMarkProps {
  /** Rendered width and height in px. */
  size?: number;
  className?: string;
  /** Accessible label. Pass an empty string to mark the logo as decorative. */
  title?: string;
}

export function LogoMark({ size = 32, className, title = "NoRi Workspaces" }: LogoMarkProps) {
  const gradientId = useId();
  const decorative = title === "";

  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND_FROM} />
          <stop offset="1" stopColor={BRAND_TO} />
        </linearGradient>
      </defs>
      <LogoArt gradientId={gradientId} />
    </svg>
  );
}
