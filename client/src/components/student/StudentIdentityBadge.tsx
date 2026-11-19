import React from "react";
import { getCurrentUser } from "@/services/AuthService";

const initialsOf = (first?: string, last?: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

/**
 * A compact "who is working" chip — the signed-in student's name and student
 * number — shown while they solve a task, so their identity is visible on
 * screen (and in any screenshot). The student number is the local part of the
 * `<student_number>@...` login email. Renders nothing for non-students, so an
 * instructor's "preview as student" view stays clean.
 */
const StudentIdentityBadge: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user } = getCurrentUser();
  if (!user || user.role !== "student") return null;

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const email: string = user.email ?? "";
  const studentNumber = email.includes("@") ? email.split("@")[0] : email;

  return (
    <div
      className={`flex items-center gap-2 pl-3 ml-1 border-l border-border ${className}`}
      title={name ? `${name}${studentNumber ? ` · ${studentNumber}` : ""}` : studentNumber}
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
        {initialsOf(user.first_name, user.last_name)}
      </div>
      <div className="leading-tight min-w-0 text-right">
        <div className="text-xs font-medium truncate max-w-[160px]">{name || studentNumber}</div>
        {studentNumber && (
          <div className="text-[10px] text-muted-foreground font-mono truncate">{studentNumber}</div>
        )}
      </div>
    </div>
  );
};

export default StudentIdentityBadge;
