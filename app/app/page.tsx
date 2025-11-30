"use client";

import {
  Suspense,
  useEffect,
  useState,
  FormEvent,
  useMemo,
  ChangeEvent,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
  id: string;
  name: string;
};

const PLATFORMS = ["X", "Instagram", "Facebook", "LinkedIn", "TikTok"] as const;
type Platform = (typeof PLATFORMS)[number];

const QUICK_TEMPLATES: string[] = [
  "Announce a limited-time offer with urgency.",
  "Share a behind-the-scenes moment from today.",
  "Promote an upcoming event with date and time.",
  "Highlight a customer testimonial or review.",
];

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function PostComposer() {
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "X",
    "Instagram",
  ]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<
    number | null
  >(null);

  const maxXChars = 280;
  const charCount = caption.length;
  const remaining = maxXChars - charCount;
  const hashtagCount =
    caption.match(/#[\p{L}\d_]+/gu)?.length ?? 0; // counts #hashtags
  const wordCount =
    caption.trim().length === 0
      ? 0
      : caption.trim().split(/\s+/).filter(Boolean).length;

  const primaryPlatform: Platform | null = useMemo(
    () => (selectedPlatforms.length ? selectedPlatforms[0] : null),
    [selectedPlatforms]
  );

  const handleCaptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCaption(e.target.value);
    setStatusMsg(null);
    setStatusType(null);
  };

  const togglePlatform = (platform: Platform) => {
    setStatusMsg(null);
    setStatusType(null);
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerateAI = () => {
    // Placeholder – later this will call your API/Edge function.
    const sample =
      "We’re leveling up social media for our brand with Black Label Social. 🚀\n\n" +
      "Schedule posts, stay consistent, and keep your message in front of the right people.\n\n" +
      "#BlackLabelSocial #Marketing #ContentStrategy";
    setCaption(sample);
    setStatusMsg("Sample AI-style caption inserted (placeholder).");
    setStatusType("success");
  };

  const handleApplyTemplate = (index: number) => {
    setSelectedTemplateIndex(index);
    const template = QUICK_TEMPLATES[index];
    if (!caption.trim()) {
      setCaption(template);
    } else {
      setCaption((c) => (c.endsWith(" ") ? c + template : c + " " + template));
    }
    setStatusMsg("Template added to your caption.");
    setStatusType("success");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);
    setStatusType(null);

    if (!caption.trim()) {
      setSubmitting(false);
      setStatusMsg("Write a caption before scheduling.");
      setStatusType("error");
      return;
    }

    if (!selectedPlatforms.length) {
      setSubmitting(false);
      setStatusMsg("Select at least one platform.");
      setStatusType("error");
      return;
    }

    // For now just simulate saving – later we’ll insert into Supabase `scheduled_posts`.
    setTimeout(() => {
      setSubmitting(false);
      setStatusMsg(
        `Post scheduled for ${scheduledDate || "today"} ${
          scheduledTime || ""
        } on ${selectedPlatforms.join(", ")}. (UI-only for now – not yet saved to DB.)`
      );
      setStatusType("success");
    }, 600);
  };

  return (
    <section className="space-y-4 max-w-6xl mx-auto">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Left: Composer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl shadow-black/40 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold">Create a post</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Choose platforms, write your caption, and schedule it. This is the
                first version of the composer – we&apos;ll plug it into Supabase and
                real social APIs next.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1 text-[11px] text-slate-400">
              <span>
                Words: <span className="text-slate-200">{wordCount}</span>
              </span>
              <span>
                Hashtags:{" "}
                <span className="text-slate-200">{hashtagCount}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                      className={classNames(
                        "px-3 py-1.5 rounded-full text-[11px] border transition flex items-center gap-1",
                        active
                          ? "bg-slate-100 text-slate-900 border-slate-100"
                          : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                      )}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {platform}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption + Counters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-300">Caption</span>
                <div className="flex gap-3 text-slate-400">
                  <span>
                    X characters:{" "}
                    <span
                      className={classNames(
                        charCount > maxXChars &&
                          "text-red-400 font-semibold"
                      )}
                    >
                      {charCount}/{maxXChars}
                    </span>
                  </span>
                  <span className="hidden sm:inline">
                    Words:{" "}
                    <span className="text-slate-200">{wordCount}</span>
                  </span>
                  <span className="hidden sm:inline">
                    Hashtags:{" "}
                    <span className="text-slate-200">{hashtagCount}</span>
                  </span>
                </div>
              </div>
              <textarea
                className="w-full min-h-[130px] rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-y"
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Write something engaging about your brand, offer, or announcement..."
              />
              {charCount > maxXChars && (
                <p className="text-[11px] text-red-400 mt-1">
                  X.com limit exceeded by {charCount - maxXChars} characters.
                  Later we&apos;ll add auto-trimming and platform-specific versions.
                </p>
              )}
            </div>

            {/* Quick templates */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-300">
                Quick templates
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((t, i) => {
                  const active = selectedTemplateIndex === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyTemplate(i)}
                      className={classNames(
                        "px-3 py-1.5 rounded-full text-[11px] border transition text-left max-w-xs truncate",
                        active
                          ? "bg-slate-100 text-slate-900 border-slate-100"
                          : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                      )}
                      title={t}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-medium">
                  Schedule date
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-medium">
                  Time (optional)
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
              <p
                className={classNames(
                  "text-[11px] mt-1 rounded-md px-3 py-2 border",
                  statusType === "success" &&
                    "text-emerald-300 bg-emerald-950/40 border-emerald-700",
                  statusType === "error" &&
                    "text-red-300 bg-red-950/40 border-red-700"
                )}
              >
                {statusMsg}
              </p>
            )}
          </form>
        </div>

        {/* Right: Live preview */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg shadow-black/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Preview</h2>
              <p className="text-[11px] text-slate-400">
                This is a rough visual preview. We&apos;ll refine per-platform styling
                later.
              </p>
            </div>
            <div className="flex flex-col items-end text-[11px] text-slate-400">
              <span>Primary platform:</span>
              <span className="text-slate-100 font-medium">
                {primaryPlatform ?? "None selected"}
              </span>
            </div>
          </div>

          <div className="border border-slate-700 rounded-xl bg-slate-950/80 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {primaryPlatform
                      ? `${primaryPlatform} preview`
                      : "Preview"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {scheduledDate || "Unsched."}{" "}
                    {scheduledTime && `• ${scheduledTime}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  @{primaryPlatform ? "yourbrand" : "select-platform"}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-100 whitespace-pre-wrap border-t border-slate-800 pt-3">
              {caption.trim()
                ? caption
                : "Your caption will appear here as you type. Use templates or AI to jump-start ideas."}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <div className="flex gap-3 text-[11px] text-slate-500">
                <span>❤️ 0</span>
                <span>💬 0</span>
                <span>🔁 0</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {selectedPlatforms.length
                  ? `${selectedPlatforms.length} platform${
                      selectedPlatforms.length > 1 ? "s" : ""
                    } selected`
                  : "No platforms selected"}
              </span>
            </div>
          </div>
        </div>
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
      {/* Top bar */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
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
          className="text-[11px] text-slate-400 underline"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        >
          Log out
        </button>
      </header>

      {/* Stats bar */}
      <section className="px-6 pt-4 pb-2">
        <div className="grid gap-3 sm:grid-cols-3 max-w-5xl mx-auto">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
            <p className="text-[11px] text-slate-400">Today</p>
            <p className="text-base font-semibold">0 scheduled</p>
            <p className="text-[11px] text-slate-500 mt-1">
              We&apos;ll pull real counts from Supabase once posts are saved.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
            <p className="text-[11px] text-slate-400">This week</p>
            <p className="text-base font-semibold">0 messages</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Use this to keep your brand visible across platforms.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
            <p className="text-[11px] text-slate-400">Connected accounts</p>
            <p className="text-base font-semibold">Coming soon</p>
            <p className="text-[11px] text-slate-500 mt-1">
              We&apos;ll plug in Meta, LinkedIn, X, TikTok, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="p-6 space-y-5">
        <PostComposer />

        <div className="grid gap-4 md:grid-cols-2 max-w-6xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Quick actions</h2>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Connect your social accounts (coming soon)</li>
              <li>• Create your first scheduled post with the composer</li>
              <li>• Duplicate high-performing posts across platforms</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Roadmap for this page</h2>
            <p className="text-xs text-slate-300 mb-1">
              Next features we&apos;ll wire up:
            </p>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Save scheduled posts to Supabase per workspace</li>
              <li>• Calendar view with drag-to-reschedule</li>
              <li>• Real AI caption generator with tone presets</li>
              <li>• Per-platform variations and asset management</li>
            </ul>
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
