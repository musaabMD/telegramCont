import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

const API = "" // same origin via Vite proxy

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

function formatBytes(n: number | undefined) {
  if (n == null) return ""
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(2) + " MB"
}

export default function App() {
  const [summary, setSummary] = useState<string>("")
  const [textMessages, setTextMessages] = useState<TextMessage[]>([])
  const [pdfs, setPdfs] = useState<PdfMeta[]>([])
  const [images, setImages] = useState<ImageMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/summary`).then((r) => r.json()),
      fetch(`${API}/api/text_messages`).then((r) => r.json()),
      fetch(`${API}/api/pdfs`).then((r) => r.json()),
      fetch(`${API}/api/images`).then((r) => r.json()),
    ])
      .then(([s, t, p, i]) => {
        setSummary((s as { summary?: string })?.summary ?? "")
        setTextMessages(Array.isArray(t) ? t : [])
        setPdfs(Array.isArray(p) ? p : [])
        setImages(Array.isArray(i) ? i : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Extracted Channel Content
        </h1>
        <p className="mb-6 text-muted-foreground">
          Browse text messages, PDFs, and images from the extracted Telegram channel.
        </p>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="text">Text messages</TabsTrigger>
            <TabsTrigger value="pdfs">PDFs</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <ScrollArea className="h-[70vh] rounded-lg border p-4">
              {loading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : summary ? (
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {summary}
                </pre>
              ) : (
                <p className="text-muted-foreground">
                  No summary yet. Run <code className="rounded bg-muted px-1">python main.py</code> or{" "}
                  <code className="rounded bg-muted px-1">extract_text_only.py</code> first.
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="text">
            <ScrollArea className="h-[70vh] pr-4">
              {loading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : textMessages.length === 0 ? (
                <p className="text-muted-foreground">No text messages.</p>
              ) : (
                <div className="space-y-4">
                  {textMessages.map((m) => (
                    <Card key={m.id}>
                      <CardHeader className="pb-2">
                        <p className="text-xs text-muted-foreground">
                          #{m.id}
                          {m.date && ` · ${m.date}`}
                          {m.views != null && ` · ${m.views} views`}
                          {m.is_caption && " · caption"}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                        {m.link && (
                          <Button variant="link" className="mt-2 h-auto p-0" asChild>
                            <a href={m.link} target="_blank" rel="noopener noreferrer">
                              Open in Telegram
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pdfs">
            <ScrollArea className="h-[70vh] pr-4">
              {loading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : pdfs.length === 0 ? (
                <p className="text-muted-foreground">No PDFs.</p>
              ) : (
                <div className="space-y-4">
                  {pdfs.map((p) => (
                    <Card key={p.message_id}>
                      <CardHeader className="pb-2">
                        <p className="font-medium">
                          {p.original_name || p.filename || "PDF"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.date && `Posted: ${p.date} · `}
                          {formatBytes(p.file_size)}
                        </p>
                      </CardHeader>
                      <CardContent className="flex gap-2 pt-0">
                        <Button size="sm" asChild>
                          <a
                            href={`${API}/files/pdfs/${encodeURIComponent(p.filename)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download / Open PDF
                          </a>
                        </Button>
                        {p.link && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={p.link} target="_blank" rel="noopener noreferrer">
                              Telegram
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="images">
            <ScrollArea className="h-[70vh] pr-4">
              {loading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : images.length === 0 ? (
                <p className="text-muted-foreground">No images.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => (
                    <Card key={img.message_id} className="overflow-hidden">
                      <a
                        href={`${API}/files/images/${encodeURIComponent(img.filename)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={`${API}/files/images/${encodeURIComponent(img.filename)}`}
                          alt=""
                          className="h-40 w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">
                          {img.date && `${img.date} · `}
                          {formatBytes(img.file_size)}
                        </p>
                        {img.caption && (
                          <p className="mt-1 line-clamp-2 text-xs">
                            {img.caption.slice(0, 80)}
                            {img.caption.length > 80 ? "…" : ""}
                          </p>
                        )}
                        {img.link && (
                          <Button
                            size="sm"
                            variant="link"
                            className="mt-1 h-auto p-0 text-xs"
                            asChild
                          >
                            <a href={img.link} target="_blank" rel="noopener noreferrer">
                              Telegram
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
