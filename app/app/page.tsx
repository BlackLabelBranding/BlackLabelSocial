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

type ScheduledPost = {
  id: string;
  caption: string;
  platforms: string[];
  scheduled_for: string;
  status: string;
  created_at: string;
  image_path: string | null;
};

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type PostComposerProps = {
  workspaceId: string;
  userId: string;
  onScheduled?: () => void;
};

function PostComposer({ workspaceId, userId, onScheduled }: PostComposerProps) {
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

  // image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const maxXChars = 280;
  const charCount = caption.length;
  const hashtagCount =
    caption.match(/#[\p{L}\d_]+/gu)?.length ?? 0;
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

  const handleImageChange = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMsg(null);
    setStatusType(null);
    setUploadingImage(true);

    try {
      // Local preview
      const localUrl = URL.createObjectURL(file);
      setImagePreviewUrl(localUrl);

      const ext = file.name.split(".").pop();
      const fileName = `${workspaceId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error, data } = await supabase.storage
        .from("social_posts")
        .upload(fileName, file, {
          upsert: false,
        });

      if (error) {
        console.error(error);
        setStatusMsg(
          error.message || "Failed to upload image. Try again."
        );
        setStatusType("error");
        setUploadingImage(false);
        return;
      }

      setImagePath(data?.path ?? fileName);

      setStatusMsg("Image attached to this post.");
      setStatusType("success");
    } catch (err: any) {
      console.error(err);
      setStatusMsg("Unexpected error uploading image.");
      setStatusType("error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
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

    if (!workspaceId || !userId) {
      setSubmitting(false);
      setStatusMsg(
        "Workspace not loaded. Open Black Label Social from the client portal or create a workspace first."
      );
      setStatusType("error");
      return;
    }

    const scheduledFor = (() => {
      if (!scheduledDate) return new Date();
      const time = scheduledTime || "09:00";
      return new Date(`${scheduledDate}T${time}:00`);
    })();

    try {
      const { error } = await supabase.from("scheduled_posts").insert({
        workspace_id: workspaceId,
        user_id: userId,
        caption,
        platforms: selectedPlatforms,
        scheduled_for: scheduledFor.toISOString(),
        status: "scheduled",
        image_path: imagePath,
      });

      if (error) {
        console.error(error);
        setStatusMsg(
          error.message || "Something went wrong saving this scheduled post."
        );
        setStatusType("error");
      } else {
        setStatusMsg(
          `Post scheduled for ${scheduledDate || "today"} ${
            scheduledTime || ""
          } on ${selectedPlatforms.join(", ")}.`
        );
        setStatusType("success");
        onScheduled?.();
        // optional reset
        // setCaption("");
        // setImagePath(null);
        // setImagePreviewUrl(null);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg("Network error while saving scheduled post.");
      setStatusType("error");
    } finally {
      setSubmitting(false);
    }
  };

  // Build simple previews per platform
  const platformsToPreview: Platform[] = selectedPlatforms.length
    ? selectedPlatforms
    : ["X", "Instagram", "Facebook"];

  return (
    <section className="space-y-4 max-w-6xl mx-auto">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        {/* Left: Composer */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl shadow-black/40 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold">Create a post</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Choose platforms, write your caption, add a photo, and schedule
                it for your brand.
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
                  Later we&apos;ll add per-platform variants.
                </p>
              )}
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-300">
                Photo (optional)
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-[11px] text-slate-200 file:text-[11px] file:px-3 file:py-1.5 file:rounded-md file:border file:border-slate-700 file:bg-slate-900 file:text-slate-100 file:mr-3"
                />
                {uploadingImage && (
                  <span className="text-slate-400">Uploading image…</span>
                )}
                {imagePath && !uploadingImage && (
                  <span className="px-2 py-1 rounded-full bg-emerald-900/40 border border-emerald-600 text-emerald-200">
                    Image attached
                  </span>
                )}
              </div>
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

        {/* Right: Multi-platform preview */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg shadow-black/30 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-semibold">Previews</h2>
              <p className="text-[11px] text-slate-400">
                Rough previews for each selected platform. We&apos;ll tighten the
                details later.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {platformsToPreview.map((platform) => (
              <div
                key={platform}
                className="border border-slate-700 rounded-xl bg-slate-950/80 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-100">
                        {platform} preview
                      </p>
                      <p className="text-[10px] text-slate-400">
                        @{platform.toLowerCase()}_brand
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {scheduledDate || "Unsched."}{" "}
                    {scheduledTime && `• ${scheduledTime}`}
                  </span>
                </div>

                {imagePreviewUrl && (
                  <div className="mt-1">
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreviewUrl}
                        alt="Post preview"
                        className={classNames(
                          "w-full object-cover",
                          platform === "Instagram" || platform === "TikTok"
                            ? "aspect-square"
                            : "aspect-video"
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-100 whitespace-pre-wrap border-t border-slate-800 pt-2">
                  {caption.trim()
                    ? caption
                    : "Your caption will appear here as you type."}
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span>❤️ 0</span>
                    <span>💬 0</span>
                    <span>🔁 0</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {platform}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type ScheduledPostsListProps = {
  workspaceId: string;
  refreshToken: number;
};

function ScheduledPostsList({
  workspaceId,
  refreshToken,
}: ScheduledPostsListProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("scheduled_for", { ascending: true })
        .limit(100);

      if (error) {
        console.error(error);
        setError(error.message || "Failed to load scheduled posts.");
      } else {
        setPosts((data || []) as ScheduledPost[]);
      }
      setLoading(false);
    }

    load();
  }, [workspaceId, refreshToken]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setError(error.message || "Failed to delete post.");
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <section className="max-w-6xl mx-auto mt-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">Scheduled posts</h2>
            <p className="text-[11px] text-slate-400">
              Upcoming posts for this workspace. We&apos;ll add editing and
              duplication next.
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-[11px] text-slate-400">Loading scheduled posts…</p>
        )}

        {!loading && error && (
          <p className="text-[11px] text-red-300">{error}</p>
        )}

        {!loading && !error && posts.length === 0 && (
          <p className="text-[11px] text-slate-400">
            No scheduled posts yet. Use the composer above to schedule your
            first one.
          </p>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-2 mt-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col md:flex-row md:items-center gap-2 justify-between border border-slate-800 rounded-xl px-3 py-2 bg-slate-950/60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold text-slate-100">
                      {formatDateTime(post.scheduled_for)}
                    </span>
                    <span
                      className={classNames(
                        "px-2 py-0.5 rounded-full border text-[10px]",
                        post.status === "scheduled" &&
                          "bg-emerald-900/40 border-emerald-600 text-emerald-200",
                        post.status === "failed" &&
                          "bg-red-900/40 border-red-600 text-red-200",
                        post.status === "sent" &&
                          "bg-slate-900/60 border-slate-500 text-slate-200"
                      )}
                    >
                      {post.status}
                    </span>
                    <span className="flex flex-wrap gap-1 text-slate-300">
                      {post.platforms.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px]"
                        >
                          {p}
                        </span>
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-200 truncate">
                    {post.caption}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="text-[11px] px-3 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60"
                  >
                    {deletingId === post.id ? "Deleting…" : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type ScheduledPostsCalendarProps = {
  workspaceId: string;
  refreshToken: number;
};

function ScheduledPostsCalendar({
  workspaceId,
  refreshToken,
}: ScheduledPostsCalendarProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (!error && data) {
        setPosts(data as ScheduledPost[]);
      }
      setLoading(false);
    }
    load();
  }, [workspaceId, refreshToken]);

  const startOfMonth = new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth(),
    1
  );
  const endOfMonth = new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth() + 1,
    0
  );

  const startDay = new Date(startOfMonth);
  startDay.setDate(startOfMonth.getDate() - startOfMonth.getDay()); // Sunday

  const endDay = new Date(endOfMonth);
  endDay.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay())); // Saturday

  const days: Date[] = [];
  for (
    let d = new Date(startDay);
    d <= endDay;
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    days.push(new Date(d));
  }

  const postsByDay = new Map<string, number>();
  posts.forEach((post) => {
    const d = new Date(post.scheduled_for);
    const key = d.toDateString();
    postsByDay.set(key, (postsByDay.get(key) || 0) + 1);
  });

  const monthLabel = monthAnchor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="max-w-6xl mx-auto mt-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">Calendar</h2>
            <p className="text-[11px] text-slate-400">
              See which days have posts scheduled. We can add drag-to-reschedule
              later.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <button
              type="button"
              onClick={() =>
                setMonthAnchor(
                  new Date(
                    monthAnchor.getFullYear(),
                    monthAnchor.getMonth() - 1,
                    1
                  )
                )
              }
              className="px-2 py-1 rounded-md border border-slate-700 hover:bg-slate-800"
            >
              ◀
            </button>
            <span>{monthLabel}</span>
            <button
              type="button"
              onClick={() =>
                setMonthAnchor(
                  new Date(
                    monthAnchor.getFullYear(),
                    monthAnchor.getMonth() + 1,
                    1
                  )
                )
              }
              className="px-2 py-1 rounded-md border border-slate-700 hover:bg-slate-800"
            >
              ▶
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-[11px] text-slate-400">Loading calendar…</p>
        )}

        {!loading && (
          <div className="grid grid-cols-7 gap-[2px] text-[11px]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-1 text-center text-slate-400 border-b border-slate-700"
              >
                {d}
              </div>
            ))}

            {days.map((day) => {
              const key = day.toDateString();
              const count = postsByDay.get(key) || 0;
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={key}
                  className={classNames(
                    "min-h-[52px] border border-slate-800 px-1 py-1 flex flex-col",
                    inMonth ? "bg-slate-950" : "bg-slate-950/40",
                    isToday && "border-sky-500"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={classNames(
                        "text-[10px]",
                        inMonth ? "text-slate-100" : "text-slate-500"
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {count > 0 && (
                      <span className="text-[9px] px-1 rounded-full bg-emerald-900/60 text-emerald-200">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [postsRefreshToken, setPostsRefreshToken] = useState(0);

  const workspaceIdParam = searchParams.get("workspaceId");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      setUserId(auth.user.id);

      let effectiveWorkspaceId = workspaceIdParam ?? null;

      if (!effectiveWorkspaceId) {
        const { data: member, error: memberError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!memberError && member && member.workspace_id) {
          effectiveWorkspaceId = member.workspace_id as string;
          router.replace(`/app?workspaceId=${effectiveWorkspaceId}`);
        }
      }

      if (effectiveWorkspaceId) {
        const { data, error } = await supabase
          .from("workspaces")
          .select("id, name")
          .eq("id", effectiveWorkspaceId)
          .single();

        if (!error && data) {
          setWorkspace(data as Workspace);
        }
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceIdParam, router]);

  const canSchedule = !!workspace && !!userId;

  const handleCreateWorkspace = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newWorkspaceName.trim()) {
      setCreateError("Enter a workspace name (usually the business name).");
      return;
    }
    if (!userId) {
      setCreateError("User not loaded yet.");
      return;
    }

    try {
      setCreatingWorkspace(true);

      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: newWorkspaceName.trim(),
        })
        .select("id, name")
        .single();

      if (wsError || !ws) {
        console.error(wsError);
        setCreateError(
          wsError?.message || "Failed to create workspace. Try again."
        );
        setCreatingWorkspace(false);
        return;
      }

      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: ws.id,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        console.error(memberError);
        setCreateError(
          memberError.message ||
            "Workspace created but failed to link to your account."
        );
        setCreatingWorkspace(false);
        return;
      }

      setWorkspace(ws as Workspace);
      setNewWorkspaceName("");
      setCreatingWorkspace(false);

      router.replace(`/app?workspaceId=${ws.id}`);
    } catch (err: any) {
      console.error(err);
      setCreateError("Unexpected error creating workspace.");
      setCreatingWorkspace(false);
    }
  };

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
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div>
          <h1 className="text-lg font-semibold">
            {workspace ? workspace.name : "Black Label Social"}
          </h1>
          <p className="text-xs text-slate-400">
            Central hub for your scheduled social posts.
          </p>
        </div>
        <button
          className="text-[11px] text-slate-300 underline"
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
              Later we&apos;ll compute this from your posts.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
            <p className="text-[11px] text-slate-400">This week</p>
            <p className="text-base font-semibold">0 messages</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Keep a consistent posting rhythm across platforms.
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
        {!canSchedule && (
          <div className="max-w-4xl mx-auto mb-4 space-y-3">
            <div className="rounded-xl border border-amber-700 bg-amber-950/40 px-4 py-3 text-[11px] text-amber-100">
              No active workspace detected. If you came here directly, create a
              workspace below. If you&apos;re a Black Label Branding client, you can
              also open Black Label Social from your client portal so we know
              which brand you&apos;re scheduling for.
            </div>

            {userId && (
              <form
                onSubmit={handleCreateWorkspace}
                className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-[11px] space-y-2"
              >
                <p className="text-slate-200 font-medium">
                  Create your first workspace
                </p>
                <p className="text-slate-400">
                  This is usually the business or brand name (you can add more
                  workspaces later for other brands).
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="e.g. Black Label Branding, Rebel Liz, Garza Unlimited"
                    value={newWorkspaceName}
                    onChange={(e) => {
                      setNewWorkspaceName(e.target.value);
                      setCreateError(null);
                    }}
                  />
                  <button
                    type="submit"
                    disabled={creatingWorkspace || !newWorkspaceName.trim()}
                    className="px-4 py-2 rounded-md bg-white text-slate-950 text-xs font-medium disabled:opacity-60"
                  >
                    {creatingWorkspace ? "Creating..." : "Create workspace"}
                  </button>
                </div>
                {createError && (
                  <p className="text-red-300 mt-1">{createError}</p>
                )}
              </form>
            )}
          </div>
        )}

        {canSchedule && (
          <PostComposer
            workspaceId={workspace!.id}
            userId={userId!}
            onScheduled={() =>
              setPostsRefreshToken((token) => token + 1)
            }
          />
        )}

        {canSchedule && (
          <>
            <ScheduledPostsCalendar
              workspaceId={workspace!.id}
              refreshToken={postsRefreshToken}
            />
            <ScheduledPostsList
              workspaceId={workspace!.id}
              refreshToken={postsRefreshToken}
            />
          </>
        )}
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
