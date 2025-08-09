import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, GripVertical } from "lucide-react";
import { getProblems } from '@/services/ProblemService';
import { Problem } from '@/types/Problem';
import { QuizFormValues } from '@/types/Quiz';

interface QuizProblemsSectionProps {
  form: ReturnType<typeof useFormContext<QuizFormValues>>;
  selectedProblems: Problem[];
  setSelectedProblems: React.Dispatch<React.SetStateAction<Problem[]>>;
}

const QuizProblemsSection: React.FC<QuizProblemsSectionProps> = ({ form, selectedProblems, setSelectedProblems }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "problems",
  });

  const { data: availableProblems, isLoading } = useQuery<Problem[]>({
    queryKey: ["instructorProblems"],
    queryFn: getProblems,
  });

  const handleAddProblem = (problem: Problem) => {
    if (!selectedProblems.find(p => p.problemId === problem.problemId)) {
      setSelectedProblems(prev => [...prev, problem]);
      append({ problemId: problem.problemId, points: 10 });
    }
  };

  const handleRemoveProblem = (index: number) => {
    const problemIdToRemove = fields[index].problemId;
    remove(index);
    setSelectedProblems(prev => prev.filter(p => p.problemId !== problemIdToRemove));
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Available Problems</CardTitle>
                <CardDescription>Select problems from your library.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto space-y-4">
                {isLoading && <p>Loading problems...</p>}
                {(availableProblems || []).map(problem => (
                    <div key={problem.problemId} className="p-4 bg-muted/20 rounded-md border flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold">{problem.title}</h3>
                            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{problem.description}</p>
                            <Badge variant="outline" className="mt-2">{problem.category}</Badge>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddProblem(problem)}
                            disabled={fields.some(field => field.problemId === problem.problemId)}
                        >
                            {fields.some(field => field.problemId === problem.problemId) ? 'Added' : 'Add'}
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Selected Problems</CardTitle>
                <CardDescription>
                    {fields.length} question{fields.length !== 1 ? 's' : ''} selected.
                </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto space-y-4">
                <FormField
                    control={form.control}
                    name="problems"
                    render={() => ( <FormMessage className="mb-4" /> )}
                />
                {fields.length === 0 && <p className="text-sm text-center text-gray-500 py-8">No problems added yet.</p>}
                {fields.map((field, index) => {
                    const problemDetails = selectedProblems.find(p => p.problemId === field.problemId);
                    return (
                        <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/40">
                            <GripVertical className="h-5 w-5 mt-8 text-gray-400 cursor-grab shrink-0" />
                            <div className="flex-grow">
                                <h4 className="font-semibold">{problemDetails?.title}</h4>
                                <Badge variant="secondary" className="mt-1">{problemDetails?.category}</Badge>
                                <FormField
                                    control={form.control}
                                    name={`problems.${index}.points`}
                                    render={({ field: pointField }) => (
                                        <FormItem className="mt-2">
                                            <FormLabel>Points</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...pointField} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveProblem(index)}>
                                <X className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    </div>
  );
};

export default QuizProblemsSection;