export default function PersonDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 rounded bg-muted/40 animate-pulse" />
      <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" />
      <div className="h-8 w-full rounded bg-muted/40 animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
