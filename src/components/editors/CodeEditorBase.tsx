import React, { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import "../../../src/lib/monacoConfig";

interface CodeEditorBaseProps {
  defaultLanguage: string;
  defaultValue: string;
  onChange?: (code: string) => void;
  supportedLanguages?: string[];
}

const CodeEditorBase: React.FC<CodeEditorBaseProps> = ({
  defaultLanguage,
  defaultValue,
  onChange,
  supportedLanguages = ["JavaScript", "Python", "CPP"],
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const [language, setLanguage] = useState(defaultLanguage);

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

      // Update value when model changes
      monacoInstance.current.onDidChangeModelContent(() => {
        if (monacoInstance.current) {
          const value = monacoInstance.current.getValue();

          // Always call onChange if provided
          if (onChange) {
            onChange(value);
          }
        }
      });

      return () => {
        if (monacoInstance.current) {
          monacoInstance.current.dispose();
          monacoInstance.current = null;
        }
      };
    }
  }, []);

  // Handle language changes
  useEffect(() => {
    if (monacoInstance.current) {
      const model = monacoInstance.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  // Update editor value when defaultValue prop changes
  useEffect(() => {
    if (
      monacoInstance.current &&
      defaultValue !== monacoInstance.current.getValue()
    ) {
      monacoInstance.current.setValue(defaultValue);
    }
  }, [defaultValue]);

  // Update language when defaultLanguage prop changes
  useEffect(() => {
    setLanguage(defaultLanguage);
  }, [defaultLanguage]);

  return (
    <div className="h-full flex flex-col">
      <div ref={editorRef} className="flex-grow" />
    </div>
  );
};

export default CodeEditorBase;
