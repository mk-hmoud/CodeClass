import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Check, Eye, EyeOff, UserPlus, X, GraduationCap, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { adminCreateUser } from "@/services/AdminService";

const PASSWORD_REQS = [
  { id: "length",    text: "At least 8 characters",    regex: /.{8,}/ },
  { id: "lowercase", text: "Lowercase letter",          regex: /[a-z]/ },
  { id: "uppercase", text: "Uppercase letter",          regex: /[A-Z]/ },
  { id: "number",    text: "Contains a number",         regex: /\d/ },
  { id: "special",   text: "Special character",         regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

const AdminCreateUser: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"instructor" | "student">("student");
  const [strength, setStrength] = useState<Record<string, boolean>>({
    length: false, lowercase: false, uppercase: false, number: false, special: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setStrength(prev => {
      const next = { ...prev };
      PASSWORD_REQS.forEach(r => { next[r.id] = r.regex.test(password); });
      return next;
    });
  }, [password]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    let pwd = "";
    // Ensure requirements
    pwd += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    pwd += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    pwd += "0123456789"[Math.floor(Math.random() * 10)];
    pwd += "!@#$%^&*()_+-="[Math.floor(Math.random() * 14)];
    
    for (let i = 0; i < 8; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    
    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
    toast.success("Random password generated!");
  };

  const validate = () => {
    if (!name.trim()) { setError("Full name is required"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address"); return false; }
    if (!password) { setError("Password is required"); return false; }
    if (!Object.values(strength).every(Boolean)) { setError("Password doesn't meet all requirements"); return false; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return false; }
    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) { triggerShake(); return; }

    setIsLoading(true);
    try {
      const result = await adminCreateUser({ name, email, password, role });
      if (result.success) {
        toast.success(result.message || "User created successfully!");
        navigate("/admin/dashboard");
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

  const passwordStrengthCount = Object.values(strength).filter(Boolean).length;
  const strengthColor =
    passwordStrengthCount <= 2 ? "bg-destructive" :
    passwordStrengthCount <= 3 ? "bg-orange-400" :
    passwordStrengthCount === 4 ? "bg-yellow-400" : "bg-green-500";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={cn("bg-card border border-border rounded-2xl p-8 shadow-sm", shake && "animate-shake")}>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-1">Create User</h1>
              <p className="text-sm text-muted-foreground">Add a new student or instructor</p>
            </div>
            <Link to="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              <Button variant="ghost" size="icon"><X size={18} /></Button>
            </Link>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Role selector */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                    role === "student"
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <GraduationCap size={15} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("instructor")}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                    role === "instructor"
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <UserPlus size={15} />
                  Instructor
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={isLoading} />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-xs text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Wand2 size={12} />
                  Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-300",
                        i <= passwordStrengthCount ? strengthColor : "bg-muted"
                      )} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {PASSWORD_REQS.map(req => (
                      <div key={req.id} className="flex items-center gap-1.5 text-xs">
                        {strength[req.id]
                          ? <Check size={11} className="text-green-500 shrink-0" />
                          : <X size={11} className="text-orange-400 shrink-0" />}
                        <span className={strength[req.id] ? "text-muted-foreground" : "text-orange-400"}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className={cn(
                    confirmPassword && password !== confirmPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>

            <Button type="submit" className="w-full gap-2 mt-6" disabled={isLoading}>
              {isLoading
                ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <UserPlus size={16} />}
              {isLoading ? "Creating user…" : "Create User"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminCreateUser;
