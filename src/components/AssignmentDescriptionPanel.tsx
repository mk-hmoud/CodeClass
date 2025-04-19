import AssignmentDescription from "@/components/AssignmentDescription";

interface AssignmentDescriptionPanelProps {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  categories: string[];
}

const AssignmentDescriptionPanel: React.FC<AssignmentDescriptionPanelProps> = ({
  title,
  difficulty,
  description,
  categories,
}) => {
  return (
    <div className="h-full overflow-y-auto">
      <AssignmentDescription
        title={title}
        difficulty={difficulty}
        description={description}
        examples={[]}
        constraints={categories}
        categories={categories}
      />
    </div>
  );
};

export default AssignmentDescriptionPanel;
