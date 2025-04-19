import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ClassStats {
  submissionsOverTime: {
    date: string;
    submissions: number;
  }[];
  assignmentCompletion: {
    assignment: string;
    completionRate: number;
  }[];
  studentEngagement: number;
  averageScore: number;
  assignmentsCreated: number;
  activeStudents: number;
}

interface StatisticsTabProps {
  stats: ClassStats;
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ stats }) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Classroom Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Student Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentEngagement}%</div>
            <p className="text-xs text-muted-foreground">
              Active participation rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Across all assignments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignmentsCreated}</div>
            <p className="text-xs text-muted-foreground">
              Total assignments created
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
            <div className="text-2xl font-bold">{stats.activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              Students active this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Submissions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.submissionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
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
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Assignment Completion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.assignmentCompletion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    dataKey="assignment"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      borderColor: "#374151",
                      color: "white",
                    }}
                    formatter={(value) => [`${value}%`, "Completion Rate"]}
                  />
                  <Legend />
                  <Bar
                    dataKey="completionRate"
                    fill="#10b981"
                    name="Completion Rate"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default StatisticsTab;
