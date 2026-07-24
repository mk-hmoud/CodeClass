import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { Library } from "@/types/Library";

interface LibraryCardProps {
  library: Library;
  onView: (library: Library) => void;
  onEdit: (library: Library, e: React.MouseEvent) => void;
  onDelete: (library: Library, e: React.MouseEvent) => void;
}

const LibraryCard: React.FC<LibraryCardProps> = ({
  library,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <Card
      className="bg-card border-border cursor-pointer hover:bg-muted transition-colors"
      onClick={() => onView(library)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{library.name}</h3>
            {library.description && (
              <p className="mt-2 text-foreground/80 line-clamp-2">
                {library.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Edit Library"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(library, e);
              }}
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive"
              aria-label="Delete Library"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(library, e);
              }}
            >
              <Trash size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LibraryCard;
