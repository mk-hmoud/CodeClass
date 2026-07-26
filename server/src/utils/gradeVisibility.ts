export interface GradeReleaseInfo {
  grading_method: string;
  grade_release_mode?: string | null;
  due_date?: Date | string | null;
  grades_released_at?: Date | string | null;
}

export function isGradeVisible(a: GradeReleaseInfo): boolean {
  if (a.grading_method === "Manual") return true;

  switch (a.grade_release_mode) {
    case "manual":
      return a.grades_released_at != null;
    case "on_deadline":
      if (a.grades_released_at != null) return true;
      if (!a.due_date) return true;
      return new Date(a.due_date).getTime() <= Date.now();
    default:
      return true;
  }
}
