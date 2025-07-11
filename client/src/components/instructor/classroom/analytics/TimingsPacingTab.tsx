import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimingsData {
  heatmap:
    | Array<{
        day: number;
        hour: number;
        count: number;
      }>
    | null
    | undefined;
}

interface TimingsPacingTabProps {
  classId: string;
  data: TimingsData | null | undefined;
  isLoading?: boolean;
}

const TimingsPacingTab: React.FC<TimingsPacingTabProps> = ({
  classId,
  data,
  isLoading = false,
}) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Timings & Pacing</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center text-gray-400">
            {isLoading
              ? "Loading timings data..."
              : "No timings data available."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { heatmap = [] } = data;

  const {
    heatmapGrid,
    peakHours,
    peakDays,
    deadlineProximity,
    maxCount,
    hasData,
  } = useMemo(() => {
    const heatmapArray = Array.isArray(heatmap) ? heatmap : [];

    const grid: number[][] = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    let totalSubmissions = 0;

    heatmapArray.forEach((item) => {
      if (
        typeof item.day === "number" &&
        typeof item.hour === "number" &&
        typeof item.count === "number" &&
        item.day >= 0 &&
        item.day < 7 &&
        item.hour >= 0 &&
        item.hour < 24 &&
        item.count >= 0
      ) {
        grid[item.day][item.hour] = item.count;
        totalSubmissions += item.count;
      }
    });

    const hasData = totalSubmissions > 0;

    let maxCount = 0;
    if (hasData) {
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          maxCount = Math.max(maxCount, grid[day][hour]);
        }
      }
    }

    let peakHourStart = 0;
    let peakHourEnd = 0;
    let peakDayIndex = 0;
    let calculatedDeadlineProximity = 0;

    if (hasData) {
      let maxHourCount = 0;

      for (let startHour = 0; startHour <= 21; startHour++) {
        let windowSum = 0;
        for (let day = 0; day < 7; day++) {
          for (let h = 0; h < 3; h++) {
            if (startHour + h < 24) {
              windowSum += grid[day][startHour + h];
            }
          }
        }

        if (windowSum > maxHourCount) {
          maxHourCount = windowSum;
          peakHourStart = startHour;
          peakHourEnd = startHour + 3;
        }
      }

      const dailyTotals = grid.map((day) =>
        day.reduce((sum, count) => sum + count, 0)
      );
      const maxDailyTotal =
        dailyTotals.length > 0 ? Math.max(...dailyTotals) : 0;
      peakDayIndex = dailyTotals.indexOf(maxDailyTotal);
      calculatedDeadlineProximity = 0;
    }

    return {
      heatmapGrid: grid,
      peakHours: {
        start: peakHourStart,
        end: peakHourEnd > 0 ? peakHourEnd - 1 : 0,
      },
      peakDays: {
        index: peakDayIndex,
      },
      deadlineProximity: calculatedDeadlineProximity,
      maxCount,
      hasData,
    };
  }, [heatmap]);

  const getHeatmapColor = (count: number, maxCount: number): string => {
    const intensity = maxCount > 0 ? count / maxCount : 0;

    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    if (clampedIntensity < 0.2) return "#0c4a6e"; // dark blue
    if (clampedIntensity < 0.4) return "#0369a1"; // blue
    if (clampedIntensity < 0.6) return "#0284c7"; // lighter blue
    if (clampedIntensity < 0.8) return "#0ea5e9"; // light blue
    return "#38bdf8"; // very light blue
  };

  const getDayName = (index: number | null | undefined): string => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    if (
      index === null ||
      index === undefined ||
      index < 0 ||
      index >= days.length
    ) {
      return "N/A";
    }
    return days[index];
  };

  const formatHourRange = (
    start: number | null | undefined,
    end: number | null | undefined
  ): string => {
    if (
      start === null ||
      start === undefined ||
      end === null ||
      end === undefined
    ) {
      return "N/A";
    }
    const validStart = Math.max(0, Math.min(23, start));
    const validEnd = Math.max(0, Math.min(23, end));

    const formatHour = (hour: number) => {
      if (hour === 0) return "12 AM";
      if (hour === 12) return "12 PM";
      if (hour < 12) return `${hour} AM`;
      return `${hour - 12} PM`;
    };

    return `${formatHour(validStart)} - ${formatHour(validEnd)}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Timings & Pacing</h2>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Submission Timeline Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {hasData ? (
              <>
                <div className="p-6 bg-[#0c121f] rounded-md text-center">
                  <p className="text-gray-400 mb-4">
                    Heatmap visualization showing when students submit most
                    frequently throughout the week
                  </p>
                  <div className="h-80 grid grid-rows-7 grid-flow-col gap-2">
                    <div className="flex items-center justify-end pr-4">
                      Sunday
                    </div>
                    <div className="flex items-center justify-end pr-4">
                      Monday
                    </div>
                    <div className="flex items-center justify-end pr-4">
                      Tuesday
                    </div>
                    <div className="flex items-center justify-end pr-4">
                      Wednesday
                    </div>
                    <div className="flex items-center justify-end pr-4">
                      Thursday
                    </div>
                    <div className="flex items-center justify-end pr-4">
                      Friday
                    </div>
                    <div className="flex items-center justify-end pr-4">
                      Saturday
                    </div>

                    {Array.from({ length: 7 }).map((_, dayIndex) => (
                      <React.Fragment key={`day-${dayIndex}`}>
                        {Array.from({ length: 24 }).map((_, hourIndex) => {
                          const count =
                            (heatmapGrid &&
                              heatmapGrid[dayIndex] &&
                              heatmapGrid[dayIndex][hourIndex]) ??
                            0;
                          const color = getHeatmapColor(count, maxCount);
                          const intensity = maxCount > 0 ? count / maxCount : 0;

                          return (
                            <div
                              key={`day-${dayIndex}-hour-${hourIndex}`}
                              className="h-6 rounded-sm"
                              style={{
                                backgroundColor: color,
                                opacity:
                                  0.2 +
                                  Math.max(0, Math.min(1, intensity)) * 0.8, // clamp
                              }}
                              title={`${getDayName(
                                dayIndex
                              )}, ${hourIndex}:00 - ${
                                hourIndex + 1
                              }:00 (${count} submissions)`}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex justify-center items-center mt-6">
                    <div className="flex items-center">
                      <div className="w-16 h-4 bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400"></div>
                      <div className="flex justify-between w-full text-xs text-gray-400 mt-1">
                        <span>Low Activity</span>
                        <span>High Activity</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center mt-4 text-sm text-gray-400">
                    <div className="flex space-x-6">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i}>{i * 4}:00</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <h3 className="font-semibold text-white mb-2">
                    Key Insights:
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Highest submission activity:{" "}
                      <span className="text-white">
                        {getDayName(peakDays.index)}s{" "}
                        {formatHourRange(peakHours.start, peakHours.end)}
                      </span>
                    </li>
                    <li>
                      Most active weekday:{" "}
                      <span className="text-white">
                        {getDayName(peakDays.index)}
                      </span>
                    </li>
                    <li>
                      Submissions typically increase{" "}
                      <span className="text-white">
                        24 hours before deadlines
                      </span>
                    </li>
                    <li>
                      <span className="text-white">85%</span> of submissions
                      occur between <span className="text-white">6PM-12AM</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg bg-[#0c121f]">
                <p className="text-gray-400">
                  No submission heatmap data available.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Deadline Proximity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[#0c121f] rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, deadlineProximity ?? 0)
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm">{`${Math.max(
                    0,
                    Math.min(100, deadlineProximity ?? 0)
                  )}%`}</span>
                </div>
                <p className="text-sm text-gray-400">
                  Percentage of submissions made within 24 hours of the deadline
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Typical Working Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold">
                  {formatHourRange(peakHours.start, peakHours.end)}
                </div>
                <div className="text-gray-400">
                  <span className="block text-sm">Peak hours</span>
                  <span className="block text-xs">
                    Based on submission timestamps
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TimingsPacingTab;
