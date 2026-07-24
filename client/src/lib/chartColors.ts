// Recharts (and any other canvas/SVG chart) needs real color strings, not Tailwind
// classes, and can't resolve `hsl(var(--x))` the way CSS can in some contexts (e.g.
// Recharts sometimes reads computed style rather than letting the browser cascade
// resolve the var). These helpers read the CSS custom properties at call time so
// chart colors track the active theme (light/dark) instead of being hardcoded hex
// that only looked right in one theme.

const readVar = (name: string): string => {
  if (typeof window === "undefined") return "";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value ? `hsl(${value})` : "";
};

export const chartColor = {
  primary: () => readVar("--primary"),
  success: () => readVar("--success"),
  warning: () => readVar("--warning"),
  info: () => readVar("--info"),
  destructive: () => readVar("--destructive"),
  muted: () => readVar("--muted-foreground"),
  border: () => readVar("--border"),
  popover: () => readVar("--popover"),
  popoverForeground: () => readVar("--popover-foreground"),
};

// Ordered categorical palette for multi-series charts (pie slices, grouped bars).
export const chartPalette = (): string[] => [
  chartColor.primary(),
  chartColor.success(),
  chartColor.warning(),
  chartColor.info(),
  chartColor.destructive(),
];

// Drop-in `contentStyle` for Recharts <Tooltip>, themed instead of hardcoded dark colors.
export const chartTooltipStyle = () => ({
  backgroundColor: chartColor.popover(),
  borderColor: chartColor.border(),
  color: chartColor.popoverForeground(),
  borderRadius: "var(--radius)",
  fontSize: 12,
});
