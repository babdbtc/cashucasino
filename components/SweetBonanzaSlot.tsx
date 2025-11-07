"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import gsap from "gsap";
import { useSound } from "@/hooks/useSound";

type Symbol =
  | "🍬" // Red Heart Candy (highest)
  | "💜" // Purple Candy (high)
  | "💚" // Green Candy (medium-high)
  | "💙" // Blue Candy (medium)
  | "🍎" // Red Apple (medium)
  | "🍇" // Purple Plum/Grapes (medium-low)
  | "🍉" // Green Watermelon (low)
  | "🫐" // Purple Grapes (low)
  | "🍌" // Yellow Banana (lowest)
  | "🍭" // Scatter/Lollipop (triggers free spins)
  | "💣"; // Bomb (multiplier during free spins)

interface BombData {
  position: { row: number; col: number };
  multiplier: number;
}

interface Position {
  row: number;
  col: number;
}

interface Cluster {
  symbol: Symbol;
  positions: Position[];
  payout: number;
}

interface BombData {
  position: Position;
  multiplier: number;
}

interface TumbleResult {
  grid: Symbol[][];
  clusters: Cluster[];
  winAmount: number;
  bombs: BombData[];
}

interface SpinResult {
  initialGrid: Symbol[][];
  initialBombs: BombData[];
  tumbles: TumbleResult[];
  finalBombs: BombData[];
  totalWin: number;
  totalBet: number;
  scatterCount: number;
  scatterPayout: number;
  triggeredFreeSpins: boolean;
  freeSpinsAwarded: number;
  bombMultiplierTotal?: number;
}

interface AutoplaySettings {
  spinsRemaining: number; // -1 for infinity
  stopOnWin: boolean;
  stopOnBalance: number | null;
}

