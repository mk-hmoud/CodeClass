import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Eye, BarChart2, Trash2, MoreHorizontal,
  Clock, CheckCircle, AlertCircle, BookOpen, ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { deleteAssignment } from "@/services/AssignmentService";
import { Classroom } from "@/types/Classroom";
import { Assignment } from "@/types/Assignment";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  classroom: Classroom;
  onAssignmentDeleted?: (id: number) => void;
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

const getStatus = (a: Assignment) => {
  if (!a.dueDate) return "open";
  return new Date(a.dueDate) > new Date() ? "active" : "expired";
};

const STATUS_META = {
  active:  { label: "Active",  icon: CheckCircle, color: "#10b981", badge: "bg-green-500/10 text-green-600 border-green-500/25" },
  expired: { label: "Expired", icon: AlertCircle, color: "#ef4444", badge: "bg-red-500/10 text-red-500 border-red-500/25" },
  open:    { label: "Open",    icon: Clock,        color: "#3b82f6", badge: "bg-blue-500/10 text-blue-600 border-blue-500/25" },
};

const AssignmentRow = ({
  assignment,
  classroomId,
  onDelete,
}: {
  assignment: Assignment;
  classroomId: number;
  onDelete: (id: number) => void;
}) => {
  const navigate = useNavigate();
  const status = getStatus(assignment);
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const StatusIcon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-lg p-1.5 shrink-0" style={{ backgroundColor: meta.color + "18" }}>
          <StatusIcon size={13} style={{ color: meta.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{assignment.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {assignment.dueDate ? `Due ${fmtDate(assignment.dueDate.toString())}` : "No due date"}
            {assignment.points != null && ` · ${assignment.points} pts`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <Badge className={cn("text-[11px] border hidden sm:flex", meta.badge)}>{meta.label}</Badge>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-60 hover:opacity-100"
          onClick={() => navigate(`/instructor/classrooms/${classroomId}/assignments/${assignment.assignmentId}/view`)}
        >
          <Eye size={14} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/instructor/classrooms/${classroomId}/assignments/${assignment.assignmentId}/analytics`)}>
              <BarChart2 size={13} className="mr-2" />Statistics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(assignment.assignmentId)}
            >
              <Trash2 size={13} className="mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

const AssignmentsTab: React.FC<Props> = ({ classroom, onAssignmentDeleted }) => {
  const navigate = useNavigate();

  const handleDelete = async (id: number) => {
    try {
      await deleteAssignment(id);
      toast.success("Assignment deleted");
      onAssignmentDeleted?.(id);
    } catch {
      toast.error("Failed to delete assignment");
    }
  };

  const active = classroom.assignments.filter(a => getStatus(a) === "active").length;
  const expired = classroom.assignments.filter(a => getStatus(a) === "expired").length;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">Assignments</h2>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">{active} active</span>
            {expired > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">{expired} expired</span>}
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => navigate(`/instructor/classrooms/${classroom.id}/assignments/create`)}
        >
          <Plus size={14} />
          New Assignment
        </Button>
      </div>

      {/* List */}
      {classroom.assignments.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Title</span>
            <div className="flex items-center gap-12 text-xs font-medium text-muted-foreground">
              <span className="hidden sm:block">Status</span>
              <span>Actions</span>
            </div>
          </div>

          {classroom.assignments.map(a => (
            <AssignmentRow
              key={a.assignmentId}
              assignment={a}
              classroomId={classroom.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen size={20} className="text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No assignments yet</p>
          <p className="text-sm text-muted-foreground mb-5">Create your first assignment for this classroom.</p>
          <Button
            size="sm"
            onClick={() => navigate(`/instructor/classrooms/${classroom.id}/assignments/create`)}
          >
            <Plus size={14} className="mr-1.5" />
            Create Assignment
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssignmentsTab;
