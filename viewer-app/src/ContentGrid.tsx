import { useMemo, useRef, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Badge } from "@/components/ui/badge"
import {
  Hash,
  ExternalLink,
  Bot,
  Loader2,
  DollarSign,
  Sparkles,
  MessageSquare,
  ArrowUpDown,
} from "lucide-react"

export type ContentRow = {
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
}

interface ContentGridProps {
  rows: ContentRow[]
  selectedRows: Set<string>
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>
  processingIds: Set<string>
  onProcess: (row: ContentRow) => void
  onAiStatusChange: (args: { table: string; id: string; ai_status: string }) => void
  onCommentSave: (args: { id: string; comment: string }) => void
  aiStatusOptions: { value: string; label: string }[]
}

const columnHelper = createColumnHelper<ContentRow>()

export function ContentGrid({
  rows,
  selectedRows,
  setSelectedRows,
  processingIds,
  onProcess,
  onAiStatusChange,
  onCommentSave,
  aiStatusOptions,
}: ContentGridProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const columns = useMemo(
    () => [
      // Checkbox
      columnHelper.display({
        id: "select",
        size: 40,
        enableSorting: false,
        header: () => {
          const allSelected = rows.length > 0 && selectedRows.size === rows.length
          const someSelected = selectedRows.size > 0 && selectedRows.size < rows.length
          return (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRows(new Set(rows.map((r) => r.id)))
                } else {
                  setSelectedRows(new Set())
                }
              }}
              className="size-4 rounded border-input accent-primary cursor-pointer"
            />
          )
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => {
              setSelectedRows((prev) => {
                const next = new Set(prev)
                if (next.has(row.original.id)) next.delete(row.original.id)
                else next.add(row.original.id)
                return next
              })
            }}
            onClick={(e) => e.stopPropagation()}
            className="size-4 rounded border-input accent-primary cursor-pointer"
          />
        ),
      }),

      // Original Content
      columnHelper.accessor("content", {
        header: "Original Content",
        size: 220,
        cell: ({ row }) => {
          const r = row.original
          const isExpanded = expandedRow === r.id
          if (r.type === "Image" && r.attachment) {
            return (
              <div className="flex items-center gap-3">
                <img
                  src={`/files/images/${encodeURIComponent(r.attachment)}`}
                  alt=""
                  className="h-12 w-12 rounded object-cover shrink-0"
                  loading="lazy"
                />
                <span className="truncate text-sm">{r.content}</span>
              </div>
            )
          }
          return (
            <p className={`text-sm leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
              {r.content}
            </p>
          )
        },
      }),

      // Question
      columnHelper.accessor("q_text", {
        header: () => (
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Question
          </span>
        ),
        size: 200,
        cell: ({ row }) => {
          const r = row.original
          const isExpanded = expandedRow === r.id
          if (r.q_text) {
            return (
              <p className={`text-sm leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                {r.q_text}
              </p>
            )
          }
          if (r.type === "Text") {
            return <span className="text-xs text-muted-foreground/50">Not processed</span>
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Choices
      columnHelper.accessor("choices", {
        header: "Choices",
        size: 200,
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original
          const isExpanded = expandedRow === r.id
          if (r.choices && r.choices.length > 0) {
            return (
              <div className="space-y-0.5">
                {r.choices.map((c, i) => (
                  <p
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded ${
                      i === r.correct_choice_index
                        ? "bg-emerald-500/15 text-emerald-400 font-medium"
                        : "text-muted-foreground"
                    } ${isExpanded ? "" : i > 1 ? "hidden" : ""}`}
                  >
                    {c}
                  </p>
                ))}
                {!isExpanded && r.choices.length > 2 && (
                  <span className="text-xs text-muted-foreground/50">
                    +{r.choices.length - 2} more
                  </span>
                )}
              </div>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Correct Answer
      columnHelper.accessor("correct_choice_index", {
        header: "Ans",
        size: 56,
        cell: ({ getValue }) => {
          const idx = getValue()
          if (idx != null) {
            return (
              <Badge className="bg-emerald-600 text-xs px-2">
                {String.fromCharCode(65 + idx)}
              </Badge>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Explanation
      columnHelper.accessor("explanation", {
        header: "Explanation",
        size: 180,
        cell: ({ row }) => {
          const r = row.original
          const isExpanded = expandedRow === r.id
          if (r.explanation) {
            return (
              <div>
                <p
                  className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}
                >
                  {r.explanation}
                </p>
                {isExpanded && r.hy_summary && (
                  <p className="text-xs font-medium text-blue-400 mt-1 border-t pt-1">
                    HY: {r.hy_summary}
                  </p>
                )}
              </div>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Subject
      columnHelper.accessor("subject", {
        header: "Subject",
        size: 96,
        cell: ({ getValue }) => {
          const val = getValue()
          if (val) {
            return (
              <Badge variant="outline" className="text-xs">
                {val}
              </Badge>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Topic
      columnHelper.accessor("topic", {
        header: "Topic",
        size: 96,
        cell: ({ getValue }) => {
          const val = getValue()
          if (val) return <span className="text-xs text-muted-foreground">{val}</span>
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Source
      columnHelper.accessor("channel", {
        header: "Source",
        size: 96,
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
            <Hash className="size-3" />
            {getValue()}
          </span>
        ),
      }),

      // AI Status
      columnHelper.accessor("aiStatus", {
        header: "AI Status",
        size: 128,
        cell: ({ row }) => {
          const r = row.original
          const isProcessing = processingIds.has(r.docId)
          return (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={r.aiStatus || ""}
                onChange={(e) => {
                  onAiStatusChange({
                    table: r.table,
                    id: r.docId,
                    ai_status: e.target.value,
                  })
                }}
                className={`rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring ${
                  r.aiStatus === "done"
                    ? "text-emerald-500"
                    : r.aiStatus === "in_progress"
                      ? "text-blue-500"
                      : r.aiStatus === "todo"
                        ? "text-yellow-500"
                        : "text-muted-foreground"
                }`}
              >
                <option value="">--</option>
                {aiStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {r.type === "Text" && r.aiStatus !== "done" && (
                <button
                  onClick={() => onProcess(r)}
                  disabled={isProcessing}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                  title="Process with AI"
                >
                  {isProcessing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                </button>
              )}
            </div>
          )
        },
      }),

      // Cost
      columnHelper.accessor("ai_cost", {
        header: () => (
          <span className="flex items-center gap-1">
            <DollarSign className="size-3.5" />
            Cost
          </span>
        ),
        size: 80,
        cell: ({ row }) => {
          const r = row.original
          if (r.ai_cost != null && r.ai_cost > 0) {
            return (
              <div>
                <span className="text-xs font-mono text-muted-foreground">
                  ${r.ai_cost.toFixed(6)}
                </span>
                {r.ai_total_tokens ? (
                  <span className="block text-[10px] font-mono text-muted-foreground/60">
                    {r.ai_total_tokens.toLocaleString()} tok
                  </span>
                ) : null}
              </div>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Comment
      columnHelper.accessor("comment", {
        header: () => (
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            Comment
          </span>
        ),
        size: 160,
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original
          if (r.type === "Text") {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  key={r.comment}
                  defaultValue={r.comment || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (r.comment || "")) {
                      onCommentSave({ id: r.docId, comment: e.target.value })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                  placeholder="Add note..."
                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs text-muted-foreground hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),

      // Link
      columnHelper.accessor("link", {
        header: "",
        size: 40,
        enableSorting: false,
        cell: ({ getValue }) => {
          const link = getValue()
          if (link) {
            return (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-4" />
              </a>
            )
          }
          return <span className="text-muted-foreground/40">--</span>
        },
      }),
    ],
    [
      rows.length,
      selectedRows,
      expandedRow,
      processingIds,
      setSelectedRows,
      onProcess,
      onAiStatusChange,
      onCommentSave,
      aiStatusOptions,
    ]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  })

  const { rows: tableRows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 15,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-16 text-center text-muted-foreground text-base">
        No content found
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-lg border"
      style={{ height: "calc(100vh - 320px)" }}
    >
      <table className="w-full" style={{ minWidth: 1800 }}>
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-muted">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`px-4 py-3 text-left text-sm font-semibold text-muted-foreground ${
                    header.column.getCanSort() ? "cursor-pointer select-none hover:text-foreground" : ""
                  }`}
                  style={{ width: header.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && !header.column.getIsSorted() && (
                      <ArrowUpDown className="size-3 text-muted-foreground/40" />
                    )}
                    {header.column.getIsSorted() === "asc" && (
                      <span className="text-xs text-primary">↑</span>
                    )}
                    {header.column.getIsSorted() === "desc" && (
                      <span className="text-xs text-primary">↓</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = tableRows[virtualRow.index]
            return (
              <tr
                key={row.id}
                className={`border-b transition-colors hover:bg-accent/30 cursor-pointer ${
                  selectedRows.has(row.original.id) ? "bg-accent/20" : ""
                }`}
                onClick={() =>
                  setExpandedRow(expandedRow === row.original.id ? null : row.original.id)
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
