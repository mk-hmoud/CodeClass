import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { SchemaLibrary } from "@/types/SchemaLibrary";

interface SchemaLibraryCardProps {
  schemaLibrary: SchemaLibrary;
  onView: (schemaLibrary: SchemaLibrary) => void;
  onEdit: (schemaLibrary: SchemaLibrary, e: React.MouseEvent) => void;
  onDelete: (schemaLibrary: SchemaLibrary, e: React.MouseEvent) => void;
}

const SchemaLibraryCard: React.FC<SchemaLibraryCardProps> = ({
  schemaLibrary,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <Card
      className="bg-card border-border cursor-pointer hover:bg-muted transition-colors"
      onClick={() => onView(schemaLibrary)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{schemaLibrary.name}</h3>
            {schemaLibrary.description && (
              <p className="mt-2 text-foreground/80 line-clamp-2">
                {schemaLibrary.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Edit Schema Library"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(schemaLibrary, e);
              }}
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive"
              aria-label="Delete Schema Library"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(schemaLibrary, e);
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

export default SchemaLibraryCard;
