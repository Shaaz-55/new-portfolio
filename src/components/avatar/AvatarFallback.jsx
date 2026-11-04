export default function AvatarFallback() {
  return (
    <svg
      className="avatar-fallback"
      viewBox="0 0 300 370"
      role="img"
      aria-label="Illustrative portrait of a young builder"
    >
      <defs>
        <linearGradient id="portrait-face" x1="0" x2="1">
          <stop stopColor="#a3b19a" />
          <stop offset=".55" stopColor="#657e65" />
          <stop offset="1" stopColor="#263b30" />
        </linearGradient>
        <linearGradient id="portrait-jacket" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#324a3e" />
          <stop offset="1" stopColor="#0c1813" />
        </linearGradient>
      </defs>
      <path
        d="M33 370 45 274Q50 248 108 229L121 211h57l17 20q55 15 65 43l14 96"
        fill="url(#portrait-jacket)"
      />
      <path d="m127 194-6 46 29 24 29-27-9-43" fill="url(#portrait-face)" />
      <path
        d="M98 106q-3-63 50-62t58 64l-9 72-27 31-34 1-31-34z"
        fill="url(#portrait-face)"
      />
      <path
        d="m96 137-7-43q-5-52 61-57 68-3 58 65l-7 32-9-49q-28 10-52-6l-32 24-4 35"
        fill="#17221b"
      />
      <path d="m109 126 23-4m35 0 23 4" stroke="#223428" strokeWidth="5" />
      <path d="m114 133 16-1m39 0 16 2" stroke="#adc3a5" strokeWidth="3" />
      <path
        d="m148 129-7 33 14 2m-20 18q16 7 30-1"
        fill="none"
        stroke="#405240"
        strokeWidth="3"
      />
      <path
        d="m119 231-22 13 22 55 30-34-28-25m59-8 24 14-20 54-31-35 28-25"
        fill="#3b5042"
      />
      <path d="M150 268v102" stroke="#69806a" />
    </svg>
  );
}
