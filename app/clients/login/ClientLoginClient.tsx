"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveClientSession } from "../../lib/auth";
import { IMAGE_SIZES } from "../../lib/image-sizes";
import { toMediaSrc } from "../../lib/media";

type ClientLoginClientProps = {
  background: string;
};

export default function ClientLoginClient({ background }: ClientLoginClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const response = await fetch("/api/client/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; username?: string } | null;

      if (!response.ok || !payload?.username) {
        setErr(payload?.error || "Invalid username or password.");
        return;
      }

      const canonicalUsername = payload.username.trim();
      saveClientSession(canonicalUsername);
      router.push(`/clients/${encodeURIComponent(canonicalUsername)}`);
    } catch {
      setErr("Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={toMediaSrc(background)}
          alt="Client background"
          fill
          className="h-full w-full object-cover"
          loading="eager"
          sizes={IMAGE_SIZES.FULL_BLEED}
        />
      </div>

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/6 bg-linear-to-b from-white/6 to-white/3 p-8">
        <h1 className="mb-2 text-2xl font-extrabold text-white">Client Login</h1>
        <p className="mb-6 text-sm text-[#c9d5dc]">Access your private gallery</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[#c9d5dc]">Username</span>
            <input className="mt-1 w-full rounded-md border border-white/6 bg-[#071018] px-3 py-2 text-white" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </label>

          <label className="block">
            <span className="text-sm text-[#c9d5dc]">Password</span>
            <input type="password" className="mt-1 w-full rounded-md border border-white/6 bg-[#071018] px-3 py-2 text-white" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>

          {err && <div className="text-sm text-rose-400">{err}</div>}

          <div className="flex items-center justify-between">
            <button type="submit" disabled={loading} className="btn-accent rounded-md px-4 py-2">
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <a href="/#contact" className="text-sm text-[#c9d5dc] hover:underline">
              Need help?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}