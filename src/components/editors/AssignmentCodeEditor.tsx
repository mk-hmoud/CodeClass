import React, { useState } from "react";
import CodeEditorBase from "./CodeEditorBase";

interface AssignmentCodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

const AssignmentCodeEditor: React.FC<AssignmentCodeEditorProps> = ({
  language,
  value,
  onChange,
}) => {
  const handleEditorChange = (newCode: string) => {
    onChange(newCode);
  };

  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      Python: "python",
      JavaScript: "javascript",
      "C++": "cpp",
    };

    return languageMap[lang] || lang.toLowerCase();
  };

  return (
    <div className="border border-gray-700 rounded-md overflow-hidden h-[200px]">
      <CodeEditorBase
        defaultLanguage={getMonacoLanguage(language)}
        defaultValue={value}
        onChange={handleEditorChange}
      />
    </div>
  );
};

export default AssignmentCodeEditor;
