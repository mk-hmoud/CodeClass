import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, History } from "lucide-react";
import { toast } from "sonner";
import { getGroups } from "@/services/GroupService";
import {
  findOrCreateSession,
  saveAttendance,
  listSessions,
} from "@/services/AttendanceService";
import { LabGroup } from "@/types/Group";
import { LabSession, AttendanceStatus } from "@/types/Attendance";

interface Props {
  classroomId: number;
}

const WHOLE_CLASSROOM_VALUE = "whole";

const todayIso = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "text-green-500 border-green-500/40 bg-green-500/10" },
  { value: "absent", label: "Absent", color: "text-red-500 border-red-500/40 bg-red-500/10" },
  { value: "excused", label: "Excused", color: "text-amber-500 border-amber-500/40 bg-amber-500/10" },
];

const AttendanceTab: React.FC<Props> = ({ classroomId }) => {
  const [groups, setGroups] = useState<LabGroup[]>([]);
  const [groupValue, setGroupValue] = useState<string>(WHOLE_CLASSROOM_VALUE);
  const [date, setDate] = useState(todayIso());
  const [session, setSession] = useState<LabSession | null>(null);
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus | null>>({});
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<LabSession[]>([]);

  useEffect(() => {
    getGroups(classroomId).then(setGroups);
  }, [classroomId]);

  const selectedGroupId = groupValue === WHOLE_CLASSROOM_VALUE ? null : Number(groupValue);

  const loadHistory = async () => {
    const sessions = await listSessions(classroomId, selectedGroupId ?? undefined);
    setHistory(sessions);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, groupValue]);

  const loadSession = async (targetDate: string) => {
    setLoading(true);
    try {
      const data = await findOrCreateSession(classroomId, targetDate, selectedGroupId);
      setSession(data);
      const initial: Record<number, AttendanceStatus | null> = {};
      (data.roster ?? []).forEach((entry) => {
        initial[entry.studentId] = entry.status;
      });
      setStatuses(initial);
    } catch (error) {
      toast.error("Failed to load attendance session");
    } finally {
      setLoading(false);
    }
  };

  const handleSetStatus = (studentId: number, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!session) return;
    const records = Object.entries(statuses)
      .filter(([, status]) => status != null)
      .map(([studentId, status]) => ({ studentId: Number(studentId), status: status as AttendanceStatus }));

    try {
      await saveAttendance(session.sessionId, records);
      toast.success("Attendance saved");
      loadHistory();
    } catch (error) {
      toast.error("Failed to save attendance");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ClipboardCheck size={18} />
          Attendance
        </h2>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          {groups.length > 0 && (
            <div>
              <Label htmlFor="attendance-group">Group</Label>
              <Select value={groupValue} onValueChange={setGroupValue}>
                <SelectTrigger id="attendance-group" className="mt-2 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WHOLE_CLASSROOM_VALUE}>Whole Classroom</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.groupId} value={String(g.groupId)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="attendance-date">Date</Label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button onClick={() => loadSession(date)} disabled={loading}>
            {session && session.sessionDate === date ? "Reload" : "Load Session"}
          </Button>
        </CardContent>
      </Card>

      {session && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Roster — {session.sessionDate}
                {selectedGroupId && groups.find((g) => g.groupId === selectedGroupId)
                  ? ` (${groups.find((g) => g.groupId === selectedGroupId)?.name})`
                  : ""}
              </h3>
              <Button size="sm" onClick={handleSave}>
                Save Attendance
              </Button>
            </div>

            {(session.roster ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No students in this roster yet — enroll students or assign them to this group first.
              </p>
            )}

            <div className="divide-y divide-border">
              {(session.roster ?? []).map((entry) => (
                <div
                  key={entry.studentId}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = statuses[entry.studentId] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSetStatus(entry.studentId, opt.value)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active ? opt.color : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <History size={14} />
            Past sessions
          </h3>
          <div className="flex flex-wrap gap-2">
            {history.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => {
                  setDate(s.sessionDate);
                  loadSession(s.sessionDate);
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                {s.sessionDate}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;
