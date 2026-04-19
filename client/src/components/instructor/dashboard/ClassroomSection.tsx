import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Users, BookOpen, MoreVertical, Trash, Search,
  Archive, RotateCcw, ChevronRight, LayoutGrid,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { Classroom } from "@/types/Classroom";
import {
  createClassroom,
  deleteClassroom,
  toggleClassroomStatus,
} from "@/services/ClassroomService";

// ── Accent palette (matches StudentDashboard) ────────────────────────────────
const ACCENTS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#6366f1", "#f97316",
];
const getAccent = (id: number) => ACCENTS[id % ACCENTS.length];

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32 } },
};

// ── Tab filter button ─────────────────────────────────────────────────────────
const FilterTab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )}
  >
    {label}
  </button>
);

// ── Classroom card ────────────────────────────────────────────────────────────
const ClassroomCard = ({
  classroom,
  onNavigate,
  onArchive,
  onDelete,
  onAddAssignment,
}: {
  classroom: Classroom;
  onNavigate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onAddAssignment: () => void;
}) => {
  const accent = getAccent(classroom.id);
  const isArchived = classroom.status === "archived";

  return (
    <motion.div
      variants={fadeUp}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      {/* Clickable top area */}
      <div className="p-5 cursor-pointer" onClick={onNavigate}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: accent + "18", color: accent }}
            >
              {classroom.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate max-w-[160px]">
                {classroom.name}
              </h3>
              {classroom.code && (
                <span className="text-xs font-mono text-muted-foreground">
                  {classroom.code}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isArchived && (
              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                Archived
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddAssignment(); }}>
                  <Plus size={14} className="mr-2" />
                  Add Assignment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                  {isArchived
                    ? <><RotateCcw size={14} className="mr-2" />Restore</>
                    : <><Archive size={14} className="mr-2" />Archive</>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>{classroom.students_num ?? 0} students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} />
            <span>{classroom.totalAssignments ?? 0} assignments</span>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        <button
          onClick={onNavigate}
          className="text-xs font-medium flex items-center gap-1 transition-colors"
          style={{ color: accent }}
        >
          Open classroom
          <ChevronRight size={13} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddAssignment(); }}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Plus size={12} />
          Assignment
        </button>
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
interface ClassroomsSectionProps {
  classrooms: Classroom[];
  isLoading: boolean;
  onRefetch: () => Promise<void>;
}

const ClassroomsSection = ({ classrooms, isLoading, onRefetch }: ClassroomsSectionProps) => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [newName, setNewName] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Enter a classroom name"); return; }
    setIsSubmitting(true);
    try {
      await createClassroom({ name: newName });
      await onRefetch();
      setNewName("");
      setCreateOpen(false);
      toast.success(`"${newName}" created`);
    } catch {
      toast.error("Failed to create classroom");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClassroom) return;
    setIsSubmitting(true);
    try {
      await deleteClassroom(selectedClassroom.id);
      await onRefetch();
      toast.success(`"${selectedClassroom.name}" deleted`);
      setDeleteDialogOpen(false);
      setSelectedClassroom(null);
    } catch {
      toast.error("Failed to delete classroom");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (classroom: Classroom) => {
    try {
      const newStatus = await toggleClassroomStatus(classroom.id);
      await onRefetch();
      toast.success(`"${classroom.name}" ${newStatus === "archived" ? "archived" : "restored"}`);
    } catch {
      toast.error("Unable to update classroom status");
    }
  };

  const filtered = classrooms
    .filter(c =>
      activeTab === "all" ||
      (activeTab === "active" && c.status !== "archived") ||
      (activeTab === "archived" && c.status === "archived")
    )
    .filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid size={18} className="text-muted-foreground" />
          <h2 className="font-semibold text-lg">Classrooms</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {classrooms.length}
          </span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus size={15} />
              New Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Classroom</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="cn">Classroom Name</Label>
              <Input
                id="cn"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Advanced Python"
                className="mt-2"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search classrooms…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border border-border">
          <FilterTab label="Active" active={activeTab === "active"} onClick={() => setActiveTab("active")} />
          <FilterTab label="Archived" active={activeTab === "archived"} onClick={() => setActiveTab("archived")} />
          <FilterTab label="All" active={activeTab === "all"} onClick={() => setActiveTab("all")} />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((classroom) => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              onNavigate={() => navigate(`/instructor/classrooms/${classroom.id}/view`)}
              onAddAssignment={() => navigate(`/instructor/classrooms/${classroom.id}/assignments/create`)}
              onArchive={() => handleArchive(classroom)}
              onDelete={() => { setSelectedClassroom(classroom); setDeleteDialogOpen(true); }}
            />
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={22} className="text-primary" />
          </div>
          {searchQuery ? (
            <>
              <p className="text-muted-foreground mb-4">No classrooms match "{searchQuery}"</p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
            </>
          ) : activeTab === "archived" ? (
            <p className="text-muted-foreground">No archived classrooms</p>
          ) : (
            <>
              <p className="font-medium mb-1">No classrooms yet</p>
              <p className="text-sm text-muted-foreground mb-5">Create your first classroom to start teaching.</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} className="mr-1.5" />
                Create Classroom
              </Button>
            </>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete <strong>"{selectedClassroom?.name}"</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone. All assignments and submissions will be lost.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ClassroomsSection;
