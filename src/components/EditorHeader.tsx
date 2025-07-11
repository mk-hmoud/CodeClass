import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface EditorHeaderProps {
  title: string;
  onBack: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({ title, onBack }) => {
  return (
    <div className="flex items-center px-4 py-2 border-b">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="mr-2"
        aria-label="Back to assignment"
      >
        <ArrowLeft size={20} />
      </Button>
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
};

export default EditorHeader;
