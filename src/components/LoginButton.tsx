import React from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LoginButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={() => navigate("/login")}
    >
      <LogIn size={18} />
      Login
    </Button>
  );
};

export default LoginButton;
