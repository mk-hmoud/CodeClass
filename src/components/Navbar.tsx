import { User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LoginButton from "./LoginButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { logout } from "@/services/AuthService";

const Navbar = () => {
  const location = useLocation();
  const isInstructorPath = location.pathname.includes("/instructor");
  const isStudentPath = location.pathname.includes("/student");
  const isLoggedIn = isInstructorPath || isStudentPath;

  const dashboardPath = isInstructorPath
    ? "/instructor/dashboard"
    : "/student/dashboard";

  return (
    <header className="border-b border-gray-800 bg-[#0b0f1a] py-3 px-4 flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <Logo />
      </div>

      <div className="flex items-center gap-2">
        {!isLoggedIn ? (
          <>
            <Link
              to="/signup"
              className="bg-[#00b7ff] hover:bg-[#00a7ea] text-black font-medium py-1.5 px-4 rounded-md transition-colors"
            >
              Get Started
            </Link>
            <LoginButton />
          </>
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => (window.location.href = dashboardPath)}
                >
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    window.location.href = "/";
                  }}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
