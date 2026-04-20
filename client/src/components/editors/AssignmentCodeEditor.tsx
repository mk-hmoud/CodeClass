import React from "react";
import CodeEditorBase from "./CodeEditorBase";

interface AssignmentCodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

const LANGUAGE_DISPLAY: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
  typescript: "TypeScript",
  c: "C",
};

const LANGUAGE_ICONS: Record<string, string> = {
  python: "🐍",
  javascript: "𝓙𝓢",
  cpp: "⚙",
  java: "☕",
  typescript: "𝓣𝓢",
};

const getMonacoLanguage = (lang: string): string => {
  const map: Record<string, string> = {
    Python: "python",
    JavaScript: "javascript",
    TypeScript: "typescript",
    "C++": "cpp",
    C: "c",
    Java: "java",
  };
  return map[lang] ?? lang.toLowerCase();
};

const AssignmentCodeEditor: React.FC<AssignmentCodeEditorProps> = ({ language, value, onChange }) => {
  const monacoLang = getMonacoLanguage(language);
  const displayName = LANGUAGE_DISPLAY[monacoLang] ?? language;

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
      {/* Native editor chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] border-b border-white/8">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">starter_code</span>
          <span className="text-xs text-white/25">·</span>
          <span className="text-xs font-medium text-white/50">{displayName}</span>
        </div>
        <div className="w-16" />
      </div>
      <div className="h-[360px]">
        <CodeEditorBase
          defaultLanguage={monacoLang}
          defaultValue={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default AssignmentCodeEditor;
