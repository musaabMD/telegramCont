import { useState } from "react"
import { X, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RightSidebarPanel({
  activeStep,
  open,
  onToggle,
}: {
  activeStep: string
  open: boolean
  onToggle: () => void
}) {
  if (!open) return null

  return (
    <div className="w-80 shrink-0 border-l bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Details</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <RightSidebarContent activeStep={activeStep} />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t">
        <p className="text-xs text-muted-foreground">Last updated: Just now</p>
      </div>
    </div>
  )
}

function RightSidebarContent({ activeStep }: { activeStep: string }) {
  const [isRunning, setIsRunning] = useState(false)

  switch (activeStep) {
    case "extractions":
      return (
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Extraction Controls</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsRunning(true)}
                disabled={isRunning}
                className="flex-1 gap-2"
                variant={isRunning ? "secondary" : "default"}
              >
                <Play className="h-4 w-4" />
                Run
              </Button>
              <Button
                onClick={() => setIsRunning(false)}
                disabled={!isRunning}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
            {isRunning && (
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700 font-medium">Extraction is running...</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rules to Follow</label>
            <textarea
              placeholder={"Example:\n\u2022 Extract only medical questions\n\u2022 Ignore duplicate content\n\u2022 Validate data format"}
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Define the rules and guidelines for the extraction process
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Runs</label>
            <input
              type="number"
              placeholder="e.g., 10"
              min={1}
              defaultValue={1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule Frequency</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="e.g., 7"
                min={1}
                defaultValue={1}
                className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="days">Days</option>
                <option value="hours">Hours</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </div>
      )

    case "mcqs":
      return (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt for Question Text</label>
            <textarea
              placeholder="Enter prompt for question..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Choices</label>
            <textarea
              placeholder="Enter choices..."
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Correct Choice</label>
            <input
              placeholder="Enter correct choice..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Explanation</label>
            <textarea
              placeholder="Enter explanation..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <input
              placeholder="Enter category..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <input
              placeholder="Enter topic..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )

    case "hy":
      return (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt Field</label>
            <textarea
              placeholder="Enter prompt..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
        </div>
      )

    case "flashcards":
      return (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-2">
              <label className="text-sm font-medium">Field {n}</label>
              <textarea
                placeholder={`Enter field ${n}...`}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
          ))}
        </div>
      )

    case "repeated":
      return (
        <div className="p-4 space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="space-y-2">
              <label className="text-sm font-medium">Field {n}</label>
              <textarea
                placeholder={`Enter field ${n}...`}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
          ))}
        </div>
      )

    case "library":
      return (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="space-y-2">
              <label className="text-sm font-medium">Field {n}</label>
              <input
                placeholder={`Enter field ${n}...`}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      )

    case "channels":
      return (
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">Add Channel</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Username</label>
            <input
              placeholder="@channelname"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Enter the Telegram channel username (e.g., @medschool)
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              placeholder="Medical School Channel"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              placeholder="Channel description..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform</label>
            <input
              defaultValue="telegram"
              disabled
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Currently only Telegram is supported</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Start Date</label>
            <input
              type="date"
              defaultValue="2025-01-01"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button className="w-full">Add Channel</Button>
        </div>
      )

    case "text":
      return (
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Text Content Settings</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Accept Rules</label>
            <textarea
              placeholder={"Example:\n\u2022 Must be a complete question\n\u2022 Minimum 50 characters\n\u2022 Contains medical terminology"}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reject Rules</label>
            <textarea
              placeholder={"Example:\n\u2022 Contains spam keywords\n\u2022 Less than 20 characters\n\u2022 Not in English"}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <Button className="w-full">Apply Settings</Button>
        </div>
      )

    case "images":
      return (
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Image Settings</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Accept Rules</label>
            <textarea
              placeholder={"Example:\n\u2022 Resolution above 1000x800\n\u2022 Contains medical diagrams\n\u2022 Clear and high quality"}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reject Rules</label>
            <textarea
              placeholder={"Example:\n\u2022 Resolution below 800x600\n\u2022 Contains watermarks\n\u2022 Blurry or low quality"}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Resolution</label>
            <input
              placeholder="e.g., 800x600"
              defaultValue="800x600"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max File Size (MB)</label>
            <input
              type="number"
              placeholder="e.g., 5"
              min={1}
              defaultValue={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button className="w-full">Apply Settings</Button>
        </div>
      )

    case "files":
      return (
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">File Settings</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Accept Rules</label>
            <textarea
              placeholder={"Example:\n\u2022 PDF or DOCX format\n\u2022 Size under 50MB\n\u2022 Contains educational content"}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Allowed File Types</label>
            <input
              placeholder="pdf, docx, xlsx, zip"
              defaultValue="pdf, docx, xlsx, zip"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max File Size (MB)</label>
            <input
              type="number"
              placeholder="e.g., 50"
              min={1}
              defaultValue={50}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button className="w-full">Apply Settings</Button>
        </div>
      )

    default:
      return (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Quick Actions</h3>
            <div className="space-y-1">
              {["Export Data", "Import Data", "Settings"].map((action) => (
                <button
                  key={action}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Recent Activity</h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-md bg-accent">
                <p className="font-medium">Item processed</p>
                <p className="text-muted-foreground">2 minutes ago</p>
              </div>
              <div className="p-2 rounded-md bg-accent">
                <p className="font-medium">Export completed</p>
                <p className="text-muted-foreground">15 minutes ago</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Statistics</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed:</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-medium">--</span>
              </div>
            </div>
          </div>
        </div>
      )
  }
}
