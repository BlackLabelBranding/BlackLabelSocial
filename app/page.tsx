export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-2xl w-full card space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Black Label Social
        </h1>
        <p className="text-sm text-slate-600">
          Schedule posts, use AI to write captions, and manage all your social
          platforms from one clean dashboard.
        </p>

        <div className="flex gap-3">
          <a href="/signup" className="btn-primary">
            Get started
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900"
          >
            Log in
          </a>
        </div>

        <p className="text-xs text-slate-500">
          Built by Black Label Branding LLC.
        </p>
      </div>
    </main>
  );
}
