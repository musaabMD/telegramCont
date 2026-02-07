import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Image, File, Hash, ChevronRight } from "lucide-react"

type Exam = {
  id: string
  name: string
  channels: string[]
  status: "active" | "paused"
  counts: { text: number; pdfs: number; images: number }
}

type TextMessage = {
  id: number
  date: string
  text: string
  views?: number
  link?: string
  is_forward?: boolean
  word_count?: number
  is_caption?: boolean
}

type PdfMeta = {
  message_id: number
  filename: string
  original_name?: string
  file_size?: number
  date?: string
  link?: string
}

type ImageMeta = {
  message_id: number
  filename: string
  caption?: string
  file_size?: number
  date?: string
  link?: string
}

type ExamContent = {
  text_messages: TextMessage[]
  pdfs: PdfMeta[]
  images: ImageMeta[]
  summary: string
}

function formatBytes(n: number | undefined) {
  if (n == null) return ""
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(2) + " MB"
}

export default function App() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [content, setContent] = useState<ExamContent | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((data) => setExams(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalStats = exams.reduce(
    (acc, e) => ({
      text: acc.text + e.counts.text,
      pdfs: acc.pdfs + e.counts.pdfs,
      images: acc.images + e.counts.images,
    }),
    { text: 0, pdfs: 0, images: 0 }
  )

  function selectExam(exam: Exam) {
    setSelectedExam(exam)
    setContentLoading(true)
    setContent(null)
    fetch(`/api/exams/${exam.id}/content`)
      .then((r) => r.json())
      .then((data) => setContent(data))
      .catch(() => setContent({ text_messages: [], pdfs: [], images: [], summary: "" }))
      .finally(() => setContentLoading(false))
  }

  function goBack() {
    setSelectedExam(null)
    setContent(null)
  }

  if (selectedExam) {
    return <ExamDetail exam={selectedExam} content={content} loading={contentLoading} onBack={goBack} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Exam Scraper</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalStats.text} messages &middot; {totalStats.pdfs} PDFs &middot; {totalStats.images} images
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-2">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => selectExam(exam)}
                className="w-full text-left"
              >
                <Card className="transition-colors hover:bg-accent/50 cursor-pointer py-4">
                  <CardContent className="flex items-center gap-4 px-4 py-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{exam.name}</span>
                        <Badge variant={exam.channels.length ? "default" : "secondary"} className="text-[10px]">
                          {exam.channels.length ? `${exam.channels.length} channel${exam.channels.length > 1 ? "s" : ""}` : "No channels"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="size-3" />
                          {exam.counts.text}
                        </span>
                        <span className="flex items-center gap-1">
                          <File className="size-3" />
                          {exam.counts.pdfs}
                        </span>
                        <span className="flex items-center gap-1">
                          <Image className="size-3" />
                          {exam.counts.images}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExamDetail({
  exam,
  content,
  loading,
  onBack,
}: {
  exam: Exam
  content: ExamContent | null
  loading: boolean
  onBack: () => void
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{exam.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {exam.channels.length > 0 ? (
              exam.channels.map((ch) => (
                <Badge key={ch} variant="outline" className="font-mono text-xs">
                  <Hash className="size-3" />
                  {ch}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No channels configured yet</span>
            )}
          </div>
          {content && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <span>{content.text_messages.length} messages</span>
              <span>{content.pdfs.length} PDFs</span>
              <span>{content.images.length} images</span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading content...</p>
        ) : !content ? (
          <p className="text-muted-foreground">Failed to load content.</p>
        ) : (
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="text">Messages ({content.text_messages.length})</TabsTrigger>
              <TabsTrigger value="pdfs">PDFs ({content.pdfs.length})</TabsTrigger>
              <TabsTrigger value="images">Images ({content.images.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {content.text_messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No text messages yet.</p>
                ) : (
                  <div className="space-y-3 pr-4">
                    {content.text_messages.map((m) => (
                      <Card key={m.id} className="py-3">
                        <CardHeader className="px-4 pb-0 pt-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>#{m.id}</span>
                            {m.date && <span>{m.date}</span>}
                            {m.views != null && <span>{m.views} views</span>}
                            {m.is_forward && <Badge variant="secondary" className="text-[10px] py-0">forwarded</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pt-2 pb-0">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                          {m.link && (
                            <a
                              href={m.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-xs text-primary hover:underline"
                            >
                              Open in Telegram
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pdfs">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {content.pdfs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No PDFs yet.</p>
                ) : (
                  <div className="space-y-2 pr-4">
                    {content.pdfs.map((p) => (
                      <Card key={p.message_id} className="py-3">
                        <CardContent className="flex items-center gap-3 px-4 py-0">
                          <File className="size-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.original_name || p.filename || "PDF"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[p.date, formatBytes(p.file_size)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button size="xs" asChild>
                              <a
                                href={`/files/pdfs/${encodeURIComponent(p.filename)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open
                              </a>
                            </Button>
                            {p.link && (
                              <Button size="xs" variant="outline" asChild>
                                <a href={p.link} target="_blank" rel="noopener noreferrer">
                                  TG
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="images">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {content.images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No images yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pr-4 sm:grid-cols-3">
                    {content.images.map((img) => (
                      <Card key={img.message_id} className="overflow-hidden py-0">
                        <a
                          href={`/files/images/${encodeURIComponent(img.filename)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={`/files/images/${encodeURIComponent(img.filename)}`}
                            alt={img.caption || ""}
                            className="h-36 w-full object-cover"
                            loading="lazy"
                          />
                        </a>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">
                            {[img.date, formatBytes(img.file_size)].filter(Boolean).join(" · ")}
                          </p>
                          {img.caption && (
                            <p className="mt-1 text-xs line-clamp-2">{img.caption}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
