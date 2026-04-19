import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, Sun, Moon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { loginUser } from "@/services/AuthService";
import { useTheme } from "@/contexts/ThemeContext";

const Login = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const validate = () => {
    if (!email) { setError("Email is required"); return false; }
    if (!password) { setError("Password is required"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address"); return false; }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) { triggerShake(); return; }

    setIsLoading(true);
    try {
      const result = await loginUser({ email, password });
      if (result.success) {
        toast.success("Welcome back!");
        navigate(result.user.role === "instructor" ? "/instructor/dashboard" : "/student/dashboard");
      } else {
        setError(result.message);
        triggerShake();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo /></Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Sign in</h1>
            <p className="text-sm text-muted-foreground">Enter your credentials to access your account</p>
          </div>

          {error && (
            <Alert variant="destructive" className={cn("mb-5", shake && "animate-shake")}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    if (!email) { setError("Enter your email first"); triggerShake(); return; }
                    toast.success(`Password reset link sent to ${email}`);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading
                ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <LogIn size={16} />}
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
