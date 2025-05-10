import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface QualityReliabilityData {
  plagiarismRate: number;
  averageSimilarity: number;
  maxSimilarity: number;
  runtimeErrorRate: number;
  languageUsage: Array<{
    languageId: number;
    count: number;
  }>;
}

interface QualityReliabilityTabProps {
  classId: string;
  data: QualityReliabilityData;
}

const QualityReliabilityTab: React.FC<QualityReliabilityTabProps> = ({
  classId,
  data,
}) => {
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Transform languageUsage data for the pie chart
  const languageNames: Record<number, string> = {
    1: "Python",
    2: "JavaScript",
    3: "Java",
    4: "C++",
    5: "Ruby",
    6: "Go",
    7: "C#",
    8: "PHP",
    // Add more language mappings as needed
  };

  // Calculate total submissions to derive percentages
  const totalSubmissions = data.languageUsage.reduce(
    (total, lang) => total + lang.count,
    0
  );

  const formattedLanguageData = data.languageUsage.map((lang) => ({
    name: languageNames[lang.languageId] || `Language ID ${lang.languageId}`,
    value: Math.round((lang.count / totalSubmissions) * 100),
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Quality & Reliability</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Plagiarism Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.plagiarismRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              % of submissions flagged above the similarity threshold
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
            <div className="text-3xl font-bold">
              {data.averageSimilarity.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mean similarity score among flagged submissions
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
            <div className="text-3xl font-bold">
              {data.maxSimilarity.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Highest similarity score detected
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Runtime/Error Failures Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {data.runtimeErrorRate.toFixed(1)}%
            </div>
            <div className="w-2/3 bg-gray-700 rounded-full h-4">
              <div
                className="bg-amber-600 h-4 rounded-full"
                style={{ width: `${data.runtimeErrorRate}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            % of submissions that error out (timeouts, crashes)
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Language Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedLanguageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {formattedLanguageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "white",
                  }}
                  formatter={(value) => [`${value}%`, "Usage"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Proportion of submissions in each programming language across all
            assignments
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReliabilityTab;
