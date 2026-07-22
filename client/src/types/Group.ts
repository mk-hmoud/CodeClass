export interface LabGroup {
  groupId: number;
  classroomId: number;
  name: string;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  created_at?: Date;
  roster?: number[];
}
