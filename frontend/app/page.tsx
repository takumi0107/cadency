"use client";

import { useState } from "react";
import URLAnalyzer from "@/components/URLAnalyzer";
import ChordInput from "@/components/ChordInput";

export default function Home() {
  const [prefillStyle, setPrefillStyle] = useState("");
  const [prefillKey, setPrefillKey] = useState("");

  const handleUseStyle = (styleContext: string, key: string) => {
    setPrefillStyle(styleContext);
    setPrefillKey(key);
  };

  return (
    <main
      className="min-h-screen relative"
      style={{ background: "#07070f", color: "#f9fafb" }}
    >
      {/* Blueprint grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,0.6) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.04,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="text-3xl font-mono font-bold tracking-widest"
              style={{ color: "#f9fafb" }}
            >
              CADENCY
            </h1>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#22d3ee" }}
            />
          </div>
          <p className="text-sm font-mono" style={{ color: "#9ca3af" }}>
            AI chord assistant
          </p>
        </header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <URLAnalyzer onUseStyle={handleUseStyle} />
            <ChordInput prefillStyle={prefillStyle} prefillKey={prefillKey} />
          </div>

          {/* Right column — piano view placeholder */}
          <div
            className="p-6 rounded-xl flex flex-col items-center justify-center min-h-[280px]"
            style={{
              border: "1px solid rgba(96,165,250,0.28)",
              background: "rgba(30,58,138,0.07)",
              borderRadius: "12px",
            }}
          >
            <div className="text-center space-y-2">
              {/* Piano keys illustration */}
              <div className="flex gap-1 justify-center mb-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-20 rounded-b-md"
                    style={{
                      background: "rgba(96,165,250,0.08)",
                      border: "1px solid rgba(96,165,250,0.2)",
                    }}
                  />
                ))}
              </div>
              <p
                className="text-xs font-mono uppercase tracking-widest"
                style={{ color: "#6b7280" }}
              >
                Piano view
              </p>
              <p className="text-xs" style={{ color: "#4b5563" }}>
                coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