export default function SweetBonanzaSlot() {
  const { user, updateBalance } = useAuth();
  const walletBalance = user?.balance || 0;
  const walletMode = user?.walletMode || "demo";

  const [grid, setGrid] = useState<Symbol[][]>(createInitialGrid());
  const [currentBombs, setCurrentBombs] = useState<BombData[]>([]); // Store current tumble's bombs
  const [spinning, setSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sweetBonanza_betAmount');
      return saved ? parseInt(saved) : 10;
    }
    return 10;
  });
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoplay, setAutoplay] = useState<AutoplaySettings | null>(null);
  const [showAutoplayModal, setShowAutoplayModal] = useState(false);
  const [totalWinDisplay, setTotalWinDisplay] = useState(0);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [currentSpinWin, setCurrentSpinWin] = useState(0);
  const [displayedWin, setDisplayedWin] = useState(0);
  const [winCountUpComplete, setWinCountUpComplete] = useState(false);
  const [freeSpinsTotalWin, setFreeSpinsTotalWin] = useState(0);
  const [displayedFreeSpinsTotal, setDisplayedFreeSpinsTotal] = useState(0);
  const [needsManualSpinAfterFreeSpins, setNeedsManualSpinAfterFreeSpins] = useState(false);
  const [needsManualSpinToStartFreeSpins, setNeedsManualSpinToStartFreeSpins] = useState(false);
  const [extendedFreeSpins, setExtendedFreeSpins] = useState(0); // Track newly awarded free spins during free spins
  const [awardedFreeSpins, setAwardedFreeSpins] = useState(0); // Store originally awarded free spins for display
  const [buyingFreeSpins, setBuyingFreeSpins] = useState(false); // Track if user is buying free spins

  const gridRef = useRef<HTMLDivElement>(null);
  const winDisplayRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sound system
  const sound = useSound();

  // Initialize empty grid
  function createInitialGrid(): Symbol[][] {
    const symbols: Symbol[] = ["🍬", "💜", "💚", "💙", "🍎", "🍇", "🍉", "🫐", "🍌", "🍭"];
    return Array(5).fill(null).map(() =>
      Array(6).fill(null).map(() => symbols[Math.floor(Math.random() * symbols.length)])
    );
  }

  // Balance is now managed through auth context, no need for manual updates

  // Save bet amount to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sweetBonanza_betAmount', betAmount.toString());
    }
  }, [betAmount]);

  // Autoplay logic - waits for win animation to complete
  useEffect(() => {
    if (autoplay && (autoplay.spinsRemaining > 0 || autoplay.spinsRemaining === -1) && !spinning) {
      // Pause autoplay if free spins were just triggered or ended - require manual spin
      if (needsManualSpinToStartFreeSpins || needsManualSpinAfterFreeSpins) {
        return;
      }

      // If there's a win showing, wait for count-up to complete
      if (currentSpinWin > 0 && !winCountUpComplete) {
        // Don't start next spin yet - waiting for count-up animation
        return;
      }

      // Calculate delay
      let delay;
      if (currentSpinWin > 0 && winCountUpComplete) {
        // Win animation just completed, show final amount for 0.5 seconds
        delay = 500;
      } else {
        // No win, use standard delay
        delay = turboMode ? 500 : 2000;
      }

      autoplayTimerRef.current = setTimeout(() => {
        handleSpin(true);
      }, delay);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, spinning, turboMode, currentSpinWin, winCountUpComplete, needsManualSpinToStartFreeSpins, needsManualSpinAfterFreeSpins]);

  // Count-up animation for win display
  useEffect(() => {
    if (currentSpinWin === 0) {
      setDisplayedWin(0);
      setWinCountUpComplete(false);
      return;
    }

    setWinCountUpComplete(false); // Reset when starting new count-up
    const duration = turboMode ? 200 : 800; // Animation duration in ms - faster in turbo
    const steps = turboMode ? 15 : 30; // Fewer steps in turbo mode for quicker display

    // Animate from current displayed value to new target value
    const startValue = displayedWin;
    const endValue = currentSpinWin;
    const increment = (endValue - startValue) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayedWin(endValue);
        setWinCountUpComplete(true); // Mark as complete for scale animation
        clearInterval(interval);
      } else {
        setDisplayedWin(Math.floor(startValue + (increment * currentStep)));
      }
    }, stepDuration);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpinWin, turboMode]);

  // Count-up animation for free spins total (big finale)
  useEffect(() => {
    if (freeSpinsTotalWin === 0) {
      setDisplayedFreeSpinsTotal(0);
      return;
    }

    // Only animate when free spins just ended
    if (freeSpinsRemaining === 0) {
      const duration = 2000; // 2 seconds for dramatic finale
      const steps = 60; // More steps for smoother animation
      const increment = freeSpinsTotalWin / steps;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayedFreeSpinsTotal(freeSpinsTotalWin);
          clearInterval(interval);
        } else {
          setDisplayedFreeSpinsTotal(Math.floor(increment * currentStep));
        }
      }, stepDuration);

      return () => clearInterval(interval);
    } else {
      // During free spins, update instantly
      setDisplayedFreeSpinsTotal(freeSpinsTotalWin);
    }
  }, [freeSpinsTotalWin, freeSpinsRemaining]);

  // Note: Balance is now managed through auth context and updated via API responses

  const playSound = (soundType: 'spin' | 'win' | 'bigWin' | 'tumble' | 'scatter' | 'freespins' | 'symbolLand' | 'buttonClick') => {
    if (!soundEnabled) return;

    switch (soundType) {
      case 'spin':
        sound.play('spin');
        break;
      case 'win':
        sound.play('win-small');
        break;
      case 'bigWin':
        sound.play('win-big');
        break;
      case 'tumble':
        sound.play('tumble');
        break;
      case 'scatter':
        sound.play('scatter');
        break;
      case 'freespins':
        sound.play('freespins');
        break;
      case 'symbolLand':
        sound.play('symbol-land');
        break;
      case 'buttonClick':
        sound.play('button-click');
        break;
    }
  };

  // Get rarity-based background color for symbols
  const getSymbolBackground = (symbol: Symbol): string => {
    switch (symbol) {
      case "🍬": // Red Heart Candy - highest (vibrant red/pink)
        return "linear-gradient(135deg, #ff1744 0%, #ff6b9d 100%)";
      case "💜": // Purple Candy - high
        return "linear-gradient(135deg, #9c27b0 0%, #ce93d8 100%)";
      case "💚": // Green Candy - medium-high
        return "linear-gradient(135deg, #00c853 0%, #69f0ae 100%)";
      case "💙": // Blue Candy - medium
        return "linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)";
      case "🍎": // Red Apple - medium
        return "linear-gradient(135deg, #ffc4c4 0%, #ffd4d4 100%)";
      case "🍇": // Purple Plum - medium-low
        return "linear-gradient(135deg, #e8d5f2 0%, #f0e4f7 100%)";
      case "🍉": // Green Watermelon - low
        return "linear-gradient(135deg, #ffd4d4 0%, #ffe4e4 100%)";
      case "🫐": // Purple Grapes - low
        return "linear-gradient(135deg, #d1c4e9 0%, #e1d5f5 100%)";
      case "🍌": // Yellow Banana - lowest
        return "linear-gradient(135deg, #fff4c4 0%, #fffad4 100%)";
      case "🍭": // Scatter - vibrant purple/pink
        return "linear-gradient(135deg, #da70d6 0%, #ff69b4 100%)";
      case "💣": // Bomb - dark with orange glow
        return "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)";
      default:
        return "linear-gradient(135deg, #f0e4f7 0%, #fce4ec 100%)";
    }
  };

  const animateSymbolDrop = (row: number, col: number, delay: number = 0) => {
    const symbolElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!symbolElement) return;

    // Kill any existing animations on this element to prevent conflicts
    gsap.killTweensOf(symbolElement);

    // Adjust duration so all rows finish at the same time (compensate for stagger delay)
    // Bottom rows get less duration since they start later
    const baseDuration = turboMode ? 0.1 : 0.6; // Increased for smoother animation
    const adjustedDuration = baseDuration - (delay * 0.7); // Slightly higher compensation

    gsap.fromTo(
      symbolElement,
      { y: -100, opacity: 0, scale: 0.5 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: adjustedDuration,
        delay,
        ease: "elastic.out(0.8, 0.6)", // Smoother elastic bounce
        onComplete: () => {
          // Clear transform properties to prevent stale styles
          gsap.set(symbolElement, { clearProps: "transform,opacity" });
        }
      }
    );
  };

  const animateWinningCluster = (positions: Position[]) => {
    positions.forEach((pos, index) => {
      const symbolElement = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
      if (!symbolElement) return;

      const duration = turboMode ? 0.2 : 0.6;

      // Kill any existing animations on this element to prevent conflicts
      gsap.killTweensOf(symbolElement);

      // Add glowing border effect
      (symbolElement as HTMLElement).style.boxShadow = '0 0 25px rgba(251, 191, 36, 1), 0 0 40px rgba(251, 191, 36, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.8)';
      (symbolElement as HTMLElement).style.borderColor = 'rgb(251, 191, 36)';
      (symbolElement as HTMLElement).style.zIndex = '10';

      // Pulsing glow animation
      gsap.to(symbolElement, {
        scale: 1.15,
        duration: duration / 2,
        yoyo: true,
        repeat: 3,
        ease: "sine.inOut",
        delay: index * 0.05,
        onComplete: () => {
          // Reset ALL styles after animation (including transform)
          gsap.set(symbolElement, { scale: 1, clearProps: "transform" });
          (symbolElement as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.5)';
          (symbolElement as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.8)';
          (symbolElement as HTMLElement).style.zIndex = '0';
        }
      });
    });
  };

  const animateFreeSpinsLollipops = (): Promise<void> => {
    return new Promise((resolve) => {
      // Find all lollipop positions in the current grid
      const lollipopPositions: Position[] = [];
      grid.forEach((row, rowIndex) => {
        row.forEach((symbol, colIndex) => {
          if (symbol === "🍭") {
            lollipopPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });

      if (lollipopPositions.length === 0) {
        resolve();
        return;
      }

      const duration = turboMode ? 0.3 : 0.8;
      let completedAnimations = 0;

      // Animate each lollipop (enlarge but don't remove)
      lollipopPositions.forEach((pos, index) => {
        const symbolElement = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
        if (!symbolElement) {
          completedAnimations++;
          if (completedAnimations === lollipopPositions.length) {
            resolve();
          }
          return;
        }

        // Kill any existing animations on this element to prevent conflicts
        gsap.killTweensOf(symbolElement);

        // Add extra glowing effect for lollipops
        (symbolElement as HTMLElement).style.boxShadow = '0 0 40px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 105, 180, 1), inset 0 0 30px rgba(255, 255, 255, 0.9)';
        (symbolElement as HTMLElement).style.borderColor = 'rgb(255, 215, 0)';
        (symbolElement as HTMLElement).style.zIndex = '20';

        // Pulsing glow animation - more dramatic for scatters
        gsap.to(symbolElement, {
          scale: 1.3,
          duration: duration / 2,
          yoyo: true,
          repeat: 5, // More repeats for emphasis
          ease: "sine.inOut",
          delay: index * 0.08,
          onComplete: () => {
            // Reset scale and clear transform
            gsap.set(symbolElement, { scale: 1, clearProps: "transform" });
            // Keep the enhanced lollipop styling (don't fully reset)
            (symbolElement as HTMLElement).style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 105, 180, 0.6), 0 4px 12px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.7)';
            (symbolElement as HTMLElement).style.borderColor = 'rgb(255, 215, 0)';
            (symbolElement as HTMLElement).style.zIndex = '0';

            completedAnimations++;
            if (completedAnimations === lollipopPositions.length) {
              resolve();
            }
          }
        });
      });
    });
  };

  const animateSymbolRemoval = (positions: Position[]): Promise<void> => {
    return new Promise((resolve) => {
      const duration = turboMode ? 0.15 : 0.4;

      positions.forEach((pos, index) => {
        const symbolElement = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
        if (!symbolElement) return;

        // Kill any existing animations on this element to prevent conflicts
        gsap.killTweensOf(symbolElement);

        // Create particle burst effect
        const rect = symbolElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create 5 particles
        for (let i = 0; i < 5; i++) {
          const particle = document.createElement('div');
          particle.style.position = 'fixed';
          particle.style.left = `${centerX}px`;
          particle.style.top = `${centerY}px`;
          particle.style.width = '10px';
          particle.style.height = '10px';
          particle.style.borderRadius = '50%';
          particle.style.backgroundColor = ['#FFD700', '#FFA500', '#FF69B4', '#9370DB', '#00CED1'][i % 5];
          particle.style.pointerEvents = 'none';
          particle.style.zIndex = '100';
          document.body.appendChild(particle);

          const angle = (i / 5) * Math.PI * 2;
          const distance = 50 + Math.random() * 50;
          const tx = Math.cos(angle) * distance;
          const ty = Math.sin(angle) * distance;

          gsap.to(particle, {
            x: tx,
            y: ty,
            opacity: 0,
            scale: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => particle.remove()
          });
        }

        // Explode symbol
        gsap.to(symbolElement, {
          scale: 1.5,
          opacity: 0,
          rotation: 360,
          duration,
          ease: "back.in(2)",
          delay: index * (turboMode ? 0.01 : 0.03),
          onComplete: () => {
            // Clear all transform properties after removal animation
            gsap.set(symbolElement, { clearProps: "all" });
            if (index === positions.length - 1) {
              resolve();
            }
          },
        });
      });
    });
  };

  const animateBigWin = () => {
    if (!winDisplayRef.current) return;

    setShowWinAnimation(true);

    gsap.fromTo(
      winDisplayRef.current,
      { scale: 0, rotation: -180, opacity: 0 },
      {
        scale: 1.5,
        rotation: 0,
        opacity: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
        onComplete: () => {
          gsap.to(winDisplayRef.current, {
            scale: 1,
            duration: 0.3,
          });

          setTimeout(() => {
            setShowWinAnimation(false);
          }, 3000);
        },
      }
    );
  };

  const animateBombMultipliers = (allBombs: BombData[], totalMultiplier: number): Promise<void> => {
    return new Promise((resolve) => {
      if (allBombs.length === 0) {
        resolve();
        return;
      }

      const duration = turboMode ? 0.3 : 0.8;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // For each bomb, create a flying multiplier text
      allBombs.forEach((bomb, index) => {
        const bombElement = document.querySelector(`[data-row="${bomb.position.row}"][data-col="${bomb.position.col}"]`);
        if (!bombElement) return;

        const rect = bombElement.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        // Create flying multiplier element
        const flyingMultiplier = document.createElement('div');
        flyingMultiplier.textContent = `${bomb.multiplier}x`;
        flyingMultiplier.style.position = 'fixed';
        flyingMultiplier.style.left = `${startX}px`;
        flyingMultiplier.style.top = `${startY}px`;
        flyingMultiplier.style.fontSize = '2rem';
        flyingMultiplier.style.fontWeight = 'bold';
        flyingMultiplier.style.color = '#fbbf24';
        flyingMultiplier.style.textShadow = '0 0 10px rgba(251, 191, 36, 1)';
        flyingMultiplier.style.zIndex = '1000';
        flyingMultiplier.style.pointerEvents = 'none';
        document.body.appendChild(flyingMultiplier);

        // Animate to center with delay based on index
        gsap.to(flyingMultiplier, {
          left: centerX,
          top: centerY,
          scale: 2,
          opacity: 0,
          duration: duration,
          delay: index * (turboMode ? 0.1 : 0.2),
          ease: "power2.in",
          onComplete: () => {
            document.body.removeChild(flyingMultiplier);

            // On the last bomb, show the total multiplier
            if (index === allBombs.length - 1) {
              // Flash the total multiplier at the center (matching winning display format)
              const totalMultiplierElement = document.createElement('div');
              totalMultiplierElement.textContent = `${totalMultiplier}x`;
              totalMultiplierElement.style.position = 'fixed';
              totalMultiplierElement.style.left = '50%';
              totalMultiplierElement.style.top = '50%';
              totalMultiplierElement.style.transform = 'translate(-50%, -50%)';
              totalMultiplierElement.style.fontSize = '8rem';
              totalMultiplierElement.style.fontWeight = '900';
              totalMultiplierElement.style.color = '#fcd34d';
              totalMultiplierElement.style.textShadow = '0 0 30px rgba(251, 191, 36, 1), 0 0 60px rgba(251, 191, 36, 0.8), 0 4px 8px rgba(0,0,0,0.8)';
              totalMultiplierElement.style.webkitTextStroke = '2px rgba(0,0,0,0.3)';
              totalMultiplierElement.style.zIndex = '1000';
              totalMultiplierElement.style.pointerEvents = 'none';
              totalMultiplierElement.style.opacity = '0';
              document.body.appendChild(totalMultiplierElement);

              gsap.fromTo(totalMultiplierElement,
                { scale: 0, opacity: 0 },
                {
                  scale: 1,
                  opacity: 1,
                  duration: turboMode ? 0.3 : 0.5,
                  ease: "back.out(1.7)",
                  onComplete: () => {
                    // Pulse effect like winning display
                    gsap.to(totalMultiplierElement, {
                      scale: 1.25,
                      duration: 0.3,
                      yoyo: true,
                      repeat: 1,
                      ease: "power2.inOut"
                    });

                    setTimeout(() => {
                      gsap.to(totalMultiplierElement, {
                        opacity: 0,
                        scale: 1.5,
                        duration: 0.3,
                        onComplete: () => {
                          document.body.removeChild(totalMultiplierElement);
                          resolve();
                        }
                      });
                    }, turboMode ? 500 : 1500);
                  }
                }
              );
            }
          }
        });
      });

      // If there are no bombs, just resolve
      if (allBombs.length === 0) {
        resolve();
      }
    });
  };

  const handleSpin = async (isAutoplay = false) => {
    const isFreeSpin = freeSpinsRemaining > 0;

    // Check virtual balance (only if not a free spin)
    if (!isFreeSpin && walletBalance < betAmount) {
      setError(`Insufficient balance. You have ${walletBalance} sat, need ${betAmount} sat`);
      if (isAutoplay) {
        setAutoplay(null); // Stop autoplay
      }
      return;
    }

    if (betAmount < 1 || betAmount > 1000) {
      setError("Bet must be between 1 and 1000 sat");
      return;
    }

    // Clear manual spin flags when user clicks spin
    setNeedsManualSpinAfterFreeSpins(false);
    setNeedsManualSpinToStartFreeSpins(false);
    setAwardedFreeSpins(0); // Clear awarded amount once user starts playing
    setExtendedFreeSpins(0); // Clear extended free spins notification

    // Server will handle balance validation
    setSpinning(true);
    setError(null);
    setResult(null);
    setTotalWinDisplay(0);
    setCurrentSpinWin(0); // Reset win counter for new spin
    setCurrentBombs([]); // Clear bombs from previous spin

    // Reset free spins total if starting a new regular spin
    if (!isFreeSpin) {
      setFreeSpinsTotalWin(0);
    }

    try {
      playSound('spin');

      // Call the API (no token needed!)
      // Server now manages free spins state to prevent manipulation
      const response = await fetch("/api/bonanza/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          betAmount,
        }),
      });

      const data = await response.json();

      // Debug logging
      console.log('[Sweet Bonanza] API Response:', {
        totalWin: data.totalWin,
        newBalance: data.newBalance,
        tumbles: data.tumbles?.length,
        clusters: data.tumbles?.[0]?.clusters?.length
      });

      if (!response.ok) {
        throw new Error(data.error || "Failed to play spin");
      }

      // Update balance from server response
      // Always update balance - the server already handles free spins accumulation correctly
      if (data.newBalance !== undefined) {
        updateBalance(data.newBalance);
        console.log('[Sweet Bonanza] Balance updated to:', data.newBalance);
      }

      // Animate initial spin - update bombs first, then grid synchronously
      flushSync(() => {
        setCurrentBombs(data.initialBombs || []);
        setGrid(data.initialGrid);
      });

      // Animate all symbols dropping
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 6; col++) {
          animateSymbolDrop(row, col, row * (turboMode ? 0.02 : 0.05));
        }
      }

      await new Promise(resolve => setTimeout(resolve, turboMode ? 300 : 1000));

      // Process tumbles
      let accumulatedWin = 0;
      const allBombsFromTumbles: BombData[] = []; // Collect all bombs across tumbles
      console.log('[Sweet Bonanza] Processing', data.tumbles.length, 'tumbles');
      for (const tumble of data.tumbles) {
        console.log('[Sweet Bonanza] Tumble has', tumble.clusters.length, 'clusters, winAmount:', tumble.winAmount);
        // Show winning clusters
        for (const cluster of tumble.clusters) {
          animateWinningCluster(cluster.positions);
          playSound('tumble');
          // Play scatter sound if cluster contains lollipops
          if (cluster.symbol === "🍭") {
            playSound('scatter');
          }
        }

        await new Promise(resolve => setTimeout(resolve, turboMode ? 200 : 600));

        // Remove winning symbols
        const allPositions = tumble.clusters.flatMap((c: any) => c.positions);
        await animateSymbolRemoval(allPositions);

        // Clear removed symbols from grid state immediately to prevent flash
        setGrid(prevGrid => {
          const clearedGrid = prevGrid.map(row => [...row]);
          for (const pos of allPositions) {
            clearedGrid[pos.row][pos.col] = null as any; // Clear the position
          }
          return clearedGrid;
        });

        await new Promise(resolve => setTimeout(resolve, turboMode ? 50 : 100));

        // Update bombs and grid synchronously to prevent multiplier display lag
        const tumuleBombs = tumble.bombs || [];
        flushSync(() => {
          setCurrentBombs(tumuleBombs);
          setGrid(tumble.grid);
        });
        allBombsFromTumbles.push(...tumuleBombs); // Collect all bombs

        // Animate new symbols dropping
        for (const cluster of tumble.clusters) {
          for (const pos of cluster.positions) {
            animateSymbolDrop(pos.row, pos.col, 0);
          }
        }

        accumulatedWin += tumble.winAmount;
        setTotalWinDisplay(accumulatedWin);
        setCurrentSpinWin(accumulatedWin);

        await new Promise(resolve => setTimeout(resolve, turboMode ? 200 : 500));
      }

      // After all tumbles, set final bombs and animate multipliers if in free spins
      setCurrentBombs(data.finalBombs || []);

      if (isFreeSpin && allBombsFromTumbles.length > 0 && data.bombMultiplierTotal) {
        await animateBombMultipliers(allBombsFromTumbles, data.bombMultiplierTotal);
      }

      // Show results
      setResult(data);

      if (data.totalWin > 0) {
        playSound(data.totalWin > betAmount * 10 ? 'bigWin' : 'win');

        if (data.totalWin > betAmount * 10) {
          animateBigWin();
        }

        // Balance already updated by server, newBalance received in response

        // Update total win display
        setTotalWinDisplay(data.totalWin);
        setCurrentSpinWin(data.totalWin);

        // Note: Free spins total is now tracked server-side
      } else {
        setTotalWinDisplay(0);
      }

      // Update free spins state from server response
      // Server now manages free spins state to prevent manipulation
      const serverFreeSpinsRemaining = data.freeSpinsRemaining ?? 0;
      const serverFreeSpinsTotalWin = data.freeSpinsTotalWin ?? 0;

      // Check if free spins were just triggered
      if (data.triggeredFreeSpins) {
        playSound('freespins');

        // If we're already in free spins, this is an extension
        if (freeSpinsRemaining > 0) {
          // Pause autoplay IMMEDIATELY to prevent clicking spin during the delay
          setNeedsManualSpinToStartFreeSpins(true);

          // Delay showing the extension overlay so users can see the lollipops
          setTimeout(() => {
            setExtendedFreeSpins(data.freeSpinsAwarded || 0);
            // Keep the extension notification visible (user needs to click spin to continue)
          }, 2500); // 2.5 second delay to show the lollipops
        } else {
          // Starting fresh free spins - fade out win display first, then animate lollipops
          const awarded = data.freeSpinsAwarded || 0;

          // Pause autoplay IMMEDIATELY to prevent clicking spin during animations
          setNeedsManualSpinToStartFreeSpins(true);

          // Use flushSync to ensure awardedFreeSpins is set immediately before showing overlay
          flushSync(() => {
            setAwardedFreeSpins(awarded); // Store the original awarded amount
          });

          // If there's a win showing, fade it out first
          if (currentSpinWin > 0) {
            // Find the win counter element and fade it out with GSAP
            const winCounter = document.querySelector('[data-win-counter]');
            if (winCounter) {
              gsap.to(winCounter, {
                opacity: 0,
                scale: 0.8,
                duration: 0.4,
                ease: "power2.in",
                onComplete: () => {
                  // After fade out completes, clear the win states
                  setCurrentSpinWin(0);
                  setTotalWinDisplay(0);

                  // Then animate lollipops (autoplay already paused)
                  animateFreeSpinsLollipops();
                }
              });
            } else {
              // Fallback if element not found
              setCurrentSpinWin(0);
              setTotalWinDisplay(0);
              animateFreeSpinsLollipops();
            }
          } else {
            // No win to fade out, go straight to lollipop animation
            animateFreeSpinsLollipops();
          }
        }
      }

      // Check if free spins just ended
      const freeSpinsJustEnded = freeSpinsRemaining > 0 && serverFreeSpinsRemaining === 0;
      if (freeSpinsJustEnded) {
        setNeedsManualSpinAfterFreeSpins(true); // Pause autoplay - require manual spin after free spins finale
        setCurrentSpinWin(0); // Clear last spin win, only show free spins total
      }

      // Update state from server
      setFreeSpinsRemaining(serverFreeSpinsRemaining);

      // Keep the free spins total visible when free spins just ended (don't update from server)
      // It will be cleared when user manually starts the next spin
      if (!freeSpinsJustEnded) {
        setFreeSpinsTotalWin(serverFreeSpinsTotalWin);
      }

      // Balance already updated from API response above

      // Handle autoplay
      if (isAutoplay && autoplay) {
        // Only decrement if not infinity (-1)
        const newSpinsRemaining = autoplay.spinsRemaining === -1 ? -1 : autoplay.spinsRemaining - 1;

        // Check stop conditions
        const shouldStop =
          (newSpinsRemaining === 0) || // Don't stop if -1 (infinity)
          (autoplay.stopOnWin && data.totalWin > 0) ||
          (autoplay.stopOnBalance !== null && walletBalance <= autoplay.stopOnBalance);

        if (shouldStop) {
          setAutoplay(null);
        } else {
          setAutoplay({ ...autoplay, spinsRemaining: newSpinsRemaining });
        }
      }

      setSpinning(false);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setSpinning(false);

      // Balance remains unchanged on error (bet wasn't processed)

      if (isAutoplay) {
        setAutoplay(null); // Stop autoplay on error
      }
    }
  };

  const handleBuyFreeSpins = async () => {
    const cost = betAmount * 100;

    // Check virtual balance
    if (walletBalance < cost) {
      setError(`Insufficient balance. You have ${walletBalance} sat, need ${cost} sat to buy free spins`);
      return;
    }

    if (betAmount < 1 || betAmount > 1000) {
      setError("Bet must be between 1 and 1000 sat");
      return;
    }

    // Don't allow buying free spins if already in free spins
    if (freeSpinsRemaining > 0) {
      setError("Cannot buy free spins while already in free spins mode");
      return;
    }

    setSpinning(true);
    setError(null);
    setResult(null);
    setTotalWinDisplay(0);
    setCurrentSpinWin(0);
    setFreeSpinsTotalWin(0);
    setCurrentBombs([]); // Clear bombs from previous spin

    try {
      playSound('spin');

      // Call the buy free spins API
      const response = await fetch("/api/bonanza/buy-freespins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          betAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to buy free spins");
      }

      // Update balance from server response
      if (data.newBalance !== undefined) {
        updateBalance(data.newBalance);
      }

      // Animate initial spin - update bombs first, then grid synchronously
      flushSync(() => {
        setCurrentBombs(data.initialBombs || []);
        setGrid(data.initialGrid);
      });

      // Animate all symbols dropping
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 6; col++) {
          animateSymbolDrop(row, col, row * (turboMode ? 0.02 : 0.05));
        }
      }

      await new Promise(resolve => setTimeout(resolve, turboMode ? 300 : 1000));

      // Process tumbles (if any wins on the purchase spin)
      let accumulatedWin = 0;
      const allBombsFromTumbles: BombData[] = []; // Collect all bombs across tumbles
      for (const tumble of data.tumbles) {
        // Show winning clusters
        for (const cluster of tumble.clusters) {
          animateWinningCluster(cluster.positions);
          playSound('tumble');
          if (cluster.symbol === "🍭") {
            playSound('scatter');
          }
        }

        await new Promise(resolve => setTimeout(resolve, turboMode ? 200 : 600));

        // Remove winning symbols
        const allPositions = tumble.clusters.flatMap((c: any) => c.positions);
        await animateSymbolRemoval(allPositions);

        // Clear removed symbols from grid state immediately to prevent flash
        setGrid(prevGrid => {
          const clearedGrid = prevGrid.map(row => [...row]);
          for (const pos of allPositions) {
            clearedGrid[pos.row][pos.col] = null as any; // Clear the position
          }
          return clearedGrid;
        });

        await new Promise(resolve => setTimeout(resolve, turboMode ? 50 : 100));

        // Update bombs and grid synchronously to prevent multiplier display lag
        const tumuleBombs = tumble.bombs || [];
        flushSync(() => {
          setCurrentBombs(tumuleBombs);
          setGrid(tumble.grid);
        });
        allBombsFromTumbles.push(...tumuleBombs); // Collect all bombs

        // Animate new symbols dropping
        for (const cluster of tumble.clusters) {
          for (const pos of cluster.positions) {
            animateSymbolDrop(pos.row, pos.col, 0);
          }
        }

        accumulatedWin += tumble.winAmount;
        setTotalWinDisplay(accumulatedWin);
        setCurrentSpinWin(accumulatedWin);

        await new Promise(resolve => setTimeout(resolve, turboMode ? 200 : 500));
      }

      // After all tumbles, set final bombs and animate multipliers if there are any
      // (shouldn't happen on buy spin, but included for completeness)
      setCurrentBombs(data.finalBombs || []);

      if (allBombsFromTumbles.length > 0 && data.bombMultiplierTotal) {
        await animateBombMultipliers(allBombsFromTumbles, data.bombMultiplierTotal);
      }

      // Show results
      setResult(data);

      if (data.totalWin > 0) {
        playSound(data.totalWin > betAmount * 10 ? 'bigWin' : 'win');

        if (data.totalWin > betAmount * 10) {
          animateBigWin();
        }

        setTotalWinDisplay(data.totalWin);
        setCurrentSpinWin(data.totalWin);
      }

      // Free spins should be triggered (we bought them!)
      if (data.triggeredFreeSpins) {
        playSound('freespins');

        const awarded = data.freeSpinsAwarded || 0;

        // Use flushSync to ensure awardedFreeSpins is set immediately before showing overlay
        flushSync(() => {
          setAwardedFreeSpins(awarded);
        });

        // If there's a win showing, fade it out first
        if (data.totalWin > 0) {
          // Find the win counter element and fade it out with GSAP
          const winCounter = document.querySelector('[data-win-counter]');
          if (winCounter) {
            gsap.to(winCounter, {
              opacity: 0,
              scale: 0.8,
              duration: 0.4,
              ease: "power2.in",
              onComplete: () => {
                // After fade out completes, clear the win states
                setCurrentSpinWin(0);
                setTotalWinDisplay(0);

                // Then animate lollipops
                animateFreeSpinsLollipops().then(() => {
                  // After animation completes, show the overlay
                  setNeedsManualSpinToStartFreeSpins(true);
                });
              }
            });
          } else {
            // Fallback if element not found
            setCurrentSpinWin(0);
            setTotalWinDisplay(0);
            animateFreeSpinsLollipops().then(() => {
              setNeedsManualSpinToStartFreeSpins(true);
            });
          }
        } else {
          // No win to fade out, go straight to lollipop animation
          animateFreeSpinsLollipops().then(() => {
            // After animation completes, show the overlay
            setNeedsManualSpinToStartFreeSpins(true);
          });
        }
      }

      // Update state from server
      setFreeSpinsRemaining(data.freeSpinsRemaining || 0);
      setFreeSpinsTotalWin(data.freeSpinsTotalWin || 0);

      setSpinning(false);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setSpinning(false);
    }
  };

  const startAutoplay = (spins: number) => {
    setAutoplay({
      spinsRemaining: spins,
      stopOnWin: false,
      stopOnBalance: null,
    });
    setShowAutoplayModal(false);
  };

  const stopAutoplay = () => {
    setAutoplay(null);
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
    }
  };

  const betOptions = [1, 5, 10, 20, 50, 100, 200, 500, 1000];

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Main 16:9 Game Container */}
      <div className="relative w-full bg-gradient-to-b from-pink-300 via-purple-300 to-blue-400 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
           style={{ minHeight: '55vh' }}>

        {/* Animated Candy Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Sky gradient with clouds */}
          <div className="absolute inset-0 bg-gradient-to-b from-pink-200 via-purple-200 to-blue-300" />

          {/* Floating clouds */}
          <div className="absolute top-10 left-10 w-32 h-20 bg-white rounded-full opacity-60 animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-20 right-20 w-40 h-24 bg-white rounded-full opacity-50 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-40 left-1/3 w-36 h-22 bg-white rounded-full opacity-55 animate-float" style={{ animationDelay: '2s' }} />

          {/* Floating candies and lollipops */}
          <div className="absolute top-32 left-16 text-6xl opacity-40 animate-float" style={{ animationDelay: '0.5s' }}>🍭</div>
          <div className="absolute top-48 right-32 text-5xl opacity-35 animate-float" style={{ animationDelay: '1.5s' }}>🍬</div>
          <div className="absolute top-64 left-1/4 text-5xl opacity-30 animate-float" style={{ animationDelay: '2.5s' }}>🍰</div>
          <div className="absolute bottom-32 right-16 text-6xl opacity-40 animate-float" style={{ animationDelay: '3s' }}>🍭</div>
          <div className="absolute bottom-48 left-20 text-5xl opacity-35 animate-float" style={{ animationDelay: '3.5s' }}>🍬</div>
        </div>

        {/* Sound Button - Top Right */}
        <button
          onClick={() => {
            // Don't play sound when turning sound off
            if (soundEnabled) {
              playSound('buttonClick');
            }
            setSoundEnabled(!soundEnabled);
          }}
          className={`absolute top-4 right-4 z-20 px-4 py-2 rounded-xl font-bold transition-all transform hover:scale-110 border-2 ${
            soundEnabled
              ? "bg-gradient-to-b from-green-400 to-green-600 border-green-300 shadow-lg"
              : "bg-gradient-to-b from-gray-600 to-gray-800 border-gray-500"
          } text-white`}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>

        {/* Buy Free Spins Button - Right Side */}
        <button
          onClick={() => {
            playSound('buttonClick');
            handleBuyFreeSpins();
          }}
          disabled={spinning || walletBalance < betAmount * 100 || freeSpinsRemaining > 0}
          className={`absolute bottom-44 right-4 z-20 px-4 py-3 rounded-xl font-bold transition-all transform border-2 ${
            spinning || walletBalance < betAmount * 100 || freeSpinsRemaining > 0
              ? "bg-gradient-to-b from-gray-600 to-gray-800 border-gray-500 opacity-50 cursor-not-allowed"
              : "bg-gradient-to-b from-purple-500 to-pink-600 border-pink-400 shadow-lg hover:scale-110 hover:from-purple-400 hover:to-pink-500"
          } text-white text-sm`}
          style={!(spinning || walletBalance < betAmount * 100 || freeSpinsRemaining > 0) ? {
            boxShadow: '0 0 20px rgba(219, 39, 119, 0.6)'
          } : {}}
        >
          <div>💣 BUY FS</div>
          <div className="text-xs">{betAmount * 100} sat</div>
        </button>

        {/* Turbo Button - Bottom Right */}
        <button
          onClick={() => {
            playSound('buttonClick');
            setTurboMode(!turboMode);
          }}
          className={`absolute bottom-24 right-4 z-20 px-4 py-2 rounded-xl font-bold transition-all transform hover:scale-110 border-2 ${
            turboMode
              ? "bg-gradient-to-b from-orange-400 to-orange-600 border-orange-300 shadow-lg"
              : "bg-gradient-to-b from-gray-600 to-gray-800 border-gray-500"
          } text-white`}
        >
          ⚡ TURBO
        </button>

        {/* Mobile Info Bar - Top of game (visible only on mobile) */}
        <div className="md:hidden relative z-20 px-2 py-2 bg-gradient-to-r from-purple-900/80 via-pink-900/80 to-purple-900/80 backdrop-blur-sm border-b-2 border-yellow-400/60">
          <div className="flex justify-around items-center gap-1 text-xs">
            <div className="text-center bg-black/40 px-2 py-1 rounded-lg border border-yellow-400/40 flex-1">
              <div className="text-[10px] font-bold text-yellow-300">
                Balance {walletMode === "demo" && <span className="text-purple-300">(Demo)</span>}
              </div>
              <div className="text-sm font-black text-yellow-400">{walletBalance}</div>
            </div>
            <div className="text-center bg-black/40 px-2 py-1 rounded-lg border border-yellow-400/40 flex-1">
              <div className="text-[10px] font-bold text-yellow-300">Bet</div>
              <div className="text-sm font-black text-yellow-400">{betAmount}</div>
            </div>
            <div className="text-center bg-black/40 px-2 py-1 rounded-lg border border-yellow-400/40 flex-1">
              <div className="text-[10px] font-bold text-yellow-300">Win</div>
              <div className={`text-sm font-black ${totalWinDisplay > 0 ? "text-green-400" : "text-gray-400"}`}>
                {totalWinDisplay}
              </div>
            </div>
            {freeSpinsRemaining > 0 && (
              <div className="text-center bg-gradient-to-br from-purple-900/60 to-pink-900/60 px-2 py-1 rounded-lg border border-pink-400/60 flex-1">
                <div className="text-[10px] font-bold text-pink-300">FS</div>
                <div className="text-sm font-black text-pink-400">{freeSpinsRemaining}</div>
              </div>
            )}
          </div>
        </div>

        {/* Left Side Panel - Info (Absolute Positioning) - Desktop only */}
        <div className="hidden md:flex absolute left-4 top-1/2 transform -translate-y-1/2 z-20 flex-col gap-4">
          {/* Balance Info */}
          <div className="text-center bg-black/40 px-6 py-3 rounded-xl border-2 border-yellow-400/40">
            <div className="text-sm font-bold text-yellow-300 uppercase tracking-wider">
              Balance {walletMode === "demo" && <span className="text-purple-300">(Demo)</span>}
            </div>
            <div className="text-2xl md:text-3xl font-black text-yellow-400 drop-shadow-lg">{walletBalance} sat</div>
          </div>

          {/* Bet Info */}
          <div className="text-center bg-black/40 px-6 py-3 rounded-xl border-2 border-yellow-400/40">
            <div className="text-sm font-bold text-yellow-300 uppercase tracking-wider">Bet</div>
            <div className="text-2xl md:text-3xl font-black text-yellow-400 drop-shadow-lg">{betAmount} sat</div>
          </div>

          {/* Last Win Info */}
          <div className="text-center bg-black/40 px-6 py-3 rounded-xl border-2 border-yellow-400/40">
            <div className="text-sm font-bold text-yellow-300 uppercase tracking-wider">Last Win</div>
            <div className={`text-2xl md:text-3xl font-black transition-all drop-shadow-lg ${
              totalWinDisplay > 0
                ? "text-green-400 animate-pulse scale-110"
                : "text-gray-400"
            }`}>
              {totalWinDisplay} sat
            </div>
          </div>
        </div>

        {/* Right Side Panel - Free Spins Info (Absolute Positioning) - Desktop only */}
        {freeSpinsRemaining > 0 && (
          <div className="hidden md:flex absolute right-4 top-1/2 transform -translate-y-1/2 z-20 flex-col gap-4">
            {/* Free Spins Remaining */}
            <div className="text-center bg-gradient-to-br from-purple-900/60 to-pink-900/60 px-6 py-3 rounded-xl border-2 border-pink-400/60 shadow-lg"
                 style={{ boxShadow: '0 0 20px rgba(236, 72, 153, 0.5)' }}>
              <div className="text-sm font-bold text-pink-300 uppercase tracking-wider">Free Spins</div>
              <div className="text-3xl md:text-4xl font-black text-pink-400 drop-shadow-lg animate-pulse">
                {freeSpinsRemaining} 🎰
              </div>
            </div>

            {/* Free Spins Total Winnings (Running Total) */}
            <div className="text-center bg-gradient-to-br from-green-900/60 to-emerald-900/60 px-6 py-3 rounded-xl border-2 border-green-400/60 shadow-lg"
                 style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' }}>
              <div className="text-sm font-bold text-green-300 uppercase tracking-wider">FS Total</div>
              <div className="text-2xl md:text-3xl font-black text-green-400 drop-shadow-lg">
                {freeSpinsTotalWin} sat
              </div>
            </div>
          </div>
        )}

        {/* Game Grid Container */}
        <div className="relative z-10 flex items-center justify-center flex-1 p-2 md:p-6 min-h-0">
          {/* Free Spins Triggered Overlay - Only covers grid area */}
          {needsManualSpinToStartFreeSpins && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/70 backdrop-blur-sm rounded-3xl">
              <div className="text-center relative">
                {/* Animated background sparkles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(30)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 bg-pink-300 rounded-full animate-ping"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${1 + Math.random() * 2}s`,
                        opacity: 0.6 + Math.random() * 0.4
                      }}
                    />
                  ))}
                </div>

                {/* Title */}
                <div className="text-4xl md:text-5xl font-black text-pink-400 mb-4 drop-shadow-lg animate-pulse"
                     style={{
                       textShadow: '0 0 30px rgba(236, 72, 153, 1), 0 0 60px rgba(236, 72, 153, 0.8), 0 4px 8px rgba(0,0,0,0.8)',
                       WebkitTextStroke: '2px rgba(0,0,0,0.3)'
                     }}>
                  🎰 FREE SPINS WON! 🎰
                </div>

                {/* Free spins count - Show awarded amount, not current remaining */}
                <div className={`text-8xl md:text-9xl font-black mb-4 drop-shadow-2xl animate-bounce`}
                     style={{
                       background: 'linear-gradient(45deg, #ec4899, #f472b6, #ec4899)',
                       backgroundClip: 'text',
                       WebkitBackgroundClip: 'text',
                       WebkitTextFillColor: 'transparent',
                       textShadow: '0 0 50px rgba(236, 72, 153, 1), 0 0 100px rgba(236, 72, 153, 0.8)',
                       filter: 'drop-shadow(0 0 40px rgba(236, 72, 153, 1)) drop-shadow(0 8px 16px rgba(0,0,0,0.8))',
                     }}>
                  {awardedFreeSpins}
                </div>

                {/* Subtitle */}
                <div className="text-xl md:text-2xl font-bold text-yellow-400 uppercase drop-shadow-lg mb-4"
                     style={{
                       textShadow: '0 0 20px rgba(251, 191, 36, 1), 0 4px 8px rgba(0,0,0,0.8)',
                       WebkitTextStroke: '1px rgba(0,0,0,0.3)'
                     }}>
                  FREE SPINS AWARDED
                </div>

                {/* Free Spins Features Explanation */}
                <div className="max-w-md mx-auto mb-4 bg-black/50 rounded-xl p-4 border-2 border-purple-400/50">
                  <div className="space-y-2 text-left">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl flex-shrink-0">💣</span>
                      <div className="text-sm text-white">
                        <span className="font-bold text-orange-300">Bomb Multipliers:</span> Bombs can appear with 2x-100x multipliers. All bombs accumulate and multiply your total win!
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-2xl flex-shrink-0">🍭</span>
                      <div className="text-sm text-white">
                        <span className="font-bold text-pink-300">Retrigger:</span> Get 3+ scatters to win +5 more free spins
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue prompt */}
                <div className="text-lg md:text-xl font-bold text-yellow-200 uppercase drop-shadow-lg animate-pulse"
                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  ▼ Press SPIN to start ▼
                </div>
              </div>
            </div>
          )}

          {/* Extended Free Spins Notification - Shows during active free spins when more are won */}
          {extendedFreeSpins > 0 && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-sm rounded-3xl">
              <div className="text-center relative">
                {/* Animated background sparkles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-pink-300 rounded-full animate-ping"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${1 + Math.random() * 2}s`,
                        opacity: 0.6 + Math.random() * 0.4
                      }}
                    />
                  ))}
                </div>

                {/* Title */}
                <div className="text-3xl md:text-4xl font-black text-pink-400 mb-3 drop-shadow-lg animate-pulse"
                     style={{
                       textShadow: '0 0 30px rgba(236, 72, 153, 1), 0 0 60px rgba(236, 72, 153, 0.8), 0 4px 8px rgba(0,0,0,0.8)',
                       WebkitTextStroke: '2px rgba(0,0,0,0.3)'
                     }}>
                  🎉 FREE SPINS EXTENDED! 🎉
                </div>

                {/* Extended spins count */}
                <div className={`text-6xl md:text-7xl font-black mb-3 drop-shadow-2xl animate-bounce`}
                     style={{
                       background: 'linear-gradient(45deg, #ec4899, #f472b6, #ec4899)',
                       backgroundClip: 'text',
                       WebkitBackgroundClip: 'text',
                       WebkitTextFillColor: 'transparent',
                       textShadow: '0 0 50px rgba(236, 72, 153, 1), 0 0 100px rgba(236, 72, 153, 0.8)',
                       filter: 'drop-shadow(0 0 40px rgba(236, 72, 153, 1)) drop-shadow(0 8px 16px rgba(0,0,0,0.8))',
                     }}>
                  +{extendedFreeSpins}
                </div>

                {/* Subtitle */}
                <div className="text-lg md:text-xl font-bold text-yellow-400 uppercase drop-shadow-lg"
                     style={{
                       textShadow: '0 0 20px rgba(251, 191, 36, 1), 0 4px 8px rgba(0,0,0,0.8)',
                       WebkitTextStroke: '1px rgba(0,0,0,0.3)'
                     }}>
                  MORE FREE SPINS!
                </div>
              </div>
            </div>
          )}

          {/* Free Spins Total Win Counter - BIG FINALE - Only covers grid area */}
          {freeSpinsRemaining === 0 && freeSpinsTotalWin > 0 && needsManualSpinAfterFreeSpins && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/70 backdrop-blur-sm rounded-3xl">
              <div className="text-center relative">
                {/* Animated background sparkles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(30)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 bg-yellow-300 rounded-full animate-ping"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${1 + Math.random() * 2}s`,
                        opacity: 0.6 + Math.random() * 0.4
                      }}
                    />
                  ))}
                </div>

                {/* Title */}
                <div className="text-3xl md:text-4xl font-black text-pink-400 mb-4 drop-shadow-lg animate-pulse"
                     style={{
                       textShadow: '0 0 30px rgba(236, 72, 153, 1), 0 0 60px rgba(236, 72, 153, 0.8), 0 4px 8px rgba(0,0,0,0.8)',
                       WebkitTextStroke: '2px rgba(0,0,0,0.3)'
                     }}>
                  🎰 FREE SPINS COMPLETE! 🎰
                </div>

                {/* Total win amount with scale animation */}
                <div className={`text-7xl md:text-8xl font-black mb-4 drop-shadow-2xl transition-all duration-500 ${
                  displayedFreeSpinsTotal === freeSpinsTotalWin ? 'scale-110 animate-bounce' : 'scale-100'
                }`}
                     style={{
                       background: 'linear-gradient(45deg, #ffd700, #ffed4e, #ffd700)',
                       backgroundClip: 'text',
                       WebkitBackgroundClip: 'text',
                       WebkitTextFillColor: 'transparent',
                       textShadow: '0 0 50px rgba(251, 191, 36, 1), 0 0 100px rgba(251, 191, 36, 0.8)',
                       filter: 'drop-shadow(0 0 40px rgba(251, 191, 36, 1)) drop-shadow(0 8px 16px rgba(0,0,0,0.8))',
                     }}>
                  +{displayedFreeSpinsTotal}
                </div>

                {/* Subtitle with glow */}
                <div className="text-xl md:text-2xl font-bold text-green-400 uppercase drop-shadow-lg mb-4"
                     style={{
                       textShadow: '0 0 20px rgba(34, 197, 94, 1), 0 4px 8px rgba(0,0,0,0.8)',
                       WebkitTextStroke: '1px rgba(0,0,0,0.3)'
                     }}>
                  TOTAL WINNINGS
                </div>

                {/* Continue prompt */}
                <div className="text-lg md:text-xl font-bold text-yellow-200 uppercase drop-shadow-lg animate-pulse"
                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  ▼ Press SPIN to continue ▼
                </div>
              </div>
            </div>
          )}

          {/* 6x5 Grid - Centered */}
          <div
            ref={gridRef}
            className="grid grid-cols-6 gap-2 md:gap-3 bg-gradient-to-br from-purple-900/40 to-pink-900/40 p-5 rounded-3xl backdrop-blur-md border-4 border-yellow-400/60 shadow-2xl"
            style={{
              gridTemplateRows: 'repeat(5, 1fr)',
              maxHeight: '90%',
              boxShadow: '0 0 40px rgba(251, 191, 36, 0.3), inset 0 0 30px rgba(147, 51, 234, 0.2)'
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((symbol, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  data-row={rowIndex}
                  data-col={colIndex}
                  className={`relative rounded-xl flex items-center justify-center text-4xl md:text-5xl aspect-square transition-all duration-200 ${
                    symbol === "🍭" ? 'border-4 border-yellow-400' : 'border-4 border-white/80'
                  }`}
                  style={{
                    background: symbol ? getSymbolBackground(symbol) : 'transparent',
                    boxShadow: symbol === "🍭"
                      ? '0 0 30px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 105, 180, 0.6), 0 4px 12px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.7)'
                      : symbol ? '0 4px 12px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.5)' : 'none',
                    filter: symbol === "🍭" ? 'brightness(1.15)' : (symbol ? 'brightness(1.05)' : 'none'),
                    opacity: symbol ? 1 : 0,
                  }}
                >
                  {/* Symbol with enhanced styling */}
                  {symbol && (
                    <span className="drop-shadow-lg relative z-10" style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      textShadow: symbol === "🍭"
                        ? '0 0 15px rgba(255, 215, 0, 1), 0 0 10px rgba(255,255,255,0.9)'
                        : '0 0 10px rgba(255,255,255,0.8)',
                      fontSize: '4.5rem',
                      lineHeight: 1,
                      animation: symbol === "🍭" ? 'subtleBounce 2.5s ease-in-out infinite' : undefined,
                    }}>
                      {symbol}
                    </span>
                  )}

                  {/* Bomb Multiplier Display - Always visible on bombs */}
                  {symbol === "💣" && (() => {
                    const bombData = currentBombs.find(
                      b => b.position.row === rowIndex && b.position.col === colIndex
                    );
                    return bombData ? (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="text-3xl md:text-4xl font-black text-yellow-300 animate-pulse"
                             style={{
                               textShadow: '0 0 20px rgba(251, 191, 36, 1), 0 0 40px rgba(251, 191, 36, 0.9), 0 2px 6px rgba(0,0,0,0.9)',
                               WebkitTextStroke: '2px rgba(0,0,0,0.5)',
                               filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 1))',
                               animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                             }}>
                          {bombData.multiplier}x
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Animated gradient for lollipop scatter */}
                  {symbol === "🍭" && (
                    <div className="absolute inset-0 rounded-xl pointer-events-none animate-gradient bg-[length:200%_auto]"
                         style={{
                           background: 'linear-gradient(45deg, #ffd700, #ff69b4, #da70d6, #ffd700)',
                           opacity: 0.5,
                           animation: 'gradient 3s ease infinite',
                           zIndex: 0
                         }} />
                  )}

                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-xl pointer-events-none" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Win Animation Overlay */}
        {showWinAnimation && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/50">
            <div
              ref={winDisplayRef}
              className="bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-500 text-white px-16 py-12 rounded-3xl shadow-2xl border-8 border-yellow-200 relative overflow-hidden"
              style={{ boxShadow: '0 0 60px rgba(251, 191, 36, 1), 0 0 100px rgba(251, 146, 60, 0.8)' }}
            >
              {/* Sparkles background */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full animate-ping"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random()}s`
                    }}
                  />
                ))}
              </div>

              <div className="text-center relative z-10">
                <div className="text-7xl md:text-8xl font-black mb-4 text-purple-900 drop-shadow-2xl"
                     style={{ textShadow: '0 4px 8px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.8)' }}>
                  BIG WIN!
                </div>
                <div className="text-5xl md:text-6xl font-black text-white mb-2 drop-shadow-2xl">
                  {totalWinDisplay} sat
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Persistent Win Counter - Center of Screen */}
        {currentSpinWin > 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none" data-win-counter>
            <div className="text-center">
              <div className={`text-8xl font-black text-yellow-300 drop-shadow-2xl transition-all duration-300 ${
                winCountUpComplete ? 'scale-125 animate-pulse' : 'scale-100'
              }`}
                   style={{
                     textShadow: '0 0 30px rgba(251, 191, 36, 1), 0 0 60px rgba(251, 191, 36, 0.8), 0 4px 8px rgba(0,0,0,0.8)',
                     WebkitTextStroke: '2px rgba(0,0,0,0.3)'
                   }}>
                +{displayedWin}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Control Panel */}
        <div className="relative z-10 px-2 md:px-6 py-2 md:py-4 bg-gradient-to-r from-purple-900/80 via-pink-900/80 to-purple-900/80 backdrop-blur-sm border-t-4 border-yellow-400/60 flex-shrink-0"
             style={{ boxShadow: '0 -4px 20px rgba(251, 191, 36, 0.3)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
            {/* Bet Selection */}
            <div className="flex gap-1 md:gap-2 flex-wrap justify-center w-full md:w-auto">
              {betOptions.map((bet) => (
                <button
                  key={bet}
                  onClick={() => {
                    playSound('buttonClick');
                    setBetAmount(bet);
                  }}
                  disabled={spinning || autoplay !== null || freeSpinsRemaining > 0}
                  className={`px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all transform ${
                    betAmount === bet
                      ? "bg-gradient-to-b from-yellow-300 to-yellow-500 text-purple-900 scale-110 shadow-lg border-2 border-yellow-200"
                      : "bg-gradient-to-b from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white border-2 border-purple-600"
                  } ${(spinning || autoplay !== null || freeSpinsRemaining > 0) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                  style={betAmount === bet ? { boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)' } : {}}
                  title={freeSpinsRemaining > 0 ? "Bet amount is locked during free spins" : ""}
                >
                  {bet}
                </button>
              ))}
            </div>

            {/* Action Buttons Container */}
            <div className="flex gap-2 w-full md:w-auto justify-center">
              {/* Spin Button */}
              <button
                onClick={() => handleSpin(false)}
                disabled={spinning || walletBalance < betAmount || (autoplay !== null && !needsManualSpinToStartFreeSpins && !needsManualSpinAfterFreeSpins)}
                className={`flex-1 md:flex-none px-8 md:px-16 py-3 md:py-5 rounded-2xl font-black text-xl md:text-3xl transition-all transform ${
                  spinning || walletBalance < betAmount || (autoplay !== null && !needsManualSpinToStartFreeSpins && !needsManualSpinAfterFreeSpins)
                    ? "bg-gray-600 cursor-not-allowed border-4 border-gray-700"
                    : "bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 hover:scale-110 active:scale-95 border-4 border-green-300"
                } text-white shadow-2xl relative overflow-hidden`}
              style={!(spinning || walletBalance < betAmount || (autoplay !== null && !needsManualSpinToStartFreeSpins && !needsManualSpinAfterFreeSpins)) ? {
                boxShadow: '0 0 30px rgba(74, 222, 128, 0.8), 0 8px 20px rgba(0,0,0,0.4)'
              } : {}}
            >
              {/* Shine effect */}
              {!(spinning || walletBalance < betAmount || (autoplay !== null && !needsManualSpinToStartFreeSpins && !needsManualSpinAfterFreeSpins)) && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-pulse" />
              )}
                <span className="relative z-10">
                  {spinning ? "SPINNING..." : (autoplay && !needsManualSpinToStartFreeSpins && !needsManualSpinAfterFreeSpins) ? `AUTO (${autoplay.spinsRemaining === -1 ? '∞' : autoplay.spinsRemaining})` : "SPIN"}
                </span>
              </button>

              {/* Autoplay Button */}
              <button
                onClick={() => {
                  playSound('buttonClick');
                  autoplay ? stopAutoplay() : setShowAutoplayModal(true);
                }}
                disabled={spinning}
                className={`flex-1 md:flex-none px-5 md:px-8 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base transition-all transform border-2 ${
                  autoplay
                    ? "bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 border-red-400"
                    : "bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 border-blue-400"
                } text-white shadow-lg ${spinning ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
              >
                {autoplay ? "STOP" : "AUTO"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-6 bg-gradient-to-r from-red-600 via-pink-600 to-red-600 rounded-2xl border-4 border-red-400 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
          <p className="text-white font-black text-lg text-center relative z-10 drop-shadow-lg">⚠️ {error}</p>
        </div>
      )}

      {/* Autoplay Modal */}
      {showAutoplayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 p-8 rounded-3xl max-w-md w-full border-4 border-yellow-400 shadow-2xl relative overflow-hidden"
               style={{ boxShadow: '0 0 50px rgba(251, 191, 36, 0.6)' }}>
            {/* Animated background sparkles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1.5 + Math.random()}s`
                  }}
                />
              ))}
            </div>

            <h2 className="text-4xl font-black mb-6 text-center bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent relative z-10 drop-shadow-lg">
              🎰 Autoplay Settings
            </h2>

            <div className="space-y-3 relative z-10">
              {[10, 25, 50, 100, 250, 500].map((spins) => (
                <button
                  key={spins}
                  onClick={() => startAutoplay(spins)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 rounded-xl font-bold text-xl transition-all transform hover:scale-105 border-2 border-blue-400 shadow-lg"
                  style={{ boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)' }}
                >
                  🍭 {spins} Spins
                </button>
              ))}
              <button
                onClick={() => startAutoplay(-1)}
                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 rounded-xl font-bold text-xl transition-all transform hover:scale-105 border-2 border-yellow-400 shadow-lg"
                style={{ boxShadow: '0 4px 15px rgba(251, 191, 36, 0.5)' }}
              >
                ♾️ Infinity (Until Balance 0)
              </button>
            </div>

            <button
              onClick={() => setShowAutoplayModal(false)}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-b from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 rounded-xl font-bold border-2 border-gray-600 transition-all transform hover:scale-105 relative z-10"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Paytable */}
      <div className="mt-6 bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 rounded-3xl p-8 border-4 border-yellow-400/50 shadow-2xl relative overflow-hidden"
           style={{ boxShadow: '0 0 40px rgba(251, 191, 36, 0.3)' }}>
        {/* Background sparkles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random()}s`
              }}
            />
          ))}
        </div>

        <h3 className="text-4xl font-black mb-6 text-center bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent relative z-10 drop-shadow-lg">
          💎 OFFICIAL PAYTABLE 💎
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm relative z-10">
          {/* Red Heart Candy - Highest */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/60 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("🍬") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🍬</div>
            <div className="text-xs text-white font-black">8-9: 10x</div>
            <div className="text-xs text-white font-black">10-11: 25x</div>
            <div className="text-xs text-white font-black">12+: 50x</div>
          </div>

          {/* Purple Candy */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("💜") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">💜</div>
            <div className="text-xs text-white font-bold">8-9: 2.5x</div>
            <div className="text-xs text-white font-bold">10-11: 10x</div>
            <div className="text-xs text-white font-bold">12+: 25x</div>
          </div>

          {/* Green Candy */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("💚") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">💚</div>
            <div className="text-xs text-white font-bold">8-9: 2x</div>
            <div className="text-xs text-white font-bold">10-11: 5x</div>
            <div className="text-xs text-white font-bold">12+: 15x</div>
          </div>

          {/* Blue Candy */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("💙") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">💙</div>
            <div className="text-xs text-white font-bold">8-9: 1.5x</div>
            <div className="text-xs text-white font-bold">10-11: 2x</div>
            <div className="text-xs text-white font-bold">12+: 12x</div>
          </div>

          {/* Red Apple */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("🍎") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🍎</div>
            <div className="text-xs text-white font-bold">8-9: 1x</div>
            <div className="text-xs text-white font-bold">10-11: 1.5x</div>
            <div className="text-xs text-white font-bold">12+: 10x</div>
          </div>

          {/* Purple Plum */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("🍇") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🍇</div>
            <div className="text-xs text-white font-bold">8-9: 0.8x</div>
            <div className="text-xs text-white font-bold">10-11: 1.2x</div>
            <div className="text-xs text-white font-bold">12+: 8x</div>
          </div>

          {/* Green Watermelon */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("🍉") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🍉</div>
            <div className="text-xs text-purple-900 font-bold">8-9: 0.5x</div>
            <div className="text-xs text-purple-900 font-bold">10-11: 1x</div>
            <div className="text-xs text-purple-900 font-bold">12+: 5x</div>
          </div>

          {/* Purple Grapes */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("🫐") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🫐</div>
            <div className="text-xs text-purple-900 font-bold">8-9: 0.4x</div>
            <div className="text-xs text-purple-900 font-bold">10-11: 0.9x</div>
            <div className="text-xs text-purple-900 font-bold">12+: 4x</div>
          </div>

          {/* Yellow Banana - Lowest */}
          <div className="bg-gradient-to-br from-pink-800 to-purple-900 p-3 rounded-2xl border-2 border-yellow-400/40 hover:border-yellow-400 transition-all transform hover:scale-105 shadow-lg"
               style={{ background: getSymbolBackground("🍌") }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🍌</div>
            <div className="text-xs text-purple-900 font-bold">8-9: 0.25x</div>
            <div className="text-xs text-purple-900 font-bold">10-11: 0.75x</div>
            <div className="text-xs text-purple-900 font-bold">12+: 2x</div>
          </div>

          {/* Scatter - Special */}
          <div className="bg-gradient-to-br from-purple-700 to-pink-800 p-3 rounded-2xl border-2 border-yellow-300 shadow-xl transform hover:scale-105 transition-all"
               style={{ boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>
            <div className="text-3xl mb-1 drop-shadow-lg">🍭</div>
            <div className="text-xs text-yellow-100 font-black">4: 3x + 10 FS</div>
            <div className="text-xs text-yellow-100 font-black">5: 5x + 10 FS</div>
            <div className="text-xs text-yellow-100 font-black">6+: 100x + 10 FS</div>
          </div>
        </div>

        {/* Bomb Multipliers Info */}
        <div className="mt-4 bg-black/40 p-4 rounded-2xl border-2 border-orange-400/60 relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="text-3xl drop-shadow-lg">💣</div>
            <h4 className="text-xl font-black text-orange-300">BOMB MULTIPLIERS</h4>
          </div>
          <p className="text-yellow-200 text-sm text-center">
            During Free Spins, bombs can appear with random multipliers (2x-100x).<br/>
            All bomb multipliers accumulate and multiply your total win at the end!
          </p>
        </div>
        <p className="text-yellow-200 text-xs text-center mt-6 font-semibold relative z-10">
          ⚡ RTP: ~96.5% • Scatter Pays (8+ symbols ANYWHERE) • Tumble Feature • Bomb Multipliers in Free Spins ⚡
        </p>
      </div>
    </div>
  );
}
