import { useState, useMemo } from "react"
import { Search, X, CheckCircle2, DollarSign } from "lucide-react"
import { StatCard } from "./StatCard"
import { Badge } from "@/components/ui/badge"

type MCQRow = {
  id: string
  docId: string
  q_text?: string
  choices?: string[]
  correct_choice_index?: number
  explanation?: string
  hy_summary?: string
  subject?: string
  topic?: string
  channel: string
  date: string
  ai_cost?: number
}

function formatDate(d: string | undefined) {
  if (!d) return ""
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function MCQsStep({ rows }: { rows: MCQRow[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const filteredRows = useMemo(() => {
    let filtered = rows

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          (r.q_text && r.q_text.toLowerCase().includes(q)) ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          (r.topic && r.topic.toLowerCase().includes(q)) ||
          (r.explanation && r.explanation.toLowerCase().includes(q))
      )
    }

    if (filterStatus === "complete") {
      filtered = filtered.filter(
        (r) => r.q_text && r.choices?.length && r.correct_choice_index != null && r.explanation
      )
    } else if (filterStatus === "incomplete") {
      filtered = filtered.filter(
        (r) => !r.q_text || !r.choices?.length || r.correct_choice_index == null || !r.explanation
      )
    }

    return filtered
  }, [rows, searchQuery, filterStatus])

  const stats = useMemo(() => {
    const total = rows.length
    const complete = rows.filter(
      (r) => r.q_text && r.choices?.length && r.correct_choice_index != null && r.explanation
    ).length
    const incomplete = total - complete
    const totalCost = rows.reduce((sum, r) => sum + (r.ai_cost ?? 0), 0)
    return { total, complete, incomplete, totalCost }
  }, [rows])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-purple-600">
          6
        </span>
        <h1 className="text-2xl font-bold">MCQs</h1>
        <span className="text-sm text-muted-foreground">
          {filteredRows.length} of {stats.total} items
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total MCQs"
          value={stats.total}
          variant="default"
          isActive={filterStatus === "all"}
          onClick={() => setFilterStatus("all")}
          showPercentage={false}
        />
        <StatCard
          label="Complete"
          value={stats.complete}
          icon={CheckCircle2}
          variant="success"
          isActive={filterStatus === "complete"}
          onClick={() => setFilterStatus("complete")}
          percentage={stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}
        />
        <StatCard
          label="Incomplete"
          value={stats.incomplete}
          variant="warning"
          isActive={filterStatus === "incomplete"}
          onClick={() => setFilterStatus("incomplete")}
          showPercentage={false}
        />
        <StatCard
          label="AI Cost"
          value={`$${stats.totalCost.toFixed(4)}`}
          icon={DollarSign}
          variant="info"
          showPercentage={false}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search questions, subjects, topics..."
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

      {/* MCQs Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-[35%]">Question</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Choices</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Answer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No MCQs found. Process text content with AI to generate questions.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="line-clamp-3 text-sm">{row.q_text || "(no question)"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.choices && row.choices.length > 0 ? (
                      <div className="space-y-1">
                        {row.choices.map((choice, i) => (
                          <div
                            key={i}
                            className={`text-xs px-2 py-1 rounded ${
                              i === row.correct_choice_index
                                ? "bg-emerald-100 text-emerald-700 font-medium"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {choice}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.correct_choice_index != null ? (
                      <Badge className="bg-emerald-600 text-xs">
                        {String.fromCharCode(65 + row.correct_choice_index)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.subject ? (
                      <Badge variant="outline" className="text-xs">{row.subject}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{row.channel}</span>
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
