export interface LibraryFile {
  languageId: number;
  content: string;
}

export interface Library {
  libraryId: number;
  instructorId?: number;
  name: string;
  description?: string;
  created_at?: Date;
  files?: LibraryFile[];
}
