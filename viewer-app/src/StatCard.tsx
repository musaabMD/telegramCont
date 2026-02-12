import { type LucideIcon } from "lucide-react"

type StatCardVariant = "default" | "success" | "danger" | "warning" | "info"

const variantStyles: Record<StatCardVariant, { card: string; label: string; value: string }> = {
  default: {
    card: "border bg-card hover:bg-muted/50",
    label: "text-muted-foreground",
    value: "text-foreground",
  },
  success: {
    card: "bg-green-50 border-green-200 hover:bg-green-100",
    label: "text-green-700 font-medium",
    value: "text-green-700",
  },
  danger: {
    card: "bg-red-50 border-red-200 hover:bg-red-100",
    label: "text-red-700 font-medium",
    value: "text-red-700",
  },
  warning: {
    card: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    label: "text-orange-700 font-medium",
    value: "text-orange-700",
  },
  info: {
    card: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    label: "text-blue-700 font-medium",
    value: "text-blue-700",
  },
}

export function StatCard({
  label,
  value,
  percentage,
  icon: Icon,
  variant = "default",
  isActive = false,
  onClick,
  showPercentage = true,
}: {
  label: string
  value: string | number
  percentage?: number
  icon?: LucideIcon
  variant?: StatCardVariant
  isActive?: boolean
  onClick?: () => void
  showPercentage?: boolean
}) {
  const styles = variantStyles[variant]

  return (
    <button
      onClick={onClick}
      className={[
        "rounded-lg p-4 text-left transition-all cursor-pointer",
        styles.card,
        isActive ? "ring-2 ring-primary ring-offset-2" : "",
        onClick ? "hover:shadow-md active:scale-[0.98]" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-1">
        <div className={`text-sm ${styles.label}`}>{label}</div>
        {Icon && <Icon className="h-4 w-4 opacity-50" />}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`text-2xl font-bold ${styles.value}`}>{value}</div>
        {showPercentage && percentage !== undefined && (
          <div className={`text-sm ${styles.value}`}>({percentage}%)</div>
        )}
      </div>
    </button>
  )
}
