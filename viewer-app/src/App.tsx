import { useState, useMemo, useCallback, useRef } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// Tabs removed – sidebar layout used instead
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// Chart imports removed – charts moved to step components or removed
import {
  ArrowLeft,
  FileText,
  Image,
  File,
  Plus,
  Search,
  X,
  Settings2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Play,
  Bot,
  Loader2,
  Square,
  Timer,
} from "lucide-react"
import { type ContentRow } from "./ContentGrid"
import { PipelineSidebar } from "./PipelineSidebar"
import { RightSidebarPanel } from "./RightSidebarPanel"
import { ChannelsStep } from "./ChannelsStep"
import { ExtractionsStep } from "./ExtractionsStep"
import { TextStep } from "./TextStep"
import { ImagesStep } from "./ImagesStep"
import { FilesStep } from "./FilesStep"
import { MCQsStep } from "./MCQsStep"
import { HYStep } from "./HYStep"
import { StepPlaceholder } from "./StepPlaceholder"

// ─── Types ───────────────────────────────────────────────
type DateFilter = "today" | "week" | "month" | "all"

type ExamDoc = {
  _id: Id<"exams">
  name: string
  channels: string[]
  status: string
  inclusion_criteria: string[]
  exclusion_criteria: string[]
  ai_prompt?: string
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

// ─── Add Channel Dialog (with Run Test) ─────────────────
function AddChannelDialog({
  open,
  onOpenChange,
  availableChannels,
  newChannel,
  setNewChannel,
  addChannel,
  addExistingChannel,
  selectedExistingChannel,
  setSelectedExistingChannel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableChannels: string[]
  newChannel: string
  setNewChannel: (v: string) => void
  addChannel: () => void
  addExistingChannel: (ch: string) => void
  selectedExistingChannel: string
  setSelectedExistingChannel: (v: string) => void
}) {
  const testChannel = useAction(api.ai.testChannel)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    lastMessage?: string
    messageCount?: number
    error?: string
  } | null>(null)

  async function runTest() {
    const ch = cleanChannel(newChannel)
    if (!ch) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testChannel({ channel: ch })
      setTestResult(result)
    } catch (err: unknown) {
      setTestResult({ ok: false, error: String(err) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setTestResult(null); setTesting(false) } }}>
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
            <div className="flex gap-2">
              <input
                type="text"
                value={newChannel}
                onChange={(e) => { setNewChannel(e.target.value); setTestResult(null) }}
                onKeyDown={(e) => e.key === "Enter" && addChannel()}
                placeholder="e.g. smlemay, @smlemay, or https://t.me/s/smlemay"
                className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 h-auto px-3"
                onClick={runTest}
                disabled={!cleanChannel(newChannel) || testing}
              >
                {testing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Test
              </Button>
            </div>
            {newChannel && (
              <p className="mt-2 text-sm text-muted-foreground">
                Will be saved as: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {cleanChannel(newChannel) || "..."}
                </code>
              </p>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              testResult.ok
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {testResult.ok ? (
                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <CheckCircle2 className="size-4" />
                    Channel is active ({testResult.messageCount} messages found)
                  </div>
                  <p className="text-xs opacity-80">
                    Last post: {testResult.lastMessage}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  {testResult.error}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={addChannel} disabled={!cleanChannel(newChannel)}>
            <Plus className="size-4" />
            Add Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Exam Detail View ────────────────────────────────────
function ExamDetail({ exam, onBack }: { exam: ExamDoc; onBack: () => void }) {
  const [activeStep, setActiveStep] = useState("channels")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [newChannel, setNewChannel] = useState("")
  const [selectedExistingChannel, setSelectedExistingChannel] = useState("")

  const updateExam = useMutation(api.exams.update)
  const updateAiStatus = useMutation(api.mutations.updateAiStatus)
  const updateComment = useMutation(api.mutations.updateComment)
  const processWithAI = useAction(api.ai.processWithAI)
  const processWithCustomPrompt = useAction(api.ai.processWithCustomPrompt)
  const scrapeChannel = useAction(api.ai.scrapeChannel)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Scrape state
  const [scraping, setScraping] = useState(false)
  const scrapeAbortRef = useRef(false)
  const [scrapeResults, setScrapeResults] = useState<{
    channel: string; ok: boolean; total: number; saved: number; skipped: number; error?: string
  }[]>([])
  const [scrapeDateFrom, setScrapeDateFrom] = useState("")
  const [scrapeDateTo, setScrapeDateTo] = useState("")

  const handleProcess = useCallback(
    async (row: ContentRow) => {
      setProcessingIds((prev) => new Set(prev).add(row.docId))
      try {
        const useCustom = !!exam.ai_prompt?.trim()
        if (useCustom) {
          await processWithCustomPrompt({ id: row.docId as any, customPrompt: exam.ai_prompt! })
        } else {
          await processWithAI({ id: row.docId as any })
        }
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev)
          next.delete(row.docId)
          return next
        })
      }
    },
    [exam.ai_prompt, processWithAI, processWithCustomPrompt]
  )

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
  const coverageData = useQuery(api.mutations.getCoverageData, { channels: exam.channels })

  // Total run count across all channels
  const totalRunCount = useMemo(() => {
    if (!scrapeLogs) return 0
    return scrapeLogs.reduce((sum: number, l: any) => sum + (l.run_count ?? 0), 0)
  }, [scrapeLogs])

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
      // AI content fields
      q_text?: string
      choices?: string[]
      correct_choice_index?: number
      explanation?: string
      hy_summary?: string
      subject?: string
      topic?: string
      exam_name?: string
      comment?: string
      ai_cost?: number
      ai_prompt_tokens?: number
      ai_completion_tokens?: number
      ai_total_tokens?: number
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
        q_text: t.q_text,
        choices: t.choices,
        correct_choice_index: t.correct_choice_index,
        explanation: t.explanation,
        hy_summary: t.hy_summary,
        subject: t.subject,
        topic: t.topic,
        exam_name: t.exam_name,
        comment: t.comment,
        ai_cost: t.ai_cost,
        ai_prompt_tokens: t.ai_prompt_tokens,
        ai_completion_tokens: t.ai_completion_tokens,
        ai_total_tokens: t.ai_total_tokens,
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

    return rows
  }, [content])

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

  // Compute step counts for sidebar
  const stepCounts = useMemo(() => {
    const textCount = content?.texts?.length ?? 0
    const imageCount = content?.images?.length ?? 0
    const fileCount = content?.pdfs?.length ?? 0
    const mcqCount = content?.texts?.filter((t: any) => t.ai_status === "done" && t.q_text)?.length ?? 0
    const hyCount = content?.texts?.filter((t: any) => t.hy_summary)?.length ?? 0
    return {
      channels: exam.channels.length,
      extractions: scrapeResults.length || (scrapeLogs?.length ?? 0),
      text: textCount,
      images: imageCount,
      files: fileCount,
      mcqs: mcqCount,
      hy: hyCount,
      flashcards: 0,
      repeated: 0,
      library: 0,
      "ai-rejected": 0,
      "ai-approved": 0,
      human: 0,
      published: 0,
    }
  }, [content, exam.channels, scrapeResults, scrapeLogs])

  // Build MCQ and HY data from content
  const mcqRows = useMemo(() => {
    if (!content) return []
    return content.texts
      .filter((t: any) => t.ai_status === "done" && t.q_text)
      .map((t: any) => ({
        id: `mcq-${t.message_id}`,
        docId: t._id,
        q_text: t.q_text,
        choices: t.choices,
        correct_choice_index: t.correct_choice_index,
        explanation: t.explanation,
        hy_summary: t.hy_summary,
        subject: t.subject,
        topic: t.topic,
        channel: t.channel,
        date: t.date,
        ai_cost: t.ai_cost,
      }))
  }, [content])

  const hyRows = useMemo(() => {
    if (!content) return []
    return content.texts
      .filter((t: any) => t.hy_summary)
      .map((t: any) => ({
        id: `hy-${t.message_id}`,
        docId: t._id,
        q_text: t.q_text,
        hy_summary: t.hy_summary,
        subject: t.subject,
        topic: t.topic,
        channel: t.channel,
        date: t.date,
      }))
  }, [content])

  const imageRows = useMemo(() => {
    if (!content) return []
    return content.images.map((i: any) => ({
      id: `img-${i.message_id}`,
      docId: i._id,
      content: i.caption || i.filename,
      date: i.date ?? "",
      channel: i.channel,
      link: i.link ?? undefined,
      attachment: i.filename,
      fileSize: i.file_size ?? undefined,
    }))
  }, [content])

  const fileRows = useMemo(() => {
    if (!content) return []
    return content.pdfs.map((p: any) => ({
      id: `pdf-${p.message_id}`,
      docId: p._id,
      content: p.original_name || p.filename || "PDF",
      date: p.date ?? "",
      channel: p.channel,
      link: p.link ?? undefined,
      attachment: p.filename,
      fileSize: p.file_size ?? undefined,
    }))
  }, [content])

  function renderStepContent() {
    switch (activeStep) {
      case "channels":
        return (
          <ChannelsStep
            examId={exam._id}
            channels={exam.channels}
            perChannelCounts={perChannelCounts}
            channelHealth={channelHealth}
            scrapeLogs={scrapeLogs}
            coverageData={coverageData}
            onAddChannel={() => setShowAddChannel(true)}
            onRemoveChannel={removeChannel}
          />
        )
      case "extractions":
        return (
          <ExtractionsStep
            exam={exam as any}
            scrapeLogs={scrapeLogs}
            scraping={scraping}
            scrapeResults={scrapeResults}
            onScrapeAll={async () => {
              scrapeAbortRef.current = false
              setScraping(true)
              setScrapeResults([])
              const results: typeof scrapeResults = []
              for (const ch of exam.channels) {
                if (scrapeAbortRef.current) break
                try {
                  const result = await scrapeChannel({
                    channel: ch,
                    inclusion_criteria: exam.inclusion_criteria,
                    exclusion_criteria: exam.exclusion_criteria,
                    dateFrom: scrapeDateFrom || undefined,
                    dateTo: scrapeDateTo || undefined,
                  })
                  results.push({ channel: ch, ...result })
                } catch (err: unknown) {
                  results.push({ channel: ch, ok: false, total: 0, saved: 0, skipped: 0, error: String(err) })
                }
                setScrapeResults([...results])
              }
              setScraping(false)
            }}
            onScrapeChannel={async (ch) => {
              setScraping(true)
              try {
                const result = await scrapeChannel({
                  channel: ch,
                  inclusion_criteria: exam.inclusion_criteria,
                  exclusion_criteria: exam.exclusion_criteria,
                  dateFrom: scrapeDateFrom || undefined,
                  dateTo: scrapeDateTo || undefined,
                })
                setScrapeResults((prev) => {
                  const filtered = prev.filter((r) => r.channel !== ch)
                  return [...filtered, { channel: ch, ...result }]
                })
              } catch (err: unknown) {
                setScrapeResults((prev) => {
                  const filtered = prev.filter((r) => r.channel !== ch)
                  return [...filtered, { channel: ch, ok: false, total: 0, saved: 0, skipped: 0, error: String(err) }]
                })
              } finally {
                setScraping(false)
              }
            }}
            scrapeDateFrom={scrapeDateFrom}
            scrapeDateTo={scrapeDateTo}
            setScrapeDateFrom={setScrapeDateFrom}
            setScrapeDateTo={setScrapeDateTo}
          />
        )
      case "text":
        return (
          <TextStep
            rows={tableRows}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            processingIds={processingIds}
            onProcess={handleProcess}
            onAiStatusChange={(args) =>
              updateAiStatus({ table: args.table, id: args.id, ai_status: args.ai_status } as any)
            }
            onCommentSave={(args) =>
              updateComment({ id: args.id as any, comment: args.comment })
            }
            dateFilter={dateFilter}
            setDateFilter={setDateFilter as any}
            channelFilter={channelFilter}
            setChannelFilter={setChannelFilter}
            channels={exam.channels}
          />
        )
      case "images":
        return <ImagesStep rows={imageRows} />
      case "files":
        return <FilesStep rows={fileRows} />
      case "mcqs":
        return <MCQsStep rows={mcqRows} />
      case "hy":
        return <HYStep rows={hyRows} />
      default:
        return <StepPlaceholder slug={activeStep} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* ─── Left Sidebar ─── */}
      <PipelineSidebar
        examName={exam.name}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        counts={stepCounts}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ─── Header ─── */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-semibold">{exam.name}</span>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={`text-xs cursor-pointer ${isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            onClick={toggleStatus}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {lastRun && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Last run: {formatDate(lastRun)}
            </span>
          )}

          {/* Running status indicator */}
          {(scraping || processingIds.size > 0) && (
            <Badge variant="default" className="bg-amber-600 text-xs animate-pulse gap-1">
              <Loader2 className="size-3 animate-spin" />
              {scraping ? "Scraping..." : `AI Processing ${processingIds.size}`}
            </Badge>
          )}

          {/* Run count & schedule */}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="size-3" />
            {totalRunCount} runs
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Timer className="size-3" />
            Every 6h
          </span>

          <div className="flex-1" />

          {/* Stop Run button - visible when scraping or AI processing */}
          {(scraping || processingIds.size > 0) && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => {
                scrapeAbortRef.current = true
                setScraping(false)
              }}
            >
              <Square className="h-4 w-4" />
              Stop Run
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            className="gap-2"
            disabled={processingIds.size > 0}
            onClick={async () => {
              if (!content) return
              const useCustom = !!exam.ai_prompt?.trim()
              let batch: { _id: string }[]
              if (selectedRows.size > 0) {
                const selectedDocIds = new Set(
                  tableRows.filter((r) => selectedRows.has(r.id) && r.type === "Text").map((r) => r.docId)
                )
                batch = content.texts.filter((t) => selectedDocIds.has(t._id)).slice(0, 10)
              } else {
                batch = content.texts.filter(
                  (t) => !t.ai_status || t.ai_status === "todo"
                ).slice(0, 10)
              }
              if (batch.length === 0) return
              const ids = batch.map((t) => t._id)
              setProcessingIds((prev) => {
                const next = new Set(prev)
                ids.forEach((id: string) => next.add(id))
                return next
              })
              await Promise.allSettled(
                batch.map((t) =>
                  useCustom
                    ? processWithCustomPrompt({ id: t._id as any, customPrompt: exam.ai_prompt! })
                    : processWithAI({ id: t._id as any })
                )
              )
              setProcessingIds((prev) => {
                const next = new Set(prev)
                ids.forEach((id: string) => next.delete(id))
                return next
              })
              setSelectedRows(new Set())
            }}
          >
            {processingIds.size > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            {processingIds.size > 0 ? `Processing ${processingIds.size}...` : "Run AI"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={scraping || exam.channels.length === 0}
            onClick={async () => {
              scrapeAbortRef.current = false
              setScraping(true)
              setScrapeResults([])
              const results: typeof scrapeResults = []
              for (const ch of exam.channels) {
                if (scrapeAbortRef.current) break
                try {
                  const result = await scrapeChannel({
                    channel: ch,
                    inclusion_criteria: exam.inclusion_criteria,
                    exclusion_criteria: exam.exclusion_criteria,
                  })
                  results.push({ channel: ch, ...result })
                } catch (err: unknown) {
                  results.push({ channel: ch, ok: false, total: 0, saved: 0, skipped: 0, error: String(err) })
                }
              }
              setScrapeResults([...results])
              setScraping(false)
            }}
          >
            {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {scraping ? "Scraping..." : "Scrape All"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAddChannel(true)}>
            <Plus className="h-4 w-4" />
            Add Channel
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </header>

        {/* ─── Content + Right Sidebar ─── */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {!content ? (
              <div className="py-16 text-center text-muted-foreground text-base">Loading content...</div>
            ) : (
              renderStepContent()
            )}
          </div>

          <RightSidebarPanel
            activeStep={activeStep}
            open={rightSidebarOpen}
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          />
        </div>
      </div>

      {/* ─── Add Channel Dialog ─── */}
      <AddChannelDialog
        open={showAddChannel}
        onOpenChange={setShowAddChannel}
        availableChannels={availableChannels}
        newChannel={newChannel}
        setNewChannel={setNewChannel}
        addChannel={addChannel}
        addExistingChannel={addExistingChannel}
        selectedExistingChannel={selectedExistingChannel}
        setSelectedExistingChannel={setSelectedExistingChannel}
      />
    </div>
  )
}

