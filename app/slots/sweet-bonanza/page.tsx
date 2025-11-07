"use client";

import SweetBonanzaSlot from "@/components/SweetBonanzaSlot";

export default function SweetBonanzaPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Hero Header */}
      <header className="mb-12 text-center relative">
        {/* Floating candy emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['🍬', '🍭', '🍇', '🍉', '🍊', '🍓'].map((emoji, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-20 animate-float"
              style={{
                left: `${15 + i * 15}%`,
                top: `${10 + (i % 2) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${4 + i}s`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        <div className="relative">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-orange bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Sweet Bonanza
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            Play with Cashu ecash
          </p>
        </div>
      </header>

      {/* Game Component */}
      <div className="mb-12">
        <SweetBonanzaSlot />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
        {/* How to Play Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-purple to-neon-pink rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-500" />
          <div className="relative glass rounded-2xl p-6 border border-neon-purple/30 hover:border-neon-purple/50 transition-all duration-300">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent flex items-center gap-2">
              <span>🎮</span> How to Play
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              {[
                'Deposit Cashu tokens to your virtual balance using the wallet',
                'Select your bet amount (1-1000 sats) from the quick bet buttons',
                'Click SPIN or use AUTOPLAY for multiple spins',
                'Land 8+ matching symbols to form winning clusters',
                'Winning symbols disappear and new ones tumble down',
                'Chain multiple wins in one spin for massive payouts!',
                'Get 4+ scatters (🍭) to trigger 10 FREE SPINS with multipliers!'
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">
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
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-orange to-neon-yellow rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-500" />
          <div className="relative glass rounded-2xl p-6 border border-neon-orange/30 hover:border-neon-orange/50 transition-all duration-300">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-orange to-neon-yellow bg-clip-text text-transparent flex items-center gap-2">
              <span>✨</span> Features
            </h2>
            <div className="space-y-4">
              {[
                { icon: '💥', title: 'Tumble Mechanic', desc: 'Winning symbols disappear and new ones drop for consecutive wins' },
                { icon: '🎯', title: 'Cluster Pays', desc: 'Win with 8+ matching symbols anywhere on the 6x5 grid' },
                { icon: '🍭', title: 'Free Spins', desc: '4+ scatters trigger 10 free spins with increasing multipliers!' },
                { icon: '⚡', title: 'Turbo Mode', desc: 'Speed up animations for faster gameplay' },
                { icon: '🤖', title: 'Autoplay', desc: 'Set up to 500 automatic spins with customizable settings' }
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

      {/* Privacy & Security Card */}
      <div className="relative group mb-6">
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-500" />
        <div className="relative glass rounded-2xl p-6 border border-neon-blue/30 hover:border-neon-blue/50 transition-all duration-300">
          <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent flex items-center gap-2">
            <span>🔒</span> Privacy & Security
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Custodial', desc: 'Deposit funds to play. Withdraw anytime.' },
              { title: 'Instant Payouts', desc: 'Winnings automatically added to your wallet, withdraw anytime.' }
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-300">
                <div className="font-bold text-white mb-2">{item.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-yellow to-neon-orange rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-500" />
        <div className="relative glass rounded-2xl p-6 border-l-4 border-neon-yellow">
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-neon-yellow to-neon-orange bg-clip-text text-transparent flex items-center gap-2">
            <span>⚠️</span> Important
          </h3>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            {[
              'RTP: ~95.5% (4.5% house edge) • Uses mint.minibits.cash',
              'Play responsibly. Never gamble more than you can afford to lose.'
            ].map((notice, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-neon-yellow text-lg">•</span>
                <span className="text-sm">{notice}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
