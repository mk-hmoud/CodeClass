import React, { useEffect, useRef, useState } from "react";
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
import { Users, Plus, Edit, Trash, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  setGroupRoster,
  importGroupRosters,
  GroupRosterBucket,
} from "@/services/GroupService";
import { LabGroup } from "@/types/Group";
import { ClassroomStudent } from "@/types/Classroom";
import { parseRosterCsv, STUDENT_EMAIL_FOR } from "@/lib/roster";

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

interface ImportPreview {
  buckets: GroupRosterBucket[];
  newNumbers: number[];      // group numbers that don't exist yet (will be created)
  existingNumbers: number[]; // group numbers matched to an existing group
  totalStudents: number;
  unknown: number;           // rows whose student_number isn't enrolled here
  skipped: number;           // rows with no usable lab_group value
}

// The scheduling PDFs name groups "Group-1".."Group-6" and carry a matching
// `lab_group` number per student, so a group is matched to a CSV value by the
// number in its name. Any naming works as long as it contains that number
// ("Group-3", "Lab 3", "3"); a group whose name has no number is skipped and
// reported rather than guessed at.
const groupNumberOf = (name: string): number | null => {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
};

const GroupsTab: React.FC<Props> = ({ classroomId, students }) => {
  const [groups, setGroups] = useState<LabGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LabGroup | null>(null);
  const [form, setForm] = useState<GroupFormState>(emptyForm);
  const [rosterGroup, setRosterGroup] = useState<LabGroup | null>(null);
  const [rosterSelection, setRosterSelection] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<LabGroup | null>(null);
  const rosterCsvRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

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

  // Reads the scheduling CSV (first_name,last_name,student_number,lab_group) and
  // builds a preview: which groups it will create vs reuse, and how many
  // students land where. Nothing is applied until the instructor confirms.
  // Groups no longer need to exist first -- the import creates "Group-N" for any
  // lab_group number that has no matching group yet.
  const handleRosterCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rows = parseRosterCsv(event.target?.result as string);
        if (rows === null) {
          toast.error("Invalid CSV. Header must include: first_name,last_name,student_number");
          return;
        }
        const withGroup = rows.filter((r) => r.lab_group && groupNumberOf(r.lab_group) !== null);
        if (withGroup.length === 0) {
          toast.error("No lab_group column found. Add a lab_group column with each student's group number.");
          return;
        }

        const studentIdByEmail = new Map(students.map((s) => [s.email, s.student_id]));
        const idsByGroupNumber = new Map<number, number[]>();
        let unknown = 0;

        for (const row of withGroup) {
          const studentId = studentIdByEmail.get(STUDENT_EMAIL_FOR(row.student_number));
          if (studentId === undefined) {
            unknown++;
            continue;
          }
          const groupNumber = groupNumberOf(row.lab_group as string) as number;
          const list = idsByGroupNumber.get(groupNumber) ?? [];
          list.push(studentId);
          idsByGroupNumber.set(groupNumber, list);
        }

        const buckets: GroupRosterBucket[] = [...idsByGroupNumber.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([groupNumber, studentIds]) => ({ groupNumber, studentIds }));

        if (buckets.length === 0) {
          toast.error("None of the students in the CSV are enrolled in this classroom.");
          return;
        }

        const existingByNumber = new Set(
          groups
            .map((g) => groupNumberOf(g.name))
            .filter((n): n is number => n !== null)
        );
        const newNumbers = buckets.map((b) => b.groupNumber).filter((n) => !existingByNumber.has(n));
        const existingNumbers = buckets.map((b) => b.groupNumber).filter((n) => existingByNumber.has(n));

        setImportPreview({
          buckets,
          newNumbers,
          existingNumbers,
          totalStudents: buckets.reduce((sum, b) => sum + b.studentIds.length, 0),
          unknown,
          skipped: rows.length - withGroup.length,
        });
      } catch {
        toast.error("Failed to parse CSV file");
      } finally {
        if (rosterCsvRef.current) rosterCsvRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // One request, applied atomically on the server (creates missing groups + sets
  // every roster in a transaction), so there is no partial-failure state.
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const result = await importGroupRosters(classroomId, importPreview.buckets);
      const assigned = result.assignments.reduce((sum, a) => sum + a.count, 0);
      const notes = [
        result.created.length > 0 ? `created ${result.created.length} new group${result.created.length === 1 ? "" : "s"}` : null,
        importPreview.unknown > 0 ? `${importPreview.unknown} not enrolled` : null,
      ].filter(Boolean);
      toast.success(
        `Assigned ${assigned} students across ${result.assignments.length} group${result.assignments.length === 1 ? "" : "s"}` +
          (notes.length > 0 ? ` (${notes.join("; ")})` : "")
      );
      setImportPreview(null);
      await loadGroups();
    } catch {
      toast.error("Failed to import rosters");
    } finally {
      setImporting(false);
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
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            ref={rosterCsvRef}
            onChange={handleRosterCsv}
            className="hidden"
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => rosterCsvRef.current?.click()}
            disabled={importing || students.length === 0}
            title={students.length === 0 ? "Enroll students first" : "Create groups and assign rosters from a CSV with a lab_group column"}
          >
            <Upload size={16} />
            {importing ? "Importing…" : "Groups from CSV"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={openCreateForm}>
            <Plus size={16} />
            Create Group
          </Button>
        </div>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10 px-6">
          <p className="text-muted-foreground mb-1">
            No groups yet. Groups are optional — set them up for per-time-slot attendance
            rosters or assignment variants.
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            Fastest way: upload the scheduling CSV you used to enrol students, with a{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">lab_group</code> column holding
            each student's group number. It creates every group and assigns everyone in one step.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              className="gap-2"
              onClick={() => rosterCsvRef.current?.click()}
              disabled={importing || students.length === 0}
              title={students.length === 0 ? "Enroll students first" : undefined}
            >
              <Upload size={16} />
              Import Groups from CSV
            </Button>
            <Button variant="outline" onClick={openCreateForm}>
              Create One Manually
            </Button>
          </div>
          <div className="mt-5 text-left inline-block">
            <p className="text-xs text-muted-foreground mb-1">Expected columns:</p>
            <pre className="text-xs bg-muted/60 rounded-md px-3 py-2 overflow-x-auto">{`first_name,last_name,student_number,lab_group
Ada,Lovelace,23175026,1
Alan,Turing,23175027,3`}</pre>
          </div>
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
                  className="text-destructive"
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
                Name <span className="text-destructive">*</span>
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

      <Dialog open={!!importPreview} onOpenChange={(open) => !open && !importing && setImportPreview(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import groups from CSV</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4 py-2">
              <p className="text-sm">
                This will assign <span className="font-semibold">{importPreview.totalStudents}</span> student
                {importPreview.totalStudents === 1 ? "" : "s"} across{" "}
                <span className="font-semibold">{importPreview.buckets.length}</span> group
                {importPreview.buckets.length === 1 ? "" : "s"}
                {importPreview.newNumbers.length > 0 && (
                  <> — <span className="font-semibold text-primary">{importPreview.newNumbers.length} new</span> will be created</>
                )}
                {importPreview.existingNumbers.length > 0 && (
                  <>, {importPreview.existingNumbers.length} existing re-filled</>
                )}
                .
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {importPreview.buckets.map((b) => {
                  const isNew = importPreview.newNumbers.includes(b.groupNumber);
                  return (
                    <div
                      key={b.groupNumber}
                      className="flex items-center justify-between text-sm px-3 py-1.5 rounded-md bg-muted/40"
                    >
                      <span className="flex items-center gap-2">
                        Group-{b.groupNumber}
                        {isNew ? (
                          <span className="text-[10px] uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded">new</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">existing</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">{b.studentIds.length} students</span>
                    </div>
                  );
                })}
              </div>

              {(importPreview.unknown > 0 || importPreview.skipped > 0) && (
                <p className="text-xs text-muted-foreground">
                  {[
                    importPreview.unknown > 0 ? `${importPreview.unknown} row(s) skipped — not enrolled in this classroom` : null,
                    importPreview.skipped > 0 ? `${importPreview.skipped} row(s) had no lab_group value` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}

              {importPreview.existingNumbers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Existing groups have their rosters <span className="font-medium">replaced</span>, not appended.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? "Importing…" : "Import"}
            </Button>
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
