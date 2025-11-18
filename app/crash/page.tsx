"use client";

import Crash from "@/components/Crash";

export default function CrashPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Hero Header */}
      <header className="mb-12 text-center relative">
        {/* Floating emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-20 animate-float"
              style={{
                left: `${15 + i * 14}%`,
                top: `${10 + (i % 2) * 15}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i}s`,
              }}
            >
              {["📈", "💰", "⚡", "🎯", "💥", "🚀"][i]}
            </div>
          ))}
        </div>

        <div className="relative">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Crash
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            Watch it rise, cash out before it crashes!
          </p>
        </div>
      </header>

      {/* Crash Game Component */}
      <Crash />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-6xl mx-auto">
        {/* How to Play Card */}
        <div className="relative group">
          <div className="relative glass rounded-2xl p-6 border border-neon-green/30 hover:border-neon-green/50 transition-all duration-300">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent flex items-center gap-2">
              <span>🎮</span> How to Play
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              {[
                'Set your bet amount before the round starts',
                'Wait for the 3-second betting phase countdown',
                'Watch the multiplier rise exponentially! 📈',
                'Click "Cash Out" before the crash to win',
                'The later you wait, the higher the multiplier... but also the risk! 💥',
                'If you don&apos;t cash out before the crash, you lose your bet'
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
                { icon: '🤖', title: 'Auto Cashout', desc: 'Set a target multiplier to automatically cash out (e.g., 2.00x)' },
                { icon: '🔐', title: 'Provably Fair', desc: 'Server seed + client seed proves each crash point was predetermined' },
                { icon: '📊', title: 'Live Graph', desc: 'Real-time visualization of the multiplier curve as it rises' },
                { icon: '📜', title: 'Crash History', desc: 'View recent crash points to analyze patterns' },
                { icon: '⚡', title: 'Fast-Paced', desc: 'Quick rounds with exponential growth, just like Stake.com' },
                { icon: '🎯', title: 'High Risk, High Reward', desc: 'Multipliers can reach 1000x before crashing!' }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-300">
                  <span className="text-2xl">{feature.icon}</span>
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

      {/* Strategy Tips */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="glass rounded-2xl p-6 border border-neon-purple/30">
          <h2 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
            💡 Strategy Tips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-xl p-4 border border-green-500/20">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="font-bold text-green-400 mb-2">Conservative</h3>
              <p className="text-sm text-gray-300">Cash out early at 1.5x - 2.0x for consistent small wins. Lower risk, steady profits.</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/20">
              <div className="text-2xl mb-2">⚖️</div>
              <h3 className="font-bold text-yellow-400 mb-2">Balanced</h3>
              <p className="text-sm text-gray-300">Target 3.0x - 5.0x multipliers. Good balance between risk and reward.</p>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-xl p-4 border border-red-500/20">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="font-bold text-red-400 mb-2">Aggressive</h3>
              <p className="text-sm text-gray-300">Go for 10x+ multipliers! High risk, but massive potential rewards.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Provably Fair Explanation */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="glass rounded-2xl p-6 border border-blue-500/30">
          <h2 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            🔐 Provably Fair System
          </h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-center text-sm text-gray-400 mb-4">
              Every crash point is predetermined and cryptographically verifiable
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="font-bold text-blue-400 mb-2">1. Before the Round</div>
                <p className="text-sm">The server generates a random seed and hashes it. You see the hash before betting, proving the crash point can&apos;t be changed.</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="font-bold text-blue-400 mb-2">2. During the Round</div>
                <p className="text-sm">Your client seed is combined with the server seed to generate the crash point using a cryptographic algorithm.</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="font-bold text-blue-400 mb-2">3. After the Crash</div>
                <p className="text-sm">The server seed is revealed, allowing you to verify the crash point was calculated fairly using both seeds.</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="font-bold text-blue-400 mb-2">4. Verification</div>
                <p className="text-sm">You can independently verify that the crash point matches the hash shown before the round started.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
