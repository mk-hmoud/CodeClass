import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface InstructorLayoutProps {
  children?: React.ReactNode;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <div className="flex-grow flex flex-col">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default InstructorLayout;
