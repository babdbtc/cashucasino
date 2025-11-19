"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import gsap from "gsap";

interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface Hand {
  cards: Card[];
  bet: number;
  status: string;
  doubled?: boolean;
}

type DealingPhase =
  | "player-first"
  | "ask-player-second"
  | "player-second"
  | "dealer-first"
  | "dealer-second"
  | "complete";

const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 250, 500];

export default function BlackjackSolo() {
  const { user, updateBalance } = useAuth();
  const [gameState, setGameState] = useState<"betting" | "dealing" | "playing" | "dealer-turn" | "complete">("betting");
  const [betAmount, setBetAmount] = useState(0);
  const [lastBetAmount, setLastBetAmount] = useState(0);
  const [selectedChipValue, setSelectedChipValue] = useState(10);
  const [playerHands, setPlayerHands] = useState<Hand[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDealerHoleCard, setShowDealerHoleCard] = useState(false);
  const [dealingPhase, setDealingPhase] = useState<DealingPhase>("player-first");
  const [bettingChips, setBettingChips] = useState<{ id: number; value: number; x: number; y: number }[]>([]);
  const [gameData, setGameData] = useState<any>(null);
  const [animatedPlayerCardCount, setAnimatedPlayerCardCount] = useState(0);
  const [animatedDealerCardCount, setAnimatedDealerCardCount] = useState(0);

  const deckRef = useRef<HTMLDivElement>(null);
  const bettingAreaRef = useRef<HTMLDivElement>(null);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Make all cards visible that should be shown (for cards that already exist)
  useEffect(() => {
    // Show any cards that should be visible but aren't animated yet
    const allCards = document.querySelectorAll('.player-card, .dealer-card');
    allCards.forEach((card) => {
      const element = card as HTMLElement;
      if (element.style.opacity === '0' && gameState === 'complete') {
        gsap.set(element, { opacity: 1 });
      }
    });
  }, [playerHands, dealerHand, gameState]);

  // Sequential dealing animation
  useEffect(() => {
    if (gameState !== "dealing" || !gameData) return;

    const dealSequence = async () => {
      if (dealingPhase === "player-first") {
        // Proper blackjack dealing order:
        // 1. First card to player
        await animateCardFromDeck("player", 0);
        await delay(600);

        // 2. First card to dealer
        setDealingPhase("dealer-first");
        await animateCardFromDeck("dealer", 0);
        await delay(600);

        // 3. Ask player about second card
        setDealingPhase("ask-player-second");
      }
    };

    dealSequence();
  }, [gameState, dealingPhase, gameData]);

  const addChipToBet = (value: number, event?: React.MouseEvent<HTMLButtonElement>) => {
    if ((betAmount + value) > (user?.balance || 0)) return;
    if ((betAmount + value) > 2500) return;

    const newChip = {
      id: Date.now(),
      value,
      x: Math.random() * 60 - 30,
      y: Math.random() * 20 - 10,
    };

    // Get button position if event is provided
    const button = event?.currentTarget;
    if (button) {
      const buttonRect = button.getBoundingClientRect();

      // Get betting area position (center of table)
      const bettingAreaEl = document.querySelector('.betting-area-center');
      const bettingRect = bettingAreaEl?.getBoundingClientRect();

      if (bettingRect) {
        // Create temporary flying chip
        const flyingChip = document.createElement('div');
        flyingChip.className = `fixed w-14 h-14 rounded-full bg-gradient-to-br ${getChipColor(value)} border-4 border-white shadow-xl z-[9999] overflow-hidden`;
        flyingChip.innerHTML = `
          <div class="absolute inset-0">
            ${[...Array(8)].map((_, i) => `
              <div class="absolute w-2 h-3 bg-white/80 rounded-sm" style="top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${i * 45}deg) translateY(-20px); transform-origin: center;"></div>
            `).join('')}
          </div>
          <div class="absolute rounded-full border-2 border-dashed border-white/40" style="top: 50%; left: 50%; transform: translate(-50%, -50%); width: calc(100% - 12px); height: calc(100% - 12px);"></div>
          <div class="absolute rounded-full bg-white/10 flex items-center justify-center" style="top: 50%; left: 50%; transform: translate(-50%, -50%); width: calc(100% - 20px); height: calc(100% - 20px);">
            <div class="text-white font-black ${value >= 100 ? 'text-xs' : 'text-sm'} drop-shadow-lg">${value}</div>
          </div>
        `;
        document.body.appendChild(flyingChip);

        // Set initial position at button
        gsap.set(flyingChip, {
          left: buttonRect.left,
          top: buttonRect.top,
          width: buttonRect.width,
          height: buttonRect.height,
        });

        // Animate to betting area
        gsap.to(flyingChip, {
          left: bettingRect.left + bettingRect.width / 2 - buttonRect.width / 2 + newChip.x,
          top: bettingRect.top + bettingRect.height / 2 - buttonRect.height / 2 + newChip.y,
          rotation: 360 + Math.random() * 360,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => {
            flyingChip.remove();
            setBettingChips([...bettingChips, newChip]);
          },
        });
      }
    }

    setBetAmount(betAmount + value);
  };

  const clearBet = () => {
    setBetAmount(0);
    setBettingChips([]);
  };

  const startGame = async () => {
    if (!user || betAmount === 0) return;

    try {
      setLoading(true);
      setMessage("Placing bet...");
      setAnimatedPlayerCardCount(0);
      setAnimatedDealerCardCount(0);
      setLastBetAmount(betAmount); // Save last bet for rebet button

      await delay(500);

      const res = await fetch("/api/blackjack/solo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", betAmount }),
      });

      const data = await res.json();

      if (data.success) {
        updateBalance(data.balance);
        setGameData(data);

        if (data.action === "complete") {
          setPlayerHands(data.playerHands);
          setDealerHand(data.dealerHand);
          setGameState("complete");
          setShowDealerHoleCard(true);
          setMessage(data.message);

          if (data.payout > betAmount) {
            await animateChipsToPlayer();
            animateWin();
          } else {
            await animateChipsToDealer();
          }
        } else {
          setPlayerHands(data.playerHands);
          setDealerHand(data.dealerHand);
          setCurrentHandIndex(0);
          setGameState("dealing");
          setDealingPhase("player-first");
          setShowDealerHoleCard(false);
          setMessage("Dealer is dealing...");
        }
      } else {
        setMessage(data.error || "Failed to start game");
        setGameState("betting");
      }
    } catch (error) {
      setMessage("Error starting game");
      setGameState("betting");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSecondCardChoice = async (wants: boolean) => {
    setLoading(true);

    if (wants) {
      // 4. Second card to player (if they want it)
      setDealingPhase("player-second");
      await animateCardFromDeck("player", 1);
      await delay(600);
    } else {
      // If Stand, remove the second card from player hand
      if (playerHands[0] && playerHands[0].cards.length === 2) {
        const updatedHand = { ...playerHands[0], cards: [playerHands[0].cards[0]] };
        setPlayerHands([updatedHand]);
      }
    }

    // 5. Deal dealer's second card (hole card)
    setDealingPhase("dealer-second");
    await animateCardFromDeck("dealer", 1);
    await delay(600);

    setDealingPhase("complete");
    setGameState("playing");
    setMessage("Your turn!");
    setLoading(false);
  };

  const performAction = async (action: string) => {
    if (!user) return;

    try {
      setLoading(true);

      const res = await fetch("/api/blackjack/solo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        // Don't update balance yet - wait until animations complete

        if (data.action === "complete") {
          // If we just hit and got a bust/21, animate the last card first
          const oldCardsCount = playerHands[currentHandIndex]?.cards.length || 0;
          const newHandIndex = data.currentHandIndex || currentHandIndex;
          const didAnimateBustCard = action === "hit" && data.playerHands[newHandIndex]?.cards.length > oldCardsCount;

          if (didAnimateBustCard) {
            setPlayerHands(data.playerHands);
            await delay(100); // Let state update
            await animateCardFromDeck("player", data.playerHands[newHandIndex].cards.length - 1);
            await delay(600); // Show the card and bust status
          }

          // Dealer's turn - animate dealer drawing cards if needed
          setGameState("dealer-turn");
          setMessage("Dealer's turn...");

          await delay(800);

          // Show hole card flip
          setShowDealerHoleCard(true);
          const holeCard = document.querySelector(".dealer-hole-card");
          if (holeCard) {
            gsap.to(holeCard, {
              rotationY: 180,
              duration: 0.5,
              ease: "back.out(1.5)",
            });
          }

          await delay(800);

          // Animate dealer drawing additional cards one by one
          const oldDealerCards = dealerHand.length;
          const newDealerHand = data.dealerHand;
          if (!didAnimateBustCard) {
            setPlayerHands(data.playerHands);
          }

          // Add each new dealer card one by one with animation
          for (let i = oldDealerCards; i < newDealerHand.length; i++) {
            await delay(500);
            // Add just one more card to the dealer hand
            setDealerHand([...newDealerHand.slice(0, i + 1)]);
            await delay(100); // Short delay for state update
            await animateCardFromDeck("dealer", i);
            await delay(300);
          }

          await delay(800);

          setGameState("complete");
          setMessage(data.message);
          setGameData(data); // Save game data for win/loss indicator

          // Update balance after all dealer animations complete
          updateBalance(data.balance);

          // Animate chips based on result
          if (data.payout > betAmount) {
            await animateChipsToPlayer();
            animateWin();
          } else if (data.payout === betAmount) {
            // Push - chips stay
            await delay(1000);
          } else {
            await animateChipsToDealer();
          }
        } else {
          const oldCardsCount = playerHands[currentHandIndex]?.cards.length || 0;
          const newHandIndex = data.currentHandIndex || 0;
          setPlayerHands(data.playerHands);
          setDealerHand(data.dealerHand);
          setCurrentHandIndex(newHandIndex);

          if (action === "hit" && data.playerHands[newHandIndex]?.cards.length > oldCardsCount) {
            await animateCardFromDeck("player", data.playerHands[newHandIndex].cards.length - 1);
          }

          // Update balance for non-complete actions (like double, split)
          updateBalance(data.balance);
        }
      } else {
        setMessage(data.error || "Action failed");
      }
    } catch (error) {
      setMessage("Error performing action");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const newRound = () => {
    setGameState("betting");
    setPlayerHands([]);
    setDealerHand([]);
    setCurrentHandIndex(0);
    setMessage("");
    setShowDealerHoleCard(false);
    setDealingPhase("player-first");
    setBettingChips([]);
    setBetAmount(0);
    setGameData(null);
    setAnimatedPlayerCardCount(0);
    setAnimatedDealerCardCount(0);
  };

  const animateCardFromDeck = async (target: "player" | "dealer", cardIndex: number) => {
    return new Promise<void>((resolve) => {
      const deckEl = deckRef.current;
      if (!deckEl) {
        resolve();
        return;
      }

      const deckRect = deckEl.getBoundingClientRect();
      const targetSelector = target === "player"
        ? `.player-card:nth-child(${cardIndex + 1})`
        : `.dealer-card:nth-child(${cardIndex + 1})`;

      // Use requestAnimationFrame to get the card after it's rendered
      requestAnimationFrame(() => {
        const targetEl = document.querySelector(targetSelector) as HTMLElement;
        if (!targetEl) {
          resolve();
          return;
        }

        // Get target position first
        const parent = targetEl.parentElement;
        const siblings = Array.from(parent?.children || []).filter(el =>
          el.classList.contains(target === "player" ? "player-card" : "dealer-card") &&
          el !== targetEl
        );

        const parentRect = parent?.getBoundingClientRect();
        let targetLeft = parentRect ? parentRect.left : 0;
        let targetTop = parentRect ? parentRect.top : 0;

        // Account for card stacking (cards overlap by 40px)
        if (siblings.length > 0) {
          const stackingOffset = -40;
          const lastSibling = siblings[siblings.length - 1] as HTMLElement;
          const lastRect = lastSibling.getBoundingClientRect();
          targetLeft = lastRect.left + lastRect.width + stackingOffset;
          targetTop = lastRect.top;
        }

        // Create a temporary card element for animation
        const flyingCard = document.createElement('div');
        flyingCard.className = 'fixed z-[9999] pointer-events-none';
        flyingCard.style.left = `${deckRect.left}px`;
        flyingCard.style.top = `${deckRect.top}px`;
        flyingCard.style.width = `${deckRect.width}px`;
        flyingCard.style.height = `${deckRect.height}px`;
        flyingCard.style.transformStyle = 'preserve-3d';
        flyingCard.style.perspective = '1000px';

        // Card back design
        flyingCard.innerHTML = `
          <div class="w-full h-full bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 rounded-xl border-3 border-white shadow-2xl flex items-center justify-center">
            <div class="text-white text-4xl opacity-30">🂠</div>
          </div>
        `;

        document.body.appendChild(flyingCard);

        // Hide the actual card until animation completes
        targetEl.style.opacity = '0';
        targetEl.style.visibility = 'hidden';

        // Animate with arc motion and flip using basic transforms
        const timeline = gsap.timeline({
          onComplete: () => {
            flyingCard.remove();
            // Show the real card with transition
            targetEl.style.opacity = '1';
            targetEl.style.visibility = 'visible';
            resolve();
          }
        });

        // Animate position, size, and rotation together
        timeline.to(flyingCard, {
          duration: 0.6,
          left: targetLeft,
          top: targetTop,
          width: targetEl.offsetWidth,
          height: targetEl.offsetHeight,
          ease: "power2.out",
        });

        // Animate flip and slight rotation
        timeline.to(flyingCard, {
          duration: 0.6,
          rotationY: 180,
          rotationZ: Math.random() * 15 - 7.5,
          ease: "back.out(1.2)",
        }, 0); // Start at the same time as position animation

        // Deck bounce effect
        gsap.to(deckEl, {
          y: -8,
          duration: 0.12,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
        });
      });
    });
  };

  const animateChipsToPlayer = async () => {
    const chips = document.querySelectorAll(".betting-chip");
    await Promise.all(
      Array.from(chips).map((chip, i) =>
        gsap.to(chip, {
          x: -window.innerWidth / 3,
          y: window.innerHeight / 3,
          scale: 0.5,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.1,
          ease: "power2.in",
        })
      )
    );
  };

  const animateChipsToDealer = async () => {
    const chips = document.querySelectorAll(".betting-chip");
    await Promise.all(
      Array.from(chips).map((chip, i) =>
        gsap.to(chip, {
          x: window.innerWidth / 4,
          y: -window.innerHeight / 3,
          scale: 0.5,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.1,
          ease: "power2.in",
        })
      )
    );
  };

  const animateWin = () => {
    const particles = document.querySelectorAll(".win-particle");
    gsap.fromTo(
      particles,
      { scale: 0, opacity: 1, x: 0, y: 0 },
      {
        scale: 1.5,
        opacity: 0,
        x: "random(-250, 250)",
        y: "random(-250, 250)",
        rotation: "random(-360, 360)",
        duration: 1.2,
        ease: "power2.out",
        stagger: 0.02,
      }
    );

    gsap.fromTo(
      ".win-message",
      { scale: 0, rotation: -10 },
      { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }
    );
  };

  const calculateHandValue = (cards: Card[]) => {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === "A") {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  };

  const renderCard = (card: Card, faceDown = false, index: number, type: "player" | "dealer", totalCards: number = 1) => {
    const cardClass = type === "player" ? "player-card" : "dealer-card";
    const isHoleCard = type === "dealer" && index === 1 && faceDown;

    // Calculate stacking styles - always apply to prevent layout shift when cards are added
    const stackStyle = {
      marginLeft: index > 0 ? '-40px' : '0',
      zIndex: index,
    };

    if (faceDown) {
      return (
        <div
          key={`facedown-${index}`}
          className={`${cardClass} ${isHoleCard ? "dealer-hole-card" : ""} w-20 h-28 md:w-24 md:h-32 flex-shrink-0 relative`}
          style={stackStyle}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 rounded-xl md:rounded-2xl border-2 md:border-3 border-white shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-4xl md:text-5xl opacity-30">🂠</div>
            </div>
            <div className="absolute inset-1 md:inset-2 border border-blue-400 rounded-lg opacity-30"></div>
            <div className="absolute inset-2 md:inset-3 border border-blue-400 rounded-md opacity-20"></div>
          </div>
        </div>
      );
    }

    const isRed = card.suit === "♥" || card.suit === "♦";
    const suitColor = isRed ? "text-red-600" : "text-gray-900";

    return (
      <div
        key={`${card.rank}-${card.suit}-${index}`}
        className={`${cardClass} w-20 h-28 md:w-24 md:h-32 flex-shrink-0 relative`}
        style={stackStyle}
      >
        <div className="absolute inset-0 bg-white rounded-xl md:rounded-2xl border-2 md:border-3 border-gray-300 shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_50px_rgba(0,0,0,0.6)] transition-shadow">
          {/* Top-left corner */}
          <div className={`absolute top-1 left-1 md:top-2 md:left-2 flex flex-col items-center ${suitColor} leading-none`}>
            <div className="text-base md:text-lg font-bold">{card.rank}</div>
            <div className="text-sm md:text-base">{card.suit}</div>
          </div>

          {/* Center suit */}
          <div className={`absolute inset-0 flex items-center justify-center ${suitColor}`}>
            <div className="text-3xl md:text-4xl">{card.suit}</div>
          </div>

          {/* Bottom-right corner (rotated) */}
          <div className={`absolute bottom-1 right-1 md:bottom-2 md:right-2 flex flex-col items-center ${suitColor} leading-none rotate-180`}>
            <div className="text-base md:text-lg font-bold">{card.rank}</div>
            <div className="text-sm md:text-base">{card.suit}</div>
          </div>
        </div>
      </div>
    );
  };

  const getChipColor = (value: number) => {
    switch (value) {
      case 1: return "from-gray-400 to-gray-600";
      case 5: return "from-red-500 to-red-700";
      case 10: return "from-blue-500 to-blue-700";
      case 25: return "from-green-500 to-green-700";
      case 50: return "from-orange-500 to-orange-700";
      case 100: return "from-purple-500 to-purple-700";
      case 250: return "from-cyan-500 to-cyan-700";
      case 500: return "from-pink-500 to-pink-700";
      default: return "from-gray-400 to-gray-600";
    }
  };

  const getVisiblePlayerCards = () => {
    if (!playerHands[0]) return [];
    if (gameState === "dealing") {
      switch (dealingPhase) {
        case "player-first":
        case "dealer-first":
        case "ask-player-second":
          // Only show first card during initial dealing
          return playerHands[0].cards.slice(0, 1);
        case "player-second":
        case "dealer-second":
          // Show only the cards the player actually has (1 if stood, 2 if hit)
          return playerHands[0].cards;
        default:
          return playerHands[0].cards;
      }
    }
    return playerHands[0].cards;
  };

  const getVisibleDealerCards = () => {
    if (gameState === "dealing") {
      switch (dealingPhase) {
        case "player-first":
          return [];
        case "dealer-first":
        case "ask-player-second":
        case "player-second":
          return dealerHand.slice(0, 1);
        default:
          return dealerHand;
      }
    }
    return dealerHand;
  };

  const currentHand = playerHands[currentHandIndex];
  const canDouble = currentHand?.cards.length === 2 && gameState === "playing";
  const canSplit =
    currentHand?.cards.length === 2 &&
    currentHand.cards[0].rank === currentHand.cards[1].rank &&
    gameState === "playing" &&
    (user?.balance || 0) >= currentHand.bet;
  const canSurrender = currentHand?.cards.length === 2 && currentHandIndex === 0 && gameState === "playing";

  const visiblePlayerCards = getVisiblePlayerCards();
  const visibleDealerCards = getVisibleDealerCards();

  // Always calculate value for ALL visible cards to avoid sync issues
  const playerValue = visiblePlayerCards.length > 0 ? calculateHandValue(visiblePlayerCards) : 0;
  // For dealer, only show value after hole card is revealed or game is complete
  const dealerValue = (showDealerHoleCard || gameState === "complete") && visibleDealerCards.length > 0
    ? calculateHandValue(visibleDealerCards)
    : (visibleDealerCards.length > 0 ? calculateHandValue([visibleDealerCards[0]]) : 0);

  return (
    <div className="min-h-screen p-2 md:p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 text-8xl animate-pulse">♠</div>
        <div className="absolute top-40 right-20 text-8xl animate-pulse">♥</div>
        <div className="absolute bottom-40 left-20 text-8xl animate-pulse">♦</div>
        <div className="absolute bottom-20 right-10 text-8xl animate-pulse">♣</div>
      </div>

      {/* Win particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="win-particle absolute top-1/2 left-1/2 w-4 h-4 bg-yellow-400 rounded-full pointer-events-none"
          style={{ opacity: 0 }}
        ></div>
      ))}

      <div className="max-w-7xl mx-auto relative">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Blackjack
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
            {gameState === "betting" && "Place Your Chips"}
            {gameState === "dealing" && dealingPhase === "ask-player-second" && "First Card Dealt!"}
            {gameState === "dealing" && dealingPhase !== "ask-player-second" && "Dealer is Dealing..."}
            {gameState === "playing" && "Your Turn"}
            {gameState === "dealer-turn" && "Dealer's Turn"}
            {gameState === "complete" && "Round Complete"}
          </p>
        </div>

        {/* Main layout with controls on left, table on right */}
        <div className="flex flex-col md:flex-row gap-3 items-start justify-center">
          {/* Left side - Controls Panel */}
          <div className="w-full md:w-64 lg:w-72 md:flex-shrink-0 space-y-4">
            {/* Balance Display */}
            <div className="bg-gradient-to-br from-gray-900 to-black px-4 py-3 rounded-xl border-2 border-yellow-600 shadow-2xl text-center">
              <div className="text-yellow-400 font-bold text-xs mb-1">BALANCE {user?.walletMode === "demo" && <span className="text-purple-300">(DEMO)</span>}</div>
              <div className="text-white font-black text-2xl">{user?.balance || 0}</div>
              <div className="text-yellow-400 font-bold text-xs">sat</div>
            </div>

            {/* Controls Panel */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 border-2 border-yellow-700 shadow-2xl space-y-4">
              {/* Bet Amount Display */}
              <div className="text-center">
                <div className="text-yellow-400 text-sm font-bold mb-1">CURRENT BET</div>
                <div className="text-white text-2xl font-black">
                  {betAmount} sat
                </div>
              </div>

              {/* Chip Selection - Always visible */}
              <div>
                <div className="text-yellow-400 text-xs font-bold mb-2 text-center">CHIPS</div>
                <div className="grid grid-cols-4 gap-2">
                  {CHIP_VALUES.map((value) => (
                    <button
                      key={value}
                      onClick={(e) => addChipToBet(value, e)}
                      disabled={gameState !== "betting" || betAmount + value > (user?.balance || 0) || betAmount + value > 2500}
                      className={`chip-button relative w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${getChipColor(value)} border-4 border-white shadow-xl transform hover:scale-110 transition active:scale-95 disabled:opacity-30 disabled:grayscale disabled:transform-none overflow-hidden`}
                      data-chip-value={value}
                    >
                      {/* Edge spots */}
                      <div className="absolute inset-0">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-2 h-3 bg-white/80 rounded-sm"
                            style={{
                              top: '50%',
                              left: '50%',
                              transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-20px)`,
                              transformOrigin: 'center',
                            }}
                          />
                        ))}
                      </div>
                      {/* Dashed circle near edge */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-12px)] h-[calc(100%-12px)] rounded-full border-2 border-dashed border-white/40"></div>
                      {/* Center circle */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-20px)] h-[calc(100%-20px)] rounded-full bg-white/10 flex items-center justify-center">
                        <div className={`text-white font-black ${value >= 100 ? 'text-xs' : 'text-sm'} drop-shadow-lg`}>{value}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* REBET, CLEAR and DEAL buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={async () => {
                    if (lastBetAmount > 0 && lastBetAmount <= (user?.balance || 0) && !loading) {
                      clearBet();

                      // Recreate chips from last bet
                      let remaining = lastBetAmount;
                      const chips = [];
                      const chipValuesDescending = [...CHIP_VALUES].reverse();

                      for (const chipValue of chipValuesDescending) {
                        while (remaining >= chipValue) {
                          chips.push({
                            id: Date.now() + Math.random(),
                            value: chipValue,
                            x: Math.random() * 60 - 30,
                            y: Math.random() * 20 - 10,
                          });
                          remaining -= chipValue;
                        }
                      }

                      setBettingChips(chips);
                      setBetAmount(lastBetAmount);

                      // Start game immediately with the lastBetAmount
                      try {
                        setLoading(true);
                        setMessage("Placing bet...");
                        setAnimatedPlayerCardCount(0);
                        setAnimatedDealerCardCount(0);

                        await delay(500);

                        const res = await fetch("/api/blackjack/solo", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "start", betAmount: lastBetAmount }),
                        });

                        const data = await res.json();

                        if (data.success) {
                          updateBalance(data.balance);
                          setGameData(data);

                          if (data.action === "complete") {
                            setPlayerHands(data.playerHands);
                            setDealerHand(data.dealerHand);
                            setGameState("complete");
                            setShowDealerHoleCard(true);
                            setMessage(data.message);

                            if (data.payout > lastBetAmount) {
                              await animateChipsToPlayer();
                              animateWin();
                            } else {
                              await animateChipsToDealer();
                            }
                          } else {
                            setPlayerHands(data.playerHands);
                            setDealerHand(data.dealerHand);
                            setCurrentHandIndex(0);
                            setGameState("dealing");
                            setDealingPhase("player-first");
                            setShowDealerHoleCard(false);
                            setMessage("Dealer is dealing...");
                          }
                        } else {
                          setMessage(data.error || "Failed to start game");
                          setGameState("betting");
                        }
                      } catch (error) {
                        setMessage("Error starting game");
                        setGameState("betting");
                        console.error(error);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  disabled={gameState !== "betting" || lastBetAmount === 0 || lastBetAmount > (user?.balance || 0) || loading}
                  className="bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-2 px-3 rounded-lg font-black text-xs shadow-lg transform hover:scale-105 transition"
                >
                  REBET
                </button>

                <button
                  onClick={clearBet}
                  disabled={gameState !== "betting" || betAmount === 0}
                  className="bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-2 px-3 rounded-lg font-black text-xs shadow-lg transform hover:scale-105 transition"
                >
                  CLEAR
                </button>

                <button
                  onClick={startGame}
                  disabled={gameState !== "betting" || loading || betAmount === 0 || betAmount > (user?.balance || 0)}
                  className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-30 text-black font-black py-2 px-3 rounded-lg text-xs shadow-lg transform hover:scale-105 transition border-2 border-yellow-600"
                >
                  {loading ? "DEAL..." : "🎴 DEAL"}
                </button>
              </div>

              {/* Main Action Buttons - Always visible, bigger HIT/STAND */}
              <div className="space-y-2">
                {/* HIT and STAND - Bigger */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (gameState === "playing") {
                        performAction("hit");
                      } else if (gameState === "dealing" && dealingPhase === "ask-player-second") {
                        handleSecondCardChoice(true);
                      }
                    }}
                    disabled={!(gameState === "playing" || (gameState === "dealing" && dealingPhase === "ask-player-second")) || loading}
                    className="bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-4 px-3 rounded-lg font-black text-base shadow-lg transform hover:scale-105 transition border-2 border-green-400"
                  >
                    👊 HIT
                  </button>

                  <button
                    onClick={() => performAction("stand")}
                    disabled={gameState !== "playing" || loading}
                    className="bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-4 px-3 rounded-lg font-black text-base shadow-lg transform hover:scale-105 transition border-2 border-red-400"
                  >
                    ✋ STAND
                  </button>
                </div>

                {/* DOUBLE and SPLIT */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => performAction("double")}
                    disabled={gameState !== "playing" || !canDouble || loading || (user?.balance || 0) < (currentHand?.bet || 0)}
                    className="bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-2 px-3 rounded-lg font-black text-sm shadow-lg transform hover:scale-105 transition border-2 border-blue-400"
                  >
                    💪 DOUBLE
                  </button>

                  <button
                    onClick={() => performAction("split")}
                    disabled={gameState !== "playing" || !canSplit || loading}
                    className="bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-2 px-3 rounded-lg font-black text-sm shadow-lg transform hover:scale-105 transition border-2 border-purple-400"
                  >
                    ✂️ SPLIT
                  </button>
                </div>

                {/* SURRENDER */}
                <button
                  onClick={() => performAction("surrender")}
                  disabled={gameState !== "playing" || !canSurrender || loading}
                  className="w-full bg-gradient-to-br from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white py-2 px-3 rounded-lg font-black text-sm shadow-lg transform hover:scale-105 transition border-2 border-orange-400"
                >
                  🏳️ SURRENDER
                </button>
              </div>

              {/* NEW ROUND button */}
              <button
                onClick={newRound}
                disabled={gameState !== "complete"}
                className="w-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 hover:from-green-600 hover:via-green-500 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-30 text-white font-black py-3 px-4 rounded-xl text-base shadow-2xl transform hover:scale-105 transition border-2 border-green-600"
              >
                🔄 NEW ROUND
              </button>
            </div>

            {/* Status Messages - Below buttons */}
            <div className="text-center mt-3 h-8">
              {gameState === "dealing" && (
                <div className="text-yellow-400 text-sm font-bold animate-pulse">
                  {dealingPhase === "ask-player-second" ? "Choose your move..." : "Dealing cards..."}
                </div>
              )}
              {gameState === "dealer-turn" && (
                <div className="text-yellow-400 text-sm font-bold animate-pulse">
                  🎲 Dealer playing...
                </div>
              )}
              {playerHands.length > 1 && gameState === "playing" && (
                <div className="text-yellow-400 text-sm font-bold">
                  Hand {currentHandIndex + 1} of {playerHands.length}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Blackjack Table */}
          <div className="w-full md:w-[600px] relative flex flex-col items-center">
          {/* Dealer Section */}
          <div className="mb-44 md:mb-52 relative w-full max-w-5xl">
            {/* Dealer's Deck */}
            <div ref={deckRef} className="absolute top-4 right-2 md:right-4 w-16 h-24 md:w-20 md:h-28 z-10">
              <div className="relative w-full h-full">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 rounded-lg md:rounded-xl border-2 md:border-3 border-white shadow-xl"
                    style={{
                      transform: `translateY(${-i * 2}px) translateX(${-i * 2}px) rotate(${-i * 1}deg)`,
                      zIndex: 5 - i,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-2xl md:text-3xl opacity-30">🂠</div>
                    </div>
                  </div>
                ))}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-black px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-black whitespace-nowrap shadow-lg">
                  DECK
                </div>
              </div>
            </div>

            {/* Curved line under dealer (like real blackjack table) */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4/5 h-8 border-b-2 border-yellow-500/20 rounded-b-[100%]"></div>

            <div className="bg-black/30 backdrop-blur rounded-2xl px-3 py-3 border-2 border-yellow-700/50 shadow-inner h-[220px] flex flex-col relative w-full">
              {/* Dealer label inside border - top left */}
              <div className="absolute top-3 left-3">
                <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-3 py-1 rounded-lg border border-yellow-500 shadow-lg">
                  <h2 className="text-sm md:text-base font-black text-white drop-shadow-lg tracking-wider">DEALER</h2>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {visibleDealerCards.length > 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    {/* Always show value label to prevent card shifting */}
                    <div className={`bg-gradient-to-r from-gray-900 to-black text-white text-lg md:text-xl font-black px-4 py-2 rounded-lg shadow-lg border-2 mb-3 ${showDealerHoleCard ? 'border-red-500 opacity-100' : 'border-transparent opacity-0'}`}>
                      {dealerValue || "?"}
                      {dealerValue > 21 && <span className="text-red-500"> BUST!</span>}
                    </div>

                    {/* Stacked cards with overlap */}
                    <div className="relative flex items-center">
                      {visibleDealerCards.map((card, idx) =>
                        renderCard(card, false, idx, "dealer", visibleDealerCards.length)
                      )}
                      {gameState === "playing" && dealerHand.length > 1 && !showDealerHoleCard &&
                        renderCard({} as Card, true, 1, "dealer", 2)
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-base text-center py-6">
                    <div className="text-4xl mb-2 opacity-30">🎴</div>
                    <div>Waiting...</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Betting Area - Centered between dealer and player */}
          <div className="betting-area-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            {/* Always show betting area */}
            {(bettingChips.length > 0 || gameState === "betting") && (
              <div className="relative">
                {/* Win/Loss Indicator */}
                {gameState === "complete" && message && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-50">
                    {(() => {
                      const data = gameData || {};
                      const payout = data.payout || 0;
                      const isWin = payout > betAmount;
                      const isPush = payout === betAmount;
                      const isLoss = payout < betAmount;

                      if (isWin) {
                        return (
                          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl text-xl md:text-2xl font-black shadow-2xl border-4 border-green-400 animate-pulse">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl">🎉</span>
                              <span>YOU WIN!</span>
                              <span className="text-3xl">🎉</span>
                            </div>
                            <div className="text-base md:text-lg text-center mt-1">{payout} sat</div>
                          </div>
                        );
                      } else if (isPush) {
                        return (
                          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-6 py-3 rounded-xl text-xl md:text-2xl font-black shadow-2xl border-4 border-yellow-400">
                            <div className="flex items-center gap-2">
                              <span>🤝 PUSH 🤝</span>
                            </div>
                            <div className="text-base md:text-lg text-center mt-1">{payout} sat</div>
                          </div>
                        );
                      } else if (isLoss) {
                        return (
                          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl text-xl md:text-2xl font-black shadow-2xl border-4 border-red-400">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl">💔</span>
                              <span>YOU LOSE</span>
                              <span className="text-3xl">💔</span>
                            </div>
                            <div className="text-base md:text-lg text-center mt-1">Lost {betAmount} sat</div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Bet amount label - only show when there's a bet */}
                {betAmount > 0 && gameState !== "betting" && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs md:text-sm font-black shadow-lg whitespace-nowrap">
                    {betAmount} sat
                  </div>
                )}

                {/* Betting circle - always visible */}
                <div className="relative w-28 h-28 md:w-32 md:h-32">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-yellow-500/50"></div>
                  {gameState === "betting" && bettingChips.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-yellow-500/50 text-xs font-bold">
                      PLACE BET
                    </div>
                  )}
                  <div ref={bettingAreaRef} className="absolute inset-0 flex items-center justify-center">
                    {bettingChips.map((chip, index) => (
                      <div
                        key={chip.id}
                        data-chip-id={chip.id}
                        className={`betting-chip absolute w-16 h-16 rounded-full bg-gradient-to-br ${getChipColor(chip.value)} border-4 border-white overflow-hidden`}
                        style={{
                          transform: `translate(${chip.x}px, ${chip.y}px)`,
                          boxShadow: `0 ${4 + index * 2}px ${20 + index * 5}px rgba(0,0,0,${0.4 + index * 0.05})`,
                          zIndex: index,
                        }}
                      >
                        {/* Edge spots */}
                        <div className="absolute inset-0">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2.5 h-3.5 bg-white/80 rounded-sm"
                              style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-23px)`,
                                transformOrigin: 'center',
                              }}
                            />
                          ))}
                        </div>
                        {/* Dashed circle near edge */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-14px)] h-[calc(100%-14px)] rounded-full border-2 border-dashed border-white/40"></div>
                        {/* Center circle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] h-[calc(100%-24px)] rounded-full bg-white/10 flex items-center justify-center">
                          <div className="text-white font-black text-base drop-shadow-lg">{chip.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Player Section */}
          <div className="relative w-full max-w-5xl">
            <div className="bg-black/30 backdrop-blur rounded-2xl px-3 py-3 border-2 border-blue-700/50 shadow-inner h-[220px] flex flex-col relative w-full">
              {/* Player label inside border - top left */}
              <div className="absolute top-3 left-3">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1 rounded-lg border border-blue-500 shadow-lg">
                  <h2 className="text-sm md:text-base font-black text-white drop-shadow-lg tracking-wider">YOU</h2>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {visiblePlayerCards.length > 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    {/* Stacked cards with overlap */}
                    <div className="relative flex items-center">
                      {visiblePlayerCards.map((card, idx) =>
                        renderCard(card, false, idx, "player", visiblePlayerCards.length)
                      )}
                    </div>

                    {/* Always show value label to prevent card shifting */}
                    <div className={`bg-gradient-to-r from-gray-900 to-black text-white text-lg md:text-xl font-black px-4 py-2 rounded-lg shadow-lg border-2 mt-3 ${(gameState === "playing" || gameState === "dealer-turn" || gameState === "complete") ? 'border-yellow-500 opacity-100' : 'border-transparent opacity-0'} ${gameState === "playing" ? "animate-pulse" : ""}`}>
                      {playerValue || "?"}
                      {playerValue > 21 && <span className="text-red-500"> BUST!</span>}
                      {playerValue === 21 && visiblePlayerCards.length === 2 && <span className="text-yellow-400"> BLACKJACK!</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-base text-center">
                    <div className="text-4xl mb-2 opacity-30 animate-bounce">💰</div>
                    <div>Place your bets</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
