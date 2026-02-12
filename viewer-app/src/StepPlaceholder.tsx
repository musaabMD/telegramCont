import { getStep } from "./steps"

export function StepPlaceholder({ slug }: { slug: string }) {
  const step = getStep(slug)
  if (!step) return null

  const sampleItems = [
    { id: 1, name: "Item A", status: "Completed", date: "2026-02-08", result: "Pass" },
    { id: 2, name: "Item B", status: "Pending", date: "2026-02-09", result: "\u2014" },
    { id: 3, name: "Item C", status: "Failed", date: "2026-02-07", result: "Fail" },
    { id: 4, name: "Item D", status: "Completed", date: "2026-02-10", result: "Pass" },
    { id: 5, name: "Item E", status: "Running", date: "2026-02-10", result: "\u2014" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${step.color}`}
        >
          {step.number}
        </span>
        <h1 className="text-2xl font-bold">{step.label}</h1>
        <span className="text-sm text-muted-foreground">0 items</span>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Last Run</div>
          <div className="text-2xl font-bold">--</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Success Rate</div>
          <div className="text-2xl font-bold">--</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Cost</div>
          <div className="text-2xl font-bold">$0</div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Items</h2>
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Result</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm">{item.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm">{item.status}</td>
                  <td className="px-4 py-3 text-sm">{item.date}</td>
                  <td className="px-4 py-3 text-sm">{item.result}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
                        Edit
                      </button>
                      <button className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600">
                        Run
                      </button>
                      <button className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
