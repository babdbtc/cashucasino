"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const GRID_SIZE = 5;
const TOTAL_TILES = 25;

// Preset difficulties matching lib/mines.ts
const DIFFICULTY_PRESETS = {
  easy: { mines: 3, label: "Easy", color: "green" },
  medium: { mines: 5, label: "Medium", color: "yellow" },
  hard: { mines: 10, label: "Hard", color: "orange" },
  extreme: { mines: 15, label: "Extreme", color: "red" },
} as const;

type Difficulty = keyof typeof DIFFICULTY_PRESETS;

interface TileState {
  revealed: boolean;
  isMine: boolean;
  isClicked: boolean;
}

export default function MinesGame() {
  const { user, updateBalance } = useAuth();
  const walletBalance = user?.balance || 0;
  const walletMode = user?.walletMode || "demo";

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>(Array(TOTAL_TILES).fill({ revealed: false, isMine: false, isClicked: false }));
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [potentialWin, setPotentialWin] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hitMine, setHitMine] = useState(false);
  const [showResultBanner, setShowResultBanner] = useState(false);
  const [resultMessage, setResultMessage] = useState({ type: "", amount: 0, multiplier: 0 });

  // Settings
  const [betAmount, setBetAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mines_betAmount');
      return saved ? parseInt(saved) : 10;
    }
    return 10;
  });

  const [difficulty, setDifficulty] = useState<Difficulty | "custom">("medium");
  const [customMinesCount, setCustomMinesCount] = useState(5);
  const [minesCount, setMinesCount] = useState(5);
  const [quickPickCount, setQuickPickCount] = useState(1);

  // Save bet amount to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mines_betAmount', betAmount.toString());
    }
  }, [betAmount]);

  // Update mines count when difficulty changes
  useEffect(() => {
    if (difficulty !== "custom") {
      setMinesCount(DIFFICULTY_PRESETS[difficulty].mines);
    } else {
      setMinesCount(customMinesCount);
    }
  }, [difficulty, customMinesCount]);

  const handleStartGame = async () => {
    if (walletBalance < betAmount) {
      alert(`Insufficient balance. You have ${walletBalance} sats, need ${betAmount} sats`);
      return;
    }

    if (loading) return;

    setLoading(true);
    setGameOver(false);
    setHitMine(false);
    setShowResultBanner(false);

    try {
      const response = await fetch("/api/mines/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betAmount,
          minesCount: difficulty === "custom" ? customMinesCount : undefined,
          difficulty: difficulty !== "custom" ? difficulty : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset tiles
        setTiles(Array(TOTAL_TILES).fill({ revealed: false, isMine: false, isClicked: false }));
        setRevealedCount(0);
        setCurrentMultiplier(data.currentMultiplier);
        setPotentialWin(0);
        setGameActive(true);
        updateBalance(data.newBalance);
        console.log("[Mines] Game started:", data);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Mines start error:", error);
      alert("An error occurred while starting the game.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevealTile = async (position: number) => {
    if (!gameActive || loading || tiles[position].revealed || gameOver) return;

    setLoading(true);

    // Optimistically mark tile as clicked
    setTiles(prev => {
      const newTiles = [...prev];
      newTiles[position] = { ...newTiles[position], isClicked: true };
      return newTiles;
    });

    try {
      const response = await fetch("/api/mines/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.hitMine) {
          // Hit a mine - game over
          setHitMine(true);
          setGameOver(true);
          setGameActive(false);

          // Reveal all mines
          setTiles(prev => prev.map((tile, idx) => ({
            ...tile,
            revealed: data.minePositions.includes(idx) || data.revealedTiles.includes(idx),
            isMine: data.minePositions.includes(idx),
            isClicked: idx === position,
          })));

          // Show loss banner
          setResultMessage({ type: "loss", amount: betAmount, multiplier: 0 });
          setShowResultBanner(true);
        } else {
          // Safe tile
          setTiles(prev => {
            const newTiles = [...prev];
            newTiles[position] = { revealed: true, isMine: false, isClicked: true };
            return newTiles;
          });

          setRevealedCount(data.revealedTiles.length);
          setCurrentMultiplier(data.currentMultiplier);
          setPotentialWin(data.potentialWin);
        }
      } else {
        alert(data.error);
        // Revert optimistic update
        setTiles(prev => {
          const newTiles = [...prev];
          newTiles[position] = { ...newTiles[position], isClicked: false };
          return newTiles;
        });
      }
    } catch (error) {
      console.error("Mines reveal error:", error);
      alert("An error occurred.");
      // Revert optimistic update
      setTiles(prev => {
        const newTiles = [...prev];
        newTiles[position] = { ...newTiles[position], isClicked: false };
        return newTiles;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!gameActive || loading || revealedCount === 0) return;

    setLoading(true);

    try {
      const response = await fetch("/api/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setGameActive(false);
        setGameOver(true);
        updateBalance(data.newBalance);

        // Reveal all mines
        setTiles(prev => prev.map((tile, idx) => ({
          ...tile,
          revealed: data.minePositions.includes(idx) || tile.revealed,
          isMine: data.minePositions.includes(idx),
        })));

        // Show win banner
        setResultMessage({ type: "win", amount: data.winAmount, multiplier: data.multiplier });
        setShowResultBanner(true);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Mines cashout error:", error);
      alert("An error occurred while cashing out.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPick = async () => {
    if (!gameActive || loading || gameOver) return;

    setLoading(true);

    try {
      // Find all unrevealed tiles
      const unrevealedTiles = tiles
        .map((tile, idx) => ({ tile, idx }))
        .filter(({ tile }) => !tile.revealed)
        .map(({ idx }) => idx);

      if (unrevealedTiles.length === 0) {
        setLoading(false);
        return;
      }

      // Pick random tiles (up to quickPickCount or available tiles)
      const tilesToPick = Math.min(quickPickCount, unrevealedTiles.length);
      const selectedTiles: number[] = [];
      const availableTiles = [...unrevealedTiles];

      for (let i = 0; i < tilesToPick; i++) {
        const randomIdx = Math.floor(Math.random() * availableTiles.length);
        selectedTiles.push(availableTiles[randomIdx]);
        availableTiles.splice(randomIdx, 1);
      }

      // Reveal all selected tiles at once
      for (const position of selectedTiles) {
        const response = await fetch("/api/mines/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.hitMine) {
            // Hit a mine - stop immediately
            setHitMine(true);
            setGameOver(true);
            setGameActive(false);

            setTiles(prev => prev.map((tile, idx) => ({
              ...tile,
              revealed: data.minePositions.includes(idx) || data.revealedTiles.includes(idx),
              isMine: data.minePositions.includes(idx),
              isClicked: idx === position,
            })));

            setResultMessage({ type: "loss", amount: betAmount, multiplier: 0 });
            setShowResultBanner(true);
            setLoading(false);
            return;
          } else {
            // Safe tile
            setTiles(prev => {
              const newTiles = [...prev];
              newTiles[position] = { revealed: true, isMine: false, isClicked: true };
              return newTiles;
            });

            setRevealedCount(data.revealedTiles.length);
            setCurrentMultiplier(data.currentMultiplier);
            setPotentialWin(data.potentialWin);
          }
        }
      }

      // Auto cash out after successful quick pick
      setLoading(false);
      await handleCashOut();
    } catch (error) {
      console.error("Quick pick error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl">
        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/40 rounded-lg p-3 border border-yellow-400/40">
            <div className="text-xs text-yellow-300 uppercase font-semibold mb-1">Balance {walletMode === "demo" && <span className="text-purple-300">(Demo)</span>}</div>
            <div className="text-xl font-black text-yellow-400">{walletBalance}</div>
          </div>

          <div className="bg-black/40 rounded-lg p-3 border border-blue-400/40">
            <div className="text-xs text-blue-300 uppercase font-semibold mb-1">Multiplier</div>
            <div className="text-xl font-black text-blue-400">{currentMultiplier.toFixed(2)}x</div>
          </div>

          <div className="bg-black/40 rounded-lg p-3 border border-green-400/40">
            <div className="text-xs text-green-300 uppercase font-semibold mb-1">Potential Win</div>
            <div className="text-xl font-black text-green-400">{potentialWin}</div>
          </div>

          <div className="bg-black/40 rounded-lg p-3 border border-purple-400/40">
            <div className="text-xs text-purple-300 uppercase font-semibold mb-1">Tiles Found</div>
            <div className="text-xl font-black text-purple-400">{revealedCount}/{TOTAL_TILES - minesCount}</div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="bg-black/20 rounded-xl p-4 mb-6 relative">
          <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
            {tiles.map((tile, idx) => (
              <button
                key={idx}
                onClick={() => handleRevealTile(idx)}
                disabled={!gameActive || loading || tile.revealed || gameOver}
                className={`
                  aspect-square rounded-lg font-bold transition-all transform flex items-center justify-center
                  ${tile.revealed
                    ? tile.isMine
                      ? "bg-red-600 border-2 border-red-400"
                      : "bg-green-600 border-2 border-green-400"
                    : "bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-500 hover:from-gray-500 hover:to-gray-600 hover:scale-105"
                  }
                  ${!gameActive || gameOver ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                  ${tile.isClicked && !tile.revealed ? "animate-pulse" : ""}
                `}
              >
                {tile.revealed && (
                  <span className="text-5xl md:text-6xl">{tile.isMine ? "💣" : "💎"}</span>
                )}
              </button>
            ))}
          </div>

          {/* Result Banner - Overlay */}
          {showResultBanner && (
            <div className="absolute inset-0 flex items-center justify-center animate-fade-in p-4">
              {resultMessage.type === "win" ? (
                <div className="bg-gradient-to-r from-green-500/50 to-green-600/50 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl border-4 border-green-400 max-w-md">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">💎</span>
                    <span className="text-2xl md:text-3xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">CASHED OUT!</span>
                    <span className="text-4xl">🎉</span>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      Won {resultMessage.amount} sats
                    </div>
                    <div className="text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {resultMessage.multiplier.toFixed(2)}x Multiplier
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-red-500/50 to-red-600/50 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl border-4 border-red-400 max-w-md">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">💣</span>
                    <span className="text-2xl md:text-3xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">BOOM!</span>
                    <span className="text-4xl">💥</span>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      You hit a mine!
                    </div>
                    <div className="text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      Lost {resultMessage.amount} sats
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {!gameActive ? (
          <div className="space-y-4">
            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={loading || walletBalance < betAmount}
              className="w-full px-6 py-4 bg-gradient-to-b from-green-500 to-green-700 border-2 border-green-300 rounded-xl font-black text-white text-xl transition-all hover:from-green-400 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "STARTING..." : "START GAME"}
            </button>

            {/* Bet Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Bet Amount (sats)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white font-semibold"
              />
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Difficulty</label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(DIFFICULTY_PRESETS) as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`
                      px-4 py-2 rounded-lg font-bold transition-all
                      ${difficulty === diff
                        ? "bg-gradient-to-b from-blue-500 to-blue-700 border-2 border-blue-300 text-white"
                        : "bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-500 text-gray-300 hover:from-gray-500 hover:to-gray-600"
                      }
                    `}
                  >
                    <div className="text-sm">{DIFFICULTY_PRESETS[diff].label}</div>
                    <div className="text-xs">{DIFFICULTY_PRESETS[diff].mines} mines</div>
                  </button>
                ))}
                <button
                  onClick={() => setDifficulty("custom")}
                  className={`
                    px-4 py-2 rounded-lg font-bold transition-all
                    ${difficulty === "custom"
                      ? "bg-gradient-to-b from-purple-500 to-purple-700 border-2 border-purple-300 text-white"
                      : "bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-500 text-gray-300 hover:from-gray-500 hover:to-gray-600"
                    }
                  `}
                >
                  <div className="text-sm">Custom</div>
                  <div className="text-xs">{customMinesCount} mines</div>
                </button>
              </div>
            </div>

            {/* Custom Mines Count */}
            {difficulty === "custom" && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Mines Count: {customMinesCount}</label>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={customMinesCount}
                  onChange={(e) => setCustomMinesCount(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Quick Pick with dropdown */}
            <div className="flex-1 flex gap-2">
              <button
                onClick={handleQuickPick}
                disabled={loading || gameOver}
                className="flex-1 px-6 py-4 bg-gradient-to-b from-blue-500 to-blue-700 border-2 border-blue-300 rounded-xl font-black text-white text-xl transition-all hover:from-blue-400 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎲 QUICK PICK
              </button>
              <select
                value={quickPickCount}
                onChange={(e) => setQuickPickCount(parseInt(e.target.value))}
                disabled={loading || gameOver}
                className="px-3 py-2 bg-gray-700 border-2 border-blue-300 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
              >
                {[1, 2, 3, 5, 10].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCashOut}
              disabled={loading || revealedCount === 0 || gameOver}
              className="flex-1 px-6 py-4 bg-gradient-to-b from-yellow-500 to-yellow-700 border-2 border-yellow-300 rounded-xl font-black text-white text-xl transition-all hover:from-yellow-400 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💰 CASH OUT
            </button>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>RTP: ~97% • Click tiles to reveal gems • Avoid the mines • Cash out anytime</p>
        </div>
      </div>
    </div>
  );
}
