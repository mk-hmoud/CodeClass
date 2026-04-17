import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { QuizFormValues } from '@/types/Quiz';
import { Problem } from '@/types/Problem';
import { Clock } from 'lucide-react';

interface QuizPreviewSectionProps {
  form: ReturnType<typeof useFormContext<QuizFormValues>>;
  selectedProblems: Problem[];
}

const QuizPreviewSection: React.FC<QuizPreviewSectionProps> = ({ form, selectedProblems }) => {
  const formData = form.watch();
  const totalPoints = formData.problems.reduce((acc, problem) => acc + Number(problem.points || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Preview</CardTitle>
        <CardDescription>
          Review the complete quiz details below before creating it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{formData.title || "Untitled Quiz"}</h2>
          <p className="text-gray-400">{formData.description || "No description provided."}</p>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formData.time_limit_minutes} minutes total
          </span>
          <span>{formData.problems.length} question{formData.problems.length !== 1 ? 's' : ''}</span>
          <span>{totalPoints} total points</span>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold">Questions:</h3>
          {formData.problems.length === 0 && <p className="text-sm text-gray-500">No problems have been added to the preview.</p>}
          {formData.problems.map((q, i) => {
            const problemDetails = selectedProblems.find(p => p.problemId === q.problemId);
            return (
              <div key={q.problemId} className="p-4 bg-muted/40 rounded-md border">
                <div className="flex justify-between items-start">
                  <span className="font-medium">Question {i + 1}: {problemDetails?.title}</span>
                  <Badge variant="outline">{problemDetails?.category}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                  <span>{q.points} points</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizPreviewSection;