import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <div className="flex-grow flex flex-col">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default AdminLayout;
