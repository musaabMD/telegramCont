import { useMemo } from "react"
import { Image, CheckCircle2, Clock } from "lucide-react"
import { StatCard } from "./StatCard"

type ImageRow = {
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

export function ImagesStep({
  rows,
}: {
  rows: ImageRow[]
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
          4
        </span>
        <h1 className="text-2xl font-bold">Images</h1>
        <span className="text-sm text-muted-foreground">
          {stats.total} items
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Images"
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

      {/* Images Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-[120px]">Preview</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Caption / Filename</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No images found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="h-16 w-20 rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                      <Image className="size-6 text-muted-foreground" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="line-clamp-2 text-sm">{row.content}</div>
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
