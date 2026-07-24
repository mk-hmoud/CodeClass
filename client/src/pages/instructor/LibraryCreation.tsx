import React, { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import { getLanguages } from "@/services/LanguageService";
import { createLibrary } from "@/services/LibraryService";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LibraryCreation = () => {
  const navigate = useNavigate();
  const [contentByLanguage, setContentByLanguage] = useState<
    Record<string, string>
  >({});

  const { data: languages, isLoading } = useQuery({
    queryKey: ["programmingLanguages"],
    queryFn: getLanguages,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleContentChange = (language: string, value: string | undefined) => {
    setContentByLanguage((prev) => ({
      ...prev,
      [language]: value ?? "",
    }));
  };

  const onSubmit = async (data: FormValues) => {
    const files = (languages || [])
      .map((lang) => ({
        languageId: lang.language_id,
        content: (contentByLanguage[lang.name] || "").trim(),
      }))
      .filter((f) => f.content.length > 0);

    if (files.length === 0) {
      toast.error("Add code for at least one language");
      return;
    }

    try {
      await createLibrary({ ...data, files });
      toast.success(`Library "${data.name}" created successfully`);
      navigate("/instructor/dashboard");
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error("Error creating library");
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
        <h1 className="text-2xl font-bold">Create Library</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Write reusable helper code once per language, then link it to any
          assignment. It will be available to every student submission
          graded against that assignment.
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
                      <Input placeholder="e.g. Vector2D Helpers" {...field} />
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
                        placeholder="What this library provides (optional)"
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

          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Library Code</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Provide code for any languages this library should support.
                For C/C++, write header-style code (functions defined
                directly, not just declared) since it gets included, not
                linked. Leave a language blank to skip it.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 h-20 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Loading languages…
              </div>
            ) : (
              <div className="space-y-6">
                {(languages || []).map((lang) => (
                  <AssignmentCodeEditor
                    key={lang.language_id}
                    language={lang.name}
                    value={contentByLanguage[lang.name] ?? ""}
                    onChange={(value) => handleContentChange(lang.name, value)}
                  />
                ))}
              </div>
            )}
          </div>

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
              Create Library
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default LibraryCreation;
