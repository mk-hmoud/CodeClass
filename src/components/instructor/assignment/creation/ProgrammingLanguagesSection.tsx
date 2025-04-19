import React, { useEffect, useState } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import { getLanguages } from "../../../../services/LanguageService";
import { Language } from "../../../../types/Language";
import { languageDefaultCode } from "@/lib/assignmentUtils";

interface ProgrammingLanguagesSectionProps {
  // Callback to send the final state (selected languages and code) to the parent.
  onLanguagesChange?: (
    selectedLanguages: string[],
    codeByLanguage: Record<string, string>
  ) => void;
}

const ProgrammingLanguagesSection: React.FC<
  ProgrammingLanguagesSectionProps
> = ({ onLanguagesChange }) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(
    {}
  );

  // Fetch languages from the backend on mount.
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const fetchedLanguages = await getLanguages();
        setLanguages(fetchedLanguages);
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };
    fetchLanguages();
  }, []);

  // Whenever selectedLanguages or codeByLanguage change, pass them upward if needed.
  useEffect(() => {
    if (onLanguagesChange) {
      onLanguagesChange(selectedLanguages, codeByLanguage);
    }
  }, [selectedLanguages, codeByLanguage, onLanguagesChange]);

  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      // Remove the language.
      setSelectedLanguages(
        selectedLanguages.filter((lang) => lang !== language)
      );
      const newCodeMap = { ...codeByLanguage };
      delete newCodeMap[language];
      setCodeByLanguage(newCodeMap);
    } else {
      // Add the language.
      setSelectedLanguages([...selectedLanguages, language]);
      // When adding, look for the default code (using lowercase for key matching).
      setCodeByLanguage({
        ...codeByLanguage,
        [language]:
          languageDefaultCode[language.toLowerCase()] ||
          `// Code for ${language}`,
      });
    }
  };

  const handleCodeChange = (language: string, value: string | undefined) => {
    if (value !== undefined) {
      setCodeByLanguage({
        ...codeByLanguage,
        [language]: value,
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Programming Languages</h2>

        <FormField
          render={() => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>
                  Languages <span className="text-red-500">*</span>
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Languages students can use for submission</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {languages.map((lang) => (
                  <div
                    key={lang.language_id}
                    className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedLanguages.includes(lang.name)
                        ? "bg-primary/20 border-primary"
                        : "border-gray-700 hover:bg-muted"
                    }`}
                    onClick={() => toggleLanguage(lang.name)}
                  >
                    {selectedLanguages.includes(lang.name) && (
                      <Check size={16} className="text-primary mr-2" />
                    )}
                    <span>{lang.name}</span>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
          name={""}
        />

        {selectedLanguages.length > 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Initial Code Templates</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={16} className="text-blue-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Starting code provided to students</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-4">
              {selectedLanguages.map((language) => (
                <div key={language} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>{language}</Label>
                  </div>
                  <AssignmentCodeEditor
                    language={language}
                    value={
                      codeByLanguage[language] ||
                      languageDefaultCode[language.toLowerCase()] ||
                      ""
                    }
                    onChange={(value) => handleCodeChange(language, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgrammingLanguagesSection;
