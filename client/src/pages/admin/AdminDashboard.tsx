import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllUsers, deleteUser, UserSummary } from "@/services/AdminService";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await fetchAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: number, email: string) => {
    if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
      const success = await deleteUser(id);
      if (success) {
        toast.success(`User ${email} deleted successfully`);
        loadUsers();
      } else {
        toast.error("Failed to delete user");
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users and platform settings</p>
        </div>
        <Link to="/admin/users/create">
          <Button className="gap-2">
            <PlusCircle size={16} />
            Create User
          </Button>
        </Link>
      </div>

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
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(user.user_id, user.email)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </Button>
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
    </div>
  );
};

export default AdminDashboard;
