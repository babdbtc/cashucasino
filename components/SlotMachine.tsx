"use client";

import { useState, useEffect } from "react";
import { getWallet } from "@/lib/browser-wallet";

type Symbol = "🍒" | "🍋" | "🍊" | "🔔" | "💎" | "7️⃣";

interface SpinResult {
  reels: Symbol[][];
  winAmount: number;
  winLine: number | null;
  totalBet: number;
  payoutToken?: string | null;
  changeToken?: string | null;
  message?: string;
}

export default function SlotMachine() {
  const [reels, setReels] = useState<Symbol[][]>([
    ["🍒", "🍋", "🍊"],
    ["🔔", "💎", "7️⃣"],
    ["🍒", "🍋", "🍊"],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [walletBalance, setWalletBalance] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update wallet balance
  useEffect(() => {
    updateBalance();
    const interval = setInterval(updateBalance, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateBalance = () => {
    const wallet = getWallet();
    setWalletBalance(wallet.getBalance());
  };

  const handleSpin = async () => {
    // Check wallet balance
    if (walletBalance < betAmount) {
      setError(`Insufficient balance. You have ${walletBalance} sat, need ${betAmount} sat`);
      return;
    }

    if (betAmount < 1 || betAmount > 1000) {
      setError("Bet must be between 1 and 1000 sat");
      return;
    }

    setSpinning(true);
    setError(null);
    setResult(null);

    try {
      // Get wallet instance
      const wallet = getWallet();

      // Create bet token from wallet
      const tokenResult = wallet.createBetToken(betAmount);

      if (!tokenResult.success || !tokenResult.token) {
        throw new Error(tokenResult.error || "Failed to create bet token");
      }

      const cashuToken = tokenResult.token;

      // Call the API
      const response = await fetch("/api/slots/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: cashuToken,
          betAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If API call failed, we need to refund the token to wallet
        wallet.deposit(cashuToken);
        throw new Error(data.error || "Failed to play spin");
      }

      // Animate the reels
      const animationDuration = 1500;
      const intervalDuration = 100;
      let elapsed = 0;

      const interval = setInterval(async () => {
        // Random symbols during animation
        setReels([
          [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
          [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
          [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        ]);

        elapsed += intervalDuration;

        if (elapsed >= animationDuration) {
          clearInterval(interval);
          // Show final result
          setReels(data.reels);
          setResult(data);
          setSpinning(false);

          // If player won, add payout to wallet
          if (data.payoutToken) {
            const payoutResult = await wallet.receivePayout(data.payoutToken);
            if (!payoutResult.success) {
              console.error("Failed to receive payout:", payoutResult.error);
            }
          }

          // If there's change (overpaid), add it back to wallet
          if (data.changeToken) {
            console.log("Receiving change from overpayment");
            const changeResult = await wallet.receivePayout(data.changeToken);
            if (!changeResult.success) {
              console.error("Failed to receive change:", changeResult.error);
            }
          }

          // Update balance
          updateBalance();
        }
      }, intervalDuration);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setSpinning(false);
      updateBalance();
    }
  };

  const getRandomSymbol = (): Symbol => {
    const symbols: Symbol[] = ["🍒", "🍋", "🍊", "🔔", "💎", "7️⃣"];
    return symbols[Math.floor(Math.random() * symbols.length)];
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-lg p-8 shadow-2xl">
        {/* Slot Machine Display */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {reels.map((reel, reelIndex) => (
              <div key={reelIndex} className="space-y-2">
                {reel.map((symbol, symbolIndex) => (
                  <div
                    key={symbolIndex}
                    className={`text-6xl text-center bg-white rounded-lg p-4 ${
                      spinning ? "animate-pulse" : ""
                    } ${
                      result?.winLine === 1 && symbolIndex === 1
                        ? "ring-4 ring-green-400 animate-pulse"
                        : ""
                    }`}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Payline indicator */}
          <div className="text-center text-yellow-400 text-sm">
            ← PAYLINE (middle row) →
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`mb-6 p-4 rounded-lg ${result.winAmount > 0 ? 'bg-green-600' : 'bg-gray-700'}`}>
            <p className="text-xl font-bold text-center text-white">
              {result.message}
            </p>
            {result.payoutToken && (
              <div className="mt-4 p-3 bg-gray-800 rounded break-all text-sm">
                <p className="text-gray-300 mb-2">Your payout token:</p>
                <code className="text-green-400">{result.payoutToken}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.payoutToken || "");
                    alert("Token copied to clipboard!");
                  }}
                  className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
                >
                  Copy Token
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-600 rounded-lg">
            <p className="text-white font-bold">Error: {error}</p>
          </div>
        )}

        {/* Wallet Balance Display */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Wallet Balance</p>
              <p className="text-2xl font-bold text-green-400">{walletBalance} sat</p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Cost per spin: {betAmount} sat</p>
              <p>Spins available: {Math.floor(walletBalance / betAmount)}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-white mb-2 font-bold">
              Bet Amount (sat): {betAmount}
            </label>
            <input
              type="range"
              min="1"
              max="1000"
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
              className="w-full"
              disabled={spinning}
            />
            <div className="flex justify-between text-white text-sm mt-1">
              <span>1</span>
              <span>1000</span>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={spinning || walletBalance < betAmount}
            className={`w-full py-4 rounded-lg font-bold text-xl transition-colors ${
              spinning || walletBalance < betAmount
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 active:bg-green-800"
            } text-white`}
          >
            {spinning
              ? "SPINNING..."
              : walletBalance < betAmount
              ? "INSUFFICIENT BALANCE"
              : `SPIN (${betAmount} sat)`
            }
          </button>

          {walletBalance < betAmount && (
            <p className="text-center text-yellow-400 text-sm">
              💡 Please deposit more funds using the wallet panel above
            </p>
          )}
        </div>

        {/* Paytable */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-bold mb-3 text-center">PAYTABLE</h3>
          <div className="space-y-1 text-white text-sm">
            <div className="flex justify-between">
              <span>7️⃣ 7️⃣ 7️⃣</span>
              <span className="text-yellow-400 font-bold">777x 🎰</span>
            </div>
            <div className="flex justify-between">
              <span>💎 💎 💎</span>
              <span className="text-yellow-400">150x</span>
            </div>
            <div className="flex justify-between">
              <span>🔔 🔔 🔔</span>
              <span className="text-yellow-400">40x</span>
            </div>
            <div className="flex justify-between">
              <span>🍊 🍊 🍊</span>
              <span className="text-yellow-400">20x</span>
            </div>
            <div className="flex justify-between">
              <span>🍋 🍋 🍋</span>
              <span className="text-yellow-400">13x</span>
            </div>
            <div className="flex justify-between">
              <span>🍒 🍒 🍒</span>
              <span className="text-yellow-400">8x</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs text-center mt-3">
            RTP: 90.4% • Max Bet: 1000 sat
          </p>
        </div>
      </div>
    </div>
  );
}
