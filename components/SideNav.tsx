"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import WalletPanel from "./WalletPanel";
import ThemeToggle from "./ThemeToggle";

const SideNav = () => {
  const { user, switchWalletMode } = useAuth();
  const balance = user?.balance || 0;
  const walletMode = user?.walletMode || "real";
  const [isWalletPanelOpen, setIsWalletPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/slots", label: "Slots", icon: "🎰" },
    { href: "/plinko", label: "Plinko", icon: "🎯" },
    { href: "/table-games", label: "Table Games", icon: "🎲" },
  ];

  const handleSwitchMode = async (newMode: "demo" | "real") => {
    if (newMode === walletMode || switchingMode) return;

    setSwitchingMode(true);
    await switchWalletMode(newMode);
    setSwitchingMode(false);
  };

  return (
    <>
      {/* Mobile Header - visible only on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-neon-purple/30">
        <div className="flex items-center justify-between p-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Mobile Balance Display */}
          <button
            onClick={() => setIsWalletPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/30 hover:border-neon-blue transition-all"
          >
            <span className="text-xl">💰</span>
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-400 dark:text-gray-500">Balance {walletMode === "demo" && <span className="text-neon-blue">(Demo)</span>}</span>
              <span className="text-sm font-bold bg-gradient-to-r from-casino-gold to-neon-yellow bg-clip-text text-transparent">
                {balance} sat
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Glassmorphic Sidebar with Neon Accents */}
      <div className={`fixed left-0 top-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Backdrop blur layer */}
        <div className="absolute inset-0 glass border-r-2 border-neon-purple/30" />

        {/* Animated gradient border glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-neon-pink/20 via-neon-purple/20 to-neon-blue/20 opacity-50 animate-pulse-slow" />

        {/* Content */}
        <div className="relative flex flex-col h-full p-6 text-foreground">
          {/* Logo Section */}
          <div className="mb-8 text-center group">
            <div className="w-16 h-16 mx-auto mb-3 animate-float relative">
              <Image src="/icon.png" alt="Cashu Casino" width={64} height={64} className="rounded-lg" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              cashucasino.cc
            </h1>
          </div>

          {/* Theme Toggle */}
          <div className="mb-6 flex justify-center">
            <ThemeToggle />
          </div>

          {/* Balance Card with Neon Glow - hidden on mobile */}
          <div className="mb-8 relative group hidden md:block">
            {/* Balance content */}
            <div className="relative glass rounded-2xl p-5 shadow-2xl">
              <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-semibold">
                Balance {walletMode === "demo" && <span className="text-neon-blue">(Demo)</span>}
              </div>
              <div className="text-3xl font-black bg-gradient-to-r from-casino-gold to-neon-yellow bg-clip-text text-transparent mb-4">
                {balance} <span className="text-xl">sat</span>
              </div>

              <button
                onClick={() => setIsWalletPanelOpen(true)}
                className="w-full py-3 px-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95
                         bg-neon-blue/20 border-2 border-neon-blue/50 hover:border-neon-blue
                         text-white mb-3"
              >
                💰 Wallet
              </button>

              {/* Mode Toggle Switch */}
              <button
                onClick={() => handleSwitchMode(walletMode === "demo" ? "real" : "demo")}
                disabled={switchingMode}
                className={`relative w-full h-8 rounded-lg transition-all duration-300 glass border border-white/10 ${
                  switchingMode ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-white/20"
                }`}
              >
                <div className="relative h-full flex items-center">
                  <div className="w-1/2 flex items-center justify-center z-10">
                    <span className={`text-xs font-semibold transition-all duration-300 ${
                      walletMode === "demo" ? "text-white" : "text-gray-500"
                    }`}>
                      Demo
                    </span>
                  </div>
                  <div className="w-1/2 flex items-center justify-center z-10">
                    <span className={`text-xs font-semibold transition-all duration-300 ${
                      walletMode === "real" ? "text-white" : "text-gray-500"
                    }`}>
                      Real
                    </span>
                  </div>
                  <div
                    className={`absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-4px)] rounded-md transition-all duration-300 ${
                      walletMode === "real"
                        ? "bg-white/20 left-[calc(50%+2px)]"
                        : "bg-white/20 left-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-grow space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:translate-x-2 group relative overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 shadow-lg shadow-neon-purple/50 border-l-4 border-neon-pink'
                      : 'hover:bg-white/5 dark:hover:bg-white/10'}`}
                >
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-neon-pink/0 via-neon-purple/20 to-neon-blue/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <span className="relative flex items-center gap-3">
                    <span className="text-2xl transform group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">
                      {item.icon}
                    </span>
                    <span className={`font-semibold ${isActive ? 'text-neon-pink' : ''}`}>
                      {item.label}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer with animated text */}
          <div className="mt-8 pt-6 border-t border-white/10 dark:border-white/5 text-center">
            <div className="text-xs font-semibold bg-gradient-to-r from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-400 bg-clip-text text-transparent">
              Powered by Cashu
            </div>
            <div className="mt-2 flex justify-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-neon-pink to-neon-blue animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Wallet Panel Modal */}
      {isWalletPanelOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
          {/* Modal backdrop with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/10 via-neon-purple/10 to-neon-blue/10" />

          {/* Modal content */}
          <div className="relative transform transition-all duration-500 ease-out scale-100 w-full max-w-2xl max-h-[90vh]">
            <div className="relative glass rounded-3xl shadow-2xl border-2 border-neon-purple/30 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Close button with neon effect */}
              <button
                onClick={() => setIsWalletPanelOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-neon-pink text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-300 transform hover:rotate-90 hover:scale-110 z-10"
              >
                ✕
              </button>

              <div className="overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <WalletPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideNav;
