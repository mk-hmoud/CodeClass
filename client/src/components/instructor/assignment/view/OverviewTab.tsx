import React from "react";
import { Badge } from "@/components/ui/badge";
import { Assignment } from "../../../../types/Assignment";
import { LANGUAGE_LABELS } from "@/lib/assignmentUtils";
import { Code, ShieldCheck, BarChart2 } from "lucide-react";

const DIFF_META: Record<string, { color: string }> = {
  Easy:   { color: "#10b981" },
  Medium: { color: "#f59e0b" },
  Hard:   { color: "#ef4444" },
};

interface OverviewTabProps {
  assignment: Assignment;
  studentSubmissions: { id: number; submitted: boolean }[];
  onEditAssignment: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ assignment }) => {
  const diff = assignment.difficulty_level;
  const diffColor = diff ? DIFF_META[diff]?.color : undefined;

  return (
    <div className="space-y-4">
      {/* Main info */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Assignment Overview</h2>
          {diff && diffColor && (
            <Badge
              className="text-xs border"
              style={{ backgroundColor: diffColor + "18", color: diffColor, borderColor: diffColor + "40" }}
            >
              {diff}
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
              {assignment.description || <span className="italic text-muted-foreground">No description provided.</span>}
            </p>
          </div>

          <div className="border-t border-border pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grading Method</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart2 size={13} className="text-primary" />
                </div>
                <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/8">
                  {assignment.grading_method}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plagiarism Detection</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck size={13} className="text-amber-600" />
                </div>
                <Badge
                  variant="outline"
                  className={assignment.plagiarism_detection
                    ? "text-[11px] border-amber-500/30 text-amber-600 bg-amber-500/8"
                    : "text-[11px] text-muted-foreground"}
                >
                  {assignment.plagiarism_detection ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Languages Allowed</p>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Code size={13} className="text-green-600" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {assignment.languages.map((lang, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[11px] border-green-500/30 text-green-600 bg-green-500/8"
                  >
                    {LANGUAGE_LABELS[lang.language.name] ?? lang.language.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
