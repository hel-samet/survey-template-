// Minimal inline icon set (24×24, stroke-based) so the app needs no icon dependency.
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  clipboard: 'M9 4h6v3H9zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 13l2 2 4-4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  send: 'M21 3 3 10.5l7 2.5 2.5 7zM10 13l11-10',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  inbox: 'M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
  check: 'M5 12.5 9.5 17 19 7.5',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  power: 'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  message: 'M4 5h16v11H8l-4 4z',
  x: 'M6 6l12 12M18 6 6 18',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  checkSquare: 'M4 4h16v16H4zM8 12l3 3 5-6',
  circleDot: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  chevronDown: 'M4 5h16v14H4zM9 11l3 3 3-3',
  thumbsUp: 'M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 3 2l-1 4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  type: 'M5 6V4h14v2M12 4v16M9 20h6',
  alignLeft: 'M4 6h16M4 10h11M4 14h16M4 18h9',
  hash: 'M9 4 7 20M17 4l-2 16M4 9h16M3 15h16',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M11 18h2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 1.9, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
