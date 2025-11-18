"use client";

import GameCard from "@/components/GameCard";

export default function ArcadePage() {
  return (
    <div className="min-h-screen p-8">
      {/* Hero Header */}
      <header className="mb-12 text-center relative">
        {/* Floating game icons */}
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
              {i % 3 === 0 ? "🎮" : i % 3 === 1 ? "💎" : "🎯"}
            </div>
          ))}
        </div>

        <div className="relative">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-neon-blue via-neon-green to-neon-blue bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Arcade Games
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Fast-paced games with instant results and big multipliers
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Drop balls, dodge mines, and win big!
          </p>
        </div>
      </header>

      {/* Game Cards */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <GameCard
            title="Plinko"
            description="Drop the ball and watch it bounce to multipliers up to 1000x!"
            imageSrc="/images/plinko-preview.png"
            emojis={['💎', '⚡', '🎯', '💰', '🔥']}
            link="/plinko"
          />
          <GameCard
            title="Mines"
            description="Find the gems and avoid the mines! Cash out anytime with increasing multipliers!"
            imageSrc="/images/mines-preview.png"
            emojis={['💎', '💣', '✨', '💰', '⚡']}
            link="/mines"
          />
          <GameCard
            title="Crash"
            description="Watch the rocket fly! Cash out before it crashes for massive multipliers!"
            imageSrc="/images/crash-preview.png"
            emojis={['🚀', '📈', '💥', '💰', '⚡']}
            link="/crash"
          />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* What are Arcade Games */}
          <div className="relative group">
            <div className="relative glass rounded-2xl p-6 border border-neon-green/30 hover:border-neon-green/50 transition-all duration-300">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent flex items-center gap-2">
                <span>🎮</span> What are Arcade Games?
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Arcade games are fast-paced, skill-influenced games with instant results. Unlike traditional slots that rely purely on luck, arcade games let you make choices that affect your outcome.
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Quick rounds - results in seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Strategic choices - when to cash out</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Big multipliers - up to 1000x possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Provably fair - cryptographic randomness</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Why Play Arcade Games */}
          <div className="relative group">
            <div className="relative glass rounded-2xl p-6 border border-neon-blue/30 hover:border-neon-blue/50 transition-all duration-300">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent flex items-center gap-2">
                <span>✨</span> Why Play Arcade?
              </h2>
              <div className="space-y-4">
                {[
                  { icon: '⚡', title: 'Instant Action', desc: 'No waiting for animations or bonus rounds' },
                  { icon: '🎯', title: 'Your Strategy', desc: 'Decide when to cash out and lock in profits' },
                  { icon: '💰', title: 'High RTP', desc: 'Up to 97% return to player on Mines' },
                  { icon: '🎲', title: 'Variety', desc: 'Different games with unique mechanics' }
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

        {/* Comparison Table */}
        <div className="mt-12">
          <div className="glass rounded-2xl p-6 border border-neon-purple/30">
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
              🎮 Game Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400">Feature</th>
                    <th className="text-center p-3 text-blue-400">Plinko</th>
                    <th className="text-center p-3 text-purple-400">Mines</th>
                    <th className="text-center p-3 text-green-400">Crash</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-left text-white font-semibold">Max Multiplier</td>
                    <td className="p-3 text-blue-300">1000x (High Risk)</td>
                    <td className="p-3 text-purple-300">Varies (up to ~50x+)</td>
                    <td className="p-3 text-green-300">1000x (capped)</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-left text-white font-semibold">RTP</td>
                    <td className="p-3 text-blue-300">~98%</td>
                    <td className="p-3 text-purple-300">~97%</td>
                    <td className="p-3 text-green-300">~95%</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-left text-white font-semibold">Game Type</td>
                    <td className="p-3 text-gray-300">Pure chance</td>
                    <td className="p-3 text-gray-300">Choice-based</td>
                    <td className="p-3 text-gray-300">Timing-based</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-left text-white font-semibold">Round Duration</td>
                    <td className="p-3 text-gray-300">3-5 seconds</td>
                    <td className="p-3 text-gray-300">Your pace</td>
                    <td className="p-3 text-gray-300">Variable (1-30+ sec)</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-left text-white font-semibold">Difficulty Options</td>
                    <td className="p-3 text-gray-300">3 risk levels</td>
                    <td className="p-3 text-gray-300">4 presets + custom</td>
                    <td className="p-3 text-gray-300">Auto-cashout option</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-left text-white font-semibold">Best For</td>
                    <td className="p-3 text-gray-300">Quick thrills</td>
                    <td className="p-3 text-gray-300">Strategic play</td>
                    <td className="p-3 text-gray-300">Adrenaline rushes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
