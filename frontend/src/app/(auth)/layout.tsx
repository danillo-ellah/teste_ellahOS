export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <h1 className="text-3xl font-bold tracking-tight">
            ELLAH<span className="text-primary">OS</span>
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
