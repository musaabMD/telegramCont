import { useState, useMemo } from "react"
import { Search, X, CheckCircle2 } from "lucide-react"
import { StatCard } from "./StatCard"
import { Badge } from "@/components/ui/badge"

type HYRow = {
  id: string
  docId: string
  q_text?: string
  hy_summary?: string
  subject?: string
  topic?: string
  channel: string
  date: string
}

function formatDate(d: string | undefined) {
  if (!d) return ""
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function HYStep({ rows }: { rows: HYRow[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(
      (r) =>
        (r.hy_summary && r.hy_summary.toLowerCase().includes(q)) ||
        (r.q_text && r.q_text.toLowerCase().includes(q)) ||
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.topic && r.topic.toLowerCase().includes(q))
    )
  }, [rows, searchQuery])

  const stats = useMemo(() => {
    const total = rows.length
    const withSummary = rows.filter((r) => r.hy_summary).length
    const uniqueSubjects = new Set(rows.map((r) => r.subject).filter(Boolean)).size
    return { total, withSummary, uniqueSubjects }
  }, [rows])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-purple-600">
          7
        </span>
        <h1 className="text-2xl font-bold">HY (High Yield)</h1>
        <span className="text-sm text-muted-foreground">
          {filteredRows.length} of {stats.total} items
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total HY Items"
          value={stats.total}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="With Summary"
          value={stats.withSummary}
          icon={CheckCircle2}
          variant="success"
          percentage={stats.total > 0 ? Math.round((stats.withSummary / stats.total) * 100) : 0}
        />
        <StatCard
          label="Unique Subjects"
          value={stats.uniqueSubjects}
          variant="info"
          showPercentage={false}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search HY summaries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-12 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* HY Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-[30%]">Question</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-[35%]">HY Summary</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Topic</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No HY summaries found. Process text content with AI to generate summaries.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="line-clamp-2 text-sm">{row.q_text || "(no question)"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="line-clamp-3 text-sm">{row.hy_summary || "(no summary)"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.subject ? (
                      <Badge variant="outline" className="text-xs">{row.subject}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{row.topic || "--"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{formatDate(row.date)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
