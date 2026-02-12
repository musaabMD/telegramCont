import { useMemo } from "react"
import { File, FileText, CheckCircle2, Clock } from "lucide-react"
import { StatCard } from "./StatCard"

type FileRow = {
  id: string
  docId: string
  content: string
  date: string
  channel: string
  link?: string
  attachment?: string
  fileSize?: number
}

function formatDate(d: string | undefined) {
  if (!d) return ""
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return <FileText className="size-5 text-red-500" />
  if (ext === "docx" || ext === "doc") return <FileText className="size-5 text-blue-500" />
  if (ext === "xlsx" || ext === "xls") return <FileText className="size-5 text-green-500" />
  return <File className="size-5 text-gray-500" />
}

export function FilesStep({
  rows,
}: {
  rows: FileRow[]
}) {
  const stats = useMemo(() => {
    const total = rows.length
    const totalSize = rows.reduce((sum, r) => sum + (r.fileSize ?? 0), 0)
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(1)
    return { total, sizeMB }
  }, [rows])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-emerald-600">
          5
        </span>
        <h1 className="text-2xl font-bold">Files</h1>
        <span className="text-sm text-muted-foreground">
          {stats.total} items
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Files"
          value={stats.total}
          variant="default"
          showPercentage={false}
        />
        <StatCard
          label="Total Size"
          value={`${stats.sizeMB} MB`}
          variant="info"
          showPercentage={false}
        />
        <StatCard
          label="Accepted"
          value={stats.total}
          icon={CheckCircle2}
          variant="success"
          showPercentage={false}
        />
        <StatCard
          label="Pending Review"
          value={0}
          icon={Clock}
          variant="warning"
          showPercentage={false}
        />
      </div>

      {/* Files Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground w-[60px]">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">File Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No files found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-center">
                    {getFileIcon(row.content)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{row.content}</div>
                    {row.link && (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View Source
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{row.channel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{formatDate(row.date)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {row.fileSize ? `${(row.fileSize / 1024).toFixed(0)} KB` : "--"}
                    </span>
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
