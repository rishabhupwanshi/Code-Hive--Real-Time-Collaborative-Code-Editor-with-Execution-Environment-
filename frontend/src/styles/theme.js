// CodeHive design tokens — single source of truth for color/spacing across
// every dashboard (Admin, User, Host) and the auth pages. Built fresh to
// replace the scattered inline hex values that used to live in each
// component. Import this instead of hardcoding a color.

export const colors = {
  bgPage: "#020817",
  bgSidebar: "linear-gradient(180deg, #0a1428 0%, #020817 100%)",
  bgCard: "rgba(15,23,42,0.92)",
  bgCardAlt: "rgba(30,41,59,0.9)",
  border: "rgba(148,163,184,0.14)",

  accentLight: "#a78bfa",
  accentDark: "#4f46e5",
  accentMid: "#7c3aed",
  gradient: "linear-gradient(135deg, #7c3aed, #4f46e5)",
  gradientRow: "linear-gradient(90deg, #7c3aed, #4f46e5)",

  textPrimary: "#e0f2fe",
  textSecondary: "#93b8d8",
  textMuted: "#64748b",

  success: "#22c55e",
  danger: "#f87171",
  dangerBg: "rgba(248,113,113,0.12)",
  warning: "#facc15",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const shadow = {
  card: "0 8px 20px rgba(0,0,0,0.18)",
  glow: "0 6px 16px rgba(29,78,216,0.35)",
};
