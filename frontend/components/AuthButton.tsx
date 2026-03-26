"use client";

import { AuthUser, logout } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuthButtonProps {
  user: AuthUser | null;
  onLogout: () => void;
}

export default function AuthButton({ user, onLogout }: AuthButtonProps) {
  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const handleLogin = async () => {
    const res = await fetch(`${BASE}/auth/google`, { credentials: "include" });
    const { url } = await res.json();
    window.location.href = url;
  };

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#9ca3af",
        }}
      >
        <GoogleIcon />
        Sign in
      </button>
    );
  }

  const remaining = user.usage_limit - user.usage_today;

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs font-mono"
        style={{ color: remaining <= 5 ? "#f87171" : "#6b7280" }}
        title={`${user.usage_today} of ${user.usage_limit} uses today`}
      >
        {remaining} left today
      </span>
      <div className="flex items-center gap-2">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.name}
            width={24}
            height={24}
            className="rounded-full"
          />
        )}
        <span className="text-xs font-mono hidden sm:block" style={{ color: "#e5e7eb" }}>
          {user.name.split(" ")[0]}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs font-mono px-2 py-1 rounded transition-all"
          style={{ color: "#6b7280" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
