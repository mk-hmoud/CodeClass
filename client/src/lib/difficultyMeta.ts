// Single source of truth for problem-difficulty coloring. Previously copy-pasted
// (with drifting hex values) across StudentAssignment.tsx, InstructorAssignment.tsx,
// and OverviewTab.tsx.
export const DIFFICULTY_META: Record<string, { color: string; bg: string; border: string }> = {
  Easy: { color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.12)", border: "hsl(var(--success) / 0.3)" },
  Medium: { color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.12)", border: "hsl(var(--warning) / 0.3)" },
  Hard: { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.12)", border: "hsl(var(--destructive) / 0.3)" },
};

export const getDifficultyMeta = (difficulty?: string | null) =>
  (difficulty && DIFFICULTY_META[difficulty]) || DIFFICULTY_META.Medium;
