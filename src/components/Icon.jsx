export default function Icon({ name, size = 18, ...props }) {
  const paths = {
    volume: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4z" />
        <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    muted: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4z" />
        <path d="m17 9 5 6m0-6-5 6" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h15m-5-5 5 5-5 5" />
      </>
    ),
    enter: (
      <>
        <path d="M20 5v9H4m5-5-5 5 5 5" />
      </>
    ),
    reset: (
      <>
        <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />
      </>
    ),
    keyboard: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M7 16h10" />
      </>
    ),
    backspace: (
      <>
        <path d="M9 5h12v14H9l-7-7zM12 9l5 6m0-6-5 6" />
      </>
    ),
    expand: (
      <>
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
