"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import Ball from "./Ball";
import { useAuth } from "@/lib/auth-context";
import { RiskLevel } from "@/lib/plinko";
import RateLimitModal from "./RateLimitModal";

// Multipliers by risk level - 17 slots
const MULTIPLIERS_BY_RISK = {
  low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  medium: [100, 40, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 40, 100],
  high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
};

interface ActiveBall {
  id: number;
  path: number[];
  multiplier: number;
  winAmount: number;
  slot: number;
  newBalance?: number; // Balance to update after ball lands
}

interface PlinkoProps {
  children: (props: {
    betAmount: number;
    setBetAmount: (amount: number) => void;
    risk: RiskLevel;
    setRisk: (risk: RiskLevel) => void;
    handlePlay: () => void;
    loading: boolean;
    balance: number;
    activeBalls: ActiveBall[];
    highlightedSlot: number | null;
    handleBallComplete: (ballId: number, slot: number, winAmount: number) => void;
    getMultiplierColor: (multiplier: number) => string;
    renderPegs: () => ReactNode[];
    renderMultipliers: () => ReactNode[];
  }) => ReactNode;
}

const Plinko: React.FC<PlinkoProps> = ({ children }) => {
  const { user, updateBalance } = useAuth();
  const balance = user?.balance || 0;
  const walletMode = user?.walletMode || "real";

  // Load saved settings from localStorage
  const [betAmount, setBetAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('plinko_betAmount');
      return saved ? parseInt(saved) : 10;
    }
    return 10;
  });

  const [risk, setRisk] = useState<RiskLevel>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('plinko_risk');
      // Prevent "high" risk from being loaded
      const savedRisk = saved as RiskLevel;
      return (savedRisk === "high" ? "medium" : savedRisk) || "medium";
    }
    return "medium";
  });

  const [loading, setLoading] = useState(false);
  const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('plinko_betAmount', betAmount.toString());
  }, [betAmount]);

  useEffect(() => {
    localStorage.setItem('plinko_risk', risk);
  }, [risk]);

  const handlePlay = async () => {
    if (balance < betAmount) {
      alert("Insufficient balance");
      return;
    }

    // Only prevent clicking while the API request is loading
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/plinko/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, risk }),
      });
      const data = await response.json();
      if (response.ok) {
        // Immediately deduct the bet from balance
        const balanceAfterBet = balance - betAmount;
        updateBalance(balanceAfterBet);

        // Store newBalance to update when ball lands (this includes the win)
        const uniqueId = Date.now() + Math.random() * 1000000;
        setActiveBalls(prev => [...prev, { ...data, id: uniqueId, newBalance: data.newBalance }]);
      } else {
        // Check if it's a demo rate limit error
        if (data.error && data.error.includes("Too many requests") && data.error.includes("demo mode")) {
          setShowRateLimitModal(true);
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      console.error("Plinko play error:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while playing Plinko.";

      // Check if it's a demo rate limit error
      if (errorMessage.includes("Too many requests") && errorMessage.includes("demo mode")) {
        setShowRateLimitModal(true);
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBallComplete = useCallback((ballId: number, slot: number, winAmount: number) => {
    // Update balance now that ball has landed
    // First, find the ball and get its newBalance
    setActiveBalls(prev => {
      const ball = prev.find(b => b.id === ballId);
      if (ball && ball.newBalance !== undefined) {
        // Call updateBalance OUTSIDE of setState to avoid render phase issues
        const balanceToUpdate = ball.newBalance;
        setTimeout(() => updateBalance(balanceToUpdate), 0);
      }
      return prev;
    });

    setHighlightedSlot(slot);
    setTimeout(() => {
      setActiveBalls(prev => prev.filter(b => b.id !== ballId));
      setHighlightedSlot(null);
    }, 1500);
  }, [updateBalance]);

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 100) return "#FF0066"; // Bright pink for 100x+
    if (multiplier >= 26) return "#FF003D";  // Bright red/pink for 26x+
    if (multiplier >= 16) return "#FF1744";  // Red for 16x+
    if (multiplier >= 9) return "#FF6B00";   // Orange for 9x+
    if (multiplier >= 4) return "#FF8C00";   // Dark orange for 4x+
    if (multiplier >= 2) return "#FFA500";   // Orange for 2x+
    if (multiplier >= 1.4) return "#FFB800"; // Yellow-orange for 1.4x+
    if (multiplier >= 1) return "#FFC107";   // Gold for 1x+
    if (multiplier >= 0.5) return "#FFD700"; // Bright yellow/gold for 0.5x+
    return "#FFE082"; // Light yellow for under 0.5x
  };

  // 16 rows: row 0 has 3 pegs, row 15 has 18 pegs
  const renderPegs = () => {
    const pegs = [];
    const pegSpacing = 35;
    const rowHeight = 35;
    const startY = 50;

    for (let row = 0; row < 16; row++) {
      const pegsInRow = 3 + row; // Row 0 has 3, row 1 has 4, ..., row 15 has 18
      const rowWidth = (pegsInRow - 1) * pegSpacing;
      const startX = 300 - rowWidth / 2; // Center around x=300

      for (let col = 0; col < pegsInRow; col++) {
        const x = startX + col * pegSpacing;
        const y = startY + row * rowHeight;
        pegs.push(
          <circle
            key={`peg-${row}-${col}`}
            cx={x}
            cy={y}
            r={5.5}
            fill="#9CA3AF"
            stroke="#6B7280"
            strokeWidth="2"
            filter="url(#pegShadow)"
          />
        );
      }
    }
    return pegs;
  };

  // Render multipliers between the bottom pegs
  const renderMultipliers = () => {
    const pegSpacing = 35;
    const bottomRow = 15;
    const pegsInBottomRow = 18;
    const rowWidth = (pegsInBottomRow - 1) * pegSpacing;
    const startX = 300 - rowWidth / 2;
    const currentMultipliers = MULTIPLIERS_BY_RISK[risk];

    return currentMultipliers.map((mult, i) => {
      // Position multiplier between peg i and peg i+1
      const leftPegX = startX + i * pegSpacing;
      const rightPegX = startX + (i + 1) * pegSpacing;
      const x = (leftPegX + rightPegX) / 2;
      const y = 590;
      const isHighlighted = highlightedSlot === i;
      const color = getMultiplierColor(mult);

      // Square dimensions
      const size = 30;
      const cornerRadius = 4;

      // 3D effect: pressed vs unpressed
      const offsetY = isHighlighted ? 2 : 0;
      const shadowOffset = isHighlighted ? 1 : 3;

      // Format the multiplier text - remove "x" suffix for large numbers
      const multText = mult >= 100 ? `${mult}` : `${mult}x`;

      return (
        <g key={i}>
          {/* Shadow for 3D effect */}
          <rect
            x={x - size / 2}
            y={y + shadowOffset}
            width={size}
            height={size}
            rx={cornerRadius}
            fill="rgba(0,0,0,0.3)"
            opacity={isHighlighted ? 0.2 : 0.4}
          />

          {/* Main button */}
          <defs>
            <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>

          <rect
            x={x - size / 2}
            y={y + offsetY}
            width={size}
            height={size}
            rx={cornerRadius}
            fill={`url(#grad-${i})`}
            stroke={isHighlighted ? "#FFFFFF" : "rgba(255,255,255,0.3)"}
            strokeWidth={isHighlighted ? "2.5" : "1"}
          />

          {/* Top highlight for 3D effect */}
          {!isHighlighted && (
            <rect
              x={x - size / 2 + 2}
              y={y + 2}
              width={size - 4}
              height={size / 3}
              rx={cornerRadius - 1}
              fill="rgba(255,255,255,0.2)"
            />
          )}

          <text
            x={x}
            y={y + offsetY + size / 2 + 5}
            textAnchor="middle"
            fill="black"
            fontSize={mult >= 100 ? "11" : "13"}
            fontWeight="bold"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {multText}
          </text>
        </g>
      );
    });
  };

  return (
    <>
      {children({
        betAmount,
        setBetAmount,
        risk,
        setRisk,
        handlePlay,
        loading,
        balance,
        activeBalls,
        highlightedSlot,
        handleBallComplete,
        getMultiplierColor,
        renderPegs,
        renderMultipliers,
      })}

      {/* Rate Limit Modal */}
      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
      />
    </>
  );
};

export default Plinko;
