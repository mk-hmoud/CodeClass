import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProgressTrendsData {
  assignmentCompletionRate: number | null;
  dropOffRate: number | null;
  improvementDistribution: Array<{
    range: "significant" | "moderate" | "flat" | "declined";
    count: number;
  }> | null;
}

interface ProgressTrendsTabProps {
  classId: string;
  data: ProgressTrendsData | null;
}

const ProgressTrendsTab: React.FC<ProgressTrendsTabProps> = ({
  classId,
  data,
}) => {
  const safeData: ProgressTrendsData = {
    assignmentCompletionRate: data?.assignmentCompletionRate ?? 0,
    dropOffRate: data?.dropOffRate ?? 0,
    improvementDistribution: data?.improvementDistribution ?? [],
  };

  const rangeLabels: Record<string, string> = {
    significant: "Improved Significantly",
    moderate: "Improved Moderately",
    flat: "Stayed Flat",
    declined: "Performance Declined",
  };

  const chartData = safeData.improvementDistribution.map((item) => ({
    range: rangeLabels[item.range] || item.range,
    count: item.count,
  }));

  const hasChartData = chartData.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Progress & Trends</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Assignment Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {safeData.assignmentCompletionRate !== null
                ? safeData.assignmentCompletionRate.toFixed(1)
                : "N/A"}
              {safeData.assignmentCompletionRate !== null ? "%" : ""}
            </div>
            <Progress
              value={safeData.assignmentCompletionRate ?? 0}
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              % of assignments completed by all enrolled students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drop-off Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {safeData.dropOffRate !== null
                ? safeData.dropOffRate.toFixed(1)
                : "N/A"}
              {safeData.dropOffRate !== null ? "%" : ""}
            </div>
            <Progress value={safeData.dropOffRate ?? 0} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              % of students who enroll but never submit
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Student Improvement Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {hasChartData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="range"
                    type="category"
                    width={180}
                    tick={{ fontSize: 12 }}
                  />
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
                    name="Number of Students"
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-slate-800 bg-opacity-20 rounded-lg">
              <p className="text-gray-400">No improvement data available</p>
            </div>
          )}
          <p className="text-sm text-gray-400 mt-4">
            Distribution of student performance improvements over the term
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressTrendsTab;
