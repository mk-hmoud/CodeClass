import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Rectangle,
  Cell,
} from "recharts";
import { getAssignmentAnalytics } from "@/services/AssignmentService";
import type {
  Assignment,
  AssignmentAnalyticsPayload,
} from "@/types/Assignment";

const HeatMapCell = ({ x, y, width, height, value }: any) => {
  const intensity = (value / 20) * 100;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={`hsl(215, 70%, ${100 - intensity}%)`}
      stroke="#1e293b"
      strokeWidth={1}
    />
  );
};

const AssignmentAnalytics: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState<AssignmentAnalyticsPayload | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const classroomId = useParams();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!assignmentId) return;

      try {
        setLoading(true);
        const data = await getAssignmentAnalytics(assignmentId);
        setAnalytics(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch assignment analytics:", err);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [assignmentId]);

  const handleBack = () => {
    navigate(
      `/instructor/classrooms/${classroomId}/assignments/${assignmentId}/view`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
        <div className="container mx-auto py-6 px-4 flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-xl">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
        <div className="container mx-auto py-6 px-4">
          <Button variant="outline" className="mb-6 gap-2" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back to Assignment
          </Button>

          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-center">
            <p className="text-xl font-medium mb-2">Error Loading Data</p>
            <p>{error || "Failed to load analytics data"}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
      <div className="container mx-auto py-6 px-4">
        <Button variant="outline" className="mb-6 gap-2" onClick={handleBack}>
          <ArrowLeft size={16} />
          Back to Assignment
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {analytics.assignmentTitle} - Statistics
          </h1>
          <p className="text-gray-400 mt-1">
            Detailed analytics and performance metrics for this assignment
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-[#0c121f] p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#123651]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="data-[state=active]:bg-[#123651]"
            >
              Submissions
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-[#123651]"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="plagiarism"
              className="data-[state=active]:bg-[#123651]"
            >
              Integrity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalSubmissions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From all students
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Distinct Submitters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.distinctSubmitters}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unique students
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.averageScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all submissions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Median Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.medianScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Middle value of all scores
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            borderColor: "#374151",
                            color: "white",
                          }}
                        />
                        <Bar dataKey="count">
                          {analytics.scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Submission Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.submissionTrend}>
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
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Attempts per Student</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Average
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.attemptsPerStudent.average}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Median
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.attemptsPerStudent.median}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Max
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.attemptsPerStudent.max}
                      </p>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.attemptsPerStudent.distribution}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="attempts" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            borderColor: "#374151",
                            color: "white",
                          }}
                        />
                        <Bar dataKey="count" fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Submission Timeline Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <div className="text-xs mb-1">Hours (0-23)</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.submissionTimeline}
                        layout="vertical"
                        barCategoryGap={0}
                        barGap={0}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="day"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            borderColor: "#374151",
                            color: "white",
                          }}
                          formatter={(value: number) => [
                            `${value} submissions`,
                            "Count",
                          ]}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              return `${payload[0].payload.day}, Hour ${payload[0].payload.hour}`;
                            }
                            return label;
                          }}
                        />
                        <Bar dataKey="value" shape={<HeatMapCell />} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span>Low activity</span>
                    <div className="flex items-center">
                      <div className="w-4 h-2 bg-[hsl(215,70%,95%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,85%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,75%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,65%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,55%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,45%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,35%)]"></div>
                      <div className="w-4 h-2 bg-[hsl(215,70%,25%)]"></div>
                    </div>
                    <span>High activity</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Runtime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.averageRuntime} ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Test execution time
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Public Test Pass Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.testPassRates.public}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visible test cases
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Private Test Pass Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.testPassRates.private}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hidden test cases
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Runtime Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.runtimeErrors.percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Of all submissions
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Runtime Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Min</p>
                      <p className="font-medium">
                        {analytics.runtimeDistribution.min} ms
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Q1</p>
                      <p className="font-medium">
                        {analytics.runtimeDistribution.q1} ms
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Median</p>
                      <p className="font-medium">
                        {analytics.runtimeDistribution.median} ms
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Q3</p>
                      <p className="font-medium">
                        {analytics.runtimeDistribution.q3} ms
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Max</p>
                      <p className="font-medium">
                        {analytics.runtimeDistribution.max} ms
                      </p>
                    </div>
                  </div>
                  <div className="relative h-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="h-[2px] w-full bg-slate-700"></div>
                    </div>
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        left: `${
                          (analytics.runtimeDistribution.min /
                            analytics.runtimeDistribution.max) *
                          100
                        }%`,
                      }}
                    >
                      <div className="h-full w-[2px] bg-blue-500"></div>
                    </div>
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: `${
                          (analytics.runtimeDistribution.q1 /
                            analytics.runtimeDistribution.max) *
                          100
                        }%`,
                      }}
                    >
                      <div className="h-full w-[2px] bg-blue-500"></div>
                    </div>
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: `${
                          (analytics.runtimeDistribution.median /
                            analytics.runtimeDistribution.max) *
                          100
                        }%`,
                      }}
                    >
                      <div className="h-full w-[2px] bg-blue-500"></div>
                    </div>
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: `${
                          (analytics.runtimeDistribution.q3 /
                            analytics.runtimeDistribution.max) *
                          100
                        }%`,
                      }}
                    >
                      <div className="h-full w-[2px] bg-blue-500"></div>
                    </div>
                    <div
                      className="absolute inset-y-0 right-0"
                      style={{
                        left: `${
                          (analytics.runtimeDistribution.max /
                            analytics.runtimeDistribution.max) *
                          100
                        }%`,
                      }}
                    >
                      <div className="h-full w-[2px] bg-blue-500"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Common Error Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.commonErrorPatterns}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            borderColor: "#374151",
                            color: "white",
                          }}
                        />
                        <Bar dataKey="count" fill="#f87171" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Most Frequently Missed Test Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {analytics.mostMissedTests.map((test, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{test.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {test.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-400">
                            {test.failRate}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Failure rate
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Top Slowest Test Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {analytics.slowestTestCases.map((test, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{test.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {test.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-amber-400">
                            {test.avgRuntime} ms
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Avg runtime
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Plagiarism/Integrity Tab */}
          <TabsContent value="plagiarism" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Plagiarism Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.plagiarism.rate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submissions above threshold
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Max Similarity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.plagiarism.maxSimilarity}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highest detected
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Similarity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.plagiarism.averageSimilarity}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Among flagged submissions
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Note on Academic Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Plagiarism detection is based on code similarity analysis
                  across all submissions. Submissions with similarity scores
                  above the threshold may require manual review. High similarity
                  doesn't always indicate plagiarism; common solutions to simple
                  problems may naturally appear similar.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssignmentAnalytics;
