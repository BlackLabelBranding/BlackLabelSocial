"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
  id: string;
  name: string;
};

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const workspaceId = searchParams.get("workspaceId");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      if (workspaceId) {
        const { data, error } = await supabase
          .from("workspaces")
          .select("id, name")
          .eq("id", workspaceId)
          .single();

        if (!error && data) {
          setWorkspace(data as Workspace);
        }
      }

      setLoading(false);
    }

    load();
  }, [workspaceId, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <p className="text-sm text-slate-300">Loading your workspace...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-semibold">
            {workspace ? workspace.name : "Black Label Social"}
          </h1>
          <p className="text-xs text-slate-400">
            Scheduler dashboard (placeholder) – next step we build composer, calendar,
            and integrations.
          </p>
        </div>
        <button
          className="text-xs text-slate-400 underline"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        >
          Log out
        </button>
      </header>

      <section className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Quick actions</h2>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Connect your social accounts</li>
              <li>• Create your first scheduled post</li>
              <li>• Invite teammates from your brand</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Coming next</h2>
            <p className="text-xs text-slate-300">
              This is where we’ll add the composer (with AI + hashtag/character counters)
              and calendar views.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
          <p className="text-sm text-slate-300">Loading dashboard...</p>
        </main>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
