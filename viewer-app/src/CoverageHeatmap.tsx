import { useState, useMemo, useRef, useEffect } from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  Play,
  Loader2,
  Hash,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Download,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────

interface DayData {
  date: string
  messages_found: number
  scraped_at: string
}

interface CoverageHeatmapProps {
  examId: Id<"exams">
  channels: string[]
}

// ─── Helpers ─────────────────────────────────────────────

const START_DATE = "2025-01-01"

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")
  const current = new Date(start)
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function getColor(count: number, maxCount: number, scraped: boolean): string {
  if (!scraped) return "#161b22"
  if (count === 0) return "#0e4429"
  const intensity = Math.min(count / Math.max(maxCount, 1), 1)
  if (intensity < 0.25) return "#0e4429"
  if (intensity < 0.5) return "#006d32"
  if (intensity < 0.75) return "#26a641"
  return "#39d353"
}

function getDayOfWeek(dateStr: string): number {
  // 0 = Mon, 6 = Sun
  const d = new Date(dateStr + "T00:00:00")
  return (d.getDay() + 6) % 7
}

function getMonthLabel(dateStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return months[parseInt(dateStr.slice(5, 7), 10) - 1]
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

// ─── Heatmap Grid ────────────────────────────────────────

function HeatmapGrid({
  coverageMap,
  allDates,
  maxCount,
}: {
  coverageMap: Map<string, DayData>
  allDates: string[]
  maxCount: number
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; data: DayData | null } | null>(null)

  // Group dates into weeks (columns)
  const weeks: string[][] = useMemo(() => {
    if (allDates.length === 0) return []
    const result: string[][] = []
    let currentWeek: string[] = []

    // Pad first week with empty cells
    const firstDow = getDayOfWeek(allDates[0])
    for (let i = 0; i < firstDow; i++) {
      currentWeek.push("")
    }

    for (const date of allDates) {
      currentWeek.push(date)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      result.push(currentWeek)
    }
    return result
  }, [allDates])

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ label: string; col: number }> = []
    let lastMonth = ""
    for (let w = 0; w < weeks.length; w++) {
      const firstDate = weeks[w].find((d) => d !== "")
      if (!firstDate) continue
      const month = firstDate.slice(0, 7)
      if (month !== lastMonth) {
        labels.push({ label: getMonthLabel(firstDate), col: w })
        lastMonth = month
      }
    }
    return labels
  }, [weeks])

  const CELL = 13
  const GAP = 2
  const LABEL_W = 28
  const HEADER_H = 20

  return (
    <div className="relative overflow-x-auto">
      <div
        style={{
          position: "relative",
          width: LABEL_W + weeks.length * (CELL + GAP) + 4,
          height: HEADER_H + 7 * (CELL + GAP) + 4,
        }}
      >
        {/* Month labels */}
        {monthLabels.map((m) => (
          <span
            key={m.label + m.col}
            className="text-[10px] text-muted-foreground absolute"
            style={{ left: LABEL_W + m.col * (CELL + GAP), top: 0 }}
          >
            {m.label}
          </span>
        ))}

        {/* Day labels */}
        {["Mon", "", "Wed", "", "Fri", "", ""].map((label, i) => (
          <span
            key={i}
            className="text-[10px] text-muted-foreground absolute"
            style={{ left: 0, top: HEADER_H + i * (CELL + GAP) + 2 }}
          >
            {label}
          </span>
        ))}

        {/* Grid cells */}
        {weeks.map((week, wIdx) =>
          week.map((date, dIdx) => {
            if (!date) return null
            const data = coverageMap.get(date) ?? null
            const scraped = data !== null
            const count = data?.messages_found ?? 0
            const color = getColor(count, maxCount, scraped)

            return (
              <div
                key={date}
                className="absolute rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/40"
                style={{
                  left: LABEL_W + wIdx * (CELL + GAP),
                  top: HEADER_H + dIdx * (CELL + GAP),
                  width: CELL,
                  height: CELL,
                  backgroundColor: color,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltip({ x: rect.left, y: rect.top - 60, date, data })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold">{formatDateShort(tooltip.date)}</p>
          {tooltip.data ? (
            <p className="text-muted-foreground">
              {tooltip.data.messages_found} message{tooltip.data.messages_found !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-muted-foreground">Not scraped</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
        <span>Less</span>
        {["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"].map((c) => (
          <div
            key={c}
            className="rounded-sm"
            style={{ width: CELL, height: CELL, backgroundColor: c }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ─── Progress Log ────────────────────────────────────────

function ScrapeProgressLog({ examId }: { examId: Id<"exams"> }) {
  const progress = useQuery(api.mutations.getScrapeProgress, { examId })
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [progress?.log_entries.length])

  if (!progress) return null

  const levelIcon: Record<string, typeof Info> = {
    info: Info,
    warn: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle2,
  }
  const levelColor: Record<string, string> = {
    info: "text-muted-foreground",
    warn: "text-amber-400",
    error: "text-red-400",
    success: "text-emerald-400",
  }

  const elapsed = progress.finished_at
    ? Math.round((new Date(progress.finished_at).getTime() - new Date(progress.started_at).getTime()) / 1000)
    : Math.round((Date.now() - new Date(progress.started_at).getTime()) / 1000)
  const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={progress.status === "running" ? "default" : progress.status === "completed" ? "secondary" : "destructive"}>
          {progress.status === "running" && <Loader2 className="size-3 animate-spin mr-1" />}
          {progress.status === "completed" && <CheckCircle2 className="size-3 mr-1" />}
          {progress.status === "failed" && <AlertCircle className="size-3 mr-1" />}
          {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
        </Badge>

        <span className="text-xs text-muted-foreground">
          {progress.channels_completed}/{progress.total_channels} channels
        </span>

        {/* Progress bar */}
        <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all rounded-full"
            style={{
              width: `${progress.total_channels > 0 ? (progress.channels_completed / progress.total_channels) * 100 : 0}%`,
            }}
          />
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          {progress.total_messages_found} msgs | {progress.total_days_found} days | {elapsedStr}
        </span>
      </div>

      {/* Log entries */}
      {progress.log_entries.length > 0 && (
        <div
          ref={logRef}
          className="max-h-[240px] overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-1 font-mono text-xs"
        >
          {progress.log_entries.map((entry: { timestamp: string; channel: string; message: string; level: string }, i: number) => {
            const Icon = levelIcon[entry.level] ?? Info
            const color = levelColor[entry.level] ?? "text-muted-foreground"
            return (
              <div key={i} className={`flex items-start gap-2 ${color}`}>
                <Icon className="size-3 mt-0.5 shrink-0" />
                <span className="text-muted-foreground/60 shrink-0">
                  {entry.timestamp.slice(11, 19)}
                </span>
                {entry.channel !== "all" && entry.channel !== "system" && (
                  <Badge variant="outline" className="px-1 py-0 text-[10px] shrink-0">
                    {entry.channel}
                  </Badge>
                )}
                <span>{entry.message}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────

export function CoverageHeatmap({ examId, channels }: CoverageHeatmapProps) {
  const coverageData = useQuery(api.mutations.getCoverageData, { channels })
  const scrapeProgress = useQuery(api.mutations.getScrapeProgress, { examId })
  const scrapeMissing = useAction(api.ai.scrapeMissing)
  const [scraping, setScraping] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<string>("all")

  const allDates = useMemo(() => generateDateRange(START_DATE, getToday()), [])

  // Aggregate coverage data
  const { coverageMap, maxCount, stats } = useMemo(() => {
    if (!coverageData) return { coverageMap: new Map<string, DayData>(), maxCount: 1, stats: { scraped: 0, total: 0, pct: 0, monthStats: [] as Array<{ month: string; pct: number }> } }

    const map = new Map<string, DayData>()

    if (selectedChannel === "all") {
      // Aggregate all channels
      for (const ch of channels) {
        const days = coverageData[ch] ?? []
        for (const d of days) {
          const existing = map.get(d.date)
          if (existing) {
            map.set(d.date, {
              ...existing,
              messages_found: existing.messages_found + d.messages_found,
            })
          } else {
            map.set(d.date, { ...d })
          }
        }
      }
    } else {
      const days = coverageData[selectedChannel] ?? []
      for (const d of days) {
        map.set(d.date, { ...d })
      }
    }

    let max = 1
    for (const d of map.values()) {
      if (d.messages_found > max) max = d.messages_found
    }

    const scrapedCount = map.size
    const totalCount = allDates.length
    const pct = totalCount > 0 ? Math.round((scrapedCount / totalCount) * 100) : 0

    // Per-month stats
    const monthBuckets: Record<string, { scraped: number; total: number }> = {}
    for (const date of allDates) {
      const month = date.slice(0, 7)
      if (!monthBuckets[month]) monthBuckets[month] = { scraped: 0, total: 0 }
      monthBuckets[month].total++
      if (map.has(date)) monthBuckets[month].scraped++
    }
    const monthStats = Object.entries(monthBuckets).map(([month, b]) => ({
      month,
      pct: b.total > 0 ? Math.round((b.scraped / b.total) * 100) : 0,
    }))

    return {
      coverageMap: map,
      maxCount: max,
      stats: { scraped: scrapedCount, total: totalCount, pct, monthStats },
    }
  }, [coverageData, selectedChannel, channels, allDates])

  const isRunning = scrapeProgress?.status === "running"

  return (
    <div className="space-y-6">
      {/* Summary stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <CalendarDays className="size-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{stats.pct}%</p>
                <p className="text-sm text-muted-foreground">Days Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <CalendarDays className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">
                  {stats.scraped}<span className="text-sm font-normal text-muted-foreground">/{stats.total}</span>
                </p>
                <p className="text-sm text-muted-foreground">Days Scraped</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <AlertCircle className="size-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{stats.total - stats.scraped}</p>
                <p className="text-sm text-muted-foreground">Days Missing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2.5">
                <Hash className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{channels.length}</p>
                <p className="text-sm text-muted-foreground">Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Scrape Coverage
              </CardTitle>
              <CardDescription>
                Gray = not scraped, green = scraped (darker = more messages). Since Jan 2025.
              </CardDescription>
            </div>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">All Channels</option>
              {channels.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {!coverageData ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2" />
              Loading coverage data...
            </div>
          ) : (
            <>
              <HeatmapGrid
                coverageMap={coverageMap}
                allDates={allDates}
                maxCount={maxCount}
              />

              {/* Monthly breakdown */}
              <div className="flex flex-wrap gap-2 mt-4">
                {stats.monthStats.map((m) => {
                  const monthName = new Date(m.month + "-15").toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  return (
                    <Badge
                      key={m.month}
                      variant={m.pct === 100 ? "default" : m.pct > 0 ? "secondary" : "outline"}
                      className="font-mono text-xs"
                    >
                      {monthName}: {m.pct}%
                    </Badge>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Scrape Missing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="size-5" />
                Fill Missing Dates
              </CardTitle>
              <CardDescription>
                Auto-detect gaps and scrape backwards to Jan 2025. Rate-limited to avoid Telegram blocks.
              </CardDescription>
            </div>
            <Button
              disabled={scraping || isRunning}
              onClick={async () => {
                setScraping(true)
                try {
                  await scrapeMissing({ examId })
                } finally {
                  setScraping(false)
                }
              }}
            >
              {isRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {isRunning ? "Scraping..." : "Scrape Missing Dates"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrapeProgressLog examId={examId} />
        </CardContent>
      </Card>
    </div>
  )
}
