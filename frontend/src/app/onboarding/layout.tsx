// Layout exclusivo do onboarding — sem sidebar nem topbar
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo ELLAHOS no topo */}
      <div className="mb-8 flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          ELLA<span className="text-primary">OS</span>
        </span>
      </div>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  )
}
