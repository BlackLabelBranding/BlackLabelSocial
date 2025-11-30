"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
  id: string;
  name: string;
};

const PLATFORMS = ["X", "Instagram", "Facebook", "LinkedIn", "TikTok"] as const;
type Platform = (typeof PLATFORMS)[number];

function PostComposer() {
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "X",
    "Instagram",
  ]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const maxXChars = 280;
  const charCount = caption.length;
  const remaining = maxXChars - charCount;
  const hashtagCount =
    caption.match(/#[\p{L}\d_]+/gu)?.length ?? 0; // counts #hashtags

  const togglePlatform = (platform: Platform) => {
    setStatusMsg(null);
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerateAI = () => {
    // Placeholder – later this will call your API/Edge function.
    setCaption(
      "Excited to share what we’re building with Black Label Social! 🚀 #Marketing #SocialMedia"
    );
    setStatusMsg("Sample AI caption inserted (placeholder).");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);

    // For now just simulate saving – later we’ll insert into Supabase `scheduled_posts`.
    setTimeout(() => {
      setSubmitting(false);
      setStatusMsg(
        `Post scheduled (${selectedPlatforms.join(
          ", "
        )}) for ${scheduledDate || "today"} ${
          scheduledTime || ""
        }. (Not yet saved to DB – UI only for now.)`
      );
    }, 500);
  };

  return (
    <section className="mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 max-w-4xl">
        <h2 className="text-sm font-semibold mb-2">Create a post</h2>
        <p className="text-xs text-slate-400 mb-4">
          Choose platforms, write your caption, and schedule it. This is just the
          first version of the composer – we&apos;ll wire it to Supabase next.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platforms */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-300">
              Platforms
            </span>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const active = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      active
                        ? "bg-slate-100 text-slate-900 border-slate-100"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Caption</span>
              <div className="flex gap-3 text-[11px] text-slate-400">
                <span>
                  X characters:{" "}
                  <span
                    className={
                      charCount > maxXChars ? "text-red-400 font-semibold" : ""
                    }
                  >
                    {charCount}/{maxXChars}
                  </span>
                </span>
                <span>Hashtags: {hashtagCount}</span>
              </div>
            </div>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setStatusMsg(null);
              }}
              placeholder="Write something engaging about your brand, offer, or announcement..."
            />
            {charCount > maxXChars && (
              <p className="text-[11px] text-red-400">
                X.com limit exceeded by {charCount - maxXChars} characters. We’ll
                add auto-trimming options later.
              </p>
            )}
          </div>

          {/* Schedule */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">
                Schedule date
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">
                Time (optional)
              </label>
              <input
                type="time"
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={handleGenerateAI}
              className="text-xs px-3 py-2 rounded-md border border-slate-600 bg-slate-900 hover:bg-slate-800"
            >
              Generate with AI (placeholder)
            </button>
            <button
              type="submit"
              disabled={submitting || !caption.trim()}
              className="text-xs px-4 py-2 rounded-md bg-white text-slate-950 font-medium disabled:opacity-60"
            >
              {submitting ? "Scheduling..." : "Schedule post"}
            </button>
          </div>

          {statusMsg && (
            <p className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-700 rounded-md px-3 py-2">
              {statusMsg}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

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
            Scheduler dashboard – composer, counters, and calendar are under
            construction.
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

      <section className="p-6 space-y-4">
        <PostComposer />

        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
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
              We&apos;ll add a calendar view, Supabase-backed scheduled posts, and
              real AI caption generation here.
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
