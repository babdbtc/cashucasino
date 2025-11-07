"use client";

import GameCard from "@/components/GameCard";
import { useState } from "react";

export default function Home() {
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20 px-8">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating orbs */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full mix-blend-screen filter blur-xl opacity-30 animate-float"
              style={{
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                left: `${10 + i * 15}%`,
                top: `${20 + i * 10}%`,
                background: `radial-gradient(circle, ${
                  i % 3 === 0 ? '#FF10F0' : i % 3 === 1 ? '#B026FF' : '#00D9FF'
                }, transparent)`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i}s`,
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Main heading with gradient and animation */}
          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight">
            <span className="block bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
              Welcome to
            </span>
            <span className="block mt-2 bg-gradient-to-r from-casino-gold via-neon-yellow to-casino-gold bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Cashu Casino
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
            Experience the thrill of casino games powered by{" "}
            <span className="font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              Cashu ecash
            </span>
          </p>

          <p className="text-lg text-gray-500 dark:text-gray-500 mb-12">
            Privacy-focused
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <a
              href="#games"
              className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95
                         bg-neon-purple/20 border-2 border-neon-purple hover:border-neon-pink hover:bg-neon-purple/30
                         text-white flex items-center gap-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Start Playing
            </a>

            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="px-8 py-4 rounded-xl font-bold text-lg glass border-2 border-neon-blue/30 hover:border-neon-blue transition-all duration-300 transform hover:scale-105 active:scale-95 group">
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How It Works
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Games Section */}
      <div id="games" className="px-8 py-16 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent">
              Choose Your Game
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Pick your favorite and start winning now
            </p>
          </div>

          {/* Game cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <GameCard
              title="Slots"
              description="Spin the reels and win big with cascading symbols and free spins!"
              imageSrc="/images/slots-preview.png"
              emojis={['🍬', '🎰', '⭐', '💎', '🍇']}
              link="/slots"
            />
            <GameCard
              title="Plinko"
              description="Drop the ball and watch it bounce to multipliers up to 1000x!"
              imageSrc="/images/plinko-preview.png"
              emojis={['💎', '⚡', '🎯', '💰', '🔥']}
              link="/plinko"
            />
            <GameCard
              title="Table Games"
              description="Classic casino action with Blackjack, Roulette, and more!"
              imageSrc="/images/table-games-preview.png"
              emojis={['🃏', '♠️', '♥️', '♦️', '♣️']}
              link="/table-games"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-8 py-16 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "⚡", title: "Instant Play", desc: "No registration, no waiting" },
              { icon: "🔒", title: "Private", desc: "Your privacy is our priority" },
              { icon: "💎", title: "Fun Games", desc: "Exciting casino experience" },
              { icon: "🚀", title: "Fast Payouts", desc: "Withdraw anytime, instantly" },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 border border-white/10 dark:border-white/5 hover:border-neon-purple/50 transition-all duration-300 group hover:scale-105"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowHowItWorksModal(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass rounded-3xl p-8 border-2 border-neon-blue/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowHowItWorksModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold transition-colors"
            >
              ×
            </button>

            {/* Header */}
            <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              How It Works
            </h2>

            {/* Introduction */}
            <div className="mb-8 p-4 rounded-xl bg-neon-blue/10 border border-neon-blue/30">
              <p className="text-lg text-gray-300">
                Cashu Casino uses <span className="font-bold text-neon-blue">Cashu ecash tokens</span> for private, instant payments.
                Follow these simple steps to get started!
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-purple to-neon-blue rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300" />
                <div className="relative glass rounded-2xl p-6 border border-neon-purple/30">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center text-white text-xl font-bold">
                      1
                    </span>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3 text-white">Download a Cashu Wallet</h3>
                      <p className="text-gray-300 mb-3">
                        Choose a Cashu-compatible wallet app. Popular options include:
                      </p>
                      <ul className="space-y-2 text-gray-300 ml-4">
                        <li className="flex items-center gap-2">
                          <span className="text-neon-green">•</span>
                          <span><span className="font-bold text-neon-blue">Minibits</span> - Mobile wallet (recommended)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-neon-green">•</span>
                          <span><span className="font-bold text-neon-blue">eNuts</span> - Mobile wallet</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-neon-green">•</span>
                          <span><span className="font-bold text-neon-blue">Cashu.me</span> - Web wallet</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-green rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300" />
                <div className="relative glass rounded-2xl p-6 border border-neon-blue/30">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center text-white text-xl font-bold">
                      2
                    </span>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3 text-white">Add the Cashu Mint</h3>
                      <p className="text-gray-300 mb-3">
                        In your wallet app, add one of these mints:
                      </p>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-black/30 border border-casino-gold/30">
                          <div className="font-bold text-casino-gold mb-1">Production Mint:</div>
                          <code className="text-sm text-neon-green break-all">mint.minibits.cash</code>
                          <p className="text-xs text-gray-400 mt-1">Use this for real money play</p>
                        </div>
                        <div className="p-3 rounded-lg bg-black/30 border border-neon-purple/30">
                          <div className="font-bold text-neon-purple mb-1">Test Mint:</div>
                          <code className="text-sm text-neon-blue break-all">testnut.cashu.space</code>
                          <p className="text-xs text-gray-400 mt-1">Use this for testing (free test tokens available)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-green to-neon-yellow rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300" />
                <div className="relative glass rounded-2xl p-6 border border-neon-green/30">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-neon-green to-neon-yellow flex items-center justify-center text-white text-xl font-bold">
                      3
                    </span>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3 text-white">Get Ecash Tokens</h3>
                      <p className="text-gray-300 mb-3">
                        Fund your wallet with ecash tokens:
                      </p>
                      <ul className="space-y-2 text-gray-300 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-neon-yellow mt-1">•</span>
                          <span><span className="font-bold text-neon-yellow">Lightning Network:</span> Send Bitcoin via Lightning to your wallet&apos;s receive address</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-neon-yellow mt-1">•</span>
                          <span><span className="font-bold text-neon-yellow">Test Tokens:</span> For testnut.cashu.space, request free test tokens from their faucet</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-yellow to-neon-pink rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300" />
                <div className="relative glass rounded-2xl p-6 border border-neon-yellow/30">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-neon-yellow to-neon-pink flex items-center justify-center text-white text-xl font-bold">
                      4
                    </span>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3 text-white">Deposit to Cashu Casino</h3>
                      <p className="text-gray-300 mb-3">
                        Transfer your ecash tokens to the casino:
                      </p>
                      <ol className="space-y-2 text-gray-300 ml-4 list-decimal">
                        <li>Open any game on Cashu Casino</li>
                        <li>Click the <span className="font-bold text-neon-pink">Wallet</span> button</li>
                        <li>In your Cashu wallet app, select tokens to send</li>
                        <li>Copy the token string from your wallet</li>
                        <li>Paste it into the deposit field on Cashu Casino</li>
                        <li>Your balance will update instantly!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-8 p-4 rounded-xl bg-neon-yellow/10 border border-neon-yellow/40">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-neon-yellow text-lg mb-2">Important Warning</h4>
                  <p className="text-gray-300 text-sm">
                    Cashu is <span className="font-bold text-neon-yellow">experimental technology under active development</span>.
                    The protocol and mints may have bugs or vulnerabilities.
                    <span className="font-bold text-white"> Only use funds you are comfortable losing.</span> Never deposit more than you can afford to lose completely.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-neon-green/10 to-neon-blue/10 border border-neon-green/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-bold text-neon-green mb-1">Privacy & Speed</h4>
                  <p className="text-sm text-gray-300">
                    Cashu ecash is <span className="font-bold">completely private</span> - no accounts, no KYC, no tracking.
                    Deposits and withdrawals are <span className="font-bold">instant</span>. Your tokens, your way!
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button at Bottom */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-purple hover:to-neon-pink border-2 border-white/20 text-white transition-all duration-300 transform hover:scale-105"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}