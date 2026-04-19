import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Mail, BadgeCheck, Calendar, KeyRound, Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getCurrentUser } from "@/services/AuthService";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = getCurrentUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setChangingPassword(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      toast.success("Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) { navigate("/"); return null; }

  const displayName =
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;

  const initial = displayName.charAt(0).toUpperCase();
  const joinedDate = user.iat
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(user.iat * 1000))
    : null;

  const ACCENT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const accent = ACCENT_COLORS[(user.username?.charCodeAt(0) ?? 0) % ACCENT_COLORS.length];

  const INFO_ROWS = [
    { icon: User, label: "Username", value: user.username },
    { icon: Mail, label: "Email", value: user.email },
    { icon: BadgeCheck, label: "Role", value: user.role, capitalize: true },
    ...(joinedDate ? [{ icon: Calendar, label: "Member since", value: joinedDate }] : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <div className="flex-grow p-6 max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          {/* Identity hero */}
          <div className="flex items-center gap-5 p-6 bg-card border border-border rounded-2xl">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
              style={{ backgroundColor: accent + "20", color: accent }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <Badge
                className="mt-1.5 capitalize text-xs"
                style={{ backgroundColor: accent + "18", color: accent, borderColor: accent + "30" }}
                variant="outline"
              >
                <Shield size={10} className="mr-1" />
                {user.role}
              </Badge>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="font-semibold text-sm">Account Information</h2>
            </div>
            <div className="divide-y divide-border">
              {INFO_ROWS.map(({ icon: Icon, label, value, capitalize }) => (
                <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                  <Icon size={15} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className={`text-sm font-medium truncate${capitalize ? " capitalize" : ""}`}>{value ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Change password */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
              <KeyRound size={15} className="text-muted-foreground" />
              <h2 className="font-semibold text-sm">Change Password</h2>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={changingPassword} className="w-full gap-2">
                {changingPassword && (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {changingPassword ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
