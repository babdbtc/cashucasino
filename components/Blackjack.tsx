"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  insurance?: number;
}

interface Player {
  seatNumber: number;
  userId: number;
  hands: Hand[];
  currentHandIndex: number;
  totalBet: number;
  status: string;
}

interface TableState {
  id: string;
  phase: string;
  dealerHand: Card[];
  currentSeat: number;
  minBet: number;
  maxBet: number;
}

interface GameState {
  table: TableState | null;
  seat: {
    seatNumber: number;
    hands: Hand[];
    currentHandIndex: number;
    totalBet: number;
    status: string;
  } | null;
  players: Player[];
}

export default function Blackjack() {
  const { user, updateBalance } = useAuth();
  const [gameState, setGameState] = useState<GameState>({
    table: null,
    seat: null,
    players: [],
  });
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showInsurance, setShowInsurance] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");

  const tableRef = useRef<HTMLDivElement>(null);
  const dealerRef = useRef<HTMLDivElement>(null);

  const fetchTableState = useCallback(async () => {
    if (!gameState.table) return;

    try {
      const res = await fetch(
        `/api/blackjack/state?tableId=${gameState.table.id}`
      );
      const data = await res.json();

      if (data.success) {
        setGameState({
          table: data.table,
          seat: data.seat,
          players: data.players,
        });
      }
    } catch (error) {
      console.error("Error fetching state:", error);
    }
  }, [gameState.table]);

  const joinTable = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/blackjack/join", {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setGameState({
          table: data.table,
          seat: data.seat,
          players: data.players,
        });
        if (data.table.phase === 'betting') {
          setMessage("Place your bet to start the round!");
        } else {
          setMessage("Joined table. Waiting for current round to finish...");
        }
      } else {
        setMessage(data.error || "Failed to join table");
      }
    } catch (error) {
      setMessage("Error joining table");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Join table on mount
  useEffect(() => {
    joinTable();
  }, []);

  // Poll for updates every 2 seconds
  useEffect(() => {
    if (!gameState.table) return;

    const interval = setInterval(() => {
      fetchTableState();
    }, 2000);

    return () => clearInterval(interval);
  }, [gameState.table, fetchTableState]);

  const placeBet = async () => {
    if (!gameState.table || !user) return;

    try {
      setLoading(true);
      const res = await fetch("/api/blackjack/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: gameState.table.id,
          betAmount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGameState({
          table: data.table,
          seat: data.seat,
          players: data.players,
        });
        updateBalance(data.balance);
        setMessage("Bet placed! Waiting for other players...");

        // Animate chips
        animateChips();
      } else {
        setMessage(data.error || "Failed to place bet");
      }
    } catch (error) {
      setMessage("Error placing bet");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, insuranceAmount?: number) => {
    if (!gameState.table || !user) return;

    try {
      setLoading(true);
      const res = await fetch("/api/blackjack/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: gameState.table.id,
          action,
          insuranceAmount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGameState({
          table: data.table,
          seat: data.seat,
          players: data.players,
        });
        updateBalance(data.balance);

        // Check if payouts available
        if (data.payouts) {
          handlePayouts(data.payouts);
        }

        // Animate cards
        if (action === "hit" || action === "double" || action === "split") {
          animateNewCard();
        }

        setShowInsurance(false);
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

  const handlePayouts = (payouts: any[]) => {
    const myPayout = payouts.find(p => p.userId === user?.id);
    if (myPayout) {
      if (myPayout.payout > 0) {
        setPayoutMessage(`You won ${myPayout.payout} sat!`);
        animateWin();
      } else if (myPayout.payout === 0) {
        setPayoutMessage("You lost!");
      } else {
        setPayoutMessage("Push!");
      }

      setTimeout(() => {
        setPayoutMessage("");
        setMessage("Place your bet for next round!");
        // Force a state refresh
        fetchTableState();
      }, 3000);
    }
  };

  const animateChips = () => {
    const chips = document.querySelectorAll(".chip");
    gsap.fromTo(
      chips,
      { scale: 0, rotation: 0 },
      {
        scale: 1,
        rotation: 720,
        duration: 0.5,
        stagger: 0.1,
        ease: "back.out(1.7)",
      }
    );
  };

  const animateNewCard = () => {
    const cards = document.querySelectorAll(".card:last-child");
    gsap.fromTo(
      cards,
      {
        opacity: 0,
        y: -100,
        rotationY: 90,
      },
      {
        opacity: 1,
        y: 0,
        rotationY: 0,
        duration: 0.6,
        ease: "power2.out",
      }
    );
  };

  const animateWin = () => {
    gsap.fromTo(
      ".win-message",
      { scale: 0, opacity: 0 },
      {
        scale: 1.2,
        opacity: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
      }
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

  const renderCard = (card: Card, faceDown = false) => {
    if (faceDown) {
      return (
        <div className="card w-16 h-24 bg-blue-600 rounded-lg border-2 border-white shadow-lg flex items-center justify-center">
          <div className="text-white text-4xl">🂠</div>
        </div>
      );
    }

    const isRed = card.suit === "♥" || card.suit === "♦";

    return (
      <div className="card w-16 h-24 bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col justify-between">
        <div className={`text-lg font-bold ${isRed ? "text-red-600" : "text-black"}`}>
          {card.rank}
          {card.suit}
        </div>
        <div className={`text-3xl text-center ${isRed ? "text-red-600" : "text-black"}`}>
          {card.suit}
        </div>
        <div className={`text-lg font-bold text-right ${isRed ? "text-red-600" : "text-black"}`}>
          {card.rank}
          {card.suit}
        </div>
      </div>
    );
  };

  const renderHand = (hand: Hand, label: string) => {
    const value = calculateHandValue(hand.cards);
    const isBust = value > 21;
    const isBlackjack = hand.status === "blackjack";

    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="flex gap-2">
          {hand.cards.map((card, idx) => (
            <div key={idx}>{renderCard(card)}</div>
          ))}
        </div>
        <div className="text-white font-semibold">
          {label}: {value}
          {isBust && " (BUST)"}
          {isBlackjack && " (BLACKJACK!)"}
        </div>
      </div>
    );
  };

  const renderPlayer = (player: Player) => {
    const isCurrentPlayer = gameState.table?.currentSeat === player.seatNumber;
    const isMe = player.userId === user?.id;

    return (
      <div
        key={player.seatNumber}
        className={`p-4 rounded-lg ${
          isCurrentPlayer ? "bg-yellow-900/30 border-2 border-yellow-500" : "bg-gray-800/50"
        } ${isMe ? "border-2 border-green-500" : ""}`}
      >
        <div className="text-white font-bold mb-2">
          Seat {player.seatNumber + 1} {isMe && "(You)"}
        </div>

        {player.hands.length > 0 ? (
          <div className="space-y-2">
            {player.hands.map((hand, idx) => (
              <div key={idx}>
                {renderHand(hand, `Hand ${idx + 1}`)}
                {player.currentHandIndex === idx && isCurrentPlayer && (
                  <div className="text-yellow-400 text-sm mt-1">← Your turn</div>
                )}
              </div>
            ))}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: Math.min(player.totalBet / 10, 10) }).map((_, i) => (
                <div
                  key={i}
                  className="chip relative w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-white shadow-lg overflow-hidden"
                >
                  <div className="absolute inset-[2px] rounded-full border border-dashed border-white/40"></div>
                  <div className="absolute inset-[3px] rounded-full bg-white/10"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            {player.status === "betting" ? "Placing bet..." : "Waiting"}
          </div>
        )}
      </div>
    );
  };

  const isMyTurn =
    gameState.table?.phase === "playing" &&
    gameState.seat &&
    gameState.table.currentSeat === gameState.seat.seatNumber &&
    gameState.seat.status === "playing";

  const canSplit =
    isMyTurn &&
    gameState.seat &&
    gameState.seat.hands[gameState.seat.currentHandIndex]?.cards.length === 2 &&
    gameState.seat.hands[gameState.seat.currentHandIndex]?.cards[0].rank ===
      gameState.seat.hands[gameState.seat.currentHandIndex]?.cards[1].rank;

  const canDouble =
    isMyTurn &&
    gameState.seat &&
    gameState.seat.hands[gameState.seat.currentHandIndex]?.cards.length === 2;

  const canSurrender =
    isMyTurn &&
    gameState.seat &&
    gameState.seat.hands[gameState.seat.currentHandIndex]?.cards.length === 2 &&
    gameState.seat.currentHandIndex === 0;

  const dealerShowingAce =
    gameState.table?.dealerHand &&
    gameState.table.dealerHand.length > 0 &&
    gameState.table.dealerHand[0].rank === "A";

  return (
    <div className="min-h-screen p-2 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] neon-text">
            Blackjack
          </h1>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-blue-900/50 border border-blue-500 text-white px-4 py-2 rounded-lg mb-4 text-center">
            {message}
          </div>
        )}

        {/* Payout Message */}
        {payoutMessage && (
          <div className="win-message fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-4 rounded-lg text-3xl font-bold shadow-2xl z-50">
            {payoutMessage}
          </div>
        )}

        {gameState.table && (
          <div className="space-y-8">
            {/* Dealer Section */}
            <div
              ref={dealerRef}
              className="bg-black/30 rounded-xl p-6 border-2 border-yellow-600"
            >
              <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">
                Dealer
              </h2>
              {gameState.table.dealerHand.length > 0 ? (
                <div className="flex justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex gap-2">
                      {gameState.table.dealerHand.map((card, idx) => (
                        <div key={idx}>{renderCard(card)}</div>
                      ))}
                      {gameState.table.phase === "playing" &&
                        gameState.table.dealerHand.length === 1 && (
                          <div>{renderCard({} as Card, true)}</div>
                        )}
                    </div>
                    {gameState.table.phase === "payout" && (
                      <div className="text-white font-semibold">
                        Dealer: {calculateHandValue(gameState.table.dealerHand)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center">Waiting for bets...</div>
              )}
            </div>

            {/* Players Section */}
            <div
              ref={tableRef}
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"
            >
              {gameState.players.map((player) => renderPlayer(player))}
            </div>

            {/* Control Panel */}
            <div className="bg-black/50 rounded-xl p-6 border-2 border-yellow-600">
              {/* Betting Phase */}
              {gameState.table.phase === "betting" &&
                gameState.seat?.status === "betting" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-yellow-400 text-center">
                      Place Your Bet
                    </h3>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setBetAmount(Math.max(1, betAmount - 10))}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold"
                      >
                        -10
                      </button>
                      <div className="text-white text-2xl font-bold">
                        {betAmount} sat
                      </div>
                      <button
                        onClick={() => setBetAmount(Math.min(1000, betAmount + 10))}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold"
                      >
                        +10
                      </button>
                    </div>
                    <button
                      onClick={placeBet}
                      disabled={loading || betAmount > (user?.balance || 0)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-500 disabled:to-gray-600 text-black font-bold py-3 px-6 rounded-lg text-xl shadow-lg"
                    >
                      {loading ? "Placing Bet..." : "Place Bet"}
                    </button>
                  </div>
                )}

              {/* Playing Phase - Action Buttons */}
              {isMyTurn && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-yellow-400 text-center">
                    Your Turn
                  </h3>

                  {/* Insurance Offer */}
                  {dealerShowingAce &&
                    !showInsurance &&
                    gameState.seat?.hands[0].cards.length === 2 && (
                      <div className="bg-yellow-900/50 border border-yellow-500 p-4 rounded-lg">
                        <p className="text-white text-center mb-2">
                          Dealer showing Ace! Take insurance?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const insuranceAmount = gameState.seat!.totalBet / 2;
                              performAction("insurance", insuranceAmount);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-bold"
                          >
                            Yes ({gameState.seat!.totalBet / 2} sat)
                          </button>
                          <button
                            onClick={() => setShowInsurance(true)}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-bold"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => performAction("hit")}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-lg"
                    >
                      Hit
                    </button>
                    <button
                      onClick={() => performAction("stand")}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-lg"
                    >
                      Stand
                    </button>

                    {canDouble && (
                      <button
                        onClick={() => performAction("double")}
                        disabled={loading || (user?.balance || 0) < betAmount}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-lg"
                      >
                        Double Down
                      </button>
                    )}

                    {canSplit && (
                      <button
                        onClick={() => performAction("split")}
                        disabled={loading || (user?.balance || 0) < betAmount}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-lg"
                      >
                        Split
                      </button>
                    )}

                    {canSurrender && (
                      <button
                        onClick={() => performAction("surrender")}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-lg"
                      >
                        Surrender
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Waiting State */}
              {gameState.table.phase === "playing" && !isMyTurn && (
                <div className="text-center text-white text-xl">
                  {gameState.seat?.status === "done"
                    ? "Waiting for other players..."
                    : "Waiting for your turn..."}
                </div>
              )}

              {/* Payout Phase */}
              {gameState.table.phase === "payout" && (
                <div className="text-center text-white text-xl">
                  {payoutMessage ? "Calculating payouts..." : "Round complete!"}
                </div>
              )}
            </div>
          </div>
        )}

        {!gameState.table && (
          <div className="text-center text-white text-xl">
            {loading ? "Joining table..." : "Loading..."}
          </div>
        )}
      </div>
    </div>
  );
}
