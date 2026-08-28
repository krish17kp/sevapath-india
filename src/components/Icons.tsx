/**
 * The whole icon set, inlined.
 *
 * Icons are decorative here: every one of them sits beside text that already
 * carries the meaning, so they are hidden from screen readers. Inlining keeps
 * the page to a single request on a slow connection.
 */

type IconProps = { size?: number; className?: string };

function svg(size: number, className: string | undefined, children: React.ReactNode) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconCheck({ size = 16, className }: IconProps) {
  return svg(size, className, <path d="m4.5 12.5 5 5 10-11" />);
}

export function IconAlert({ size = 16, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M12 8v5" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 3.5 21.5 20H2.5z" />
    </>
  );
}

export function IconCross({ size = 16, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  );
}

export function IconArrowRight({ size = 18, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  );
}

export function IconArrowDown({ size = 28, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M12 4v15" />
      <path d="m6 13 6 6 6-6" />
    </>
  );
}

export function IconExternal({ size = 14, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  );
}

export function IconDocument({ size = 18, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h4.5" />
    </>
  );
}

export function IconCertificate({ size = 18, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <rect x="3" y="4" width="18" height="12.5" rx="1.5" />
      <path d="M7 8.5h6" />
      <path d="M7 12h4" />
      <circle cx="16.5" cy="11" r="2" />
      <path d="M15 13v4l1.5-1 1.5 1v-4" />
    </>
  );
}

export function IconBank({ size = 18, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8" />
      <path d="M10 10v8" />
      <path d="M14 10v8" />
      <path d="M19 10v8" />
      <path d="M3 20.5h18" />
    </>
  );
}

export function IconBalance({ size = 18, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M12 4v16" />
      <path d="M7 20h10" />
      <path d="M4 8h16" />
      <path d="M4 8 1.8 13.5a3 3 0 0 0 4.4 0z" />
      <path d="M20 8l2.2 5.5a3 3 0 0 1-4.4 0z" />
    </>
  );
}

export function IconQuestion({ size = 16, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" />
      <circle cx="12" cy="16.6" r="0.85" fill="currentColor" stroke="none" />
    </>
  );
}

export function IconShield({ size = 16, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M12 3 5 5.8v5.4c0 4.3 2.8 8.2 7 9.6 4.2-1.4 7-5.3 7-9.6V5.8z" />
      <path d="m9 12 2.2 2.2L15.3 10" />
    </>
  );
}

export function IconClock({ size = 16, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  );
}

export function IconSeva({ size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 18.5c3.5 0 3.5-13 8-13s4.5 13 8 13" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
