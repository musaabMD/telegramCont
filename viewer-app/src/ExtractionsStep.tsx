import { useMemo } from "react"
import {
  Download,
  Loader2,
  Hash,
  CheckCircle2,
  FileText,
  X,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "./StatCard"

type ExamDoc = {
  _id: string
  name: string
  channels: string[]
  status: string
  inclusion_criteria: string[]
  exclusion_criteria: string[]
  ai_prompt?: string
}

type ScrapeResult = {
  channel: string
  ok: boolean
  total: number
  saved: number
  skipped: number
  error?: string
}

export function ExtractionsStep({
  exam,
  scrapeLogs,
  scraping,
  scrapeResults,
  onScrapeAll,
  onScrapeChannel,
  scrapeDateFrom,
  scrapeDateTo,
  setScrapeDateFrom,
  setScrapeDateTo,
}: {
  exam: ExamDoc
  scrapeLogs: { channel: string; last_scrape_date: string; messages_scraped: number }[] | undefined
  scraping: boolean
  scrapeResults: ScrapeResult[]
  onScrapeAll: () => void
  onScrapeChannel: (ch: string) => void
  scrapeDateFrom: string
  scrapeDateTo: string
  setScrapeDateFrom: (v: string) => void
  setScrapeDateTo: (v: string) => void
}) {
  const stats = useMemo(() => {
    const totalRuns = scrapeResults.length
    const successfulRuns = scrapeResults.filter((r) => r.ok).length
    const totalSaved = scrapeResults.reduce((sum, r) => sum + r.saved, 0)
    const totalSkipped = scrapeResults.reduce((sum, r) => sum + r.skipped, 0)
    return { totalRuns, successfulRuns, totalSaved, totalSkipped }
  }, [scrapeResults])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-amber-500">
          2
        </span>
        <h1 className="text-2xl font-bold">Extractions</h1>
        <span className="text-sm text-muted-foreground">
          {scrapeLogs?.length ?? 0} channels tracked
        </span>
      </div>

      {/* Rules Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-5" />
            Scraping Rules
          </CardTitle>
          <CardDescription>
            Messages will be filtered using your inclusion/exclusion criteria before saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-2">Include keywords</p>
              <div className="flex flex-wrap gap-2">
                {exam.inclusion_criteria.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None (accept all)</span>
                ) : (
                  exam.inclusion_criteria.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">
                      {c}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-red-500 mb-2">Exclude keywords</p>
              <div className="flex flex-wrap gap-2">
                {exam.exclusion_criteria.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None</span>
                ) : (
                  exam.exclusion_criteria.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs border-red-500/30 text-red-500">
                      {c}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scrape Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5" />
            Scrape Channels
          </CardTitle>
          <CardDescription>
            Fetch latest messages from public Telegram channel pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date range */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">From:</label>
              <input
                type="date"
                value={scrapeDateFrom}
                onChange={(e) => setScrapeDateFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">To:</label>
              <input
                type="date"
                value={scrapeDateTo}
                onChange={(e) => setScrapeDateTo(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(scrapeDateFrom || scrapeDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setScrapeDateFrom(""); setScrapeDateTo("") }}
              >
                <X className="size-3.5" />
                Clear dates
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={scraping || exam.channels.length === 0}
              onClick={onScrapeAll}
            >
              {scraping ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {scraping ? "Scraping..." : "Scrape All Channels"}
            </Button>
            {exam.channels.length === 0 && (
              <span className="text-sm text-muted-foreground">Add channels first</span>
            )}
          </div>

          {/* Individual channel buttons */}
          {exam.channels.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Or scrape individually:</p>
              <div className="flex flex-wrap gap-2">
                {exam.channels.map((ch) => (
                  <Button
                    key={ch}
                    variant="outline"
                    size="sm"
                    disabled={scraping}
                    onClick={() => onScrapeChannel(ch)}
                  >
                    <Hash className="size-3" />
                    {ch}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {scrapeResults.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Runs"
            value={stats.totalRuns}
            variant="default"
            showPercentage={false}
          />
          <StatCard
            label="Successful"
            value={`${stats.successfulRuns}/${stats.totalRuns}`}
            icon={CheckCircle2}
            variant="success"
            showPercentage={false}
          />
          <StatCard
            label="Total Saved"
            value={stats.totalSaved}
            icon={FileText}
            variant="info"
            showPercentage={false}
          />
          <StatCard
            label="Skipped"
            value={stats.totalSkipped}
            variant="warning"
            showPercentage={false}
          />
        </div>
      )}

      {/* Results Table */}
      {scrapeResults.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Extraction Run Logs
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({scrapeResults.length} runs)
            </span>
          </h2>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Found</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Saved</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {scrapeResults.map((r) => (
                  <tr key={r.channel} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-sm">
                        <Hash className="size-3" />
                        {r.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.ok ? (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Completed
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {r.error ?? "Failed"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">{r.total}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-emerald-600">{r.saved}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm text-muted-foreground">{r.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical Scrape Log */}
      {scrapeLogs && scrapeLogs.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors">
            Historical Scrape Log
          </summary>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Last Scrape</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Messages Scraped</th>
                </tr>
              </thead>
              <tbody>
                {scrapeLogs.map((log) => (
                  <tr key={log.channel} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-sm">
                        <Hash className="size-3" />
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(log.last_scrape_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-sm">{log.messages_scraped}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
