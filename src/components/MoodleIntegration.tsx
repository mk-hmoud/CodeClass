import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  Database,
  ExternalLink,
  FileDown,
  Loader2,
  RefreshCw,
  Server,
  Settings,
  RefreshCcw,
  Users,
} from "lucide-react";

interface MoodleIntegrationProps {
  classroomData: any;
  students: any[];
  assignments: any[];
}

const MoodleIntegration = ({
  classroomData,
  students,
  assignments,
}: MoodleIntegrationProps) => {
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "connecting" | "syncing" | "complete" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("sync");
  const [moodleUrl, setMoodleUrl] = useState(
    "https://moodle.youruniversity.edu"
  );
  const [courseId, setCourseId] = useState("");
  const [syncOptions, setSyncOptions] = useState({
    grades: true,
    assignments: true,
    students: true,
    autoSync: false,
  });

  const handleSync = () => {
    if (!courseId) {
      toast.error("Please enter a Moodle Course ID");
      return;
    }

    setSyncStatus("connecting");
    setProgress(10);

    setTimeout(() => {
      setSyncStatus("syncing");
      setProgress(30);

      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            setSyncStatus("complete");
            toast.success("Successfully synchronized with Moodle");
            return 100;
          }
          return newProgress;
        });
      }, 500);
    }, 1500);
  };

  const handleToggleOption = (option: keyof typeof syncOptions) => {
    setSyncOptions({
      ...syncOptions,
      [option]: !syncOptions[option],
    });
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Moodle Integration</h2>
        <p className="text-muted-foreground">
          Synchronize your classroom with Moodle LMS
        </p>
      </div>

      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="mb-8"
      >
        <TabsList>
          <TabsTrigger value="sync">Sync with Moodle</TabsTrigger>
          <TabsTrigger value="settings">Connection Settings</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Moodle Synchronization</CardTitle>
              <CardDescription>
                Sync grades, assignments and student data with your Moodle
                course
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncStatus === "idle" && (
                <>
                  <div className="mb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="moodleUrl">Moodle URL</Label>
                        <Input
                          id="moodleUrl"
                          value={moodleUrl}
                          onChange={(e) => setMoodleUrl(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="courseId">Moodle Course ID</Label>
                        <Input
                          id="courseId"
                          value={courseId}
                          onChange={(e) => setCourseId(e.target.value)}
                          placeholder="e.g. CS101_SP24"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="syncGrades"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <Database className="h-4 w-4" />
                          Sync Grades
                        </Label>
                        <Switch
                          id="syncGrades"
                          checked={syncOptions.grades}
                          onCheckedChange={() => handleToggleOption("grades")}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="syncAssignments"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <FileDown className="h-4 w-4" />
                          Sync Assignments
                        </Label>
                        <Switch
                          id="syncAssignments"
                          checked={syncOptions.assignments}
                          onCheckedChange={() =>
                            handleToggleOption("assignments")
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="syncStudents"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <Users className="h-4 w-4" />
                          Sync Students
                        </Label>
                        <Switch
                          id="syncStudents"
                          checked={syncOptions.students}
                          onCheckedChange={() => handleToggleOption("students")}
                        />
                      </div>
                    </div>

                    <Alert>
                      <RefreshCcw className="h-4 w-4" />
                      <AlertTitle>Sync Details</AlertTitle>
                      <AlertDescription>
                        <p>Classroom: {classroomData.name}</p>
                        <p>Students: {students.length}</p>
                        <p>Assignments: {assignments.length}</p>
                      </AlertDescription>
                    </Alert>
                  </div>
                  <Button onClick={handleSync}>Sync with Moodle</Button>
                </>
              )}

              {(syncStatus === "connecting" || syncStatus === "syncing") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>
                      {syncStatus === "connecting"
                        ? "Connecting to Moodle..."
                        : "Synchronizing data..."}
                    </p>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {syncStatus === "connecting"
                      ? "Establishing secure connection to Moodle LMS"
                      : `Transferring ${
                          syncOptions.students ? "student data, " : ""
                        }${syncOptions.assignments ? "assignments, " : ""}${
                          syncOptions.grades ? "and grades" : ""
                        }`}
                  </p>
                </div>
              )}

              {syncStatus === "complete" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <p>Synchronization completed successfully</p>
                  </div>
                  <p className="text-sm">
                    {syncOptions.students && `${students.length} students, `}
                    {syncOptions.assignments &&
                      `${assignments.length} assignments, `}
                    {syncOptions.grades && "and all grades "}
                    have been synchronized with your Moodle course.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSyncStatus("idle")}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Again
                    </Button>
                    <Button variant="secondary">
                      Open in Moodle
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {syncStatus === "error" && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTitle>Synchronization Failed</AlertTitle>
                    <AlertDescription>
                      There was an error connecting to Moodle. Please check your
                      connection settings and try again.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => setSyncStatus("idle")}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>
                Configure your Moodle integration settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">Moodle API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value="●●●●●●●●●●●●●●●●"
                      className="font-mono mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The API key can be generated in your Moodle admin settings
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="autoSync"
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Auto-sync daily
                    </Label>
                    <Switch
                      id="autoSync"
                      checked={syncOptions.autoSync}
                      onCheckedChange={() => handleToggleOption("autoSync")}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Data Mapping</h3>
                  <div className="bg-muted p-4 rounded-md">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-muted-foreground">Moodle Course ID:</p>
                      <p>CS101_SP24</p>
                      <p className="text-muted-foreground">Classroom Code:</p>
                      <p>{classroomData.code}</p>
                      <p className="text-muted-foreground">
                        Moodle Assignment ID:
                      </p>
                      <p>Various (mapped automatically)</p>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization History</CardTitle>
              <CardDescription>
                View past synchronization events with Moodle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    date: "May 20, 2023 - 14:32",
                    status: "success",
                    details: "Full sync completed",
                  },
                  {
                    date: "May 15, 2023 - 09:45",
                    status: "success",
                    details: "Grades synced only",
                  },
                  {
                    date: "May 10, 2023 - 16:20",
                    status: "error",
                    details: "Connection timeout",
                  },
                  {
                    date: "May 5, 2023 - 11:15",
                    status: "success",
                    details: "New assignments synced",
                  },
                ].map((event, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 pb-3 border-b"
                  >
                    <div
                      className={`mt-0.5 ${
                        event.status === "success"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {event.status === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Server className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{event.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MoodleIntegration;
