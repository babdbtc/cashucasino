"use client";

import Link from "next/link";
import Image from "next/image";

export default function SlotsPage() {
  const games = [
    {
      title: "Sweet Bonanza",
      desc: "Tumble feature with cluster pays and free spins!",
      icon: "🍬",
      imageSrc: "/images/sweet-bonanza-preview.png",
      gradient: "from-neon-pink to-neon-purple",
      link: "/slots/sweet-bonanza",
      status: "available"
    },
    {
      title: "Book of Dead",
      desc: "Ancient Egyptian adventure with expanding symbols!",
      icon: "📖",
      gradient: "from-neon-purple to-neon-blue",
      status: "coming-soon"
    },
    {
      title: "Starburst",
      desc: "Classic slot with expanding wilds and re-spins!",
      icon: "⭐",
      gradient: "from-neon-blue to-neon-green",
      status: "coming-soon"
    },
    {
      title: "Gates of Olympus",
      desc: "Zeus-themed multipliers and tumble mechanic!",
      icon: "⚡",
      gradient: "from-neon-green to-neon-yellow",
      status: "coming-soon"
    },
    {
      title: "Gonzo's Quest",
      desc: "Avalanche reels with increasing multipliers!",
      icon: "🗿",
      gradient: "from-neon-yellow to-neon-orange",
      status: "coming-soon"
    },
    {
      title: "Mega Moolah",
      desc: "African safari with progressive jackpots!",
      icon: "🦁",
      gradient: "from-neon-orange to-casino-ruby",
      status: "coming-soon"
    }
  ];

  return (
    <div className="min-h-screen p-8">
      {/* Hero Header */}
      <header className="mb-12 text-center relative">
        {/* Floating slot emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['🍬', '🎰', '⭐', '💎', '🍇', '🍊'].map((emoji, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-10 animate-float"
              style={{
                left: `${15 + i * 18}%`,
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
            Slot Machines
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            Spin the reels and win big with our collection of slots!
          </p>
        </div>
      </header>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
        {games.map((game, i) => (
          <div key={i} className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r ${game.gradient} rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-500`} />
            {game.status === "available" && game.link ? (
              <Link href={game.link}>
                <div className="relative glass rounded-2xl overflow-hidden border border-white/10 dark:border-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105">
                  {game.imageSrc ? (
                    <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-purple-900/40 to-pink-900/40">
                      <Image
                        src={game.imageSrc}
                        alt={game.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>
                  ) : (
                    <div className="relative w-full h-48 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                      <div className="text-6xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                        {game.icon}
                      </div>
                    </div>
                  )}
                  <div className="p-8 text-center">
                    <h3 className={`text-2xl font-black mb-2 bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent`}>
                      {game.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{game.desc}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-casino-gold to-neon-yellow text-black text-sm font-bold">
                      <span>🎮</span>
                      Play Now
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="relative glass rounded-2xl overflow-hidden border border-white/10 dark:border-white/5 transition-all duration-300">
                {game.imageSrc ? (
                  <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-purple-900/40 to-pink-900/40 opacity-50">
                    <Image
                      src={game.imageSrc}
                      alt={game.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="relative w-full h-48 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <div className="text-6xl opacity-50">
                      {game.icon}
                    </div>
                  </div>
                )}
                <div className="p-8 text-center">
                  <h3 className={`text-2xl font-black mb-2 bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent`}>
                    {game.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{game.desc}</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-sm font-semibold">
                    <span className="text-neon-yellow">⏳</span>
                    Coming Soon
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-500" />
          <div className="relative glass rounded-2xl p-8 border border-neon-blue/30">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-blue to-neon-pink bg-clip-text text-transparent flex items-center gap-2">
              <span>🎰</span> What to Expect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700 dark:text-gray-300">
              {[
                { icon: '🍬', title: 'Modern Mechanics', desc: 'Tumble features, cluster pays, and cascading symbols' },
                { icon: '⚡', title: 'Instant Play', desc: 'No downloads, play directly in your browser' },
                { icon: '💰', title: 'Fair RTP', desc: 'Provably fair with ~95% return to player' },
                { icon: '🎯', title: 'Low Stakes', desc: 'Start with as little as 1 sat per spin' }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-300">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <div className="font-bold mb-1">{feature.title}</div>
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