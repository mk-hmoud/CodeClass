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
  totalStudents: number;
  activeStudents: number;
  activeStudentsPercentage: number;
  submissionRate: number;
  submissionTrend: Array<{
    day: number;
    hour: number;
    count: number;
  }>;
}

interface ParticipationEngagementTabProps {
  classId: string;
  data: ParticipationData;
}

const ParticipationEngagementTab: React.FC<ParticipationEngagementTabProps> = ({
  classId,
  data,
}) => {
  // Process submission trend data into weekly format
  // This converts the raw hour/day data into weekly aggregates for the chart
  const processedTrendData = React.useMemo(() => {
    // Group by day and sum counts
    const dayMap = new Map<number, number>();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, 0);
    }

    // Sum counts for each day
    data.submissionTrend.forEach((item) => {
      const currentCount = dayMap.get(item.day) || 0;
      dayMap.set(item.day, currentCount + item.count);
    });

    // Convert to array format for chart
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from(dayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, count]) => ({
        week: dayNames[day],
        submissions: +(count / data.totalStudents).toFixed(1), // Normalize by student count
      }));
  }, [data.submissionTrend, data.totalStudents]);

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
            <div className="text-3xl font-bold">{data.totalStudents}</div>
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
                {data.activeStudentsPercentage.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {data.activeStudents}/{data.totalStudents}
              </span>
            </div>
            <Progress value={data.activeStudentsPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Students with ≥1 submission in the last 2 weeks
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
              {data.submissionRate.toFixed(1)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipationEngagementTab;
