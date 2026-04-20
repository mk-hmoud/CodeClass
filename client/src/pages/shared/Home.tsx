import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, Sun, Moon, ArrowRight, Zap, BarChart3, Users, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { loginUser, studentAccess } from "@/services/AuthService";
import { useTheme } from "@/contexts/ThemeContext";

const FEATURES = [
  { icon: Zap,      label: "Multi-language code execution",   desc: "Run Python, C++, JavaScript and more in isolated sandboxes." },
  { icon: BarChart3, label: "Automated grading & analytics",  desc: "Instant feedback with detailed classroom performance insights." },
  { icon: Users,    label: "Classroom management",            desc: "Create classrooms, assign problems, and track every student." },
];

const CODE_LINES = [
  { indent: 0, tokens: [{ t: "def ", c: "text-primary" }, { t: "solve", c: "text-yellow-400" }, { t: "(arr: list[int]) -> int:", c: "text-foreground/80" }] },
  { indent: 1, tokens: [{ t: "# find max subarray sum", c: "text-muted-foreground" }] },
  { indent: 1, tokens: [{ t: "best = cur = ", c: "text-foreground/80" }, { t: "arr", c: "text-cyan-400" }, { t: "[0]", c: "text-orange-400" }] },
  { indent: 1, tokens: [{ t: "for ", c: "text-primary" }, { t: "n ", c: "text-cyan-400" }, { t: "in ", c: "text-primary" }, { t: "arr[1:]:", c: "text-foreground/80" }] },
  { indent: 2, tokens: [{ t: "cur = ", c: "text-foreground/80" }, { t: "max", c: "text-yellow-400" }, { t: "(n, cur + n)", c: "text-foreground/80" }] },
  { indent: 2, tokens: [{ t: "best = ", c: "text-foreground/80" }, { t: "max", c: "text-yellow-400" }, { t: "(best, cur)", c: "text-foreground/80" }] },
  { indent: 1, tokens: [{ t: "return ", c: "text-primary" }, { t: "best", c: "text-cyan-400" }] },
];

type Mode = "instructor" | "student";

const Home = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("student");

  // Instructor login state
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student access state
  const [studentNumber, setStudentNumber] = useState("");

  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [shake, setShake]             = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

  const handleInstructorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Email and password are required"); triggerShake(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address"); triggerShake(); return; }
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

  const handleStudentAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = studentNumber.trim();
    if (!num) { setError("Please enter your student number"); triggerShake(); return; }
    setIsLoading(true);
    try {
      const result = await studentAccess(num);
      if (result.success) {
        toast.success("Welcome!");
        navigate("/student/dashboard");
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
    <div className="min-h-screen flex flex-col md:flex-row bg-background relative overflow-hidden">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 flex flex-col justify-between p-8 md:p-12 bg-gradient-to-br from-background to-muted/50 border-b md:border-b-0 md:border-r border-border overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(#888 1px,transparent 1px),linear-gradient(90deg,#888 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-block mb-10"><Logo /></Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 leading-tight">
              Where coding<br /><span className="text-primary">education</span> lives.
            </h1>
            <p className="text-muted-foreground text-base mb-10 max-w-sm">
              A professional platform for instructors and students to teach, learn, and grow through code.
            </p>
            <div className="space-y-5">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg p-1.5 bg-primary/10 shrink-0">
                    <Icon size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 mt-10 hidden md:block"
        >
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/40">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">kadane.py</span>
            </div>
            <div className="p-4 font-mono text-xs leading-6">
              {CODE_LINES.map((line, i) => (
                <div key={i} style={{ paddingLeft: `${line.indent * 16}px` }}>
                  {line.tokens.map((tok, j) => <span key={j} className={tok.c}>{tok.t}</span>)}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border bg-muted/40 p-1 mb-8">
            <button
              type="button"
              onClick={() => { setMode("student"); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                mode === "student"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Hash size={14} />
              Student
            </button>
            <button
              type="button"
              onClick={() => { setMode("instructor"); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                mode === "instructor"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users size={14} />
              Instructor
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className={cn("mb-5", shake && "animate-shake")}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            {mode === "student" ? (
              <motion.div
                key="student"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1">Enter your student number</h2>
                  <p className="text-sm text-muted-foreground">
                    First time? An account will be created automatically.
                  </p>
                </div>

                <form onSubmit={handleStudentAccess} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="studentNumber">Student Number</Label>
                    <Input
                      id="studentNumber"
                      type="text"
                      placeholder="e.g. 20210001"
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      autoComplete="off"
                      disabled={isLoading}
                      className="text-lg tracking-widest"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading
                      ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <ArrowRight size={16} />}
                    {isLoading ? "Loading…" : "Continue"}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="instructor"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1">Instructor sign in</h2>
                  <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
                </div>

                <form onSubmit={handleInstructorLogin} className="space-y-4">
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
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => toast.info("Password reset not yet implemented")}
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

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  New to CodeClass?{" "}
                  <Link to="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors inline-flex items-center gap-0.5">
                    Create an account <ArrowRight size={13} />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-muted-foreground mt-10">
            © {new Date().getFullYear()} CodeClass. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
