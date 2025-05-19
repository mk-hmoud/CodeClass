import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { Plus, Users, BookOpen, MoreVertical, Trash, Book } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { Classroom } from "../../../types/Classroom";
import {
  createClassroom,
  deleteClassroom,
  getClassrooms,
  toggleClassroomStatus,
} from "@/services/ClassroomService";

const ClassroomsSection = () => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [newClassroomName, setNewClassroomName] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      const data = await getClassrooms();
      setClassrooms(data);
    } catch (error) {
      toast.error("Failed to load classrooms");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreateClassroom = async () => {
    if (!newClassroomName.trim()) {
      toast.error("Please enter a classroom name");
      return;
    }
    setIsSubmitting(true);
    try {
      await createClassroom({ name: newClassroomName });
      await fetchClassrooms();
      setNewClassroomName("");
      setOpen(false);
      toast.success(`Classroom "${newClassroomName}" created successfully`);
    } catch (error) {
      toast.error("Failed to create classroom");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!selectedClassroom) return;
    setIsSubmitting(true);
    try {
      await deleteClassroom(selectedClassroom.id);
      setClassrooms(classrooms.filter((c) => c.id !== selectedClassroom.id));
      toast.success(
        `Classroom "${selectedClassroom.name}" deleted successfully`
      );
      setDeleteDialogOpen(false);
      setSelectedClassroom(null);
    } catch (error) {
      toast.error("Failed to delete classroom");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveClassroom = async (classroom: Classroom) => {
    try {
      const newStatus = await toggleClassroomStatus(classroom.id);
      setClassrooms((cls) =>
        cls.map((c) =>
          c.id === classroom.id ? { ...c, status: newStatus } : c
        )
      );

      toast.success(
        `Classroom "${classroom.name}" ${
          newStatus === "archived" ? "archived" : "restored"
        }`
      );
    } catch (err) {
      toast.error("Unable to update classroom status");
      console.error(err);
    }
  };

  const filteredClassrooms = classrooms
    .filter(
      (classroom) =>
        activeTab === "all" ||
        (activeTab === "active" && classroom.status === "active") ||
        (activeTab === "archived" && classroom.status === "archived")
    )
    .filter(
      (classroom) =>
        classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classroom.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="bg-[#0b0f1a] text-white rounded-lg border border-gray-800 p-6 mb-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Classrooms</h2>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={18} />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Classroom</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="classroom-name">Classroom Name</Label>
                <Input
                  id="classroom-name"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="e.g. Advanced Python Programming"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateClassroom}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Search classrooms..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="border border-gray-700 bg-[#0d1224]">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-[#123651]"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="data-[state=active]:bg-[#123651]"
            >
              Archived
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-[#123651]"
            >
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className={`bg-[#0d1224] border-gray-700 hover:border-[#00b7ff] transition-colors ${
                classroom.status === "active" ? "opacity-80" : ""
              }`}
            >
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  navigate(`/instructor/classrooms/${classroom.id}/view`)
                }
              >
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white">{classroom.name}</CardTitle>
                  {classroom.status === "archived" && (
                    <Badge
                      variant="outline"
                      className="bg-gray-800 text-gray-400 border-gray-600"
                    >
                      Archived
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent
                className="cursor-pointer"
                onClick={() =>
                  navigate(`/instructor/classrooms/${classroom.id}/view`)
                }
              >
                <p className="text-gray-400 mb-4">
                  Code:{" "}
                  <span className="font-mono bg-gray-800 px-2 py-1 rounded text-[#00b7ff]">
                    {classroom.code}
                  </span>
                </p>

                <div className="flex justify-between text-sm text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{classroom.students_num} Students </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen size={16} />
                    <span>{classroom.totalAssignments} Assignments </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 pt-4 flex justify-between">
                <Button
                  variant="outline"
                  className="flex-1 mr-2"
                  onClick={() =>
                    navigate(`/instructor/classrooms/${classroom.id}/view`)
                  }
                >
                  View Classroom
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => "openNewAssignmentDialog(classroom.id)"} // TODO: update this
                    >
                      <Plus size={16} className="mr-2" />
                      Add Assignment
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveClassroom(classroom)}
                    >
                      {classroom.status === "active"
                        ? "Archive Classroom"
                        : "Restore Classroom"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-500"
                      onClick={() => {
                        setSelectedClassroom(classroom);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash size={16} className="mr-2" />
                      Delete Classroom
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-gray-700 rounded-lg bg-[#0c121f]">
          <div className="bg-[#123651]/20 rounded-full p-3 inline-flex mb-4">
            <BookOpen className="text-[#00b7ff]" size={24} />
          </div>
          {searchQuery ? (
            <>
              <p className="text-gray-400 mb-4">
                No classrooms found matching "{searchQuery}"
              </p>
              <Button onClick={() => setSearchQuery("")}>Clear Search</Button>
            </>
          ) : activeTab === "active" ? (
            <>
              <p className="text-gray-400 mb-4">
                You don't have any active classrooms
              </p>
              <Button onClick={() => setOpen(true)}>
                Create Your First Classroom
              </Button>
            </>
          ) : activeTab === "archived" ? (
            <p className="text-gray-400">
              You don't have any archived classrooms
            </p>
          ) : (
            <>
              <p className="text-gray-400 mb-4">
                You don't have any classrooms yet
              </p>
              <Button onClick={() => setOpen(true)}>
                Create Your First Classroom
              </Button>
            </>
          )}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete "{selectedClassroom?.name}"?</p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClassroom}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassroomsSection;
