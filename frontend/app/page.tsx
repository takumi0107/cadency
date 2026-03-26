"use client";

import { useEffect, useState } from "react";
import URLAnalyzer from "@/components/URLAnalyzer";
import ChordInput from "@/components/ChordInput";
import SavedProgressions from "@/components/SavedProgressions";
import AuthButton from "@/components/AuthButton";
import { SavedProgression, AuthUser, getMe } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [prefillStyle, setPrefillStyle] = useState("");
  const [prefillKey, setPrefillKey] = useState("");
  const [savedTrigger, setSavedTrigger] = useState(0);
  const [loadedProgression, setLoadedProgression] = useState<SavedProgression | null>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  const handleLoad = (prog: SavedProgression) => {
    setLoadedProgression(prog);
    setPrefillKey(prog.key);
    setPrefillStyle(prog.mood);
  };

  const refreshUser = () => getMe().then(setUser);

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070f" }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22d3ee" }} />
      </div>
    );
  }

  return (
    <main className="min-h-screen relative" style={{ background: "#07070f", color: "#f9fafb" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,0.6) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.04,
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 sm:px-6">
        <header className="mb-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-mono font-bold tracking-widest" style={{ color: "#f9fafb" }}>
                CADENCY
              </h1>
              <span className="w-2 h-2 rounded-full" style={{ background: "#22d3ee" }} />
            </div>
            <p className="text-sm font-mono" style={{ color: "#9ca3af" }}>AI chord assistant</p>
          </div>
          {user && <AuthButton user={user} onLogout={() => setUser(null)} />}
        </header>

        {!user ? (
          <SignInGate onSignedIn={refreshUser} />
        ) : (
          <div className="space-y-6">
            <WelcomeBanner name={user.name.split(" ")[0]} used={user.usage_today} limit={user.usage_limit} />
            <URLAnalyzer
              user={user}
              onUseStyle={(style, key) => { setPrefillStyle(style); setPrefillKey(key); }}
              onUsed={refreshUser}
            />
            <ChordInput
              prefillStyle={prefillStyle}
              prefillKey={prefillKey}
              loadedProgression={loadedProgression}
              onSaved={() => setSavedTrigger(t => t + 1)}
              onUsed={refreshUser}
            />
            <SavedProgressions onLoad={handleLoad} refreshTrigger={savedTrigger} />
          </div>
        )}
      </div>
    </main>
  );
}

function SignInGate({ onSignedIn }: { onSignedIn: () => void }) {
  const handleLogin = async () => {
    const res = await fetch(`${BASE}/auth/google`, { credentials: "include" });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="flex flex-col items-center text-center py-16 space-y-8">
      <div className="space-y-3">
        <p className="text-2xl font-mono font-semibold" style={{ color: "#f9fafb" }}>
          Your AI music companion
        </p>
        <p className="text-sm font-mono max-w-sm" style={{ color: "#6b7280" }}>
          Analyze any YouTube track, generate chord progressions, and build your musical ideas — all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg text-left">
        {[
          { icon: "♫", title: "Analyze tracks", desc: "Paste a YouTube URL → get key, mood & tempo instantly" },
          { icon: "✦", title: "Generate chords", desc: "AI builds progressions that match your style and vibe" },
          { icon: "↓", title: "Export MIDI", desc: "Download your progressions as MIDI files" },
        ].map(f => (
          <div
            key={f.title}
            className="p-4 rounded-xl space-y-1"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-lg" style={{ color: "#22d3ee" }}>{f.icon}</span>
            <p className="text-xs font-mono font-semibold" style={{ color: "#e5e7eb" }}>{f.title}</p>
            <p className="text-xs font-mono" style={{ color: "#6b7280" }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={handleLogin}
        className="flex items-center gap-3 px-6 py-3 rounded-xl font-mono text-sm font-medium transition-all duration-200 hover:scale-105"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#f9fafb",
        }}
      >
        <GoogleIcon />
        Sign in with Google
      </button>

      <p className="text-xs font-mono" style={{ color: "#374151" }}>
        20 free uses per day · No credit card required
      </p>
    </div>
  );
}

function WelcomeBanner({ name, used, limit }: { name: string; used: number; limit: number }) {
  const remaining = limit - used;
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.15)" }}
    >
      <p className="text-sm font-mono" style={{ color: "#e5e7eb" }}>
        Welcome back, <span style={{ color: "#22d3ee" }}>{name}</span>
      </p>
      <p
        className="text-xs font-mono"
        style={{ color: remaining <= 5 ? "#f87171" : "#6b7280" }}
      >
        {remaining}/{limit} uses remaining today
      </p>
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
