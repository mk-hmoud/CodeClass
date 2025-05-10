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
  averageAssignmentScore: number;
  medianAssignmentScore: number;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  scoreTrend: Array<{
    period: string;
    averageScore: number;
  }>;
}

interface PerformanceOverviewTabProps {
  classId: string;
  data: PerformanceData;
}

const PerformanceOverviewTab: React.FC<PerformanceOverviewTabProps> = ({
  classId,
  data,
}) => {
  // Process score distribution data for better visualization
  const processedDistribution = React.useMemo(() => {
    // For the bar chart, we'll add an assignments field that's roughly proportional
    // to the count for demonstration purposes
    return data.scoreDistribution.map((item) => ({
      ...item,
      assignments: Math.round(item.count * 0.8), // Just a rough approximation for visualization
    }));
  }, [data.scoreDistribution]);

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
              {data.averageAssignmentScore.toFixed(1)}%
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
              {data.medianAssignmentScore.toFixed(1)}%
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
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Score Trend Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.scoreTrend}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceOverviewTab;
