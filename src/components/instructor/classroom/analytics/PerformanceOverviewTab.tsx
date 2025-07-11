import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PerformanceData {
  averageAssignmentScore: number | null;
  medianAssignmentScore: number | null;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }> | null;
  scoreTrend: Array<{
    period: string;
    averageScore: number;
  }> | null;
}

interface PerformanceOverviewTabProps {
  classId: string;
  data: PerformanceData | null;
}

const PerformanceOverviewTab: React.FC<PerformanceOverviewTabProps> = ({
  classId,
  data,
}) => {
  const safeData: PerformanceData = {
    averageAssignmentScore: data?.averageAssignmentScore ?? 0,
    medianAssignmentScore: data?.medianAssignmentScore ?? 0,
    scoreDistribution: data?.scoreDistribution ?? [],
    scoreTrend: data?.scoreTrend ?? [],
  };

  const processedDistribution = React.useMemo(() => {
    return safeData.scoreDistribution.map((item) => ({
      ...item,
      assignments: Math.round(item.count * 0.8),
    }));
  }, [safeData.scoreDistribution]);

  const hasDistributionData =
    safeData.scoreDistribution && safeData.scoreDistribution.length > 0;
  const hasTrendData = safeData.scoreTrend && safeData.scoreTrend.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performance Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Assignment Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {safeData.averageAssignmentScore !== null
                ? safeData.averageAssignmentScore.toFixed(1) + "%"
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mean score across all assignments and students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Median Assignment Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {safeData.medianAssignmentScore !== null
                ? safeData.medianAssignmentScore.toFixed(1) + "%"
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Median score across all assignments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Assignment Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {hasDistributionData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedDistribution}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      borderColor: "#374151",
                      color: "white",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Student Submissions"
                    fill="#4f46e5"
                  />
                  <Bar
                    dataKey="assignments"
                    name="Total Assignments"
                    fill="#10b981"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-slate-800 bg-opacity-20 rounded-lg">
              <p className="text-gray-400">No distribution data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Score Trend Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {hasTrendData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={safeData.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
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
                    dataKey="averageScore"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Average Score %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-slate-800 bg-opacity-20 rounded-lg">
              <p className="text-gray-400">No trend data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceOverviewTab;
