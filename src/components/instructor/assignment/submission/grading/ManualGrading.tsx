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

interface ManualGradingProps {
  submission: FullSubmission;
  onSubmitGrade: (id: number, score: number, feedback: string) => void;
}

export const ManualGrading: React.FC<ManualGradingProps> = ({
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
