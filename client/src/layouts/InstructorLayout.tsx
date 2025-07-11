import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface InstructorLayoutProps {
  children?: React.ReactNode;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
      <Navbar />
      <div className="container mx-auto py-8 px-4 flex-grow">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default InstructorLayout;
