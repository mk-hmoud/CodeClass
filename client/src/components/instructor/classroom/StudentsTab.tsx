import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Search, Users } from "lucide-react";
import { motion } from "framer-motion";

interface Student {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string;
}

interface Props {
  students: Student[];
  formatDate?: (date: string) => string;
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));

const initial = (name: string) => name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#6366f1", "#f97316"];
const avatarColor = (email: string) => AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length];

const StudentsTab: React.FC<Props> = ({ students, formatDate = fmtDate }) => {
  const [search, setSearch] = useState("");

  const filtered = students.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Students</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{students.length}</span>
        </div>
        <div className="relative w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>Student</span>
            <span>Enrolled</span>
          </div>

          {filtered.map((s, i) => {
            const color = avatarColor(s.email);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_auto] items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: color + "20", color }}
                  >
                    {initial(s.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <a
                    href={`mailto:${s.email}`}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Send email"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <Mail size={13} />
                    </Button>
                  </a>
                </div>

                <span className="text-xs text-muted-foreground">{formatDate(s.lastActive)}</span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users size={20} className="text-muted-foreground" />
          </div>
          {search ? (
            <>
              <p className="font-medium mb-1">No match for "{search}"</p>
              <button onClick={() => setSearch("")} className="text-sm text-primary hover:underline">Clear search</button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1">No students enrolled</p>
              <p className="text-sm text-muted-foreground">Share the class code to invite students.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentsTab;
