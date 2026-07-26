import React from "react";
import { SchemaLibrary } from "@/types/SchemaLibrary";
import SchemaLibraryCard from "./SchemaLibraryCard";

interface SchemaLibraryListProps {
  schemaLibraries: SchemaLibrary[];
  onView: (schemaLibrary: SchemaLibrary) => void;
  onEdit: (schemaLibrary: SchemaLibrary, e: React.MouseEvent) => void;
  onDelete: (schemaLibrary: SchemaLibrary, e: React.MouseEvent) => void;
}

const SchemaLibraryList: React.FC<SchemaLibraryListProps> = ({
  schemaLibraries,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      {schemaLibraries.map((schemaLibrary) => (
        <SchemaLibraryCard
          key={schemaLibrary.schemaLibraryId}
          schemaLibrary={schemaLibrary}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default SchemaLibraryList;
