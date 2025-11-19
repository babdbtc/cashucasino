"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RateLimitModal({ isOpen, onClose }: RateLimitModalProps) {
  const { switchWalletMode } = useAuth();
  const [switching, setSwitching] = React.useState(false);

  if (!isOpen) return null;

  const handleSwitchToReal = async () => {
    setSwitching(true);
    try {
      await switchWalletMode("real");
      onClose();
    } catch (error) {
      console.error("Failed to switch wallet mode:", error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-red-900 to-orange-900 p-8 rounded-2xl border-4 border-yellow-500 max-w-lg w-full shadow-2xl animate-scaleIn">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="text-8xl mb-4 animate-bounce">⚠️</div>
          <h2 className="text-4xl font-black mb-2 text-yellow-300 drop-shadow-lg">
            DEMO RATE LIMIT REACHED
          </h2>
        </div>

        {/* Message */}
        <div className="bg-black bg-opacity-50 p-6 rounded-xl mb-6 border-2 border-yellow-600">
          <p className="text-white text-xl font-bold mb-4 text-center">
            You&apos;ve hit the demo mode play limit!
          </p>
          <p className="text-gray-200 text-lg mb-4 text-center">
            Demo mode is limited to prevent abuse and encourage you to experience the full game.
          </p>
          <div className="bg-green-900 bg-opacity-50 border-2 border-green-500 p-4 rounded-lg">
            <p className="text-green-200 text-lg font-bold text-center">
              ✅ Switch to REAL balance for unlimited play!
            </p>
            <p className="text-green-300 text-sm text-center mt-2">
              No rate limits • Full speed • Unrestricted gameplay
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSwitchToReal}
            disabled={switching}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-500 text-white px-6 py-4 rounded-xl font-black text-xl shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-green-400"
          >
            {switching ? "Switching..." : "🚀 SWITCH TO REAL BALANCE"}
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-200"
          >
            Continue with Demo (Limited)
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <p className="text-yellow-200 text-sm">
            💡 Demo mode: 10-30 plays/min • Real mode: Unlimited plays
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
