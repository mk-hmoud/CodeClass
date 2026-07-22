import React from "react";
import { Library } from "@/types/Library";
import LibraryCard from "./LibraryCard";

interface LibraryListProps {
  libraries: Library[];
  onView: (library: Library) => void;
  onEdit: (library: Library, e: React.MouseEvent) => void;
  onDelete: (library: Library, e: React.MouseEvent) => void;
}

const LibraryList: React.FC<LibraryListProps> = ({
  libraries,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      {libraries.map((library) => (
        <LibraryCard
          key={library.libraryId}
          library={library}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default LibraryList;
