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
import MoodleExport from "@/components/MoodleExport";

interface ExportTabProps {
  assignment: any;
  students: any[];
}

const ExportTab: React.FC<ExportTabProps> = ({ assignment, students }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MoodleExport assignmentData={assignment} students={students} />

      <Card className="bg-[#0d1224] border-gray-700">
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Additional export formats and options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
            <Button variant="outline" className="justify-start">
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
