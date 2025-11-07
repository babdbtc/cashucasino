"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import BlackjackSolo from "@/components/BlackjackSolo";
import Blackjack from "@/components/Blackjack";

export default function BlackjackPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"select" | "solo" | "multi">("select");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
            Blackjack
          </h1>
          <p className="text-white text-xl">
            Please log in to play Blackjack. Click the login button in the navigation.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div>
            <h1 className="text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
              BLACKJACK
            </h1>
            <p className="text-gray-400 text-xl">Choose Your Game Mode</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Single Player */}
            <button
              onClick={() => setMode("solo")}
              className="group relative overflow-hidden bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 rounded-3xl p-8 border-4 border-yellow-600 shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="relative z-10 space-y-4">
                <div className="text-7xl mb-4">🎴</div>
                <h2 className="text-4xl font-black text-white mb-2">SOLO PLAY</h2>
                <p className="text-yellow-200 text-lg mb-4">Play against the dealer</p>
                <ul className="text-white text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Instant gameplay
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Play at your own pace
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> All classic rules
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Split, Double, Surrender
                  </li>
                </ul>
                <div className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-xl inline-block group-hover:bg-yellow-400 transition">
                  START PLAYING →
                </div>
              </div>
            </button>

            {/* Multiplayer */}
            <button
              onClick={() => setMode("multi")}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-3xl p-8 border-4 border-yellow-600 shadow-2xl transform hover:scale-105 transition-all duration-300 opacity-75"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="relative z-10 space-y-4">
                <div className="text-7xl mb-4">👥</div>
                <h2 className="text-4xl font-black text-white mb-2">MULTIPLAYER</h2>
                <p className="text-yellow-200 text-lg mb-4">Play with others at the table</p>
                <ul className="text-white text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Up to 5 players per table
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Real-time gameplay
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Shared table experience
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Turn-based actions
                  </li>
                </ul>
                <div className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-xl inline-block group-hover:bg-yellow-400 transition">
                  JOIN TABLE →
                </div>
                <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  BETA
                </div>
              </div>
            </button>
          </div>

          <div className="text-gray-500 text-sm">
            Tip: Start with Solo Play for the best experience!
          </div>
        </div>
      </div>
    );
  }

  if (mode === "solo") {
    return (
      <div className="relative">
        <button
          onClick={() => setMode("select")}
          className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg font-bold transition"
        >
          ← Back
        </button>
        <BlackjackSolo />
      </div>
    );
  }

  if (mode === "multi") {
    return (
      <div className="relative">
        <button
          onClick={() => setMode("select")}
          className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg font-bold transition"
        >
          ← Back
        </button>
        <Blackjack />
      </div>
    );
  }

  return null;
}
