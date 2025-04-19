import { useState } from "react";
import ClassroomsSection from "@/components/instructor/ClassroomSection";
import ProblemsSection from "@/components/instructor/ProblemsSection";

const InstructorDashboard = () => {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
      </div>
      <ClassroomsSection />
      <ProblemsSection activeTab={activeTab} />
    </div>
  );
};

export default InstructorDashboard;
