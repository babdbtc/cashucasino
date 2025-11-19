"use client";

import MinesGame from "@/components/MinesGame";

export default function MinesPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Hero Header */}
      <header className="mb-12 text-center relative">
        {/* Floating mines and gems */}
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
              {i % 2 === 0 ? "💎" : "💣"}
            </div>
          ))}
        </div>

        <div className="relative">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-neon-blue via-neon-green to-neon-blue bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Mines
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            Find the gems, avoid the mines
          </p>
        </div>
      </header>

      {/* Mines Game Component */}
      <MinesGame />

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
                'Choose your difficulty or custom mine count',
                'Set your bet amount',
                'Click "Start Game" to begin',
                'Click tiles one by one to reveal gems 💎',
                'Avoid hitting mines 💣',
                'Cash out anytime to secure your winnings!'
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
                { icon: '⚙️', title: 'Flexible Difficulty', desc: 'Choose from 4 presets or set custom mine count (1-24)' },
                { icon: '💰', title: 'Increasing Multipliers', desc: 'Each safe tile increases your potential win exponentially' },
                { icon: '🎲', title: 'Quick Pick', desc: 'Let the game pick a random safe tile for you' },
                { icon: '⚡', title: 'Cash Out Anytime', desc: 'Secure your winnings whenever you want' }
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

      {/* Multiplier Table */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="glass rounded-2xl p-6 border border-neon-purple/30">
          <h2 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
            📊 Multiplier Examples
          </h2>
          <p className="text-center text-gray-400 mb-6 text-sm">
            Sample multipliers for different mine counts (your actual multipliers may vary)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-gray-400">Tiles Revealed</th>
                  <th className="text-center p-3 text-green-400">Easy (3 mines)</th>
                  <th className="text-center p-3 text-yellow-400">Medium (5 mines)</th>
                  <th className="text-center p-3 text-orange-400">Hard (10 mines)</th>
                  <th className="text-center p-3 text-red-400">Extreme (15 mines)</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {[1, 3, 5, 7, 10].map(tiles => (
                  <tr key={tiles} className="border-b border-gray-800">
                    <td className="p-3 text-white font-bold">{tiles}</td>
                    <td className="p-3 text-green-300">{calculateExampleMultiplier(tiles, 3)}</td>
                    <td className="p-3 text-yellow-300">{calculateExampleMultiplier(tiles, 5)}</td>
                    <td className="p-3 text-orange-300">{calculateExampleMultiplier(tiles, 10)}</td>
                    <td className="p-3 text-red-300">{calculateExampleMultiplier(tiles, 15)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate example multipliers
function calculateExampleMultiplier(tilesRevealed: number, minesCount: number): string {
  let multiplier = 1.0;
  const totalTiles = 25;
  const houseEdge = 0.97;

  for (let i = 0; i < tilesRevealed; i++) {
    const remainingTiles = totalTiles - i;
    const remainingSafeTiles = totalTiles - minesCount - i;
    if (remainingSafeTiles <= 0) break;
    multiplier *= remainingTiles / remainingSafeTiles;
  }

  return `${(multiplier * houseEdge).toFixed(2)}x`;
}
