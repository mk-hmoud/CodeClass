import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FullSubmission } from "@/types/Submission";

interface HybridGradingProps {
  submission: FullSubmission;
  onSubmitGrade: (id: number, score: number, feedback: string) => void;
}

export const HybridGrading: React.FC<HybridGradingProps> = ({
  submission,
  onSubmitGrade,
}) => {
  const form = useForm({
    defaultValues: {
      instructorScore: submission.manualScore || 0,
      feedback: submission.feedback || "",
    },
  });

  const handleSubmitGrade = (values: {
    instructorScore: number;
    feedback: string;
  }) => {
    onSubmitGrade(
      submission.submissionId,
      values.instructorScore,
      values.feedback
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Grading</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 mb-6 bg-purple-900/20 border border-purple-500/30 rounded-md">
          <h3 className="text-lg font-semibold text-purple-400 mb-1">
            Hybrid Grading
          </h3>
          <p className="text-sm text-gray-300">
            This submission has been automatically graded, but requires
            instructor review and final grade determination.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">System Score</h3>
          <div className="text-4xl font-bold mb-1">
            {submission.autoScore || 0}/100
          </div>
          <p className="text-sm text-muted-foreground">
            Based on automated test results
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmitGrade)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="instructorScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor Score (0-100)</FormLabel>
                  <FormControl>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="text-sm text-muted-foreground mb-4">
              The final grade will be calculated as an average of system and
              instructor scores.
            </div>
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed feedback for the student..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Submit Final Grade
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
