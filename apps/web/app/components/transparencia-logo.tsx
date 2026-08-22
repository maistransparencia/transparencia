export function TransparenciaLogo({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="120" height="120" rx="30" fill="#5a72a8" />
      <g fill="#ffffff">
        <rect x="30" y="30" width="12" height="60" rx="4" />
        <rect x="30" y="42" width="30" height="12" rx="4" />
        <rect x="52" y="60" width="12" height="30" rx="4" />
        <rect x="74" y="48" width="12" height="42" rx="4" />
      </g>
    </svg>
  );
}
