import React, { useRef } from "react";
import * as monaco from "monaco-editor";
import { Button } from "@/components/ui/button";
import { Play, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CodeEditorBase from "./CodeEditorBase";

interface StudentCodeEditorProps {
  defaultLanguage: string;
  defaultValue: string;
  onRunCode: (code: string) => void;
  onSubmitCode?: (code: string) => void;
  onChange?: (code: string) => void;
  supportedLanguages?: string[];
}

const StudentCodeEditor: React.FC<StudentCodeEditorProps> = ({
  defaultLanguage,
  defaultValue,
  onRunCode,
  onSubmitCode,
  onChange,
  supportedLanguages = [
    "javascript",
    "typescript",
    "python",
    "java",
    "cpp",
    "csharp",
  ],
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = React.useState(defaultLanguage);
  const [code, setCode] = React.useState(defaultValue);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (onChange) {
      onChange(newCode);
    }
  };

  const handleRunCode = () => {
    onRunCode(code);
  };

  const handleSubmitCode = () => {
    if (onSubmitCode) {
      onSubmitCode(code);
    } else {
      onRunCode(code);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-center gap-2 mb-2 border-b border-border pb-2">
        {supportedLanguages.length > 1 && (
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px] mr-2">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          onClick={handleRunCode}
          className="flex items-center gap-1"
        >
          <Play size={16} />
          Run
        </Button>
        <Button onClick={handleSubmitCode} className="flex items-center gap-1">
          <Send size={16} />
          Submit
        </Button>
      </div>

      <CodeEditorBase
        defaultLanguage={language}
        defaultValue={defaultValue}
        onChange={handleCodeChange}
        supportedLanguages={supportedLanguages}
      />
    </div>
  );
};

export default StudentCodeEditor;
