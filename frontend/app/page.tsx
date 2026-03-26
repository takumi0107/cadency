"use client";

import { useEffect, useState } from "react";
import URLAnalyzer from "@/components/URLAnalyzer";
import ChordInput from "@/components/ChordInput";
import SavedProgressions from "@/components/SavedProgressions";
import AuthButton from "@/components/AuthButton";
import { SavedProgression, AuthUser, getMe, saveAuthToken } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [prefillStyle, setPrefillStyle] = useState("");
  const [prefillKey, setPrefillKey] = useState("");
  const [prefillEnergy, setPrefillEnergy] = useState<number | undefined>(undefined);
  const [savedTrigger, setSavedTrigger] = useState(0);
  const [loadedProgression, setLoadedProgression] = useState<SavedProgression | null>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sid");
    if (sid) {
      saveAuthToken(sid);
      window.history.replaceState({}, "", window.location.pathname);
    }
    getMe().then(setUser);
  }, []);

  const refreshUser = () => getMe().then(setUser);

  const handleLoad = (prog: SavedProgression) => {
    setLoadedProgression(prog);
    setPrefillKey(prog.key);
    setPrefillStyle(prog.mood);
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070f" }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22d3ee" }} />
      </div>
    );
  }

  return (
    <main className="min-h-screen relative" style={{ background: "#07070f", color: "#f9fafb" }}>
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,0.5) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.04,
        }}
      />
      {/* Colorful ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: "absolute", top: -100, left: "20%", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 100, right: "10%", width: 400, height: 300, background: "radial-gradient(ellipse, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 200, left: "5%", width: 350, height: 300, background: "radial-gradient(ellipse, rgba(244,114,182,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="mb-12 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
                AI Music Tool
              </span>
            </div>
            <h1
              className="text-4xl font-mono font-bold tracking-widest mb-1"
              style={{
                background: "linear-gradient(90deg, #f9fafb 0%, #a78bfa 60%, #22d3ee 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              CADENCY
            </h1>
            <p className="text-sm font-mono" style={{ color: "#6b7280" }}>
              Analyze tracks · Generate chord progressions · Export MIDI
            </p>
          </div>
          {user && <AuthButton user={user} onLogout={() => setUser(null)} />}
        </header>

        {!user ? (
          <SignInGate />
        ) : (
          <div className="space-y-10">
            <UsageBar used={user.usage_today} limit={user.usage_limit} name={user.name.split(" ")[0]} />

            <section className="space-y-3">
              <SectionHeader
                step={1}
                color="#a78bfa"
                title="Analyze any YouTube track"
                desc="Paste a URL — Cadency extracts the key, mood, and tempo using AI, then pre-fills your chord workspace."
              />
              <URLAnalyzer
                user={user}
                onUseStyle={(style, key, energy) => { setPrefillStyle(style); setPrefillKey(key); setPrefillEnergy(energy); }}
                onUsed={refreshUser}
              />
            </section>

            <section className="space-y-3">
              <SectionHeader
                step={2}
                color="#22d3ee"
                title="Build your chord progression"
                desc="Generate a fresh progression from scratch, or type your own chords and ask AI what fits next."
              />
              <ChordInput
                prefillStyle={prefillStyle}
                prefillKey={prefillKey}
                prefillEnergy={prefillEnergy}
                loadedProgression={loadedProgression}
                onSaved={() => setSavedTrigger(t => t + 1)}
                onUsed={refreshUser}
              />
            </section>

            <section className="space-y-3">
              <SectionHeader
                color="#f472b6"
                title="Your saved progressions"
                desc="All generated progressions live here. Load any to keep editing, export, or play back."
              />
              <SavedProgressions onLoad={handleLoad} refreshTrigger={savedTrigger} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function SectionHeader({ step, color, title, desc }: { step?: number; color: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      {step !== undefined && (
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}50`,
            color,
          }}
        >
          {step}
        </span>
      )}
      <div>
        <p className="text-sm font-mono font-semibold" style={{ color: "#e5e7eb" }}>{title}</p>
        <p className="text-xs font-mono mt-0.5" style={{ color: "#6b7280" }}>{desc}</p>
      </div>
    </div>
  );
}

function UsageBar({ used, limit, name }: { used: number; limit: number; name: string }) {
  const remaining = limit - used;
  const pct = (used / limit) * 100;
  const low = remaining <= 5;
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-sm font-mono shrink-0" style={{ color: "#9ca3af" }}>
        Hey, <span style={{ color: "#f9fafb" }}>{name}</span>
      </p>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: low
              ? "#f87171"
              : "linear-gradient(90deg, #a78bfa, #22d3ee)",
          }}
        />
      </div>
      <p className="text-xs font-mono shrink-0" style={{ color: low ? "#f87171" : "#6b7280" }}>
        {remaining} / {limit} left
      </p>
    </div>
  );
}

function SignInGate() {
  const handleLogin = async () => {
    const res = await fetch(`${BASE}/auth/google`, { credentials: "include" });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="flex flex-col items-center text-center py-16 space-y-10">
      <div className="space-y-4">
        <p className="text-4xl font-mono font-bold leading-tight">
          <span style={{ color: "#f9fafb" }}>Hear a song.</span>
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #a78bfa, #22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Decode its chords.
          </span>
        </p>
        <p className="text-sm font-mono max-w-sm mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
          Paste any YouTube URL to extract its musical DNA, then use AI to generate chord progressions in the same style. Export as MIDI and drop into your DAW.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
        {[
          { step: "01", title: "Analyze a track", desc: "AI reads the key, mood & tempo from any YouTube song", color: "#a78bfa" },
          { step: "02", title: "Generate chords", desc: "One click creates a progression matching that exact style", color: "#22d3ee" },
          { step: "03", title: "Export MIDI", desc: "Drop it straight into Ableton, FL Studio, or Logic", color: "#f472b6" },
        ].map(f => (
          <div
            key={f.step}
            className="p-4 rounded-xl space-y-2"
            style={{
              background: `${f.color}08`,
              border: `1px solid ${f.color}25`,
            }}
          >
            <span className="text-xs font-mono" style={{ color: `${f.color}80` }}>{f.step}</span>
            <p className="text-xs font-mono font-semibold" style={{ color: "#e5e7eb" }}>{f.title}</p>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "#9ca3af" }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 px-7 py-3.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.15))",
            border: "1px solid rgba(139,92,246,0.4)",
            color: "#f9fafb",
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <p className="text-xs font-mono" style={{ color: "#6b7280" }}>
          Free · 20 uses per day · No credit card
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
