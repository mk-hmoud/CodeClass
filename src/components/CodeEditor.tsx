import React, { useEffect, useRef, useState } from "react";
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

interface CodeEditorProps {
  defaultLanguage: string;
  defaultValue: string;
  onRunCode: (code: string) => void;
  onSubmitCode: (code: string) => void;
  showButtons?: boolean;
  onChange?: (code: string) => void;
  supportedLanguages?: string[];
  onLanguageChange?: (lang: string) => void;
  language: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  defaultLanguage,
  defaultValue,
  onRunCode,
  onSubmitCode,
  showButtons = false,
  onChange,
  supportedLanguages = ["javascript", "python", "cpp"],
  onLanguageChange,
  language,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  useEffect(() => {
    if (editorRef.current && !monacoInstance.current) {
      monacoInstance.current = monaco.editor.create(editorRef.current, {
        value: defaultValue,
        language: language,
        theme: "vs-dark",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        fontSize: 14,
        lineHeight: 21,
        automaticLayout: true,
        tabSize: 2,
        scrollbar: {
          useShadows: false,
          vertical: "visible",
          horizontal: "visible",
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        padding: {
          top: 16,
          bottom: 16,
        },
      });

      monacoInstance.current.onDidChangeModelContent(() => {
        if (monacoInstance.current) {
          const value = monacoInstance.current.getValue();
          if (!showButtons) {
            onRunCode(value);
          }
          if (onChange) {
            onChange(value);
          }
        }
      });

      return () => {
        monacoInstance.current?.dispose();
        monacoInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (monacoInstance.current) {
      const model = monacoInstance.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  useEffect(() => {
    if (
      monacoInstance.current &&
      defaultValue !== monacoInstance.current.getValue()
    ) {
      monacoInstance.current.setValue(defaultValue);
    }
  }, [defaultValue]);

  const handleRunCode = () => {
    if (monacoInstance.current) {
      const code = monacoInstance.current.getValue();
      onRunCode(code);
    }
  };

  const handleSubmitCode = () => {
    if (monacoInstance.current && onSubmitCode) {
      const code = monacoInstance.current.getValue();
      onSubmitCode(code);
    }
  };

  const handleLanguageChange = (value: string) => {
    if (onLanguageChange) {
      onLanguageChange(value);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {showButtons && (
        <div className="flex justify-center gap-2 mb-2 border-b border-border pb-2">
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
          <Button
            variant="outline"
            onClick={handleRunCode}
            className="flex items-center gap-1"
          >
            <Play size={16} />
            Run
          </Button>
          {onSubmitCode && (
            <Button
              onClick={handleSubmitCode}
              className="flex items-center gap-1"
            >
              <Send size={16} />
              Submit
            </Button>
          )}
        </div>
      )}
      <div ref={editorRef} className="flex-grow" />
    </div>
  );
};

export default CodeEditor;
