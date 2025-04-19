import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Check, Eye, EyeOff, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { signupUser } from "../../services/AuthService";

const passwordRequirements = [
  { id: "length", text: "At least 8 characters long", regex: /.{8,}/ },
  { id: "lowercase", text: "Contains lowercase letter", regex: /[a-z]/ },
  { id: "uppercase", text: "Contains uppercase letter", regex: /[A-Z]/ },
  { id: "number", text: "Contains a number", regex: /\d/ },
  {
    id: "special",
    text: "Contains a special character",
    regex: /[!@#$%^&*(),.?":{}|<>]/,
  },
];

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setrole] = useState<"instructor" | "student">("instructor");
  const [passwordStrength, setPasswordStrength] = useState<{
    [key: string]: boolean;
  }>({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  // Update password strength whenever password changes
  useEffect(() => {
    console.info(`[Signup] Updating password strength for: "${password}"`);
    const newStrength = { ...passwordStrength };
    passwordRequirements.forEach((req) => {
      newStrength[req.id] = req.regex.test(password);
    });
    console.debug(
      `[Signup] New password strength: ${JSON.stringify(newStrength)}`
    );
    setPasswordStrength(newStrength);
  }, [password]);

  const validateForm = () => {
    if (!name) {
      setError("Full name is required");
      console.warn("[Signup] Validation failed: Full name is missing");
      return false;
    }
    if (!email) {
      setError("Email is required");
      console.warn("[Signup] Validation failed: Email is missing");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      console.warn(`[Signup] Validation failed: Invalid email ${email}`);
      return false;
    }
    if (!password) {
      setError("Password is required");
      console.warn("[Signup] Validation failed: Password is missing");
      return false;
    }
    const isPasswordValid = Object.values(passwordStrength).every(
      (value) => value
    );
    if (!isPasswordValid) {
      setError("Password doesn't meet all requirements");
      console.warn("[Signup] Validation failed: Password requirements not met");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      console.warn("[Signup] Validation failed: Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.info(
      `[Signup] handleSignup invoked with name: ${name}, email: ${email}, role: ${role}`
    );
    setError(null);

    if (!validateForm()) {
      triggerShakeAnimation();
      return;
    }

    setIsLoading(true);
    try {
      console.info("[Signup] Calling signupUser service");
      const result = await signupUser({ name, email, password, role });
      console.debug(`[Signup] signupUser response: ${JSON.stringify(result)}`);

      if (result.success) {
        toast.success(result.message || "Account created successfully!");
        console.info("[Signup] Signup successful, redirecting to login page");
        navigate("/login");
      } else {
        setError(result.message);
        toast.error(result.message);
        console.warn(`[Signup] Signup failed: ${result.message}`);
        triggerShakeAnimation();
      }
    } catch (err) {
      console.error("[Signup] Error during signup:", err);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex items-center justify-center gap-2">
              <div className="bg-primary/10 rounded-full p-2">
                <div className="text-primary text-xl font-mono">{`<>`}</div>
              </div>
              <h1 className="text-xl font-bold">Problem Solver Studio</h1>
            </div>
          </Link>
        </div>

        <Card className={cn("border-muted/30", shake && "animate-shake")}>
          <CardHeader>
            <CardTitle className="text-2xl">Create an Account</CardTitle>
            <CardDescription>
              Sign up to start using Problem Solver Studio
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    error &&
                      error.includes("name") &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    error &&
                      error.includes("email") &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      error &&
                        error.includes("Password doesn't meet") &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isLoading}
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
                {/* Password requirements */}
                <div className="space-y-2 mt-2">
                  <div className="text-xs text-muted-foreground">
                    Password requirements:
                  </div>
                  <ul className="space-y-1.5">
                    {passwordRequirements.map((req) => (
                      <li
                        key={req.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        {passwordStrength[req.id] ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <X size={14} className="text-destructive" />
                        )}
                        <span
                          className={cn(
                            passwordStrength[req.id]
                              ? "text-muted-foreground"
                              : "text-destructive"
                          )}
                        >
                          {req.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      error &&
                        error.includes("match") &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>I am a</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={role === "instructor" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setrole("instructor")}
                    disabled={isLoading}
                  >
                    Instructor
                  </Button>
                  <Button
                    type="button"
                    variant={role === "student" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setrole("student")}
                    disabled={isLoading}
                  >
                    Student
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <UserPlus size={18} />
                )}
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center w-full">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary underline hover:text-primary/80"
              >
                Login
              </Link>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
              disabled={isLoading}
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
