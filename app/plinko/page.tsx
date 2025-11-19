"use client";

import Plinko from "@/components/Plinko";
import { RiskLevel } from "@/lib/plinko";
import { ReactNode } from "react";
import Ball from "@/components/Ball";
import { useAuth } from "@/lib/auth-context";

export default function PlinkoPage() {
  const { user } = useAuth();
  const walletMode = user?.walletMode || "demo";

  return (
    <div className="min-h-screen p-8">
      {/* Hero Header */}
      <header className="mb-12 text-center relative">
        {/* Floating balls */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-20 animate-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 2) * 15}%`,
                animationDelay: `${i * 0.6}s`,
                animationDuration: `${3 + i}s`,
              }}
            >
              💎
            </div>
          ))}
        </div>

        <div className="relative">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-neon-blue via-neon-green to-neon-blue bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Plinko
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            Play with Cashu ecash
          </p>
        </div>
      </header>

      <Plinko>
        {({
          betAmount,
          setBetAmount,
          risk,
          setRisk,
          handlePlay,
          loading,
          balance,
          activeBalls,
          highlightedSlot,
          handleBallComplete,
          getMultiplierColor,
          renderPegs,
          renderMultipliers,
        }) => (
          <div className="flex flex-col lg:flex-row items-start justify-center gap-4 lg:gap-8 py-4 lg:py-8 max-w-7xl mx-auto px-2 lg:px-0">
            {/* Controls Panel */}
            <div className="w-full lg:w-96">
              <div className="relative group">
                <div className="relative glass rounded-2xl p-4 md:p-8 border border-neon-blue/30">
                  {/* Balance Display */}
                  <div className="mb-6 p-4 rounded-xl bg-black/20 dark:bg-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
                        Balance {walletMode === "demo" && <span className="text-neon-blue ml-1">(Demo)</span>}
                      </label>
                      <div className="text-2xl font-black bg-gradient-to-r from-casino-gold to-neon-yellow bg-clip-text text-transparent">{balance} sat</div>
                    </div>
                  </div>

                  {/* Bet Amount */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block font-semibold">Bet Amount</label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(parseInt(e.target.value) || 1)}
                      className="w-full bg-black/20 dark:bg-white/5 text-foreground rounded-xl p-4 text-lg border-2 border-gray-300 dark:border-gray-700 focus:border-neon-blue focus:outline-none transition-all duration-300"
                    />
                  </div>

                  {/* Risk Level */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-3 block font-semibold">
                      Risk Level
                      {activeBalls.length > 0 && (
                        <span className="ml-2 text-xs text-neon-blue">(Locked during play)</span>
                      )}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => r !== "high" && setRisk(r)}
                          disabled={activeBalls.length > 0 || r === "high"}
                          className={`relative py-3 rounded-xl font-bold transition-all duration-300 transform ${
                            activeBalls.length > 0 || r === "high"
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:scale-105"
                          } ${
                            risk === r
                              ? "bg-neon-blue/20 border-2 border-neon-blue text-white"
                              : "glass border border-white/10 hover:border-neon-blue/50"
                          }`}
                        >
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drop Ball Button */}
                  <button
                    onClick={handlePlay}
                    disabled={loading}
                    className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                      loading
                        ? 'opacity-50 cursor-not-allowed bg-neon-green/20 border-2 border-neon-green/50'
                        : 'bg-neon-green/20 border-2 border-neon-green hover:border-neon-green hover:bg-neon-green/30 transform hover:scale-105'
                    } text-white flex items-center justify-center gap-2`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {loading ? "Dropping..." : "Drop Ball"}
                  </button>
                </div>
              </div>
            </div>

            {/* Plinko Board */}
            <div className="flex justify-center items-center w-full lg:w-auto">
              <div className="relative group w-full max-w-[95vw] sm:max-w-[640px] lg:max-w-none lg:w-[720px]">
                <div className="relative glass rounded-3xl p-2 md:p-8 border-2 border-neon-blue/30 shadow-2xl">
                  <svg
                    viewBox="-20 0 640 720"
                    style={{ shapeRendering: 'geometricPrecision' }}
                    className="drop-shadow-2xl w-full h-auto"
                    preserveAspectRatio="xMidYMid meet"
                  >
                  <defs>
                    <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="pegShadow">
                      <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                    </filter>
                    <radialGradient id="ballGradient">
                      <stop offset="0%" stopColor="#FFD700" />
                      <stop offset="50%" stopColor="#FFA500" />
                      <stop offset="100%" stopColor="#FF8C00" />
                    </radialGradient>
                  </defs>

                  {/* Pegs */}
                  <g>{renderPegs()}</g>

                  {/* Multiplier slots at bottom */}
                  <g>{renderMultipliers()}</g>

                  {/* Balls */}
                  {activeBalls.map(ball => (
                    <Ball
                      key={ball.id}
                      path={ball.path}
                      multiplier={ball.multiplier}
                      onComplete={() => handleBallComplete(ball.id, ball.slot, ball.winAmount)}
                    />
                  ))}
                </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </Plinko>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {/* How to Play Card */}
        <div className="relative group">
          <div className="relative glass rounded-2xl p-6 border border-neon-green/30 hover:border-neon-green/50 transition-all duration-300">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent flex items-center gap-2">
              <span>🎮</span> How to Play
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              {[
                'Set your bet amount',
                'Select a risk level (low or medium)',
                'Choose the number of rows (8 or 16)',
                'Click the "Drop" button to release a ball',
                'Watch the ball bounce down the pyramid',
                'The slot it lands in determines your win multiplier!'
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center text-white text-sm font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Features Card */}
        <div className="relative group">
          <div className="relative glass rounded-2xl p-6 border border-neon-blue/30 hover:border-neon-blue/50 transition-all duration-300">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent flex items-center gap-2">
              <span>✨</span> Features
            </h2>
            <div className="space-y-4">
              {[
                { icon: '⚙️', title: 'Adjustable Risk', desc: 'Choose between low and medium risk for different payout structures' },
                { icon: '🧱', title: 'Variable Rows', desc: 'Play with 8 or 16 rows to change the game\'s complexity' },
                { icon: '⚡', title: 'Instant Play', desc: 'No waiting, just click and drop' }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-300">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <div className="font-bold text-white mb-1">{feature.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
