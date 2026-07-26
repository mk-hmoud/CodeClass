import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import { createSchemaLibrary } from "@/services/SchemaLibraryService";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  setupSql: z.string().min(1, "Setup SQL is required"),
});

type FormValues = z.infer<typeof formSchema>;

const SchemaLibraryCreation = () => {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      setupSql: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createSchemaLibrary(data);
      toast.success(`Schema library "${data.name}" created successfully`);
      navigate("/instructor/dashboard");
    } catch (error) {
      console.error("Error creating schema library:", error);
      toast.error("Error creating schema library");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          onClick={() => navigate("/instructor/dashboard")}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold">Create Schema Library</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Write reusable setup SQL (schema + seed data) once, then reuse it
          across any SQL problem's test cases instead of retyping it.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardContent className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Students schema v1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What this schema provides (optional)"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <FormField
            control={form.control}
            name="setupSql"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Setup SQL <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <AssignmentCodeEditor
                    language="sql"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/instructor/dashboard")}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save size={16} />
              Create Schema Library
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SchemaLibraryCreation;
