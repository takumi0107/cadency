"use client";

import { useState } from "react";
import URLAnalyzer from "@/components/URLAnalyzer";
import ChordInput from "@/components/ChordInput";

export default function Home() {
  const [prefillStyle, setPrefillStyle] = useState("");
  const [prefillKey, setPrefillKey] = useState("");

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
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-mono font-bold tracking-widest" style={{ color: "#f9fafb" }}>
              CADENCY
            </h1>
            <span className="w-2 h-2 rounded-full" style={{ background: "#22d3ee" }} />
          </div>
          <p className="text-sm font-mono" style={{ color: "#9ca3af" }}>AI chord assistant</p>
        </header>

        <div className="space-y-6">
          <URLAnalyzer onUseStyle={(style, key) => { setPrefillStyle(style); setPrefillKey(key); }} />
          <ChordInput prefillStyle={prefillStyle} prefillKey={prefillKey} />
        </div>
      </div>
    </main>
  );
}
