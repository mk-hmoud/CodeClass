import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { GraduationCap, Users, BookOpen, LayoutGrid, FolderOpen } from "lucide-react";
import ClassroomsSection from "@/components/instructor/dashboard/ClassroomSection";
import ProblemsSection from "@/components/instructor/dashboard/ProblemsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClassrooms } from "@/services/ClassroomService";
import { getCurrentUser } from "@/services/AuthService";
import { Classroom } from "@/types/Classroom";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.38 } }),
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const StatPill = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) => (
  <motion.div variants={fadeUp} custom={0}
    className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
    <div className="rounded-lg p-2.5 shrink-0" style={{ backgroundColor: color + "20" }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  </motion.div>
);

const InstructorDashboard = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = getCurrentUser();
  const firstName = user?.firstName || user?.name?.split(' ')[0] || "Instructor";

  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      const data = await getClassrooms();
      setClassrooms(data);
    } catch {
      toast.error("Failed to load classrooms");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchClassrooms(); }, []);

  const active = classrooms.filter(c => c.status !== "archived");
  const totalStudents = classrooms.reduce((s, c) => s + (c.students_num ?? 0), 0);
  const totalAssignments = classrooms.reduce((s, c) => s + (c.totalAssignments ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-primary blur-3xl translate-x-1/3 -translate-y-1/3" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-10">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={fadeUp} custom={0}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border border-primary/30 text-primary bg-primary/10 mb-4">
              <GraduationCap size={12} />
              Instructor Dashboard
            </motion.div>
            <div className="flex justify-between items-center mb-1">
              <motion.h1 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight">
                {getGreeting()}, {firstName}
              </motion.h1>
              <motion.div variants={fadeUp} custom={1}>
              </motion.div>
            </div>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground mb-8">
              {active.length > 0
                ? `You have ${active.length} active classroom${active.length !== 1 ? "s" : ""} with ${totalStudents} student${totalStudents !== 1 ? "s" : ""} enrolled.`
                : "Create your first classroom to get started."}
            </motion.p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <StatPill icon={LayoutGrid} label="Active Classrooms" value={active.length} color="#3b82f6" />
              <StatPill icon={Users} label="Total Students" value={totalStudents} color="#8b5cf6" />
              <StatPill icon={BookOpen} label="Total Assignments" value={totalAssignments} color="#10b981" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="classrooms" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="classrooms" className="gap-2">
              <FolderOpen size={16} />
              My Classrooms
            </TabsTrigger>
            <TabsTrigger value="problems" className="gap-2">
              <BookOpen size={16} />
              Problem Library
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="classrooms" className="m-0">
            <ClassroomsSection
              classrooms={classrooms}
              isLoading={isLoading}
              onRefetch={fetchClassrooms}
            />
          </TabsContent>
          
          <TabsContent value="problems" className="m-0">
            <ProblemsSection activeTab="problems" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InstructorDashboard;
