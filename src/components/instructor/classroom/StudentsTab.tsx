import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  UserPlus,
  Mail,
  MoreHorizontal,
  UserCog,
  MessageSquare,
  BarChart,
  UserMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Student {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string;
  completionRate: number;
}

interface StudentsTabProps {
  students: Student[];
  formatDate?: (date: string) => string;
}

const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  formatDate = (date) => new Date(date).toLocaleDateString(),
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "inactive":
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-400">
            Inactive
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Pending
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Students</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus size={16} />
              Add Students
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Add Students</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email Addresses
                </label>
                <Input
                  placeholder="Enter student emails separated by commas"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Students will receive an invitation email to join this
                  classroom
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Or share invite code
                </label>
                <div className="flex gap-2">
                  <Input
                    value="CLASS123"
                    readOnly
                    className="bg-background font-mono"
                  />
                  <Button variant="outline">Copy</Button>
                </div>
              </div>

              <Button className="w-full">Send Invitations</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>{formatDate(student.lastActive)}</TableCell>
                    <TableCell>{student.completionRate}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Send Email">
                          <Mail size={16} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <UserCog className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart className="mr-2 h-4 w-4" />
                              View Progress
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No students enrolled yet.</p>
              <Button variant="outline" className="mt-2">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite students
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default StudentsTab;
