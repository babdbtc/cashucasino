"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import RateLimitModal from "./RateLimitModal";

interface CrashHistoryEntry {
  id: number;
  crashPoint: number;
  hashedServerSeed: string;
  createdAt: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export default function Crash() {
  const { user, updateBalance } = useAuth();
  const walletBalance = user?.balance || 0;
  const walletMode = user?.walletMode || "demo";

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gamePhase, setGamePhase] = useState<'idle' | 'betting' | 'running' | 'crashed'>('idle');
  const [bettingPhaseEnd, setBettingPhaseEnd] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [cashedOut, setCashedOut] = useState(false);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [showResultBanner, setShowResultBanner] = useState(false);
  const [resultMessage, setResultMessage] = useState({ type: "", amount: 0, multiplier: 0 });
  const [hasCrashed, setHasCrashed] = useState(false);

  // Settings
  const [betAmount, setBetAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_betAmount');
      return saved ? parseInt(saved) : 10;
    }
    return 10;
  });

  const [autoCashout, setAutoCashout] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_autoCashout');
      return saved ? parseFloat(saved) : null;
    }
    return null;
  });

  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);

  // History
  const [history, setHistory] = useState<CrashHistoryEntry[]>([]);

  // Modals
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [hashedServerSeed, setHashedServerSeed] = useState("");

  // Graph state
  const [graphPoints, setGraphPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const statusPollIntervalRef = useRef<NodeJS.Timeout>();
  const particlesRef = useRef<Particle[]>([]);
  const explosionParticlesRef = useRef<Particle[]>([]);

  // Save bet amount and auto cashout to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash_betAmount', betAmount.toString());
      if (autoCashout !== null) {
        localStorage.setItem('crash_autoCashout', autoCashout.toString());
      }
    }
  }, [betAmount, autoCashout]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/crash/history?limit=20");
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  const resetGameState = useCallback(() => {
    setGameActive(false);
    setGamePhase('idle');
    setCurrentMultiplier(1.0);
    setCashedOut(false);
    setCrashPoint(null);
    setGraphPoints([]);
    setHasCrashed(false);
    particlesRef.current = [];
    explosionParticlesRef.current = [];
  }, []);

  const handleAutoCashout = useCallback((data: any) => {
    // Don't stop the game - let it continue running until crash
    setCashedOut(true);
    setWinAmount(data.winAmount);
    setCrashPoint(data.crashPoint);
    setServerSeed(data.serverSeed);
    setClientSeed(data.clientSeed);
    setHashedServerSeed(data.hashedServerSeed);
    updateBalance(data.newBalance);

    setResultMessage({
      type: "success",
      amount: data.winAmount,
      multiplier: data.cashoutMultiplier,
    });
    setShowResultBanner(true);

    setTimeout(() => setShowResultBanner(false), 5000);
    loadHistory();
  }, [updateBalance, loadHistory]);

  const handleCrash = useCallback((data: any) => {
    setGameActive(false);
    setGamePhase('crashed');
    setHasCrashed(true);
    setCrashPoint(data.crashPoint || data.currentMultiplier);
    setCurrentMultiplier(data.crashPoint || data.currentMultiplier);
    setServerSeed(data.serverSeed);
    setClientSeed(data.clientSeed);

    if (!cashedOut) {
      setResultMessage({
        type: "loss",
        amount: 0,
        multiplier: data.crashPoint || data.currentMultiplier,
      });
      setShowResultBanner(true);
      setTimeout(() => setShowResultBanner(false), 5000);
    }

    loadHistory();
  }, [cashedOut, loadHistory]);

  const pollGameStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/crash/status");
      const data = await response.json();

      if (response.ok && data.hasActiveGame) {
        if (data.autoCashedOut) {
          handleAutoCashout(data);
          return;
        }

        if (data.crashed && !hasCrashed) {
          handleCrash(data);
          return;
        }

        setGamePhase(data.phase);
        setCashedOut(data.cashedOut);
      } else if (response.ok && !data.hasActiveGame && !cashedOut && gamePhase !== 'crashed') {
        // Only reset if not cashed out and not in crashed state
        resetGameState();
      }
    } catch (error) {
      console.error("Failed to poll game status:", error);
    }
  }, [handleAutoCashout, handleCrash, resetGameState, hasCrashed, gamePhase, cashedOut]);

  // Poll for game status when game is active
  useEffect(() => {
    if (gameActive && gamePhase !== 'idle') {
      statusPollIntervalRef.current = setInterval(pollGameStatus, 100);
      return () => {
        if (statusPollIntervalRef.current) {
          clearInterval(statusPollIntervalRef.current);
        }
      };
    }
  }, [gameActive, gamePhase, pollGameStatus]);

  // Countdown timer for betting phase
  useEffect(() => {
    if (gamePhase === 'betting' && bettingPhaseEnd > 0) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((bettingPhaseEnd - Date.now()) / 1000));
        setCountdown(remaining);

        if (remaining === 0) {
          setGamePhase('running');
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [gamePhase, bettingPhaseEnd]);

  // Main animation loop - calculate multiplier and draw
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let points: { x: number; y: number }[] = [];
    let animationId: number;

    const createThrusterParticle = (x: number, y: number, angle: number) => {
      const speed = 2 + Math.random() * 2;
      const spreadAngle = (Math.random() - 0.5) * 0.5;
      // Thrusters shoot bottom-left: 135° = down-left diagonal in canvas coords
      const thrusterAngle = Math.PI * 3 / 4; // 135 degrees = bottom-left
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(thrusterAngle + spreadAngle) * speed,
        vy: Math.sin(thrusterAngle + spreadAngle) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#fbbf24' : '#f97316',
      });
    };

    const createExplosion = (x: number, y: number) => {
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 3 + Math.random() * 5;
        explosionParticlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          maxLife: 1.0,
          size: 3 + Math.random() * 4,
          color: ['#ef4444', '#f97316', '#fbbf24', '#fef3c7'][Math.floor(Math.random() * 4)],
        });
      }
    };

    const updateParticles = (particles: Particle[], deltaTime: number) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= deltaTime;

        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    };

    const drawParticles = (particles: Particle[], ctx: CanvasRenderingContext2D) => {
      particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (rect.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();

        const x = (rect.width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }

      // Update multiplier if running (even after cashout, until crash)
      if (gamePhase === 'running' && gameStartTime > 0 && !hasCrashed) {
        const now = Date.now();
        const elapsedMs = now - gameStartTime;

        if (elapsedMs >= 0) {
          const seconds = elapsedMs / 1000;
          const multiplier = Math.pow(Math.E, 0.0015 * seconds * 100);
          const roundedMultiplier = Math.round(multiplier * 100) / 100;
          setCurrentMultiplier(roundedMultiplier);

          // Add point every frame for ultra-smooth curve
          points.push({ x: seconds, y: multiplier }); // Use full precision for smoothness
          if (points.length > 1000) points.shift(); // Larger buffer for more points

          // Check if we've reached the crash point
          if (crashPoint && roundedMultiplier >= crashPoint) {
            console.log("[Crash] Game crashed at", crashPoint, "current:", roundedMultiplier);
            setHasCrashed(true);
            setGameActive(false);
            setGamePhase('crashed');
            setCurrentMultiplier(crashPoint);
          }
        }
      }

      // Draw graph
      if (points.length > 0) {
        // Add 10% buffer to max values so rocket doesn't touch the edges
        const maxX = Math.max(...points.map(p => p.x), 5) * 1.1;
        const maxY = Math.max(...points.map(p => p.y), 2) * 1.1;
        const padding = 20;

        // Draw exponential curve (data is already exponential, use linear scaling)
        ctx.strokeStyle = hasCrashed ? '#ef4444' : '#10b981';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = hasCrashed ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const startX = padding;
        const startY = rect.height - padding; // Start at bottom-left corner
        ctx.moveTo(startX, startY);

        // Draw smooth curve using quadratic bezier curves
        let prevX = startX;
        let prevY = startY;

        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const x = padding + (point.x / maxX) * (rect.width - padding * 2);
          const normalizedY = (point.y - 1.0) / (maxY - 1.0);
          const y = rect.height - padding - normalizedY * (rect.height - padding * 2);

          if (i === 0) {
            // First point - draw straight line
            ctx.lineTo(x, y);
          } else if (i === points.length - 1) {
            // Last point - use quadratic curve with previous point as control
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, x, y);
          } else {
            // Middle points - use smooth quadratic curves
            const nextPoint = points[i + 1];
            const nextX = padding + (nextPoint.x / maxX) * (rect.width - padding * 2);
            const nextNormalizedY = (nextPoint.y - 1.0) / (maxY - 1.0);
            const nextY = rect.height - padding - nextNormalizedY * (rect.height - padding * 2);

            // Control point between current and next
            const cpX = x;
            const cpY = y;
            const endX = (x + nextX) / 2;
            const endY = (y + nextY) / 2;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            prevX = endX;
            prevY = endY;
            continue;
          }

          prevX = x;
          prevY = y;
        }

        const lastPoint = points[points.length - 1];
        const lastX = padding + (lastPoint.x / maxX) * (rect.width - padding * 2);
        const normalizedLastY = (lastPoint.y - 1.0) / (maxY - 1.0);
        const lastY = rect.height - padding - normalizedLastY * (rect.height - padding * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Fill area under curve
        if (!hasCrashed) {
          const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
          ctx.fillStyle = gradient;
          ctx.lineTo(lastX, rect.height - padding);
          ctx.lineTo(startX, rect.height - padding);
          ctx.closePath();
          ctx.fill();
        }

        // Draw rocket or explosion
        if (hasCrashed) {
          // Draw explosion
          updateParticles(explosionParticlesRef.current, 0.02);
          drawParticles(explosionParticlesRef.current, ctx);

          // Draw explosion emoji
          ctx.font = '64px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💥', lastX, lastY);
        } else if (points.length > 0) {
          // Fixed angle - always point to the right
          const angle = 0; // 0 degrees = pointing right

          // Update thruster particles
          updateParticles(particlesRef.current, 0.02);

          // Create new thruster particles
          if (Math.random() > 0.3) {
            createThrusterParticle(lastX, lastY, angle);
          }

          // Draw thruster particles
          drawParticles(particlesRef.current, ctx);

          // Draw rocket
          ctx.save();
          ctx.translate(lastX, lastY);
          ctx.rotate(angle);
          ctx.font = '40px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚀', 0, 0);
          ctx.restore();
        }
      }

      if (gamePhase === 'running' && !hasCrashed) {
        animationId = requestAnimationFrame(animate);
      } else if (hasCrashed && explosionParticlesRef.current.length === 0) {
        // Create explosion once
        if (points.length > 0) {
          const lastPoint = points[points.length - 1];
          // Add 10% buffer to match graph rendering
          const maxX = Math.max(...points.map(p => p.x), 5) * 1.1;
          const maxY = Math.max(...points.map(p => p.y), 2) * 1.1;
          const padding = 20;
          const lastX = padding + (lastPoint.x / maxX) * (rect.width - padding * 2);
          const normalizedLastY = (lastPoint.y - 1.0) / (maxY - 1.0);
          const lastY = rect.height - padding - normalizedLastY * (rect.height - padding * 2);
          createExplosion(lastX, lastY);
          setGraphPoints(points);
        }
        animationId = requestAnimationFrame(animate);
      } else if (explosionParticlesRef.current.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    if (gamePhase === 'running' || hasCrashed) {
      animate();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (points.length > 0) {
        setGraphPoints(points);
      }
    };
  }, [gamePhase, gameStartTime, hasCrashed, crashPoint, cashedOut]);

  const handleStartGame = async () => {
    if (walletBalance < betAmount) {
      alert(`Insufficient balance. You have ${walletBalance} sats, need ${betAmount} sats`);
      return;
    }

    if (loading) return;

    setLoading(true);
    setShowResultBanner(false);

    try {
      const response = await fetch("/api/crash/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betAmount,
          autoCashout: autoCashoutEnabled && autoCashout ? autoCashout : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGameActive(true);
        setGamePhase('betting');
        setBettingPhaseEnd(data.bettingPhaseEnd);
        setGameStartTime(data.gameStartTime);
        setHashedServerSeed(data.hashedServerSeed);
        setClientSeed(data.clientSeed);
        setCurrentMultiplier(1.0);
        setCashedOut(false);
        setCrashPoint(null);
        setGraphPoints([]);
        setHasCrashed(false);
        particlesRef.current = [];
        explosionParticlesRef.current = [];
        updateBalance(data.newBalance);
        console.log("[Crash] Game started:", data);
      } else {
        if (data.error?.includes("Too many requests") && data.error?.includes("demo mode")) {
          setShowRateLimitModal(true);
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      console.error("Crash start error:", error);
      alert("An error occurred while starting the game.");
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!gameActive || loading || cashedOut || gamePhase !== 'running') return;

    setLoading(true);

    try {
      const response = await fetch("/api/crash/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        // Don't stop the game - let it continue running until crash
        setCashedOut(true);
        setWinAmount(data.winAmount);
        setCrashPoint(data.crashPoint);
        setServerSeed(data.serverSeed);
        setClientSeed(data.clientSeed);
        setHashedServerSeed(data.hashedServerSeed);
        updateBalance(data.newBalance);

        setResultMessage({
          type: "success",
          amount: data.winAmount,
          multiplier: data.cashoutMultiplier,
        });
        setShowResultBanner(true);

        setTimeout(() => setShowResultBanner(false), 5000);
        console.log("[Crash] Cashed out:", data, "Crash point:", data.crashPoint, "Current multiplier:", currentMultiplier);
        loadHistory();
      } else {
        if (data.crashed) {
          handleCrash(data);
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      console.error("Crash cashout error:", error);
      alert("An error occurred while cashing out.");
    } finally {
      setLoading(false);
    }
  };

  const potentialWin = Math.floor(betAmount * currentMultiplier);

  const getCrashPointColor = (point: number) => {
    if (point < 2) return "text-red-400";
    if (point < 5) return "text-yellow-400";
    if (point < 10) return "text-green-400";
    return "text-purple-400";
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Result Banner */}
      {showResultBanner && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-lg shadow-lg ${
            resultMessage.type === "success"
              ? "bg-green-500/90"
              : "bg-red-500/90"
          } text-white font-bold text-xl animate-bounce`}
        >
          {resultMessage.type === "success"
            ? `🎉 Cashed Out! +${resultMessage.amount} sats at ${resultMessage.multiplier.toFixed(2)}x`
            : `💥 Crashed at ${resultMessage.multiplier.toFixed(2)}x!`}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Bet Amount Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-purple-300">Bet Amount</h3>

            <div className="mb-4">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                disabled={gameActive}
                className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-purple-400 disabled:opacity-50"
                min="1"
                max="500"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={gameActive}
                  className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/30 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {amount}
                </button>
              ))}
            </div>

            <div className="text-center text-sm text-gray-400">
              Balance: {walletBalance} sats ({walletMode})
            </div>
          </div>

          {/* Auto Cashout Card */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-300">Auto Cashout</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCashoutEnabled}
                  onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                  disabled={gameActive}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {autoCashoutEnabled && (
              <div>
                <input
                  type="number"
                  value={autoCashout || ""}
                  onChange={(e) => setAutoCashout(parseFloat(e.target.value) || null)}
                  disabled={gameActive}
                  placeholder="e.g., 2.00"
                  step="0.01"
                  min="1.01"
                  max="1000"
                  className="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-blue-400 disabled:opacity-50"
                />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Automatically cash out at this multiplier
                </p>
              </div>
            )}
          </div>

          {/* Start/Cashout Button */}
          {!gameActive || gamePhase === 'idle' ? (
            <button
              onClick={handleStartGame}
              disabled={loading || betAmount < 1 || betAmount > 500}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xl font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {loading ? "Starting..." : "Place Bet"}
            </button>
          ) : gamePhase === 'betting' ? (
            <button
              disabled={true}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-bold rounded-xl shadow-lg opacity-75 cursor-not-allowed"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </span>
            </button>
          ) : gamePhase === 'running' && !cashedOut ? (
            <button
              onClick={handleCashout}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white text-xl font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 animate-pulse"
            >
              {loading ? "Cashing Out..." : `Cash Out ${potentialWin} sats`}
            </button>
          ) : cashedOut && gamePhase === 'running' ? (
            <button
              onClick={handleStartGame}
              disabled={loading || betAmount < 1 || betAmount > 500}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xl font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {loading ? "Starting..." : "Place Bet (Next Round)"}
            </button>
          ) : (
            <div className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xl font-bold rounded-xl shadow-lg text-center">
              {cashedOut ? "Cashed Out!" : "Crashed!"}
            </div>
          )}

          {/* History Ticker */}
          <div className="bg-gradient-to-br from-gray-900/30 to-black/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/20 shadow-lg">
            <h3 className="text-sm font-bold text-gray-400 mb-2">Recent Crashes</h3>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className={`px-3 py-1 rounded-lg font-bold text-sm ${getCrashPointColor(entry.crashPoint)} bg-gray-800/50 border border-gray-700/30`}
                >
                  {entry.crashPoint.toFixed(2)}x
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-gray-500 text-sm">No history yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Center Panel - Graph */}
        <div className="lg:col-span-3 space-y-4">
          {/* Multiplier Display */}
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-8 border border-indigo-500/20 shadow-lg text-center">
            {/* Show both indicators side by side when cashed out and game still running */}
            {cashedOut && winAmount > 0 && gamePhase === 'running' && !hasCrashed ? (
              <div className="flex items-center justify-center gap-8">
                {/* Cashout Indicator */}
                <div className="px-6 py-3 bg-green-500/20 border-2 border-green-500 rounded-xl">
                  <div className="text-sm text-green-400 font-semibold">CASHED OUT AT</div>
                  <div className="text-5xl text-green-300 font-bold">
                    {resultMessage.multiplier.toFixed(2)}x
                  </div>
                  <div className="text-sm text-green-400">+{winAmount} sats</div>
                </div>

                {/* Arrow */}
                <div className="text-gray-400 text-4xl">→</div>

                {/* Current Multiplier */}
                <div className="px-6 py-3 bg-blue-500/20 border-2 border-blue-500 rounded-xl">
                  <div className="text-sm text-blue-400 font-semibold">CURRENT</div>
                  <div className="text-5xl text-blue-300 font-bold animate-pulse">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-sm text-blue-400">Watching...</div>
                </div>
              </div>
            ) : (
              <div className={`text-8xl font-bold ${hasCrashed ? 'text-red-400' : gamePhase === 'running' ? 'text-green-400 animate-pulse' : 'text-white'} transition-all`}>
                {currentMultiplier.toFixed(2)}x
              </div>
            )}

            {/* Show indicators horizontally when both cashed out and crashed */}
            {cashedOut && winAmount > 0 && hasCrashed && crashPoint ? (
              <div className="mt-4 flex items-center justify-center gap-6">
                {/* Cashout Indicator */}
                <div className="px-6 py-3 bg-green-500/20 border-2 border-green-500 rounded-xl">
                  <div className="text-sm text-green-400 font-semibold">YOU CASHED OUT</div>
                  <div className="text-3xl text-green-300 font-bold">
                    {resultMessage.multiplier.toFixed(2)}x
                  </div>
                  <div className="text-sm text-green-400">+{winAmount} sats</div>
                </div>

                {/* Separator */}
                <div className="text-gray-400 text-2xl">•</div>

                {/* Crash Point */}
                <div className="px-6 py-3 bg-red-500/20 border-2 border-red-500 rounded-xl">
                  <div className="text-sm text-red-400 font-semibold">ROCKET CRASHED</div>
                  <div className="text-3xl text-red-300 font-bold">
                    {crashPoint.toFixed(2)}x
                  </div>
                  <div className="text-sm text-red-400">💥</div>
                </div>
              </div>
            ) : hasCrashed && crashPoint ? (
              /* Show only crash indicator if didn't cash out */
              <div className="mt-4">
                <div className="text-2xl text-red-400 font-bold">
                  💥 CRASHED! 💥
                </div>
                <div className="px-6 py-3 bg-red-500/20 border-2 border-red-500 rounded-xl inline-block mt-2">
                  <div className="text-sm text-red-400 font-semibold">CRASH POINT</div>
                  <div className="text-2xl text-red-300 font-bold">
                    {crashPoint.toFixed(2)}x
                  </div>
                </div>
              </div>
            ) : null}

            {gamePhase === 'running' && !cashedOut && !hasCrashed && (
              <div className="text-3xl text-gray-300 mt-4">
                Win: {potentialWin} sats
              </div>
            )}
          </div>

          {/* Graph Canvas */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg bg-black/20"
              style={{ height: '500px' }}
            />
          </div>

          {/* Provably Fair */}
          {hashedServerSeed && (
            <div className="bg-gradient-to-br from-gray-900/30 to-black/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/20 shadow-lg">
              <h3 className="text-sm font-bold text-gray-400 mb-2">Provably Fair</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Server Seed (Hashed): {hashedServerSeed.substring(0, 16)}...</div>
                <div>Client Seed: {clientSeed.substring(0, 16)}...</div>
                {serverSeed && <div className="text-green-400">Server Seed: {serverSeed.substring(0, 16)}... (Revealed after crash)</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate Limit Modal */}
      <RateLimitModal isOpen={showRateLimitModal} onClose={() => setShowRateLimitModal(false)} />
    </div>
  );
}
