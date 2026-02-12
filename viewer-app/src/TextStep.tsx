import React, { useState, useMemo } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatCard } from "./StatCard"
import { ContentGrid, type ContentRow } from "./ContentGrid"

type AiStatus = "todo" | "in_progress" | "done"

export function TextStep({
  rows,
  selectedRows,
  setSelectedRows,
  processingIds,
  onProcess,
  onAiStatusChange,
  onCommentSave,
  dateFilter,
  setDateFilter,
  channelFilter,
  setChannelFilter,
  channels,
}: {
  rows: ContentRow[]
  selectedRows: Set<string>
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>
  processingIds: Set<string>
  onProcess: (row: ContentRow) => void
  onAiStatusChange: (args: { table: string; id: string; ai_status: string }) => void
  onCommentSave: (args: { id: string; comment: string }) => void
  dateFilter: string
  setDateFilter: (v: string) => void
  channelFilter: string
  setChannelFilter: (v: string) => void
  channels: string[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [aiStatusFilter, setAiStatusFilter] = useState("all")
  const [aiFieldFilter, setAiFieldFilter] = useState("all")

  const textRows = useMemo(() => {
    let filtered = rows.filter((r) => r.type === "Text")

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.content.toLowerCase().includes(q) ||
          r.channel.toLowerCase().includes(q) ||
          (r.q_text && r.q_text.toLowerCase().includes(q)) ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          (r.topic && r.topic.toLowerCase().includes(q))
      )
    }
    if (aiStatusFilter !== "all") {
      filtered = filtered.filter((r) => {
        if (aiStatusFilter === "no_status") return !r.aiStatus
        return r.aiStatus === aiStatusFilter
      })
    }
    if (aiFieldFilter !== "all") {
      filtered = filtered.filter((r) => {
        switch (aiFieldFilter) {
          case "has_question": return !!r.q_text
          case "missing_question": return r.aiStatus === "done" && !r.q_text
          case "has_all": return !!r.q_text && !!r.choices?.length && r.correct_choice_index != null && !!r.explanation
          case "incomplete": return r.aiStatus === "done" && (!r.q_text || !r.choices?.length || r.correct_choice_index == null || !r.explanation)
          default: return true
        }
      })
    }
    return filtered
  }, [rows, searchQuery, aiStatusFilter, aiFieldFilter])

  const stats = useMemo(() => {
    const allText = rows.filter((r) => r.type === "Text")
    const total = allText.length
    const done = allText.filter((r) => r.aiStatus === "done").length
    const todo = allText.filter((r) => !r.aiStatus || r.aiStatus === "todo").length
    const inProgress = allText.filter((r) => r.aiStatus === "in_progress").length
    return { total, done, todo, inProgress }
  }, [rows])

  const dateFilters = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "all", label: "All" },
  ]

  const AI_STATUS_OPTIONS: { value: AiStatus; label: string }[] = [
    { value: "todo", label: "Todo" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "Done" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-emerald-600">
          3
        </span>
        <h1 className="text-2xl font-bold">Text Content</h1>
        <span className="text-sm text-muted-foreground">
          {textRows.length} of {stats.total} items
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Messages"
          value={stats.total}
          variant="default"
          isActive={aiStatusFilter === "all"}
          onClick={() => setAiStatusFilter("all")}
          showPercentage={false}
        />
        <StatCard
          label="AI Done"
          value={stats.done}
          variant="success"
          isActive={aiStatusFilter === "done"}
          onClick={() => setAiStatusFilter("done")}
          percentage={stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}
        />
        <StatCard
          label="Pending"
          value={stats.todo}
          variant="warning"
          isActive={aiStatusFilter === "todo"}
          onClick={() => setAiStatusFilter("todo")}
          showPercentage={false}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          variant="info"
          isActive={aiStatusFilter === "in_progress"}
          onClick={() => setAiStatusFilter("in_progress")}
          showPercentage={false}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-5 py-4">
        <div className="flex items-center gap-1.5">
          {dateFilters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={dateFilter === f.key ? "default" : "outline"}
              onClick={() => setDateFilter(f.key)}
              className="text-sm"
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Channels</option>
            {channels.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Fields:</span>
          <select
            value={aiFieldFilter}
            onChange={(e) => setAiFieldFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            <option value="has_question">Has Question</option>
            <option value="has_all">Complete</option>
            <option value="incomplete">Incomplete</option>
            <option value="missing_question">Missing Question</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search text content..."
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

      {/* Content Table */}
      <ContentGrid
        rows={textRows}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        processingIds={processingIds}
        onProcess={onProcess}
        onAiStatusChange={onAiStatusChange}
        onCommentSave={onCommentSave}
        aiStatusOptions={AI_STATUS_OPTIONS}
      />
    </div>
  )
}
