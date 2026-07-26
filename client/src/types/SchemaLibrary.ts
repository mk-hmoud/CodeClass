export interface SchemaLibrary {
  schemaLibraryId: number;
  instructorId?: number;
  name: string;
  description?: string;
  setupSql: string;
  created_at?: Date;
}
