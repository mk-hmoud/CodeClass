import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface CodeSubmissionViewProps {
  code: string;
  language?: string;
}

const CodeSubmissionView: React.FC<CodeSubmissionViewProps> = ({
  code,
  language = "javascript",
}) => {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between bg-[#0c121f] px-4 py-2 border-b border-border">
          <div className="text-sm font-medium">
            {language.charAt(0).toUpperCase() + language.slice(1)}
          </div>
        </div>
        <pre className="overflow-auto text-sm bg-[#0d1224] p-4 max-h-[500px]">
          <code className="text-gray-200">{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
};

export default CodeSubmissionView;
