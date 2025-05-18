import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import GradesExport from "@/components/GradesExport";
import { toast } from "sonner";
import {
  exportAndDownloadSubmissionsAsZip,
  exportAndDownloadAssignment,
} from "@/services/ExportService";

interface ExportTabProps {
  assignment: {
    assignmentId: number | string;
    title: string;
    [key: string]: any;
  };
  students: any[];
}

const ExportTab: React.FC<ExportTabProps> = ({ assignment, students }) => {
  const handleExcelExport = async () => {
    try {
      await exportAndDownloadAssignment(
        assignment.assignmentId,
        assignment.title,
        { format: "excel" }
      );
      toast.success("Successfully exported data as Excel");
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error(`Export failed: ${error.message || "Unknown error"}`);
    }
  };

  const handlePDFExport = async () => {
    try {
      await exportAndDownloadAssignment(
        assignment.assignmentId,
        assignment.title,
        { format: "pdf" }
      );
      toast.success("Successfully exported data as PDF");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error(`Export failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleZipExport = async () => {
    try {
      await exportAndDownloadSubmissionsAsZip(
        assignment.assignmentId,
        assignment.title
      );
      toast.success("Successfully exported all submission files as ZIP");
    } catch (error) {
      console.error("ZIP export failed:", error);
      toast.error(`Export failed: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GradesExport assignmentData={assignment} students={students} />
      <Card className="bg-[#0d1224] border-gray-700">
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Additional export formats and options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleExcelExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={handlePDFExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleZipExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export all submission files (ZIP)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportTab;
