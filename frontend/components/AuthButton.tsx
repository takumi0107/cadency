"use client";

import { AuthUser, logout } from "@/lib/api";

interface AuthButtonProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function AuthButton({ user, onLogout }: AuthButtonProps) {
  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const remaining = user.usage_limit - user.usage_today;

  return (
    <div className="flex items-center gap-3">
      {user.avatar_url && (
        <img src={user.avatar_url} alt={user.name} width={28} height={28} className="rounded-full" />
      )}
      <button
        onClick={handleLogout}
        className="text-xs font-mono px-2 py-1 rounded transition-all"
        style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        Sign out
      </button>
    </div>
  );
}
