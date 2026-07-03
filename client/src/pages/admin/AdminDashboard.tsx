import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchAllUsers, deleteUser, UserSummary, fetchAllClassroomsAdmin, deleteClassroomAdmin, fetchPlatformAnalytics, adminChangeUserPassword, adminBulkCreateUsers, adminBulkEnrollStudents } from "@/services/AdminService";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, UserCog, BookOpen, BarChart, Settings, Users as UsersIcon, Key, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClassroomForEnroll, setSelectedClassroomForEnroll] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    const [userData, classData, analyticsData] = await Promise.all([
      fetchAllUsers(),
      fetchAllClassroomsAdmin(),
      fetchPlatformAnalytics()
    ]);
    setUsers(userData);
    setClassrooms(classData);
    setAnalytics(analyticsData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const headers = lines[0].toLowerCase().split(',');
        
        if (!headers.includes('first_name') || !headers.includes('last_name') || !headers.includes('student_number')) {
          toast.error("Invalid CSV format. Header must be exactly: first_name,last_name,student_number");
          return;
        }

        const students = lines.slice(1).map(line => {
          const values = line.split(',');
          const student: any = {};
          headers.forEach((h, i) => { student[h.trim()] = values[i]?.trim(); });
          return student;
        }).filter(s => s.first_name && s.last_name && s.student_number);

        if (students.length === 0) {
          toast.error("No valid student data found in CSV");
          return;
        }

        setIsLoading(true);
        const response = await adminBulkCreateUsers(students);
        if (response.success) {
          toast.success(response.message);
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users and platform settings</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            Import CSV
          </Button>
          <Link to="/admin/users/create">
            <Button className="gap-2">
              <PlusCircle size={16} />
              Create User
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2"><UsersIcon size={16}/> Users</TabsTrigger>
          <TabsTrigger value="classrooms" className="gap-2"><BookOpen size={16}/> Classrooms</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart size={16}/> Analytics</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Settings size={16}/> Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCog className="text-primary" />
                <CardTitle>All Users</CardTitle>
              </div>
              <CardDescription>A list of all users currently registered on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                  No users found.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
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
                              ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 
                                user.role === 'instructor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 
                                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
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
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-600/10"
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="text-primary" />
                <CardTitle>All Classrooms</CardTitle>
              </div>
              <CardDescription>Oversight of all platform classrooms.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : classrooms.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                  No classrooms found.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
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
                              ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => triggerEnrollModal(c.classroom_id)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-600/10"
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart className="text-primary" />
                <CardTitle>Platform Analytics</CardTitle>
              </div>
              <CardDescription>High-level system statistics.</CardDescription>
            </CardHeader>
            <CardContent>
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="text-primary" />
                <CardTitle>Maintenance Mode</CardTitle>
              </div>
              <CardDescription>Enable maintenance mode to prevent non-admins from logging in.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-6 border rounded-xl">
                <div>
                  <h3 className="font-medium text-lg mb-1">System Maintenance</h3>
                  <p className="text-muted-foreground text-sm">When enabled, students and instructors will see a maintenance page.</p>
                </div>
                <Button 
                  variant={maintenance ? "destructive" : "default"}
                  onClick={() => setMaintenance(!maintenance)}
                >
                  {maintenance ? "Disable Maintenance" : "Enable Maintenance"}
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
            <Input 
              placeholder="Search students..." 
              value={studentSearch} 
              onChange={e => setStudentSearch(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2 max-h-[40vh]">
              {users.filter(u => u.role === 'student' && (u.email.includes(studentSearch) || u.first_name?.toLowerCase().includes(studentSearch.toLowerCase()) || u.last_name?.toLowerCase().includes(studentSearch.toLowerCase()))).map(student => (
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
              {users.filter(u => u.role === 'student').length === 0 && (
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
