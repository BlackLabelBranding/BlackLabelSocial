"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({ email, password });

      if (signUpError || !signUpData.user) {
        throw signUpError ?? new Error("Unable to create user");
      }

      const userId = signUpData.user.id;

      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          hub_account_id: null,
          name: businessName || "My Workspace"
        })
        .select("*")
        .single();

      if (workspaceError || !workspace) {
        throw workspaceError ?? new Error("Unable to create workspace");
      }

      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: userId,
          role: "owner"
        });

      if (memberError) throw memberError;

      router.push(`/app?workspaceId=${workspace.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full card space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Start with Black Label Social</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create your account and workspace in a few seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business / Brand Name</label>
            <input
              className="input mt-1"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Black Label Coffee Co."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brand.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating your workspace..." : "Create account"}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <a href="/login" className="underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
