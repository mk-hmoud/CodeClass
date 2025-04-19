import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileDown, FileText, RefreshCw, Server } from "lucide-react";

interface MoodleExportProps {
  assignmentData: any;
  students: any[];
  classroomData?: any;
}

const MoodleExport = ({
  assignmentData,
  students,
  classroomData,
}: MoodleExportProps) => {
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "xml">(
    "csv"
  );
  const [includeFields, setIncludeFields] = useState({
    studentId: true,
    name: true,
    email: true,
    score: true,
    feedback: false,
    timestamp: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.success(
        `Successfully exported ${
          students.length
        } records in ${exportFormat.toUpperCase()} format`
      );
    }, 1500);
  };

  const toggleField = (field: keyof typeof includeFields) => {
    setIncludeFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export to Moodle</CardTitle>
        <CardDescription>
          Export assignment data to your Moodle course
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div>
            <Label htmlFor="exportFormat">Export Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(value: "csv" | "json" | "xml") =>
                setExportFormat(value)
              }
            >
              <SelectTrigger id="exportFormat" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Include Fields</Label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(includeFields).map(([field, checked]) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={checked}
                    onCheckedChange={() =>
                      toggleField(field as keyof typeof includeFields)
                    }
                  />
                  <Label htmlFor={field} className="capitalize cursor-pointer">
                    {field}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Export Summary</h3>
            </div>
            <div className="text-sm">
              <p>
                <span className="text-muted-foreground">Assignment:</span>{" "}
                {assignmentData.title}
              </p>
              <p>
                <span className="text-muted-foreground">Records:</span>{" "}
                {students.length} students
              </p>
              <p>
                <span className="text-muted-foreground">Format:</span>{" "}
                {exportFormat.toUpperCase()}
              </p>
              {classroomData && (
                <p>
                  <span className="text-muted-foreground">Classroom:</span>{" "}
                  {classroomData.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export to Moodle
                </>
              )}
            </Button>
            <Button variant="outline">
              <Server className="mr-2 h-4 w-4" />
              Download Locally
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MoodleExport;
