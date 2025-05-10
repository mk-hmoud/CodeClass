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
  assignmentCompletionRate: number;
  dropOffRate: number;
  improvementDistribution: Array<{
    range: "significant" | "moderate" | "flat" | "declined";
    count: number;
  }>;
}

interface ProgressTrendsTabProps {
  classId: string;
  data: ProgressTrendsData;
}

const ProgressTrendsTab: React.FC<ProgressTrendsTabProps> = ({
  classId,
  data,
}) => {
  // Map API range values to display labels
  const rangeLabels: Record<string, string> = {
    significant: "Improved Significantly",
    moderate: "Improved Moderately",
    flat: "Stayed Flat",
    declined: "Performance Declined",
  };

  // Transform the improvement distribution data for the chart
  const chartData = data.improvementDistribution.map((item) => ({
    range: rangeLabels[item.range] || item.range,
    count: item.count,
  }));

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
              {data.assignmentCompletionRate.toFixed(1)}%
            </div>
            <Progress
              value={data.assignmentCompletionRate}
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
              {data.dropOffRate.toFixed(1)}%
            </div>
            <Progress value={data.dropOffRate} className="h-2 mt-2" />
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
                <Bar dataKey="count" name="Number of Students" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Distribution of student performance improvements over the term
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressTrendsTab;
