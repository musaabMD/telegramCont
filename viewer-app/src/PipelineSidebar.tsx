import { GraduationCap, PanelLeft } from "lucide-react"
import { groups } from "./steps"
import { Button } from "@/components/ui/button"

export function PipelineSidebar({
  examName,
  activeStep,
  onStepChange,
  counts,
  collapsed,
  onToggle,
}: {
  examName: string
  activeStep: string
  onStepChange: (slug: string) => void
  counts: Record<string, number>
  collapsed: boolean
  onToggle: () => void
}) {
  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r bg-sidebar flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-sidebar-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="w-full border-t border-sidebar-border my-1" />
        {groups.flatMap((group, gi) => {
          const startIndex = groups
            .slice(0, gi)
            .reduce((sum, g) => sum + g.items.length, 0)
          return group.items.map((item, i) => {
            const stepNum = startIndex + i + 1
            const isActive = activeStep === item.slug
            return (
              <button
                key={item.slug}
                onClick={() => onStepChange(item.slug)}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white transition-all ${group.color} ${isActive ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"}`}
                title={item.label}
              >
                {stepNum}
              </button>
            )
          })
        })}
      </div>
    )
  }

  return (
    <div className="w-64 shrink-0 border-r bg-sidebar flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{examName}</p>
          <p className="text-xs text-muted-foreground">Pipeline</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 shrink-0 text-sidebar-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group, gi) => {
          const startIndex = groups
            .slice(0, gi)
            .reduce((sum, g) => sum + g.items.length, 0)

          return (
            <div
              key={gi}
              className={gi > 0 ? "border-t border-sidebar-border pt-2 mt-2" : ""}
            >
              {group.items.map((item, i) => {
                const stepNum = startIndex + i + 1
                const isActive = activeStep === item.slug
                const count = counts[item.slug] ?? 0

                return (
                  <button
                    key={item.slug}
                    onClick={() => onStepChange(item.slug)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${group.color}`}
                    >
                      {stepNum}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
