import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { loginUser } from "@/services/AuthService";

const Home = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email) {
      setError("Email is required");
      return false;
    }

    if (!password) {
      setError("Password is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      triggerShakeAnimation();
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginUser({ email, password });

      if (result.success) {
        toast.success("Login successful");
        if (result.user.role === "instructor") {
          navigate("/instructor/dashboard");
        } else {
          navigate("/student/dashboard");
        }
      } else {
        setError(result.message);
        toast.error(result.message);
        triggerShakeAnimation();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      triggerShakeAnimation();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShakeAnimation = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 flex flex-col md:flex-row">
      {/* left side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-[#0b0f1a] to-[#121a2e]">
        <motion.div
          className="max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center md:justify-start mb-6">
            <Logo size="large" />
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-mono font-bold mb-4 text-center md:text-left">
            Coding <span className="text-cyan-400">Mastery</span>
          </h1>

          <p className="text-lg font-mono text-gray-400 mb-6 text-center md:text-left">
            A powerful platform designed to make coding education engaging,
            effective, and accessible for students and instructors.
          </p>

          <div className="space-y-6 mb-8 font-mono">
            <div className="flex items-start">
              <div className="bg-cyan-500/20 rounded-full p-1 mr-3 mt-1">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              </div>
              <p className="text-sm">
                Powerful code editor with support for multiple languages
              </p>
            </div>

            <div className="flex items-start">
              <div className="bg-cyan-500/20 rounded-full p-1 mr-3 mt-1">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              </div>
              <p className="text-sm">
                Real-time feedback and automated grading
              </p>
            </div>

            <div className="flex items-start">
              <div className="bg-cyan-500/20 rounded-full p-1 mr-3 mt-1">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              </div>
              <p className="text-sm">
                Comprehensive analytics for tracking progress
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <Link
              to="/signup"
              className="text-cyan-400 hover:text-cyan-300 flex items-center group font-mono"
            >
              New to CodeEd? Sign up
              <ArrowRight
                size={16}
                className="ml-1 group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* right side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-black/20 border border-gray-800 rounded-lg backdrop-blur-sm p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
            <p className="text-gray-400 mb-6">
              Sign in to your account to continue
            </p>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Password reset functionality would go here");
                    }}
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/30"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <LogIn size={18} />
                )}
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          <p className="text-xs text-center text-gray-500 mt-8">
            © {new Date().getFullYear()} CodeEd. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
function setShake(arg0: boolean) {
  throw new Error("Function not implemented.");
}
