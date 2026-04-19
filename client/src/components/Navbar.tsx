import { Sun, Moon, ChevronDown, LayoutDashboard, User, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { logout, isAuthenticated, getCurrentUser } from "@/services/AuthService";
import { useTheme } from "@/contexts/ThemeContext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isInstructorPath = location.pathname.includes("/instructor");
  const isStudentPath = location.pathname.includes("/student");
  const loggedIn = isInstructorPath || isStudentPath || isAuthenticated();
  const { theme, toggleTheme } = useTheme();

  const { user } = getCurrentUser();
  const displayName = user?.firstName || user?.username || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const dashboardPath = isInstructorPath
    ? "/instructor/dashboard"
    : "/student/dashboard";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: Logo */}
        <Link to={loggedIn ? dashboardPath : "/"} className="flex items-center gap-2">
          <Logo />
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-8 w-8"
          >
            {theme === "dark"
              ? <Sun size={16} className="text-muted-foreground" />
              : <Moon size={16} className="text-muted-foreground" />}
          </Button>

          {!loggedIn ? (
            <div className="flex items-center gap-2 ml-1">
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 ml-1 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">{initial}</span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{displayName}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate(dashboardPath)}>
                  <LayoutDashboard size={14} className="mr-2 text-muted-foreground" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User size={14} className="mr-2 text-muted-foreground" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut size={14} className="mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
