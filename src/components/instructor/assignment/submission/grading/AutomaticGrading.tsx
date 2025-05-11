import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullSubmission } from "@/types/Submission";

interface AutomaticGradingProps {
  submission: FullSubmission;
  onViewTestResults: () => void;
}

export const AutomaticGrading: React.FC<AutomaticGradingProps> = ({
  submission,
  onViewTestResults,
}) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Grading</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-2">System Score</h3>
          <div className="text-4xl font-bold mb-1">
            {submission.autoScore || 0}/100
          </div>
          <p className="text-sm text-muted-foreground">
            Based on automated test results
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm mb-4">
            This assignment is automatically graded. The system score is final.
          </p>
          <Button variant="outline" onClick={onViewTestResults}>
            View Test Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
