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
import { chartPalette, chartTooltipStyle } from "@/lib/chartColors";

interface QualityReliabilityData {
  runtimeErrorRate: number | null;
  languageUsage: Array<{
    languageId: number;
    count: number;
  }> | null;
}

interface QualityReliabilityTabProps {
  classId: string;
  data: QualityReliabilityData | null;
}

const QualityReliabilityTab: React.FC<QualityReliabilityTabProps> = ({
  classId,
  data,
}) => {
  const COLORS = chartPalette();

  const safeData: QualityReliabilityData = {
    runtimeErrorRate: data?.runtimeErrorRate ?? 0,
    languageUsage: data?.languageUsage ?? [],
  };

  const languageNames: Record<number, string> = {
    1: "Python",
    2: "C++",
    3: "JavaScript",
    4: "C",
    5: "TypeScript",
  };

  const totalSubmissions = safeData.languageUsage.reduce(
    (total, lang) => total + lang.count,
    0
  );

  const formattedLanguageData = safeData.languageUsage.map((lang) => ({
    name: languageNames[lang.languageId] || `Language ID ${lang.languageId}`,
    value:
      totalSubmissions > 0
        ? Math.round((lang.count / totalSubmissions) * 100)
        : 0,
  }));

  const hasLanguageData =
    safeData.languageUsage && safeData.languageUsage.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Quality & Reliability</h2>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Runtime/Error Failures Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {safeData.runtimeErrorRate !== null
                ? safeData.runtimeErrorRate.toFixed(1) + "%"
                : "N/A"}
            </div>
            <div className="w-2/3 bg-muted rounded-full h-4">
              <div
                className="bg-warning h-4 rounded-full"
                style={{ width: `${safeData.runtimeErrorRate ?? 0}%` }}
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
          {hasLanguageData && totalSubmissions > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedLanguageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill={COLORS[0]}
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
                    contentStyle={chartTooltipStyle()}
                    formatter={(value) => [`${value}%`, "Usage"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-muted bg-opacity-20 rounded-lg">
              <p className="text-muted-foreground">No language usage data available</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Proportion of submissions in each programming language across all
            assignments
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReliabilityTab;
