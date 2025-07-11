import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CodeEditorBase from "./CodeEditorBase";

interface InstructorCodeEditorProps {
  defaultLanguage: string;
  defaultValue: string;
  onSaveCode?: (code: string) => void;
  onRunCode?: (code: string) => void;
  onChange?: (code: string) => void;
  supportedLanguages?: string[];
}

const InstructorCodeEditor: React.FC<InstructorCodeEditorProps> = ({
  defaultLanguage,
  defaultValue,
  onSaveCode,
  onRunCode,
  onChange,
  supportedLanguages = ["javascript", "typescript", "python", "cpp", "c"],
}) => {
  const [language, setLanguage] = React.useState(defaultLanguage);
  const [code, setCode] = React.useState(defaultValue);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (onChange) {
      onChange(newCode);
    }
  };

  const handleRunCode = () => {
    if (onRunCode) {
      onRunCode(code);
    }
  };

  const handleSaveCode = () => {
    if (onSaveCode) {
      onSaveCode(code);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between gap-2 mb-2 border-b border-border pb-2">
        {supportedLanguages.length > 1 && (
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px]">
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
        <div className="flex gap-2">
          {onRunCode && (
            <Button
              variant="outline"
              onClick={handleRunCode}
              className="flex items-center gap-1"
            >
              <Play size={16} />
              Test Run
            </Button>
          )}
          {onSaveCode && (
            <Button
              onClick={handleSaveCode}
              className="flex items-center gap-1"
            >
              <Save size={16} />
              Save
            </Button>
          )}
        </div>
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

export default InstructorCodeEditor;
