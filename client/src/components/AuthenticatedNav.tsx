import { User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type AuthenticatedNavProps = {
  userName?: string;
};

const AuthenticatedNav = ({ userName = "User" }: AuthenticatedNavProps) => {
  const location = useLocation();
  const isInstructorPath = location.pathname.includes("/instructor");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="border-b border-border bg-background py-3 px-4 flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <div className="text-[#00b7ff] text-2xl font-mono">{`<>`}</div>
        <h1 className="text-lg font-medium text-foreground">
          Problem Solver Studio
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <Link
          to={isInstructorPath ? "/instructor" : "/student"}
          className="text-foreground/80 hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8 bg-primary/20">
                <AvatarFallback className="bg-primary/20 text-foreground">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => (window.location.href = "/profile")}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (window.location.href = "/")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (window.location.href = "/")}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AuthenticatedNav;
