export interface Language {
  language_id: number;
  name: string;
  version?: string;
}

export interface AssignmentLanguage {
  language: Language;
  initial_code?: string;
}