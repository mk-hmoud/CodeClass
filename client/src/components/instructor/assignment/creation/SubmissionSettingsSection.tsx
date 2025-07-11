import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "@/lib/assignmentUtils";

interface SubmissionSettingsSectionProps {
  form: UseFormReturn<FormValues>;
  watchEnableSubmissionAttempts: boolean;
}

const SubmissionSettingsSection: React.FC<SubmissionSettingsSectionProps> = ({
  form,
  watchEnableSubmissionAttempts,
}) => {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Submission Settings</h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="enable-attempts">Limit Submission Attempts</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-blue-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restrict how many times students can submit</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="enable-attempts"
            checked={watchEnableSubmissionAttempts}
            onCheckedChange={(checked) => {
              form.setValue("enable_max_submissions", checked);
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="max_submissions"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel
                  className={
                    !watchEnableSubmissionAttempts ? "text-gray-500" : ""
                  }
                >
                  Number of Attempts
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Maximum number of submissions allowed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  disabled={!watchEnableSubmissionAttempts}
                  className={
                    !watchEnableSubmissionAttempts
                      ? "bg-gray-700 text-gray-400"
                      : ""
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="plagiarism">Enable Plagiarism Detection</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-blue-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Automatically check submissions for plagiarism</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="plagiarism"
            checked={form.watch("plagiarism_detection")}
            onCheckedChange={(checked) => {
              form.setValue("plagiarism_detection", checked);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionSettingsSection;
