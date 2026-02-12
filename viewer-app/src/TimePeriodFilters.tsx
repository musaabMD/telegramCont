import { TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"

type TimePeriod = "daily" | "monthly" | "yearly" | "all"

type PeriodStats = {
  count: number
  trend: "up" | "down" | "same"
}

export function TimePeriodFilters({
  timeFilter,
  onTimeFilterChange,
  stats,
}: {
  timeFilter: TimePeriod
  onTimeFilterChange: (period: TimePeriod) => void
  stats: Record<TimePeriod, PeriodStats>
}) {
  const periods: { key: TimePeriod; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
    { key: "all", label: "All Time" },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {periods.map((period) => {
        const periodStats = stats[period.key]
        return (
          <Button
            key={period.key}
            variant={timeFilter === period.key ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeFilterChange(period.key)}
            className="gap-2"
          >
            <span>{period.label}</span>
            <span className="text-xs">({periodStats.count})</span>
            {periodStats.trend === "up" && (
              <TrendingUp className="h-3 w-3 text-green-600" />
            )}
            {periodStats.trend === "down" && (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </Button>
        )
      })}
    </div>
  )
}
