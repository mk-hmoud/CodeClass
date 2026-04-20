import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Tag, BookOpen, Check, Eye } from "lucide-react";
import { Assignment } from "../../../../types/Assignment";

interface ProblemTabProps {
  assignment: Assignment;
}

const ProblemTab: React.FC<ProblemTabProps> = ({ assignment }) => {
  const p = assignment.problem;
  const splitList = (value?: string, delimiter = ";") =>
    value ? value.split(delimiter).map((s) => s.trim()).filter(Boolean) : [];

  const tagList = splitList(p.tags, ",");
  const prereqList = splitList(p.prerequisites, ";");
  const outcomeList = splitList(p.learning_outcomes, ";");

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-sm">Problem Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Full problem specifications and requirements</p>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">{p.title}</h2>
          {p.category && (
            <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/8">
              {p.category}
            </Badge>
          )}
        </div>

        <Section icon={FileText} title="Description">
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{p.description}</p>
          </div>
        </Section>

        {prereqList.length > 0 && (
          <Section icon={BookOpen} title="Prerequisites">
            <ul className="space-y-2">
              {prereqList.map((pr, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {pr}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {outcomeList.length > 0 && (
          <Section icon={BookOpen} title="Learning Outcomes">
            <ul className="space-y-2">
              {outcomeList.map((lo, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {lo}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {tagList.length > 0 && (
          <Section icon={Tag} title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {tagList.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[11px] border-violet-500/30 text-violet-600 bg-violet-500/8">
                  {tag}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {p.testCases && p.testCases.length > 0 && (
          <Section icon={Check} title="Test Cases">
            <div className="space-y-3">
              {p.testCases.map((testCase, index) => (
                <div key={testCase.testCaseId} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2.5 bg-muted/30 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Test Case #{index + 1}</span>
                    {testCase.isPublic && (
                      <Badge variant="outline" className="text-[11px] border-green-500/30 text-green-600 bg-green-500/8 gap-1">
                        <Eye size={10} />Public
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Input</p>
                      <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">
                        {testCase.input || <span className="italic text-muted-foreground">empty</span>}
                      </pre>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Expected Output</p>
                      <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">
                        {testCase.expectedOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

export default ProblemTab;
