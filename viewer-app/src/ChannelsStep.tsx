import { useMemo } from "react"
import { Hash, Trash2, Activity, CheckCircle2, AlertCircle, Clock, Plus, ExternalLink, Timer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "./StatCard"
import { CoverageHeatmap } from "./CoverageHeatmap"
import type { Id } from "@convex/_generated/dataModel"

type ChannelHealthItem = {
  channel: string
  health: {
    status: string
    last_check: string
    error?: string
    latest_messages?: { id: number; date: string; text: string }[]
    message_count?: number
  } | null
}

type ScrapeLog = {
  channel: string
  last_scrape_date: string
  last_message_date: string
  messages_scraped: number
  run_count?: number
}

type PerChannelCount = {
  channel: string
  text: number
  pdfs: number
  images: number
}

type DayData = {
  date: string
  messages_found: number
  scraped_at: string
}

type CoverageDataMap = Record<string, DayData[]> | undefined

const SCRAPE_TARGET_START = "2025-01-01"

function formatDate(d: string | undefined) {
  if (!d) return ""
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getDaysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00")
  const e = new Date(end + "T00:00:00")
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ChannelsStep({
  examId,
  channels,
  perChannelCounts,
  channelHealth,
  scrapeLogs,
  coverageData,
  onAddChannel,
  onRemoveChannel,
}: {
  examId: Id<"exams">
  channels: string[]
  perChannelCounts: PerChannelCount[] | undefined
  channelHealth: ChannelHealthItem[] | undefined
  scrapeLogs: ScrapeLog[] | undefined
  coverageData: CoverageDataMap
  onAddChannel: () => void
  onRemoveChannel: (ch: string) => void
}) {
  const activeCount = channelHealth
    ? channelHealth.filter((h) => h.health?.status === "ok").length
    : 0
  const totalContent = perChannelCounts
    ? perChannelCounts.reduce((sum, c) => sum + c.text + c.pdfs + c.images, 0)
    : 0

  const totalDays = getDaysBetween(SCRAPE_TARGET_START, getToday())

  // Compute per-channel coverage stats
  const channelCoverageStats = useMemo(() => {
    const stats: Record<string, { daysScraped: number; daysRemaining: number }> = {}
    for (const ch of channels) {
      const days = coverageData?.[ch] ?? []
      const uniqueDays = new Set(days.map((d) => d.date))
      const daysScraped = uniqueDays.size
      stats[ch] = {
        daysScraped,
        daysRemaining: Math.max(0, totalDays - daysScraped),
      }
    }
    return stats
  }, [channels, coverageData, totalDays])

  // Aggregate coverage for stats cards
  const aggregateCoverage = useMemo(() => {
    if (!coverageData) return { scraped: 0, pct: 0 }
    const allScrapedDays = new Set<string>()
    for (const ch of channels) {
      const days = coverageData[ch] ?? []
      for (const d of days) allScrapedDays.add(d.date)
    }
    const scraped = allScrapedDays.size
    return {
      scraped,
      pct: totalDays > 0 ? Math.round((scraped / totalDays) * 100) : 0,
    }
  }, [coverageData, channels, totalDays])

  // Total runs
  const totalRuns = useMemo(() => {
    if (!scrapeLogs) return 0
    return scrapeLogs.reduce((sum, l) => sum + (l.run_count ?? 0), 0)
  }, [scrapeLogs])

  // Last scraping date
  const lastScraping = useMemo(() => {
    if (!scrapeLogs || scrapeLogs.length === 0) return null
    let latest = scrapeLogs[0].last_scrape_date
    for (const log of scrapeLogs) {
      if (log.last_scrape_date > latest) latest = log.last_scrape_date
    }
    return latest
  }, [scrapeLogs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-blue-600">
          1
        </span>
        <h1 className="text-2xl font-bold">Channels</h1>
        <span className="text-sm text-muted-foreground">
          {channels.length} {channels.length === 1 ? "channel" : "channels"}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-6">
        <StatCard
          label="Active Channels"
          value={`${activeCount}/${channels.length}`}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="Total Content"
          value={totalContent.toLocaleString()}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="Avg Coverage"
          value={aggregateCoverage.pct > 0 ? `${aggregateCoverage.pct}%` : "--"}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="Last Scraping"
          value={lastScraping ? formatDate(lastScraping) : "Never"}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="Total Runs"
          value={totalRuns}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="Schedule"
          value="Every 6h"
          variant="default"
          showPercentage={false}
        />
      </div>

      {/* Channel Cards */}
      {channels.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground mb-4">No channels configured yet.</p>
          <Button onClick={onAddChannel}>
            <Plus className="size-4" />
            Add Channel
          </Button>
        </div>
      ) : (
        <>
          {/* Channel Table */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">All Channels</h2>
              <Button variant="outline" size="sm" onClick={onAddChannel}>
                <Plus className="size-4" />
                Add Channel
              </Button>
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Channel</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Connection</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Text</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Images</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Files</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Days Scraped</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Days Left</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Runs</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Schedule</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Last Scraped</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => {
                    const counts = perChannelCounts?.find((c) => c.channel === ch)
                    const log = scrapeLogs?.find((l) => l.channel === ch)
                    const health = channelHealth?.find((h) => h.channel === ch)
                    const hasData = health?.health || log
                    const isOk = health?.health?.status === "ok" || (log && !health?.health)
                    const total = (counts?.text ?? 0) + (counts?.pdfs ?? 0) + (counts?.images ?? 0)
                    const coverage = channelCoverageStats[ch]
                    const runCount = log?.run_count ?? 0

                    return (
                      <tr key={ch} className="border-b hover:bg-muted/50 transition-colors">
                        {/* Channel name + URL */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">@{ch}</span>
                            <a
                              href={`https://t.me/s/${ch}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <ExternalLink className="size-3" />
                              t.me/s/{ch}
                            </a>
                          </div>
                        </td>

                        {/* Connection Health */}
                        <td className="px-4 py-3">
                          {hasData ? (
                            isOk ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                <CheckCircle2 className="size-3" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                <AlertCircle className="size-3" />
                                Error
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              <Clock className="size-3" />
                              Not tested
                            </span>
                          )}
                        </td>

                        {/* Content counts */}
                        <td className="px-4 py-3 text-center text-sm">{counts?.text ?? 0}</td>
                        <td className="px-4 py-3 text-center text-sm">{counts?.images ?? 0}</td>
                        <td className="px-4 py-3 text-center text-sm">{counts?.pdfs ?? 0}</td>
                        <td className="px-4 py-3 text-center font-medium text-sm">{total}</td>

                        {/* Scrape Coverage */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-medium">{coverage?.daysScraped ?? 0}</span>
                            <span className="text-[10px] text-muted-foreground">/{totalDays}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-medium ${(coverage?.daysRemaining ?? totalDays) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {coverage?.daysRemaining ?? totalDays}
                          </span>
                        </td>

                        {/* Runs */}
                        <td className="px-4 py-3 text-center text-sm font-mono">{runCount}</td>

                        {/* Schedule */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Timer className="size-3" />
                            6h
                          </span>
                        </td>

                        {/* Last Scraped */}
                        <td className="px-4 py-3">
                          <div className="text-sm">{log ? formatDate(log.last_scrape_date) : "Never"}</div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onRemoveChannel(ch)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Target date note */}
            <p className="mt-2 text-xs text-muted-foreground">
              Scrape target: from <span className="font-medium">Jan 1, 2025</span> to today ({totalDays} days total)
            </p>
          </div>

          {/* Connection Health */}
          <div>
            <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
              <Activity className="size-5" />
              Connection Health
            </h2>
            {!channelHealth ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {channelHealth.map(({ channel, health }) => {
                  const log = scrapeLogs?.find((l) => l.channel === channel)
                  const hasData = health || log
                  const isOk = health?.status === "ok" || (log && !health)
                  return (
                    <div key={channel} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-sm py-1 px-3">
                            <Hash className="size-3" />
                            {channel}
                          </Badge>
                          {hasData ? (
                            <Badge
                              variant={isOk ? "default" : "destructive"}
                              className={`text-xs ${isOk ? "bg-emerald-600" : ""}`}
                            >
                              {isOk ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                              {isOk ? "Connected" : "Error"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="size-3.5" />
                              Not tested
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {log && <span>Last scraped: {formatDate(log.last_scrape_date)}</span>}
                        </div>
                      </div>
                      {health?.error && (
                        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                          {health.error}
                        </div>
                      )}
                      {health?.latest_messages && health.latest_messages.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Latest {health.latest_messages.length} messages
                          </p>
                          <div className="space-y-1">
                            {health.latest_messages.slice(0, 3).map((msg) => (
                              <div key={msg.id} className="flex items-start gap-3 rounded bg-muted/50 px-3 py-2">
                                <span className="shrink-0 text-xs text-muted-foreground font-mono w-28">{msg.date}</span>
                                <p className="line-clamp-1 text-sm">{msg.text || "(no text)"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Coverage Heatmap */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Scraping Activity</h2>
            <CoverageHeatmap examId={examId} channels={channels} />
          </div>
        </>
      )}
    </div>
  )
}
