import React, { useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  GripVertical, Plus, X, ChevronDown, Check, FileCode2, Terminal,
} from "lucide-react";
import { getProblems } from "@/services/ProblemService";
import { Problem } from "@/types/Problem";
import { Language } from "@/types/Language";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import { LANGUAGE_LABELS, languageDefaultCode } from "@/lib/assignmentUtils";

/** One problem in the assignment, with its per-problem points and (for standard
 *  problems) its own language selection + starter code. Systems problems carry
 *  their files on the problem itself, so they need no languages here. */
export interface ProblemSetItem {
  problem: Problem;
  points: number;
  languages: string[];                 // selected language names (standard only)
  codeByLanguage: Record<string, string>;
}

interface Props {
  value: ProblemSetItem[];
  onChange: (items: ProblemSetItem[]) => void;
  languages: Language[] | undefined;
}

const isSystems = (p: Problem) => p.runtime === "systems";

const ProblemSetBuilder: React.FC<Props> = ({ value, onChange, languages }) => {
  const [bank, setBank] = useState<Problem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    getProblems().then(setBank).catch((e) => console.error("Error fetching problems:", e));
  }, []);

  const takenIds = new Set(value.map((it) => it.problem.problemId));
  const totalPoints = value.reduce((s, it) => s + (Number(it.points) || 0), 0);

  const patch = (problemId: number, next: Partial<ProblemSetItem>) =>
    onChange(value.map((it) => (it.problem.problemId === problemId ? { ...it, ...next } : it)));

  const remove = (problemId: number) =>
    onChange(value.filter((it) => it.problem.problemId !== problemId));

  const toggleExpand = (problemId: number) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(problemId) ? n.delete(problemId) : n.add(problemId);
      return n;
    });

  const confirmAdd = () => {
    const additions = bank
      .filter((p) => picked.has(p.problemId) && !takenIds.has(p.problemId))
      .map<ProblemSetItem>((p) => ({ problem: p, points: 100, languages: [], codeByLanguage: {} }));
    onChange([...value, ...additions]);
    setPicked(new Set());
    setPickerOpen(false);
  };

  const toggleLang = (item: ProblemSetItem, lang: string) => {
    const has = item.languages.includes(lang);
    const languagesNext = has ? item.languages.filter((l) => l !== lang) : [...item.languages, lang];
    const codeNext = { ...item.codeByLanguage };
    if (has) delete codeNext[lang];
    else codeNext[lang] = languageDefaultCode[lang.toLowerCase()] || `// starter code for ${lang}`;
    patch(item.problem.problemId, { languages: languagesNext, codeByLanguage: codeNext });
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Problems</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              The exercises in this assignment. Each is attempted and graded on its own; drag to reorder.
            </p>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            Total <span className="font-semibold text-foreground">{totalPoints}</span> pts ·{" "}
            <span className="font-semibold text-foreground">{value.length}</span>{" "}
            problem{value.length === 1 ? "" : "s"}
          </div>
        </div>

        {value.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
            No problems yet. Add at least one to base this assignment on.
          </div>
        ) : (
          <Reorder.Group axis="y" values={value} onReorder={onChange} className="space-y-2">
            {value.map((item, i) => (
              <ProblemRow
                key={item.problem.problemId}
                item={item}
                index={i}
                languages={languages}
                expanded={expanded.has(item.problem.problemId)}
                onToggleExpand={() => toggleExpand(item.problem.problemId)}
                onPoints={(pts) => patch(item.problem.problemId, { points: pts })}
                onRemove={() => remove(item.problem.problemId)}
                onToggleLang={(lang) => toggleLang(item, lang)}
                onCode={(lang, code) =>
                  patch(item.problem.problemId, {
                    codeByLanguage: { ...item.codeByLanguage, [lang]: code },
                  })
                }
              />
            ))}
          </Reorder.Group>
        )}

        <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setPickerOpen(true)}>
          <Plus size={15} /> Add problems
        </Button>
      </CardContent>

      {/* Searchable picker over the whole problem bank */}
      <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) setPicked(new Set()); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add problems</DialogTitle>
          </DialogHeader>
          <Command className="border border-border rounded-lg">
            <CommandInput placeholder="Search problems…" />
            <CommandList className="max-h-72">
              <CommandEmpty>No problems found.</CommandEmpty>
              <CommandGroup>
                {bank.map((p) => {
                  const already = takenIds.has(p.problemId);
                  const sel = picked.has(p.problemId);
                  return (
                    <CommandItem
                      key={p.problemId}
                      value={`${p.title} ${p.category ?? ""} ${p.runtime ?? ""}`}
                      disabled={already}
                      onSelect={() => {
                        if (already) return;
                        setPicked((prev) => {
                          const n = new Set(prev);
                          n.has(p.problemId) ? n.delete(p.problemId) : n.add(p.problemId);
                          return n;
                        });
                      }}
                      className="gap-2"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                        {sel && <Check size={12} />}
                      </span>
                      <span className="flex-1 min-w-0 truncate">{p.title}</span>
                      {isSystems(p) && <Badge variant="outline" className="text-[10px] shrink-0">systems</Badge>}
                      {p.category && <Badge variant="outline" className="text-[10px] shrink-0">{p.category}</Badge>}
                      {already && <span className="text-[10px] text-muted-foreground shrink-0">added</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setPickerOpen(false); setPicked(new Set()); }}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAdd} disabled={picked.size === 0}>
              Add {picked.size > 0 ? picked.size : ""} problem{picked.size === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

interface RowProps {
  item: ProblemSetItem;
  index: number;
  languages: Language[] | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  onPoints: (pts: number) => void;
  onRemove: () => void;
  onToggleLang: (lang: string) => void;
  onCode: (lang: string, code: string) => void;
}

const ProblemRow: React.FC<RowProps> = ({
  item, index, languages, expanded, onToggleExpand, onPoints, onRemove, onToggleLang, onCode,
}) => {
  const controls = useDragControls();
  const systems = isSystems(item.problem);

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
        <span className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{item.problem.title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px]">
              {systems ? <><Terminal size={10} className="mr-1" />systems</> : <><FileCode2 size={10} className="mr-1" />{item.problem.category ?? "standard"}</>}
            </Badge>
            {!systems && item.languages.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {item.languages.map((l) => LANGUAGE_LABELS[l] ?? l).join(", ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            min={1}
            value={item.points}
            onChange={(e) => onPoints(Number(e.target.value))}
            className="h-8 w-20 text-sm"
          />
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggleExpand}>
          <ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </Button>
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
          aria-label="Remove problem"
        >
          <X size={15} />
        </button>
      </div>

      <Collapsible open={expanded}>
        <CollapsibleContent>
          <div className="border-t border-border px-3 py-3 space-y-3">
            {systems ? (
              <p className="text-xs text-muted-foreground">
                This is a <span className="font-medium">systems</span> problem — its files, build command and
                tests are defined on the problem itself, so there's no starter code to set here.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium mb-1.5">Languages students may use</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(languages ?? []).map((lang) => {
                      const active = item.languages.includes(lang.name);
                      return (
                        <button
                          key={lang.language_id}
                          type="button"
                          onClick={() => onToggleLang(lang.name)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${active ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted"}`}
                        >
                          {active && <Check size={12} />}
                          {LANGUAGE_LABELS[lang.name] ?? lang.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {item.languages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium">Starter code</p>
                    {item.languages.map((lang) => (
                      <AssignmentCodeEditor
                        key={lang}
                        language={lang}
                        value={item.codeByLanguage[lang] ?? ""}
                        onChange={(v) => onCode(lang, v ?? "")}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Reorder.Item>
  );
};

export default ProblemSetBuilder;
