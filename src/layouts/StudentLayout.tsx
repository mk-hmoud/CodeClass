import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface StudentLayoutProps {
  children?: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
      <Navbar />
      <div className="container mx-auto py-8 px-4 flex-grow">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default StudentLayout;
