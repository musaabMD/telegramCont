export type StepGroup = {
  color: string
  items: { label: string; slug: string }[]
}

export const groups: StepGroup[] = [
  {
    color: "bg-blue-600",
    items: [{ label: "Channels", slug: "channels" }],
  },
  {
    color: "bg-amber-500",
    items: [{ label: "Extractions", slug: "extractions" }],
  },
  {
    color: "bg-emerald-600",
    items: [
      { label: "Text", slug: "text" },
      { label: "Images", slug: "images" },
      { label: "Files", slug: "files" },
    ],
  },
  {
    color: "bg-purple-600",
    items: [
      { label: "MCQs", slug: "mcqs" },
      { label: "HY", slug: "hy" },
      { label: "Flashcards", slug: "flashcards" },
      { label: "Repeated", slug: "repeated" },
      { label: "Library", slug: "library" },
    ],
  },
  {
    color: "bg-cyan-600",
    items: [
      { label: "AI Rejected", slug: "ai-rejected" },
      { label: "AI Approved", slug: "ai-approved" },
    ],
  },
  {
    color: "bg-rose-600",
    items: [
      { label: "Human", slug: "human" },
      { label: "Published", slug: "published" },
    ],
  },
]

export type StepInfo = {
  label: string
  slug: string
  color: string
  number: number
}

export const steps: StepInfo[] = groups.flatMap((group, gi) => {
  const startIndex = groups
    .slice(0, gi)
    .reduce((sum, g) => sum + g.items.length, 0)
  return group.items.map((item, i) => ({
    label: item.label,
    slug: item.slug,
    color: group.color,
    number: startIndex + i + 1,
  }))
})

export function getStep(slug: string): StepInfo | undefined {
  return steps.find((s) => s.slug === slug)
}
