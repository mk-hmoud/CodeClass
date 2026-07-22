import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Users, Plus, Edit, Trash, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  setGroupRoster,
} from "@/services/GroupService";
import { LabGroup } from "@/types/Group";
import { ClassroomStudent } from "@/types/Classroom";

interface Props {
  classroomId: number;
  students: ClassroomStudent[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NO_DAY_VALUE = "none";

interface GroupFormState {
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

const emptyForm: GroupFormState = { name: "", dayOfWeek: NO_DAY_VALUE, startTime: "", endTime: "" };

const GroupsTab: React.FC<Props> = ({ classroomId, students }) => {
  const [groups, setGroups] = useState<LabGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LabGroup | null>(null);
  const [form, setForm] = useState<GroupFormState>(emptyForm);
  const [rosterGroup, setRosterGroup] = useState<LabGroup | null>(null);
  const [rosterSelection, setRosterSelection] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<LabGroup | null>(null);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getGroups(classroomId);
      setGroups(data);
    } catch (error) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  const openCreateForm = () => {
    setEditingGroup(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (group: LabGroup) => {
    setEditingGroup(group);
    setForm({
      name: group.name,
      dayOfWeek: group.dayOfWeek != null ? String(group.dayOfWeek) : NO_DAY_VALUE,
      startTime: group.startTime ?? "",
      endTime: group.endTime ?? "",
    });
    setFormOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    const payload = {
      classroomId,
      name: form.name.trim(),
      dayOfWeek: form.dayOfWeek === NO_DAY_VALUE ? undefined : Number(form.dayOfWeek),
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
    };

    try {
      if (editingGroup) {
        await updateGroup(editingGroup.groupId, payload);
        toast.success("Group updated");
      } else {
        await createGroup(payload);
        toast.success("Group created");
      }
      setFormOpen(false);
      loadGroups();
    } catch (error) {
      toast.error(editingGroup ? "Failed to update group" : "Failed to create group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup(deleteTarget.groupId);
      toast.success("Group deleted");
      setDeleteTarget(null);
      loadGroups();
    } catch (error) {
      toast.error("Failed to delete group");
    }
  };

  const openRoster = (group: LabGroup) => {
    setRosterGroup(group);
    setRosterSelection(new Set(group.roster ?? []));
  };

  const toggleRosterStudent = (studentId: number) => {
    setRosterSelection((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSaveRoster = async () => {
    if (!rosterGroup) return;
    try {
      await setGroupRoster(rosterGroup.groupId, Array.from(rosterSelection));
      toast.success("Roster updated");
      setRosterGroup(null);
      loadGroups();
    } catch (error) {
      toast.error("Failed to update roster");
    }
  };

  const scheduleLabel = (group: LabGroup) => {
    if (group.dayOfWeek == null) return null;
    const day = DAYS[group.dayOfWeek];
    const time = group.startTime && group.endTime ? ` ${group.startTime}–${group.endTime}` : "";
    return `${day}${time}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users size={18} />
            Lab Groups
          </h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {groups.length}
          </span>
        </div>
        <Button className="gap-2" onClick={openCreateForm}>
          <Plus size={16} />
          Create Group
        </Button>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10">
          <p className="text-muted-foreground mb-4">
            No groups yet. Groups are optional — only set these up if you want per-time-slot
            attendance rosters or assignment variants.
          </p>
          <Button onClick={openCreateForm}>Create Your First Group</Button>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <Card key={group.groupId} className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{group.name}</h3>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                  {scheduleLabel(group) && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {scheduleLabel(group)}
                    </span>
                  )}
                  <span>{group.roster?.length ?? 0} students</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openRoster(group)}>
                  Manage Roster
                </Button>
                <Button variant="outline" size="icon" onClick={() => openEditForm(group)} aria-label="Edit Group">
                  <Edit size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-500"
                  onClick={() => setDeleteTarget(group)}
                  aria-label="Delete Group"
                >
                  <Trash size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="group-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="group-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Monday PM"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="group-day">Day of week</Label>
              <Select
                value={form.dayOfWeek}
                onValueChange={(value) => setForm({ ...form, dayOfWeek: value })}
              >
                <SelectTrigger id="group-day" className="mt-2">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DAY_VALUE}>Not set</SelectItem>
                  {DAYS.map((day, index) => (
                    <SelectItem key={day} value={String(index)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="group-start">Start time</Label>
                <Input
                  id="group-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="group-end">End time</Label>
                <Input
                  id="group-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveGroup}>{editingGroup ? "Save Changes" : "Create Group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rosterGroup} onOpenChange={(open) => !open && setRosterGroup(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Roster — {rosterGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {students.length === 0 && (
              <p className="text-sm text-muted-foreground">No students enrolled in this classroom yet.</p>
            )}
            {students.map((s) => (
              <label
                key={s.student_id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 cursor-pointer"
              >
                <Checkbox
                  checked={rosterSelection.has(s.student_id)}
                  onCheckedChange={() => toggleRosterStudent(s.student_id)}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveRoster}>Save Roster</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Confirm Group Deletion"
        description={`Are you sure you want to delete the group "${deleteTarget?.name}"? Any assignments linked to it will become classroom-wide, and its attendance history will be removed. This action cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteGroup}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default GroupsTab;
