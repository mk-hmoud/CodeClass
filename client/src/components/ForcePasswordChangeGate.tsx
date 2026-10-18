import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PASSWORD_REQS, passwordMeetsAllRules } from "@/lib/passwordRules";
import {
  changeOwnPassword,
  isAuthenticated,
  MUST_CHANGE_PASSWORD_KEY,
  PASSWORD_CHANGE_REQUIRED_EVENT,
} from "@/services/AuthService";

/**
 * Blocks the app until someone who was handed a password sets their own.
 *
 * The real enforcement is server-side -- the API refuses everything but this
 * endpoint while the flag is set -- so this dialog is the way *through* that
 * block rather than the block itself. It has no close affordance and ignores
 * overlay clicks and Escape for the same reason.
 */
const ForcePasswordChangeGate: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setOpen(isAuthenticated() && localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === "1");
    };
    sync();
    window.addEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, sync);
    // Another tab signing in or changing its password should settle this one too.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const met = (regex: RegExp) => regex.test(newPassword);
  const allMet = passwordMeetsAllRules(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) { setError("Enter the password you just signed in with"); return; }
    if (!allMet) { setError("New password doesn't meet all requirements"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    if (newPassword === currentPassword) { setError("New password must be different from the current one"); return; }

    setSaving(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    setSaving(false);

    if (!result.success) { setError(result.message); return; }

    toast.success("Password updated");
    setOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            Choose your own password
          </DialogTitle>
          <DialogDescription>
            Your account was set up with a password someone else chose. Pick a new one to
            continue — nobody else will know it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fpc-current">Current password</Label>
            <Input
              id="fpc-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fpc-new">New password</Label>
            <div className="relative">
              <Input
                id="fpc-new"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={saving}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                {PASSWORD_REQS.map((req) => (
                  <div key={req.id} className="flex items-center gap-1.5 text-xs">
                    {met(req.regex)
                      ? <Check size={11} className="text-success shrink-0" />
                      : <X size={11} className="text-orange-400 shrink-0" />}
                    <span className={met(req.regex) ? "text-muted-foreground" : "text-orange-400"}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fpc-confirm">Confirm new password</Label>
            <Input
              id="fpc-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={saving}
              className={cn(confirmPassword && newPassword !== confirmPassword && "border-destructive")}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Set password and continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForcePasswordChangeGate;
