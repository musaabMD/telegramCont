import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"
import {
  ArrowLeft,
  FileText,
  Image,
  File,
  Hash,
  Plus,
  Search,
  X,
  Settings2,
  ExternalLink,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutGrid,
  BarChart3,
  History,
  Radio,
  Zap,
  Trash2,
  TrendingUp,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────
type DateFilter = "today" | "week" | "month" | "all"
type TypeFilter = "all" | "Text" | "File" | "Image"
type AiStatus = "todo" | "in_progress" | "done"

type ExamDoc = {
  _id: Id<"exams">
  name: string
  channels: string[]
  status: string
  inclusion_criteria: string[]
  exclusion_criteria: string[]
}

// ─── Helpers ─────────────────────────────────────────────
function cleanChannel(raw: string): string {
  let s = raw.trim()
  for (const prefix of [
    "https://t.me/s/",
    "http://t.me/s/",
    "https://t.me/",
    "http://t.me/",
  ]) {
    if (s.toLowerCase().startsWith(prefix)) {
      s = s.slice(prefix.length)
      break
    }
  }
  return s.replace(/^@/, "").replace(/\/+$/, "").trim()
}

function formatBytes(n: number | undefined) {
  if (n == null) return ""
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(2) + " MB"
}

function formatDate(d: string | undefined) {
  if (!d) return ""
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── Main App ────────────────────────────────────────────
export default function App() {
  const [selectedExamId, setSelectedExamId] = useState<Id<"exams"> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddExam, setShowAddExam] = useState(false)

  const exams = useQuery(api.exams.list) ?? []

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return exams
    const q = searchQuery.toLowerCase()
    return exams.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.channels.some((ch) => ch.toLowerCase().includes(q))
    )
  }, [exams, searchQuery])

  const selectedExam = exams.find((e) => e._id === selectedExamId) ?? null

  if (selectedExam) {
    return <ExamDetail exam={selectedExam} onBack={() => setSelectedExamId(null)} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DrNote Content HQ</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Manage your exam content sources and monitoring
            </p>
          </div>
          <Button onClick={() => setShowAddExam(true)}>
            <Plus className="size-5" />
            Add Exam
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exams or channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-12 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Add Exam Dialog */}
        <AddExamDialog open={showAddExam} onOpenChange={setShowAddExam} />

        {/* Exam Grid */}
        {!exams ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-lg text-muted-foreground">Loading exams...</div>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground">
              {searchQuery ? "No exams match your search" : "No exams yet"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowAddExam(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="size-5" />
                Create your first exam
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredExams.map((exam) => (
              <ExamCard
                key={exam._id}
                exam={exam as ExamDoc}
                onClick={() => setSelectedExamId(exam._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Exam Card ───────────────────────────────────────────
function ExamCard({ exam, onClick }: { exam: ExamDoc; onClick: () => void }) {
  const countsAll = useQuery(api.exams.getExamCounts, {
    channels: exam.channels,
    filter: "all",
  })
  const countsToday = useQuery(api.exams.getExamCounts, {
    channels: exam.channels,
    filter: "today",
  })

  const isActive = exam.status === "active"
  const todayTotal = (countsToday?.text ?? 0) + (countsToday?.pdfs ?? 0) + (countsToday?.images ?? 0)

  return (
    <button onClick={onClick} className="text-left w-full">
      <Card className="h-full transition-all hover:bg-accent/40 hover:shadow-lg cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{exam.name}</CardTitle>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={`text-xs px-2.5 py-0.5 ${isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription className="text-sm">
            {exam.channels.length} channel{exam.channels.length !== 1 ? "s" : ""} monitored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large stat numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center rounded-lg bg-muted/50 py-3">
              <p className="text-3xl font-bold font-mono tabular-nums">{countsAll?.text ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <FileText className="size-3.5" />
                Messages
              </p>
            </div>
            <div className="text-center rounded-lg bg-muted/50 py-3">
              <p className="text-3xl font-bold font-mono tabular-nums">{countsAll?.pdfs ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <File className="size-3.5" />
                PDFs
              </p>
            </div>
            <div className="text-center rounded-lg bg-muted/50 py-3">
              <p className="text-3xl font-bold font-mono tabular-nums">{countsAll?.images ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Image className="size-3.5" />
                Images
              </p>
            </div>
          </div>

          {/* Today summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
            <span>
              Today: <span className="font-semibold text-foreground">+{todayTotal}</span>
            </span>
            <span className="font-mono text-xs">
              {exam.channels.length} ch
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

// ─── Add Exam Dialog ─────────────────────────────────────
const EXAM_PRESETS = ["SMLE", "SDLE", "SPLE", "SNLE", "SLLE", "Family Medicine"] as const

function AddExamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selectedPreset, setSelectedPreset] = useState("")
  const [customName, setCustomName] = useState("")
  const [channelsInput, setChannelsInput] = useState("")
  const createExam = useMutation(api.exams.create)

  const isCustom = selectedPreset === "__custom__"
  const examName = isCustom ? customName.trim() : selectedPreset

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!examName) return
    const channels = channelsInput
      .split(",")
      .map((c) => cleanChannel(c))
      .filter(Boolean)
    await createExam({
      name: examName,
      channels,
      status: "active",
      inclusion_criteria: [],
      exclusion_criteria: [],
    })
    setSelectedPreset("")
    setCustomName("")
    setChannelsInput("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Exam</DialogTitle>
          <DialogDescription>
            Create a new exam to start monitoring Telegram channels.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Exam Name</label>
            <select
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value)
                if (e.target.value !== "__custom__") setCustomName("")
              }}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            >
              <option value="" disabled>Select an exam...</option>
              {EXAM_PRESETS.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
              <option value="__custom__">+ Add new...</option>
            </select>
            {isCustom && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter custom exam name"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Channels</label>
            <input
              type="text"
              value={channelsInput}
              onChange={(e) => setChannelsInput(e.target.value)}
              placeholder="e.g. smlemay, @channel2, https://t.me/channel3"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Comma-separated. URLs and @ prefixes are automatically cleaned.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!examName}>
              Create Exam
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Exam Detail View ────────────────────────────────────
function ExamDetail({ exam, onBack }: { exam: ExamDoc; onBack: () => void }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [newChannel, setNewChannel] = useState("")
  const [selectedExistingChannel, setSelectedExistingChannel] = useState("")
  const [chartRange, setChartRange] = useState<"day" | "month" | "year" | "all">("month")

  const updateExam = useMutation(api.exams.update)
  const updateAiStatus = useMutation(api.mutations.updateAiStatus)

  const content = useQuery(api.exams.getExamContent, {
    channels: exam.channels,
    dateFilter: dateFilter === "all" ? undefined : dateFilter,
    channelFilter: channelFilter === "all" ? undefined : channelFilter,
  })

  const channelHealth = useQuery(api.mutations.getChannelHealth, {
    channels: exam.channels,
  })

  const scrapeLogs = useQuery(api.mutations.getScrapeLogsForChannels, {
    channels: exam.channels,
  })

  const allChannels = useQuery(api.exams.getAllChannels) ?? []
  const perChannelCounts = useQuery(api.exams.getPerChannelCounts, { channels: exam.channels })

  const countsToday = useQuery(api.exams.getExamCounts, { channels: exam.channels, filter: "today" })
  const countsWeek = useQuery(api.exams.getExamCounts, { channels: exam.channels, filter: "week" })
  const countsMonth = useQuery(api.exams.getExamCounts, { channels: exam.channels, filter: "month" })
  const countsAll = useQuery(api.exams.getExamCounts, { channels: exam.channels, filter: "all" })

  const currentCounts =
    dateFilter === "today"
      ? countsToday
      : dateFilter === "week"
        ? countsWeek
        : dateFilter === "month"
          ? countsMonth
          : countsAll

  // Last run across all channels
  const lastRun = useMemo(() => {
    if (!scrapeLogs || scrapeLogs.length === 0) return null
    let latest = scrapeLogs[0].last_scrape_date
    for (const log of scrapeLogs) {
      if (log.last_scrape_date > latest) latest = log.last_scrape_date
    }
    return latest
  }, [scrapeLogs])

  // Build unified table rows
  const tableRows = useMemo(() => {
    if (!content) return []
    const rows: {
      id: string
      docId: string
      table: string
      type: "Text" | "Image" | "File"
      content: string
      date: string
      channel: string
      link?: string
      attachment?: string
      fileSize?: number
      aiStatus?: string
    }[] = []

    for (const t of content.texts) {
      rows.push({
        id: `text-${t.message_id}`,
        docId: t._id,
        table: "text_messages",
        type: "Text",
        content: t.text,
        date: t.date,
        channel: t.channel,
        link: t.link,
        aiStatus: t.ai_status,
      })
    }
    for (const p of content.pdfs) {
      rows.push({
        id: `pdf-${p.message_id}`,
        docId: p._id,
        table: "pdfs_metadata",
        type: "File",
        content: p.original_name || p.filename || "PDF",
        date: p.date ?? "",
        channel: p.channel,
        link: p.link ?? undefined,
        attachment: p.filename,
        fileSize: p.file_size ?? undefined,
        aiStatus: p.ai_status,
      })
    }
    for (const i of content.images) {
      rows.push({
        id: `img-${i.message_id}`,
        docId: i._id,
        table: "images_metadata",
        type: "Image",
        content: i.caption || i.filename,
        date: i.date ?? "",
        channel: i.channel,
        link: i.link ?? undefined,
        attachment: i.filename,
        fileSize: i.file_size ?? undefined,
        aiStatus: i.ai_status,
      })
    }

    rows.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))

    let filtered = rows
    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.content.toLowerCase().includes(q) ||
          r.channel.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [content, searchQuery, typeFilter])

  // Timeline chart data: aggregate content by date bucket, split by type
  const timelineData = useMemo(() => {
    if (!content) return []

    const now = new Date()
    let cutoff: Date | null = null
    if (chartRange === "day") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
    } else if (chartRange === "month") {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1)
    } else if (chartRange === "year") {
      cutoff = new Date(now.getFullYear() - 5, 0, 1)
    }
    const cutoffStr = cutoff ? cutoff.toISOString().slice(0, 10) : null

    function toKey(dateStr: string) {
      if (chartRange === "day") return dateStr
      if (chartRange === "month") return dateStr.slice(0, 7)
      if (chartRange === "year") return dateStr.slice(0, 4)
      return dateStr.slice(0, 7)
    }

    const buckets: Record<string, { messages: number; files: number }> = {}
    function ensure(key: string) {
      if (!buckets[key]) buckets[key] = { messages: 0, files: 0 }
    }

    for (const t of content.texts) {
      if (!t.date) continue
      const d = t.date.slice(0, 10)
      if (cutoffStr && d < cutoffStr) continue
      const key = toKey(d)
      ensure(key)
      buckets[key].messages++
    }
    for (const p of content.pdfs) {
      if (!p.date) continue
      const d = p.date.slice(0, 10)
      if (cutoffStr && d < cutoffStr) continue
      const key = toKey(d)
      ensure(key)
      buckets[key].files++
    }
    for (const i of content.images) {
      if (!i.date) continue
      const d = i.date.slice(0, 10)
      if (cutoffStr && d < cutoffStr) continue
      const key = toKey(d)
      ensure(key)
      buckets[key].files++
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, messages: counts.messages, files: counts.files }))
  }, [content, chartRange])

  const isActive = exam.status === "active"

  // Channels not already in this exam (for the picker)
  const availableChannels = useMemo(() => {
    return allChannels.filter((ch: string) => !exam.channels.includes(ch))
  }, [allChannels, exam.channels])

  async function addChannel() {
    const cleaned = cleanChannel(newChannel)
    if (!cleaned) return
    if (exam.channels.includes(cleaned)) return
    const updated = [...exam.channels, cleaned]
    await updateExam({ id: exam._id, channels: updated })
    setNewChannel("")
    setShowAddChannel(false)
  }

  async function addExistingChannel(ch: string) {
    if (!ch || exam.channels.includes(ch)) return
    const updated = [...exam.channels, ch]
    await updateExam({ id: exam._id, channels: updated })
    setSelectedExistingChannel("")
    setShowAddChannel(false)
  }

  async function removeChannel(ch: string) {
    const updated = exam.channels.filter((c) => c !== ch)
    await updateExam({ id: exam._id, channels: updated })
  }

  async function toggleStatus() {
    await updateExam({
      id: exam._id,
      status: isActive ? "inactive" : "active",
    })
  }

  const dateFilters: { key: DateFilter; label: string }[] = [
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

  const typeFilters: { key: TypeFilter; label: string; icon: typeof FileText; countKey?: keyof NonNullable<typeof currentCounts> }[] = [
    { key: "all", label: "All", icon: LayoutGrid },
    { key: "Text", label: "Messages", icon: FileText, countKey: "text" },
    { key: "File", label: "PDFs", icon: File, countKey: "pdfs" },
    { key: "Image", label: "Images", icon: Image, countKey: "images" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">{exam.name}</h1>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={`text-sm cursor-pointer px-3 py-1 ${isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                onClick={toggleStatus}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              {/* Scraping status */}
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={`text-xs py-1 px-2.5 ${isActive ? "bg-emerald-600/80" : ""}`}
              >
                <Radio className="size-3" />
                {isActive ? "Scraping On" : "Scraping Off"}
              </Badge>
              {/* Last run */}
              {lastRun && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  Last run: {formatDate(lastRun)}
                </span>
              )}
              <div className="h-5 w-px bg-border" />
              <Button size="sm" variant="outline" onClick={() => setShowAddChannel(true)}>
                <Plus className="size-4" />
                Add Channel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Add Channel Dialog ─── */}
      <Dialog open={showAddChannel} onOpenChange={setShowAddChannel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Channel</DialogTitle>
            <DialogDescription>
              Pick from existing channels across your exams, or type a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Pick from existing */}
            {availableChannels.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Select from existing channels</label>
                <select
                  value={selectedExistingChannel}
                  onChange={(e) => {
                    setSelectedExistingChannel(e.target.value)
                    if (e.target.value) addExistingChannel(e.target.value)
                  }}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Choose a channel...</option>
                  {availableChannels.map((ch: string) => (
                    <option key={ch} value={ch}>@{ch}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or type manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Type manually */}
            <div>
              <label className="block text-sm font-medium mb-2">Channel URL or username</label>
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChannel()}
                placeholder="e.g. smlemay, @smlemay, or https://t.me/s/smlemay"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              {newChannel && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Will be saved as: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {cleanChannel(newChannel) || "..."}
                  </code>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddChannel(false)}>
              Cancel
            </Button>
            <Button onClick={addChannel} disabled={!cleanChannel(newChannel)}>
              <Plus className="size-4" />
              Add Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Body (full width) ─── */}
      <div className="px-4 py-6">
        {/* Tabs */}
        <Tabs defaultValue="content">
          <TabsList variant="line" className="mb-6">
            <TabsTrigger value="content" className="text-sm px-4 py-2">
              <FileText className="size-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="channels" className="text-sm px-4 py-2">
              <Hash className="size-4" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm px-4 py-2">
              <BarChart3 className="size-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="criteria" className="text-sm px-4 py-2">
              <Settings2 className="size-4" />
              Criteria
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm px-4 py-2">
              <History className="size-4" />
              Run History
            </TabsTrigger>
            <TabsTrigger value="health" className="text-sm px-4 py-2">
              <Activity className="size-4" />
              Connection Health
            </TabsTrigger>
          </TabsList>

          {/* ─── Content Tab ─── */}
          <TabsContent value="content">
            {/* Filter Bar */}
            <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border bg-card px-5 py-4">
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
                  {exam.channels.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-1.5">
                {typeFilters.map((f) => {
                  const count = f.countKey && currentCounts
                    ? currentCounts[f.countKey]
                    : f.key === "all" && currentCounts
                      ? currentCounts.text + currentCounts.pdfs + currentCounts.images
                      : 0
                  return (
                    <Button
                      key={f.key}
                      size="sm"
                      variant={typeFilter === f.key ? "default" : "outline"}
                      onClick={() => setTypeFilter(f.key)}
                      className="gap-1.5"
                    >
                      <f.icon className="size-4" />
                      {f.label}
                      <Badge variant="secondary" className="ml-0.5 text-xs px-1.5 py-0">
                        {count}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search content..."
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

            {/* Content Table (full width like Airtable) */}
            {!content ? (
              <div className="py-16 text-center text-muted-foreground text-base">Loading content...</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                        Content
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-24">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-32">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-28">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-28">
                        AI Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-24">
                        Attachment
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-14">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-base">
                          No content found
                        </td>
                      </tr>
                    ) : (
                      tableRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b transition-colors hover:bg-accent/30"
                        >
                          <td className="px-4 py-3">
                            <div>
                              {row.type === "Image" && row.attachment ? (
                                <div className="flex items-center gap-3">
                                  <img
                                    src={`/files/images/${encodeURIComponent(row.attachment)}`}
                                    alt=""
                                    className="h-12 w-12 rounded object-cover shrink-0"
                                    loading="lazy"
                                  />
                                  <span className="truncate text-sm">{row.content}</span>
                                </div>
                              ) : (
                                <p className="line-clamp-2 text-sm leading-relaxed">
                                  {row.content}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                row.type === "Text"
                                  ? "secondary"
                                  : row.type === "Image"
                                    ? "outline"
                                    : "default"
                              }
                              className="text-xs"
                            >
                              {row.type === "Text" && <FileText className="size-3.5" />}
                              {row.type === "Image" && <Image className="size-3.5" />}
                              {row.type === "File" && <File className="size-3.5" />}
                              {row.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(row.date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-sm font-mono text-muted-foreground">
                              <Hash className="size-3" />
                              {row.channel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={row.aiStatus || ""}
                              onChange={(e) => {
                                const val = e.target.value as AiStatus
                                updateAiStatus({ table: row.table, id: row.docId, ai_status: val })
                              }}
                              className={`rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring ${
                                row.aiStatus === "done"
                                  ? "text-emerald-500"
                                  : row.aiStatus === "in_progress"
                                    ? "text-blue-500"
                                    : row.aiStatus === "todo"
                                      ? "text-yellow-500"
                                      : "text-muted-foreground"
                              }`}
                            >
                              <option value="">--</option>
                              {AI_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {row.attachment ? (
                              <a
                                href={`/files/${row.type === "Image" ? "images" : "pdfs"}/${encodeURIComponent(row.attachment)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-primary hover:underline"
                              >
                                <File className="size-4" />
                                {formatBytes(row.fileSize) || "View"}
                              </a>
                            ) : (
                              <span className="text-muted-foreground/40">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.link ? (
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground/40">--</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ─── Channels Tab ─── */}
          <TabsContent value="channels">
            <div className="space-y-4">
              {exam.channels.length === 0 ? (
                <div className="rounded-lg border bg-card p-12 text-center">
                  <p className="text-muted-foreground mb-4">No channels configured yet.</p>
                  <Button onClick={() => setShowAddChannel(true)}>
                    <Plus className="size-4" />
                    Add Channel
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {exam.channels.map((ch) => {
                      const counts = perChannelCounts?.find((c: { channel: string }) => c.channel === ch)
                      const log = scrapeLogs?.find((l: { channel: string }) => l.channel === ch)
                      return (
                        <div key={ch} className="rounded-lg border bg-card p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline" className="font-mono text-sm py-1 px-3">
                              <Hash className="size-3" />
                              {ch}
                            </Badge>
                            <button
                              onClick={() => removeChannel(ch)}
                              className="text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded bg-muted/50 py-2">
                              <p className="text-lg font-bold font-mono">{counts?.text ?? 0}</p>
                              <p className="text-xs text-muted-foreground">Messages</p>
                            </div>
                            <div className="rounded bg-muted/50 py-2">
                              <p className="text-lg font-bold font-mono">{counts?.pdfs ?? 0}</p>
                              <p className="text-xs text-muted-foreground">PDFs</p>
                            </div>
                            <div className="rounded bg-muted/50 py-2">
                              <p className="text-lg font-bold font-mono">{counts?.images ?? 0}</p>
                              <p className="text-xs text-muted-foreground">Images</p>
                            </div>
                          </div>
                          {log && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Last scraped: {formatDate(log.last_scrape_date)}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <Button variant="outline" onClick={() => setShowAddChannel(true)}>
                    <Plus className="size-4" />
                    Add Channel
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* ─── Analytics Tab ─── */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2.5">
                        <FileText className="size-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold font-mono">{countsAll?.text ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Total Messages</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-500/10 p-2.5">
                        <File className="size-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold font-mono">{countsAll?.pdfs ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Total PDFs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-amber-500/10 p-2.5">
                        <Image className="size-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold font-mono">{countsAll?.images ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Total Images</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-500/10 p-2.5">
                        <Hash className="size-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold font-mono">{exam.channels.length}</p>
                        <p className="text-sm text-muted-foreground">Channels</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Period comparison */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono">
                      +{(countsToday?.text ?? 0) + (countsToday?.pdfs ?? 0) + (countsToday?.images ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {countsToday?.text ?? 0} msg, {countsToday?.pdfs ?? 0} pdf, {countsToday?.images ?? 0} img
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>This Week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono">
                      +{(countsWeek?.text ?? 0) + (countsWeek?.pdfs ?? 0) + (countsWeek?.images ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {countsWeek?.text ?? 0} msg, {countsWeek?.pdfs ?? 0} pdf, {countsWeek?.images ?? 0} img
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>This Month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono">
                      +{(countsMonth?.text ?? 0) + (countsMonth?.pdfs ?? 0) + (countsMonth?.images ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {countsMonth?.text ?? 0} msg, {countsMonth?.pdfs ?? 0} pdf, {countsMonth?.images ?? 0} img
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Scraping timeline chart */}
              <TimelineBarChart
                timelineData={timelineData}
                chartRange={chartRange}
                setChartRange={setChartRange}
              />

              {/* Total content radial chart */}
              <TotalContentRadialChart
                total={(countsAll?.text ?? 0) + (countsAll?.pdfs ?? 0) + (countsAll?.images ?? 0)}
                channels={exam.channels.length}
              />
            </div>
          </TabsContent>

          {/* ─── Criteria Tab ─── */}
          <TabsContent value="criteria">
            <CriteriaPanel exam={exam} />
          </TabsContent>

          {/* ─── Run History Tab ─── */}
          <TabsContent value="history">
            <div className="space-y-6">
              {/* Summary stats */}
              {scrapeLogs && scrapeLogs.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500/10 p-2.5">
                          <Zap className="size-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold font-mono">
                            {scrapeLogs.reduce((sum: number, l: { messages_scraped: number }) => sum + l.messages_scraped, 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">Total Messages Scraped</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500/10 p-2.5">
                          <Hash className="size-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold font-mono">{scrapeLogs.length}</p>
                          <p className="text-sm text-muted-foreground">Channels Scraped</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-500/10 p-2.5">
                          <Clock className="size-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{lastRun ? formatDate(lastRun) : "Never"}</p>
                          <p className="text-sm text-muted-foreground">Last Run</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scrape log table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Channel</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Last Scrape</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Last Message Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Messages Scraped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!scrapeLogs ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading...</td>
                      </tr>
                    ) : scrapeLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                          No scrape history yet. Run the scraper to see results here.
                        </td>
                      </tr>
                    ) : (
                      scrapeLogs
                        .slice()
                        .sort((a: { last_scrape_date: string }, b: { last_scrape_date: string }) => b.last_scrape_date.localeCompare(a.last_scrape_date))
                        .map((log: { channel: string; last_scrape_date: string; last_message_date: string; messages_scraped: number }) => (
                          <tr key={log.channel} className="border-b transition-colors hover:bg-accent/30">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 font-mono text-sm">
                                <Hash className="size-3" />
                                {log.channel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {formatDate(log.last_scrape_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {formatDate(log.last_message_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono font-semibold text-sm">{log.messages_scraped}</span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ─── Connection Health Tab ─── */}
          <TabsContent value="health">
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-2 text-base font-semibold flex items-center gap-2">
                  <Activity className="size-5" />
                  Channel Connection Health
                </h3>
                <p className="mb-5 text-sm text-muted-foreground">
                  Status is derived from scrape logs and health checks.
                  Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">python test_connection.py</code> for a full health check.
                </p>

                {!channelHealth ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : exam.channels.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No channels configured</div>
                ) : (
                  <div className="space-y-4">
                    {channelHealth.map(({ channel, health }: { channel: string; health: { status: string; last_check: string; error?: string; latest_messages?: { id: number; date: string; text: string }[]; message_count?: number } | null }) => {
                      const log = scrapeLogs?.find((l: { channel: string }) => l.channel === channel)
                      const hasData = health || log
                      const isOk = health?.status === "ok" || (log && !health)
                      return (
                        <div key={channel} className="rounded-lg border p-5">
                          <div className="flex items-center justify-between mb-3">
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
                                  {isOk ? (
                                    <CheckCircle2 className="size-3.5" />
                                  ) : (
                                    <AlertCircle className="size-3.5" />
                                  )}
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
                              {log && (
                                <span>Last scraped: {formatDate(log.last_scrape_date)} ({log.messages_scraped} msgs)</span>
                              )}
                              {health?.last_check && (
                                <span>Health check: {formatDate(health.last_check)}</span>
                              )}
                            </div>
                          </div>

                          {health?.error && (
                            <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                              {health.error}
                            </div>
                          )}

                          {health?.latest_messages && health.latest_messages.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Latest {health.latest_messages.length} messages
                              </p>
                              <div className="space-y-1.5">
                                {health.latest_messages.map((msg: { id: number; date: string; text: string }) => (
                                  <div key={msg.id} className="flex items-start gap-3 rounded-lg bg-muted/50 px-4 py-2.5">
                                    <span className="shrink-0 text-xs text-muted-foreground font-mono w-32">
                                      {msg.date}
                                    </span>
                                    <p className="line-clamp-1 text-sm">{msg.text || "(no text)"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {health?.message_count != null && (
                            <p className="mt-3 text-xs text-muted-foreground">
                              Total messages: <span className="font-mono font-semibold">{health.message_count}</span>
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Timeline Bar Chart ─────────────────────────────────
const timelineChartConfig = {
  views: { label: "Content" },
  messages: { label: "Messages", color: "var(--chart-2)" },
  files: { label: "Files", color: "var(--chart-1)" },
} satisfies ChartConfig

function TimelineBarChart({
  timelineData,
  chartRange,
  setChartRange,
}: {
  timelineData: { date: string; messages: number; files: number }[]
  chartRange: "day" | "month" | "year" | "all"
  setChartRange: (r: "day" | "month" | "year" | "all") => void
}) {
  const [activeChart, setActiveChart] =
    useState<"messages" | "files">("messages")

  const total = useMemo(
    () => ({
      messages: timelineData.reduce((acc, curr) => acc + curr.messages, 0),
      files: timelineData.reduce((acc, curr) => acc + curr.files, 0),
    }),
    [timelineData]
  )

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Scraping Timeline</CardTitle>
          <CardDescription>
            Content collected over time
          </CardDescription>
          <div className="flex items-center gap-1.5 mt-2">
            {(["day", "month", "year", "all"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={chartRange === r ? "default" : "outline"}
                onClick={() => setChartRange(r)}
                className="text-xs capitalize h-7"
              >
                {r === "day" ? "Daily" : r === "month" ? "Monthly" : r === "year" ? "Yearly" : "All Time"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex">
          {(["messages", "files"] as const).map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-muted-foreground text-xs">
                {timelineChartConfig[key].label}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {total[key].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {timelineData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this range</p>
        ) : (
          <ChartContainer
            config={timelineChartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={timelineData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  if (chartRange === "year") return value
                  if (chartRange === "month" || chartRange === "all") {
                    const [y, m] = value.split("-")
                    return new Date(+y, +m - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                  }
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="views"
                    labelFormatter={(value) => {
                      if (chartRange === "year") return value
                      if (chartRange === "month" || chartRange === "all") {
                        const [y, m] = String(value).split("-")
                        return new Date(+y, +m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                      }
                      return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    }}
                  />
                }
              />
              <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Total Content Radial Chart ─────────────────────────
const radialChartConfig = {
  content: { label: "Content" },
  total: { label: "Total", color: "var(--chart-2)" },
} satisfies ChartConfig

function TotalContentRadialChart({ total, channels }: { total: number; channels: number }) {
  const chartData = [{ label: "total", count: total, fill: "var(--color-total)" }]
  const endAngle = Math.min((total / Math.max(total * 1.2, 1)) * 360, 350)

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Total Content Collected</CardTitle>
        <CardDescription>Across {channels} channel{channels !== 1 ? "s" : ""}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={radialChartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={endAngle}
            innerRadius={80}
            outerRadius={140}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="count" background />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Items
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {total > 0 && (
            <>
              Content growing <TrendingUp className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Total messages, PDFs, and images collected
        </div>
      </CardFooter>
    </Card>
  )
}

// ─── Criteria Panel ──────────────────────────────────────
function CriteriaPanel({ exam }: { exam: ExamDoc }) {
  const [newInclusion, setNewInclusion] = useState("")
  const [newExclusion, setNewExclusion] = useState("")
  const updateExam = useMutation(api.exams.update)

  async function addInclusion() {
    if (!newInclusion.trim()) return
    const updated = [...exam.inclusion_criteria, newInclusion.trim()]
    await updateExam({ id: exam._id, inclusion_criteria: updated })
    setNewInclusion("")
  }

  async function removeInclusion(item: string) {
    const updated = exam.inclusion_criteria.filter((c) => c !== item)
    await updateExam({ id: exam._id, inclusion_criteria: updated })
  }

  async function addExclusion() {
    if (!newExclusion.trim()) return
    const updated = [...exam.exclusion_criteria, newExclusion.trim()]
    await updateExam({ id: exam._id, exclusion_criteria: updated })
    setNewExclusion("")
  }

  async function removeExclusion(item: string) {
    const updated = exam.exclusion_criteria.filter((c) => c !== item)
    await updateExam({ id: exam._id, exclusion_criteria: updated })
  }

  return (
    <div className="mb-6 rounded-lg border bg-card p-5">
      <h3 className="mb-4 text-base font-semibold">Content Criteria</h3>
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Inclusion */}
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-500">
            Include (keywords to accept)
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {exam.inclusion_criteria.map((c) => (
              <Badge key={c} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 py-1 px-2.5">
                {c}
                <button onClick={() => removeInclusion(c)} className="ml-1.5">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {exam.inclusion_criteria.length === 0 && (
              <span className="text-sm text-muted-foreground">No inclusion criteria (all accepted)</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newInclusion}
              onChange={(e) => setNewInclusion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInclusion()}
              placeholder="Add keyword..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" variant="outline" onClick={addInclusion}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Exclusion */}
        <div>
          <p className="mb-2 text-sm font-medium text-red-400">
            Exclude (keywords to reject)
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {exam.exclusion_criteria.map((c) => (
              <Badge key={c} variant="outline" className="text-xs border-red-500/30 text-red-400 py-1 px-2.5">
                {c}
                <button onClick={() => removeExclusion(c)} className="ml-1.5">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {exam.exclusion_criteria.length === 0 && (
              <span className="text-sm text-muted-foreground">No exclusion criteria</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExclusion()}
              placeholder="Add keyword..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" variant="outline" onClick={addExclusion}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
