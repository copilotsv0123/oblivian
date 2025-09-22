"use client";

import clsx from "clsx";
import { useState, useEffect } from "react";
import Tooltip from "./Tooltip";
import { studyRepo } from "@/lib/client/repositories";

interface HeatmapData {
  [date: string]: {
    count: number;
    totalCards: number;
  };
}

export default function StudyHeatmap() {
  const [data, setData] = useState<HeatmapData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await studyRepo.getHeatmap();
        setData(result.heatmapData);
      } catch (error) {
        console.error("Error fetching heatmap data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const intensityLevels = [
    "bg-muted/70 dark:bg-white/10",
    "bg-emerald-200/70 dark:bg-emerald-400/25",
    "bg-emerald-300/80 dark:bg-emerald-400/45",
    "bg-emerald-400/90 dark:bg-emerald-500/60",
    "bg-emerald-500 dark:bg-emerald-500",
  ];

  const getIntensity = (count: number) => {
    const index = Math.min(Math.max(Math.floor(count), 0), intensityLevels.length - 1);
    return intensityLevels[index];
  };

  // Generate grid for the last 52 weeks
  const generateGrid = () => {
    const grid = [];
    const today = new Date();
    const endDate = new Date(today); // End with today

    // Calculate start date (52 weeks ago from today)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Go back 52 weeks

    // Adjust to start on Sunday
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek !== 0) {
      startDate.setDate(startDate.getDate() - dayOfWeek);
    }

    const weeks = [];
    const currentDate = new Date(startDate);

    // Generate weeks until we reach or pass today
    while (currentDate <= endDate) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        if (currentDate > endDate) {
          // Don't add future dates
          days.push(null);
        } else {
          const dateStr = currentDate.toISOString().split("T")[0];
          const dayData = data[dateStr] || { count: 0, totalCards: 0 };
          const isToday = currentDate.toDateString() === today.toDateString();

          days.push({
            date: new Date(currentDate),
            dateStr,
            count: dayData.count,
            totalCards: dayData.totalCards,
            isToday,
            isFuture: false,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Only add week if it has at least one valid day
      if (days.some(d => d !== null)) {
        weeks.push(days);
      }
    }

    return weeks;
  };

  const monthLabels = () => {
    let labels: { month: string; weekIndex: number }[] = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const weeks = generateGrid();
    let currentMonth = -1;

    weeks.forEach((week, weekIndex) => {
      // Find the first valid day in this week
      const firstValidDay = week.find(d => d !== null);

      if (firstValidDay) {
        const month = firstValidDay.date.getMonth();

        // Always show the first month at position 0
        if (weekIndex === 0) {
          labels.push({
            month: months[month],
            weekIndex: 0,
          });
          currentMonth = month;
        }
        // Show month label when month changes
        else if (month !== currentMonth) {
          labels.push({
            month: months[month],
            weekIndex,
          });
          currentMonth = month;
        }
      }
    });

    // Always ensure the current month is shown on the far right
    const lastWeek = weeks[weeks.length - 1];
    const lastValidDay = lastWeek?.findLast(d => d !== null);
    if (lastValidDay) {
      const lastMonth = lastValidDay.date.getMonth();
      // Check if we already have this month in labels for the last position
      const hasLastMonth = labels.some(l =>
        l.month === months[lastMonth] &&
        l.weekIndex >= weeks.length - 4
      );

      if (!hasLastMonth) {
        // Remove any label too close to the end and add the current month
        labels = labels.filter(l => l.weekIndex < weeks.length - 3);
        labels.push({
          month: months[lastMonth],
          weekIndex: weeks.length - 1,
        });
      }
    }

    return labels;
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-primary mb-4">
          Study Activity
        </h2>
        <div className="animate-pulse">
          <div className="h-32 rounded bg-muted/60"></div>
        </div>
      </div>
    );
  }

  const weeks = generateGrid();
  const months = monthLabels();

  // Calculate total activity
  const totalSessions = Object.values(data).reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const totalCards = Object.values(data).reduce(
    (sum, day) => sum + day.totalCards,
    0,
  );

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-primary mb-4">
        Study Activity
      </h2>

      <div className="overflow-x-auto">
        <div className="inline-block relative">
          {/* Month labels */}
          <div className="relative mb-1 h-5" style={{ marginLeft: '35px' }}>
            {months.map((label, i) => (
              <div
                key={i}
                className="absolute text-xs text-muted-foreground/80"
                style={{
                  left: `${label.weekIndex * 14}px`,
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="relative flex gap-[3px]">
            {/* Day labels */}
            <div
              className="mr-1 flex flex-col gap-[3px] text-[11px] text-muted-foreground/80"
            >
              <div className="h-[11px]"></div>
              <div className="h-[11px] flex items-center pr-1">Mon</div>
              <div className="h-[11px]"></div>
              <div className="h-[11px] flex items-center pr-1">Wed</div>
              <div className="h-[11px]"></div>
              <div className="h-[11px] flex items-center pr-1">Fri</div>
              <div className="h-[11px]"></div>
            </div>

            {/* Heatmap grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    // Empty cell for future dates
                    return <div key={dayIndex} className="w-[11px] h-[11px]" />;
                  }

                  const tooltipContent = (
                    <>
                      <div className="font-semibold">
                        {day.date.toLocaleDateString()}
                      </div>
                      <div className="mt-1">
                        {day.count} session{day.count !== 1 ? "s" : ""}
                      </div>
                      <div>{day.totalCards} cards reviewed</div>
                    </>
                  );

                  return (
                    <Tooltip key={dayIndex} content={tooltipContent}>
                      <div
                        className={clsx(
                          "h-[11px] w-[11px] cursor-pointer rounded-[2px] border border-border/40 transition-colors duration-300",
                          day.isToday
                            ? `${getIntensity(day.count)} ring-1 ring-primary`
                            : getIntensity(day.count),
                          "hover:ring-1 hover:ring-primary/40",
                        )}
                      />
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend and totals */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <strong>{totalSessions.toLocaleString()}</strong> sessions in the
              last year
              <span className="ml-2 text-muted-foreground/60">·</span>
              <span className="ml-2">
                {totalCards.toLocaleString()} cards reviewed
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <span>Less</span>
              <div className="flex gap-[2px]">
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={clsx(
                      "h-[11px] w-[11px] rounded-[2px] border border-border/40",
                      getIntensity(level),
                    )}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
