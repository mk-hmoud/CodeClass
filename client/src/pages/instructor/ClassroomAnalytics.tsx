import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ParticipationEngagementTab from "@/components/instructor/classroom/analytics/ParticipationEngagementTab";
import PerformanceOverviewTab from "@/components/instructor/classroom/analytics/PerformanceOverviewTab";
import TimingsPacingTab from "@/components/instructor/classroom/analytics/TimingsPacingTab";
import QualityReliabilityTab from "@/components/instructor/classroom/analytics/QualityReliabilityTab";
import ProgressTrendsTab from "@/components/instructor/classroom/analytics/ProgressTrendsTab";
import { ClassroomAnalyticsPayload } from "@/types/Classroom";
import { getClassroomAnalytics } from "@/services/ClassroomService";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ClassroomAnalytics = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("participation");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ClassroomAnalyticsPayload | null>(
    null
  );

  useEffect(() => {
    if (!classroomId) return;

    setLoading(true);
    setError(null);

    getClassroomAnalytics(Number(classroomId))
      .then((payload) => {
        setAnalytics(payload);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics. Please try again later.");
        setLoading(false);
      });
  }, [classroomId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-80 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          onClick={() => navigate(`/instructor/classrooms/${classroomId}/view`)}
        >
          <ArrowLeft size={15} />
          Back to Classroom
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {analytics.classroomName} — Statistics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive analytics and insights for your classroom performance
          </p>
        </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-muted/50 border border-border p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="participation" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">Participation & Engagement</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">Performance Overview</TabsTrigger>
          <TabsTrigger value="timings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">Timings & Pacing</TabsTrigger>
          <TabsTrigger value="quality" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">Quality & Reliability</TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">Progress & Trends</TabsTrigger>
        </TabsList>

        {analytics && (
          <>
            <TabsContent value="participation">
              <ParticipationEngagementTab
                classId={classroomId}
                data={analytics.participation}
              />
            </TabsContent>
            <TabsContent value="performance">
              <PerformanceOverviewTab
                classId={classroomId}
                data={analytics.performance}
              />
            </TabsContent>
            <TabsContent value="timings">
              <TimingsPacingTab
                classId={classroomId}
                data={analytics.timings}
              />
            </TabsContent>
            <TabsContent value="quality">
              <QualityReliabilityTab
                classId={classroomId}
                data={analytics.quality}
              />
            </TabsContent>
            <TabsContent value="progress">
              <ProgressTrendsTab
                classId={classroomId}
                data={analytics.progress}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
      </div>
    </div>
  );
};

export default ClassroomAnalytics;
