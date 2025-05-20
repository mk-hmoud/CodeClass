import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ParticipationData {
  totalStudents: number | null | undefined;
  activeStudents: number | null | undefined;
  activeStudentsPercentage: number | null | undefined;
  submissionRate: number | null | undefined;
  submissionTrend:
    | Array<{
        day: number;
        hour: number;
        count: number;
      }>
    | null
    | undefined;
}

interface ParticipationEngagementTabProps {
  classId: string;
  data: ParticipationData | null | undefined;
  isLoading?: boolean;
}

const ParticipationEngagementTab: React.FC<ParticipationEngagementTabProps> = ({
  classId,
  data,
  isLoading = false,
}) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Participation & Engagement</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center text-gray-400">
            {isLoading
              ? "Loading participation data..."
              : "No participation data available."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    totalStudents = 0,
    activeStudents = 0,
    activeStudentsPercentage = 0,
    submissionRate = 0,
    submissionTrend = [],
  } = data;

  const processedTrendData = React.useMemo(() => {
    const trendDataArray = Array.isArray(submissionTrend)
      ? submissionTrend
      : [];

    const dayMap = new Map<number, number>();

    for (let i = 0; i < 7; i++) {
      dayMap.set(i, 0);
    }

    trendDataArray.forEach((item) => {
      if (typeof item.day === "number" && typeof item.count === "number") {
        const currentCount = dayMap.get(item.day) || 0;
        dayMap.set(item.day, currentCount + item.count);
      }
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from(dayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, count]) => {
        const submissionsPerStudent =
          totalStudents > 0 ? count / totalStudents : 0;
        return {
          week: dayNames[day],

          submissions: parseFloat(
            Math.max(0, submissionsPerStudent).toFixed(1)
          ),
        };
      });
  }, [submissionTrend, totalStudents]);

  const formatNumber = (
    value: number | null | undefined,
    decimals: number = 0,
    fallback: string = "N/A"
  ) => {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback;
    }
    return value.toFixed(decimals);
  };

  const formatPercentage = (
    value: number | null | undefined,
    decimals: number = 1,
    fallback: string = "N/A"
  ) => {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback;
    }
    const clampedValue = Math.max(0, Math.min(100, value));
    return `${clampedValue.toFixed(decimals)}%`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Participation & Engagement</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students Enrolled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(totalStudents, 0, "0")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Students currently enrolled in this classroom
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <span className="text-3xl font-bold">
                {formatPercentage(activeStudentsPercentage, 1, "0%")}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatNumber(activeStudents, 0, "0")}/
                {formatNumber(totalStudents, 0, "0")}
              </span>
            </div>
            <Progress value={activeStudentsPercentage ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Students with &ge;1 submission in the last 2 weeks
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Submission Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(submissionRate, 1, "N/A")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average submissions per student per week
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Submission Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {processedTrendData &&
          processedTrendData.length > 0 &&
          processedTrendData.some((d) => d.submissions > 0) ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="week" />
                  <YAxis
                    label={{
                      value: "Submissions per student",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      borderColor: "#374151",
                      color: "white",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submissions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Submissions per Student"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              No submission trend data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipationEngagementTab;
