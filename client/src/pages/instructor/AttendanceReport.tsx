import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { listSessions, getAttendanceReport } from "@/services/AttendanceService";
import { LabSession, AttendanceReportRow } from "@/types/Attendance";

const statusBadge = (status: AttendanceReportRow["attendanceStatus"]) => {
  if (status === "present") {
    return <span className="text-xs px-2.5 py-1 rounded-full border text-green-500 border-green-500/40 bg-green-500/10">Present</span>;
  }
  if (status === "absent") {
    return <span className="text-xs px-2.5 py-1 rounded-full border text-red-500 border-red-500/40 bg-red-500/10">Absent</span>;
  }
  if (status === "excused") {
    return <span className="text-xs px-2.5 py-1 rounded-full border text-amber-500 border-amber-500/40 bg-amber-500/10">Excused</span>;
  }
  return <span className="text-xs px-2.5 py-1 rounded-full border text-muted-foreground border-border">No record</span>;
};

const fmtDateTime = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

const AttendanceReport = () => {
  const { classroomId, assignmentId } = useParams<{ classroomId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classroomId) return;
    listSessions(Number(classroomId)).then(setSessions);
  }, [classroomId]);

  useEffect(() => {
    if (!assignmentId || !sessionId) {
      setRows([]);
      return;
    }
    setLoading(true);
    getAttendanceReport(Number(assignmentId), Number(sessionId))
      .then(setRows)
      .catch(() => toast.error("Failed to load attendance report"))
      .finally(() => setLoading(false));
  }, [assignmentId, sessionId]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <button
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        onClick={() => navigate(`/instructor/classrooms/${classroomId}/assignments/${assignmentId}/view`)}
      >
        <ArrowLeft size={15} />
        Back to Assignment
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck size={22} />
          Attendance Report
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cross-references this assignment's submissions against attendance for a lab
          session you pick — computed live, so it always reflects the latest attendance
          marks regardless of when they were entered relative to a submission.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lab session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.sessionId} value={String(s.sessionId)}>
                    {s.sessionDate}
                    {s.groupId ? "" : " (Whole Classroom)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No lab sessions recorded for this classroom yet.
            </p>
          )}
        </CardContent>
      </Card>

      {loading && <div className="text-center py-8">Loading...</div>}

      {!loading && sessionId && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>Student</span>
            <span>Submitted</span>
            <span>Attendance</span>
          </div>
          {rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No submissions for this assignment yet.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.submissionId}
                className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-border last:border-0 gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {row.firstName} {row.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {fmtDateTime(row.submittedAt)}
                </span>
                {statusBadge(row.attendanceStatus)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
