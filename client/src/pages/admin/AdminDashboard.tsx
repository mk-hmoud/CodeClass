import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchAllUsers, deleteUser, UserSummary, fetchAllClassroomsAdmin, deleteClassroomAdmin, fetchPlatformAnalytics, adminChangeUserPassword, adminBulkCreateUsers, adminResetStudentPasswords, adminBulkEnrollStudents, getMaintenanceStatus, setMaintenanceStatus, StudentCredential } from "@/services/AdminService";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, UserCog, BookOpen, BarChart, Settings, Users as UsersIcon, Key, Upload, UserPlus, Download } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/PageHeader";
import { parseRosterCsv, STUDENT_EMAIL_FOR, credentialsCsv, downloadCsv } from "@/lib/roster";

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceUpdating, setMaintenanceUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);
  const resetInputRef = useRef<HTMLInputElement>(null);
  const [lastCredentials, setLastCredentials] = useState<StudentCredential[]>([]);
  
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClassroomForEnroll, setSelectedClassroomForEnroll] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  // Shared by the list, the empty state and the select-all control, so all three
  // agree on what "the students you're looking at" means while a search is active.
  const filteredStudents = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "student" &&
          (u.email.includes(studentSearch) ||
            u.first_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            u.last_name?.toLowerCase().includes(studentSearch.toLowerCase()))
      ),
    [users, studentSearch]
  );

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudents.has(s.email));

  // Select-all acts on the filtered set, not every student, so searching "2512"
  // and selecting all adds just those -- and leaves selections made under a
  // previous search untouched.
  const toggleSelectAllFiltered = (checked: boolean) => {
    const newSet = new Set(selectedStudents);
    for (const s of filteredStudents) {
      if (checked) newSet.add(s.email);
      else newSet.delete(s.email);
    }
    setSelectedStudents(newSet);
  };

  const loadData = async () => {
    setIsLoading(true);
    const [userData, classData, analyticsData, maintenanceStatus] = await Promise.all([
      fetchAllUsers(),
      fetchAllClassroomsAdmin(),
      fetchPlatformAnalytics(),
      getMaintenanceStatus(),
    ]);
    setUsers(userData);
    setClassrooms(classData);
    setAnalytics(analyticsData);
    setMaintenance(maintenanceStatus);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMaintenance = async () => {
    setMaintenanceUpdating(true);
    const response = await setMaintenanceStatus(!maintenance);
    if (response.success && response.maintenance_mode !== undefined) {
      setMaintenance(response.maintenance_mode);
      toast.success(response.message);
    } else {
      toast.error(response.message);
    }
    setMaintenanceUpdating(false);
  };

  const handleDelete = async (id: number, email: string) => {
    if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
      const success = await deleteUser(id);
      if (success) {
        toast.success(`User ${email} deleted successfully`);
        loadData();
      } else {
        toast.error("Failed to delete user");
      }
    }
  };

  const handleDeleteClassroom = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete classroom ${name}?`)) {
      const success = await deleteClassroomAdmin(id);
      if (success) {
        toast.success(`Classroom ${name} deleted successfully`);
        loadData();
      } else {
        toast.error("Failed to delete classroom");
      }
    }
  };

  const handleChangePassword = async (id: number, email: string) => {
    const newPassword = window.prompt(`Enter a new password for ${email}:\n(Note: You cannot view their current password because it is securely hashed)`);
    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        return;
      }
      const response = await adminChangeUserPassword(id, newPassword);
      if (response.success) {
        toast.success(`Password for ${email} has been changed.`);
      } else {
        toast.error(response.message);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const students = parseRosterCsv(text);

        if (students === null) {
          toast.error("Invalid CSV format. Header must include: first_name,last_name,student_number");
          return;
        }

        if (students.length === 0) {
          toast.error("No valid student data found in CSV");
          return;
        }

        setIsLoading(true);
        const response = await adminBulkCreateUsers(students);
        if (response.success) {
          toast.success(response.message);
          deliverCredentials(response.credentials ?? [], "imported");
          loadData();
        } else {
          toast.error(response.message);
        }
      } catch (error) {
        toast.error("Failed to parse CSV file");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  /**
   * The server generates one password per student and returns them exactly
   * once; nothing but the hash is kept. So the download happens here, straight
   * away, and the list is also held in state in case the save dialog is
   * dismissed -- losing it means re-running a reset, not looking it up.
   */
  const deliverCredentials = (credentials: StudentCredential[], verb: string) => {
    if (credentials.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `student-passwords-${stamp}.csv`;
    downloadCsv(filename, credentialsCsv(credentials));
    setLastCredentials(credentials);
    toast.success(
      `${credentials.length} password${credentials.length === 1 ? "" : "s"} ${verb} and saved to ${filename}. This list cannot be shown again.`,
      { duration: 12000 }
    );
  };

  // Re-issues a password to students who already have accounts. The cohort
  // comes from the same roster CSV, so the instructor gets one list per course
  // rather than a platform-wide reset.
  const handlePasswordResetCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rows = parseRosterCsv(event.target?.result as string);
        if (rows === null) {
          toast.error("Invalid CSV format. Header must include: first_name,last_name,student_number");
          return;
        }
        if (rows.length === 0) {
          toast.error("No valid student data found in CSV");
          return;
        }

        setIsLoading(true);
        const response = await adminResetStudentPasswords(rows);
        if (response.success) {
          toast.success(response.message);
          deliverCredentials(response.credentials ?? [], "reset");
        } else {
          toast.error(response.message);
        }
      } catch {
        toast.error("Failed to parse CSV file");
      } finally {
        if (resetInputRef.current) resetInputRef.current.value = '';
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Enrolling a course means picking its ~170 students out of every student on
  // the platform, which no amount of searching makes tractable. The roster CSV
  // already names exactly the right cohort, so reuse it as the selection: match
  // each row back to the account bulk import created and tick those boxes. The
  // admin still reviews and presses Enroll -- this only replaces the clicking.
  const handleRosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rows = parseRosterCsv(event.target?.result as string);

        if (rows === null) {
          toast.error("Invalid CSV format. Header must include: first_name,last_name,student_number");
          return;
        }
        if (rows.length === 0) {
          toast.error("No valid student data found in CSV");
          return;
        }

        const wanted = new Set(rows.map(r => STUDENT_EMAIL_FOR(r.student_number)));
        const known = new Set(users.filter(u => u.role === "student").map(u => u.email));
        const matched = [...wanted].filter(email => known.has(email));
        const missing = wanted.size - matched.length;

        setSelectedStudents(new Set(matched));

        if (matched.length === 0) {
          toast.error(`None of the ${wanted.size} students in this roster have accounts yet. Import the CSV from the Users tab first.`);
        } else if (missing > 0) {
          toast.warning(`Selected ${matched.length} of ${wanted.size}. ${missing} have no account yet -- import the CSV from the Users tab first.`);
        } else {
          toast.success(`Selected all ${matched.length} students from this roster.`);
        }
      } catch {
        toast.error("Failed to parse CSV file");
      } finally {
        if (rosterInputRef.current) rosterInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerEnrollModal = (classroomId: number) => {
    setSelectedClassroomForEnroll(classroomId);
    setSelectedStudents(new Set());
    setStudentSearch("");
    setEnrollModalOpen(true);
  };

  const submitEnrollment = async () => {
    if (!selectedClassroomForEnroll || selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }
    
    setIsLoading(true);
    const emails = Array.from(selectedStudents);
    const response = await adminBulkEnrollStudents(selectedClassroomForEnroll, emails);
    if (response.success) {
      toast.success(response.message);
      setEnrollModalOpen(false);
      loadData();
    } else {
      toast.error(response.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Admin Dashboard"
        description="Manage users and platform settings"
        className="mb-8"
        actions={
          <>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <Upload size={16} />
              Import CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={resetInputRef}
              className="hidden"
              onChange={handlePasswordResetCsv}
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => resetInputRef.current?.click()}
              disabled={isLoading}
              title="Issue a new generated password to every student in a roster CSV and download the list"
            >
              <Key size={16} />
              Reset passwords
            </Button>
            {lastCredentials.length > 0 && (
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() =>
                  downloadCsv(
                    `student-passwords-${new Date().toISOString().slice(0, 10)}.csv`,
                    credentialsCsv(lastCredentials)
                  )
                }
                title="Save the list from the last import or reset again (lost when this page reloads)"
              >
                <Download size={16} />
                Save list again ({lastCredentials.length})
              </Button>
            )}
            <Link to="/admin/users/create">
              <Button className="gap-2">
                <PlusCircle size={16} />
                Create User
              </Button>
            </Link>
          </>
        }
      />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2"><UsersIcon size={16}/> Users</TabsTrigger>
          <TabsTrigger value="classrooms" className="gap-2"><BookOpen size={16}/> Classrooms</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart size={16}/> Analytics</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Settings size={16}/> Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <UserCog className="text-primary" />
                <CardTitle>All Users</CardTitle>
              </div>
              <CardDescription>A list of all users currently registered on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                  No users found.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((user) => (
                        <tr key={user.user_id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium">{(user.first_name || '') + ' ' + (user.last_name || '')}</td>
                          <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                              ${user.role === 'admin' ? 'bg-primary/10 text-primary' :
                                user.role === 'instructor' ? 'bg-info/10 text-info' :
                                'bg-success/10 text-success'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {user.role !== 'admin' && (
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleChangePassword(user.user_id, user.email)}
                                  className="h-8 w-8 text-info hover:text-info hover:bg-info/10"
                                  title="Change Password"
                                >
                                  <Key size={16} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDelete(user.user_id, user.email)}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete user"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classrooms">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="text-primary" />
                <CardTitle>All Classrooms</CardTitle>
              </div>
              <CardDescription>Oversight of all platform classrooms.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : classrooms.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                  No classrooms found.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Code</th>
                        <th className="px-4 py-3 font-medium">Instructor</th>
                        <th className="px-4 py-3 font-medium">Students</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {classrooms.map((c) => (
                        <tr key={c.classroom_id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium">{c.classroom_name}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{c.classroom_code}</td>
                          <td className="px-4 py-3">
                            <div>{c.instructor_name}</div>
                            <div className="text-xs text-muted-foreground">{c.instructor_email}</div>
                          </td>
                          <td className="px-4 py-3">{c.student_count}</td>
                          <td className="px-4 py-3 capitalize">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                              ${c.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => triggerEnrollModal(c.classroom_id)}
                                className="h-8 w-8 text-info hover:text-info hover:bg-info/10"
                                title="Enroll Students"
                              >
                                <UserPlus size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteClassroom(c.classroom_id, c.classroom_name)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete classroom"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <BarChart className="text-primary" />
                <CardTitle>Platform Analytics</CardTitle>
              </div>
              <CardDescription>High-level system statistics.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              {isLoading || !analytics ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-6 border rounded-xl bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                    <p className="text-3xl font-bold">{analytics.totalUsers}</p>
                  </div>
                  <div className="p-6 border rounded-xl bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Total Classrooms</p>
                    <p className="text-3xl font-bold">{analytics.totalClassrooms}</p>
                  </div>
                  <div className="p-6 border rounded-xl bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Active Classrooms</p>
                    <p className="text-3xl font-bold text-primary">{analytics.activeClassrooms}</p>
                  </div>
                  <div className="p-6 border rounded-xl bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                    <p className="text-3xl font-bold">{analytics.totalSubmissions}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="text-primary" />
                <CardTitle>Maintenance Mode</CardTitle>
              </div>
              <CardDescription>Enable maintenance mode to prevent non-admins from logging in.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              <div className="flex items-center justify-between p-6 border rounded-xl">
                <div>
                  <h3 className="font-medium text-lg mb-1">System Maintenance</h3>
                  <p className="text-muted-foreground text-sm">When enabled, students and instructors will see a maintenance page.</p>
                </div>
                <Button
                  variant={maintenance ? "destructive" : "default"}
                  onClick={handleToggleMaintenance}
                  disabled={maintenanceUpdating}
                >
                  {maintenanceUpdating ? "Updating…" : maintenance ? "Disable Maintenance" : "Enable Maintenance"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Enroll Students</DialogTitle>
            <DialogDescription>
              Select students to enroll in this classroom.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
              <input
                type="file"
                accept=".csv"
                ref={rosterInputRef}
                onChange={handleRosterSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="shrink-0 gap-2"
                onClick={() => rosterInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload size={15} />
                From roster
              </Button>
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-students"
                  checked={allFilteredSelected}
                  disabled={filteredStudents.length === 0}
                  onCheckedChange={(checked) => toggleSelectAllFiltered(checked === true)}
                />
                <label
                  htmlFor="select-all-students"
                  className="cursor-pointer text-sm font-medium leading-none"
                >
                  {studentSearch
                    ? `Select all ${filteredStudents.length} matching`
                    : `Select all ${filteredStudents.length}`}
                </label>
              </div>
              <span className="text-muted-foreground text-xs">
                {selectedStudents.size} selected
              </span>
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2 max-h-[40vh]">
              {filteredStudents.map(student => (
                <div key={student.user_id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                  <Checkbox 
                    id={`student-${student.user_id}`}
                    checked={selectedStudents.has(student.email)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedStudents);
                      if (checked) newSet.add(student.email);
                      else newSet.delete(student.email);
                      setSelectedStudents(newSet);
                    }}
                  />
                  <label htmlFor={`student-${student.user_id}`} className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {student.first_name} {student.last_name} <span className="text-muted-foreground font-normal">({student.email})</span>
                  </label>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <div className="text-center text-muted-foreground py-4">No students found.</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollModalOpen(false)}>Cancel</Button>
            <Button onClick={submitEnrollment}>Enroll {selectedStudents.size} Students</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
