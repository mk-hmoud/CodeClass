import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AuthenticatedNav from "@/components/AuthenticatedNav";
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
  const [activeTab, setActiveTab] = useState("participation");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ClassroomAnalyticsPayload | null>(
    null
  );

  useEffect(() => {
    console.log("hi");
    if (!classroomId) return;
    console.log("bye");

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
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-1/3 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {analytics.classroomName} Statistics
          </h1>
          <p className="text-gray-400 mt-1">
            Comprehensive analytics and insights for your classroom performance
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-[#0c121f] p-1 w-full md:w-auto flex flex-wrap">
          <TabsTrigger
            value="participation"
            className="data-[state=active]:bg-[#123651]"
          >
            Participation & Engagement
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-[#123651]"
          >
            Performance Overview
          </TabsTrigger>
          <TabsTrigger
            value="timings"
            className="data-[state=active]:bg-[#123651]"
          >
            Timings & Pacing
          </TabsTrigger>
          <TabsTrigger
            value="quality"
            className="data-[state=active]:bg-[#123651]"
          >
            Quality & Reliability
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="data-[state=active]:bg-[#123651]"
          >
            Progress & Trends
          </TabsTrigger>
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
  );
};

export default ClassroomAnalytics;
