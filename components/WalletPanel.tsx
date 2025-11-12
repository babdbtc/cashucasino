"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth, type WalletMode } from "@/lib/auth-context";
import { QRCodeSVG } from "qrcode.react";

export default function WalletPanel() {
  const { user, updateBalance, refreshUser, switchWalletMode } = useAuth();
  const balance = user?.balance || 0;
  const walletMode = user?.walletMode || "real";

  const [depositToken, setDepositToken] = useState("");
  const [withdrawToken, setWithdrawToken] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showWithdrawInput, setShowWithdrawInput] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);

  // Lightning deposit state
  const [depositMethod, setDepositMethod] = useState<"cashu" | "lightning">("lightning");
  const [lightningAmount, setLightningAmount] = useState("");
  const [lightningInvoice, setLightningInvoice] = useState("");
  const [lightningQuoteId, setLightningQuoteId] = useState("");
  const [lightningExpiry, setLightningExpiry] = useState(0);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const paymentCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Nostr-specific state
  const [showNostrWithdraw, setShowNostrWithdraw] = useState(false);
  const [nostrWithdrawAmount, setNostrWithdrawAmount] = useState("");
  const hasNostrAccount = user?.nostrPubkey !== null;

  // How It Works modal state
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  const handleDeposit = async () => {
    if (!depositToken.trim()) {
      setMessage("Please enter a token");
      return;
    }

    setMessage("Processing deposit...");
    setLoading(true);

    try {
      const response = await fetch("/api/balance/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: depositToken.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(`✅ Deposited ${data.amount} sat!`);
        setDepositToken("");
        setShowDeposit(false);

        // Update balance from server response
        if (data.newBalance !== undefined) {
          updateBalance(data.newBalance);
        } else {
          await refreshUser();
        }

        // Clear message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.error || "Deposit failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLightningDeposit = async () => {
    const amount = parseInt(lightningAmount);

    if (!amount || amount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    setMessage("Generating Lightning invoice...");
    setLoading(true);

    try {
      const response = await fetch("/api/balance/deposit-lightning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLightningInvoice(data.invoice);
        setLightningQuoteId(data.quoteId);
        setLightningExpiry(data.expiry);
        setMessage(`✅ Lightning invoice generated! Pay ${amount} sat to deposit.`);

        // Start checking for payment
        startPaymentCheck(data.quoteId);
      } else {
        setMessage(`❌ ${data.error || "Failed to create Lightning invoice"}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startPaymentCheck = (quoteId: string) => {
    // Clear any existing interval
    if (paymentCheckInterval.current) {
      clearInterval(paymentCheckInterval.current);
    }

    setCheckingPayment(true);

    paymentCheckInterval.current = setInterval(async () => {
      try {
        const response = await fetch("/api/balance/deposit-lightning-claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quoteId }),
        });

        const data = await response.json();

        if (data.success && data.paid) {
          // Payment received!
          if (paymentCheckInterval.current) {
            clearInterval(paymentCheckInterval.current);
            paymentCheckInterval.current = null;
          }
          setCheckingPayment(false);
          setPaymentConfirmed(true);
          setMessage(`✅ Payment received! Deposited ${data.amount} sat!`);

          // Update balance
          if (data.newBalance !== undefined) {
            updateBalance(data.newBalance);
          } else {
            await refreshUser();
          }

          // Reset Lightning deposit state after showing success
          setTimeout(() => {
            setLightningInvoice("");
            setLightningQuoteId("");
            setLightningAmount("");
            setPaymentConfirmed(false);
            setMessage("");
            setShowDeposit(false);
          }, 3000);
        } else if (data.error && data.error.includes("expired")) {
          // Invoice expired
          if (paymentCheckInterval.current) {
            clearInterval(paymentCheckInterval.current);
            paymentCheckInterval.current = null;
          }
          setCheckingPayment(false);
          setMessage("❌ Lightning invoice expired. Please try again.");
          setLightningInvoice("");
          setLightningQuoteId("");
        }
        // Otherwise keep checking
      } catch (error) {
        console.error("Payment check error:", error);
      }
    }, 3000); // Check every 3 seconds

    // Stop checking after 10 minutes
    setTimeout(() => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
        paymentCheckInterval.current = null;
      }
      setCheckingPayment(false);
    }, 10 * 60 * 1000);
  };

  // Cleanup payment check interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
      }
    };
  }, []);

  const copyLightningInvoice = () => {
    navigator.clipboard.writeText(lightningInvoice);
    setCopied(true);
    setMessage("✅ Invoice copied to clipboard!");
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleWithdrawAll = () => {
    if (balance === 0) {
      setMessage("❌ No balance to withdraw");
      return;
    }
    setWithdrawAmount(balance.toString());
    setShowWithdrawInput(true);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);

    if (!amount || amount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      setMessage(`❌ Insufficient balance. You have ${balance} sat`);
      return;
    }

    setMessage("Processing withdrawal...");
    setLoading(true);

    try {
      const response = await fetch("/api/balance/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWithdrawToken(data.token);
        setShowWithdraw(true);
        setShowWithdrawInput(false);
        setMessage(`✅ Withdrew ${amount} sat`);

        // Update balance from server response
        if (data.newBalance !== undefined) {
          updateBalance(data.newBalance);
        } else {
          await refreshUser();
        }
      } else {
        setMessage(`❌ ${data.error || "Withdrawal failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyWithdrawToken = () => {
    navigator.clipboard.writeText(withdrawToken);
    setCopied(true);
    setMessage("✅ Token copied to clipboard!");
    setTimeout(() => {
      setMessage("");
      setCopied(false);
    }, 2000);
  };

  const handleSwitchMode = async (newMode: WalletMode) => {
    if (newMode === walletMode || switchingMode) return;

    setSwitchingMode(true);

    const result = await switchWalletMode(newMode);

    if (!result.success) {
      setMessage(`❌ ${result.error || "Failed to switch mode"}`);
    }

    setSwitchingMode(false);
  };

  // Nostr Withdraw Handler
  const handleNostrWithdrawAll = () => {
    if (!hasNostrAccount) {
      setMessage("❌ Please login with Nostr first to use instant withdraw");
      return;
    }
    if (balance === 0) {
      setMessage("❌ No balance to withdraw");
      return;
    }
    setNostrWithdrawAmount(balance.toString());
    setShowNostrWithdraw(true);
  };

  const handleNostrWithdraw = async () => {
    const amount = parseInt(nostrWithdrawAmount);

    if (!amount || amount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      setMessage(`❌ Insufficient balance. You have ${balance} sat`);
      return;
    }

    setMessage("Sending to your Nostr wallet...");
    setLoading(true);

    try {
      const response = await fetch("/api/balance/withdraw-nostr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowNostrWithdraw(false);
        setNostrWithdrawAmount("");

        if (data.warning) {
          // Fallback: DM failed, show token
          setWithdrawToken(data.token);
          setShowWithdraw(true);
          setMessage(`⚠️ ${data.warning}`);
        } else {
          setMessage(`✅ ${data.message || `Sent ${amount} sat to your Nostr wallet!`}`);
          setTimeout(() => setMessage(""), 5000);
        }

        // Update balance from server response
        if (data.newBalance !== undefined) {
          updateBalance(data.newBalance);
        } else {
          await refreshUser();
        }
      } else {
        setMessage(`❌ ${data.error || "Nostr withdrawal failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNutzapWithdrawAll = async () => {
    if (balance === 0) {
      setMessage("No balance to withdraw");
      return;
    }

    setMessage("Sending nutzap to your Nostr wallet...");
    setLoading(true);

    try {
      const response = await fetch("/api/balance/withdraw-nutzap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: balance,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(`✅ ${data.message || `Sent ${balance} sat via nutzap!`}`);
        setTimeout(() => setMessage(""), 5000);

        // Update balance from server response
        if (data.newBalance !== undefined) {
          updateBalance(data.newBalance);
        } else {
          await refreshUser();
        }
      } else {
        setMessage(`❌ ${data.error || "Nutzap withdrawal failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Show nothing if not authenticated (AuthModal will handle login)
  if (!user) {
    return null;
  }

  const mintUrl = walletMode === "real"
    ? "mint.minibits.cash"
    : "testnut.cashu.space";

  return (
    <div className="relative">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent">
          Wallet
        </h2>
      </div>

      {/* Wallet Mode Toggle */}
      <div className="mb-6">
        <button
          onClick={() => handleSwitchMode(walletMode === "demo" ? "real" : "demo")}
          disabled={switchingMode}
          className={`relative w-full h-10 rounded-lg transition-all duration-300 glass border border-white/10 ${
            switchingMode ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-white/20"
          }`}
        >
          <div className="relative h-full flex items-center">
            <div className="w-1/2 flex items-center justify-center z-10">
              <span className={`text-sm font-semibold transition-all duration-300 ${
                walletMode === "demo" ? "text-white" : "text-gray-500"
              }`}>
                Demo
              </span>
            </div>
            <div className="w-1/2 flex items-center justify-center z-10">
              <span className={`text-sm font-semibold transition-all duration-300 ${
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

      {/* Balance Card */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-casino-gold via-neon-yellow to-casino-gold rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500 animate-gradient bg-[length:200%_auto]" />
        <div className="relative glass rounded-2xl p-6 border border-casino-gold/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
              Balance {walletMode === "demo" && <span className="text-neon-blue ml-1">(Demo)</span>}
            </span>
          </div>
          <div className="text-5xl font-black bg-gradient-to-r from-casino-gold to-neon-yellow bg-clip-text text-transparent mb-1">
            {balance.toLocaleString()}
          </div>
          <div className="text-lg text-gray-500 dark:text-gray-500">sat</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => {
            setShowDeposit(true);
            setShowWithdrawInput(false);
            setShowWithdraw(false);
            setShowNostrWithdraw(false);
          }}
          className="bg-neon-blue/20 border-2 border-neon-blue hover:border-neon-purple text-white px-6 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Deposit
        </button>

        <button
          onClick={() => {
            if (balance === 0) {
              setMessage("❌ No balance to withdraw");
              return;
            }
            setWithdrawAmount(balance.toString());
            setShowWithdrawInput(true);
            setShowDeposit(false);
            setShowWithdraw(false);
            setShowNostrWithdraw(false);
          }}
          disabled={balance === 0}
          className={`bg-neon-purple/20 border-2 border-neon-purple hover:border-neon-pink text-white px-6 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
            balance === 0 ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          Withdraw
        </button>
      </div>

      {/* Nostr Quick Actions - Show only if user has Nostr account and withdraw is selected */}
      {hasNostrAccount && showWithdrawInput && (
        <div className="mb-6 glass rounded-2xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💜</span>
            <h4 className="font-bold text-purple-400">Nostr Instant Transfer</h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
            Choose your preferred withdrawal method
          </p>

          <div className="space-y-3">
            {/* Nutzap (NIP-61) - Auto-import */}
            <div>
              <button
                onClick={handleNutzapWithdrawAll}
                disabled={balance === 0}
                className={`w-full bg-gradient-to-r from-purple-600 to-purple-500 border-2 border-purple-400 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  balance === 0 ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50'
                }`}
              >
                <span>🚀</span>
                Nutzap (Auto-import)
              </button>
              <p className="text-xs text-gray-400 mt-1 ml-1">
                NIP-61 • P2PK-locked • Auto-import in compatible wallets
              </p>
            </div>

            {/* DM (NIP-04) - Manual claiming */}
            <div>
              <button
                onClick={handleNostrWithdrawAll}
                disabled={balance === 0}
                className={`w-full bg-gradient-to-r from-indigo-600 to-indigo-500 border-2 border-indigo-400 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  balance === 0 ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50'
                }`}
              >
                <span>💬</span>
                Direct Message
              </button>
              <p className="text-xs text-gray-400 mt-1 ml-1">
                NIP-04 • Encrypted DM • Manual claiming required
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <div className="mb-6 glass rounded-xl p-4 border-l-4 border-neon-green animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {message.includes('✅') ? '✅' : message.includes('❌') ? '❌' : 'ℹ️'}
            </span>
            <p className="text-sm leading-relaxed flex-1">{message.replace(/[✅❌]/g, '').trim()}</p>
          </div>
        </div>
      )}

      {/* Deposit Section */}
      {showDeposit && (
        <div className="mb-6 glass rounded-2xl p-6 border border-neon-blue/30 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              Deposit Funds
            </h4>
            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold glass border border-neon-blue/30 hover:border-neon-blue transition-all duration-300 transform hover:scale-105 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How It Works
            </button>
          </div>

          {/* Deposit Method Toggle */}
          <div className="mb-4">
            <div className="relative w-full h-12 rounded-lg glass border border-white/10">
              <div className="relative h-full flex items-center">
                <button
                  onClick={() => setDepositMethod("lightning")}
                  className="w-1/2 flex items-center justify-center z-10 h-full rounded-lg transition-all duration-300"
                >
                  <span className={`text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                    depositMethod === "lightning" ? "text-white" : "text-gray-500"
                  }`}>
                    <span>⚡</span>
                    Lightning
                  </span>
                </button>
                <button
                  onClick={() => {
                    setDepositMethod("cashu");
                    setLightningInvoice("");
                    setLightningQuoteId("");
                    setPaymentConfirmed(false);
                  }}
                  className="w-1/2 flex items-center justify-center z-10 h-full rounded-lg transition-all duration-300"
                >
                  <span className={`text-sm font-semibold transition-all duration-300 ${
                    depositMethod === "cashu" ? "text-white" : "text-gray-500"
                  }`}>
                    Cashu Token
                  </span>
                </button>
                <div
                  className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-md transition-all duration-300 ${
                    depositMethod === "cashu"
                      ? "bg-neon-blue/20 left-[calc(50%+2px)]"
                      : "bg-neon-yellow/20 left-1"
                  }`}
                />
              </div>
            </div>
          </div>

          {depositMethod === "lightning" ? (
            <>
              {/* Lightning Deposit UI */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Deposit Bitcoin via Lightning Network - converted to Cashu tokens automatically
              </p>

              {!lightningInvoice ? (
                <>
                  {/* Amount Input */}
                  <div className="mb-4 p-3 rounded-xl bg-neon-yellow/10 border border-neon-yellow/40">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">⚡</span>
                      <div>
                        <p className="text-xs text-gray-300">
                          <span className="font-bold text-neon-yellow">Lightning Network:</span> Pay a Lightning invoice to deposit sats directly to your balance.
                        </p>
                      </div>
                    </div>
                  </div>

                  <input
                    type="number"
                    value={lightningAmount}
                    onChange={(e) => setLightningAmount(e.target.value)}
                    placeholder="Enter amount in sats (e.g. 1000)"
                    className="w-full p-4 rounded-xl bg-black/20 dark:bg-white/5 border-2 border-gray-300 dark:border-gray-700 focus:border-neon-yellow focus:outline-none text-lg font-semibold transition-all duration-300 mb-4"
                    disabled={loading}
                    min="1"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleLightningDeposit}
                      disabled={loading}
                      className={`bg-neon-yellow text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        loading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
                      }`}
                    >
                      {loading ? (
                        "Generating..."
                      ) : (
                        <>
                          <span>⚡</span>
                          Create Invoice
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeposit(false);
                        setLightningAmount("");
                        setPaymentConfirmed(false);
                      }}
                      disabled={loading}
                      className="glass rounded-xl px-6 py-3 font-semibold border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Display Invoice */}
                  <div className={`mb-4 p-4 rounded-xl border ${
                    paymentConfirmed
                      ? "bg-neon-green/10 border-neon-green/40"
                      : "bg-neon-yellow/10 border-neon-yellow/40"
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl">
                        {paymentConfirmed ? "✅" : "⚡"}
                      </span>
                      <div className="flex-1">
                        <h5 className={`font-bold text-lg mb-1 ${
                          paymentConfirmed ? "text-neon-green" : "text-neon-yellow"
                        }`}>
                          {paymentConfirmed ? "Payment Confirmed!" : "Lightning Invoice Ready"}
                        </h5>
                        <div className="flex items-center gap-2">
                          {paymentConfirmed ? (
                            <>
                              <svg className="h-4 w-4 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <p className="text-xs text-gray-300">Crediting your balance...</p>
                            </>
                          ) : checkingPayment ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-neon-yellow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-xs text-gray-300">Waiting for payment...</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-300">Scan the QR code or copy the invoice to pay</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Display */}
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white rounded-xl">
                      <QRCodeSVG
                        value={lightningInvoice.toUpperCase()}
                        size={256}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Invoice Text */}
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 transition-colors mb-2">
                      Show invoice text
                    </summary>
                    <div className="p-4 glass rounded-xl break-all text-xs font-mono border border-neon-yellow/30 max-h-40 overflow-y-auto">
                      {lightningInvoice}
                    </div>
                  </details>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={copyLightningInvoice}
                      className="bg-neon-yellow text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Invoice
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeposit(false);
                        setLightningInvoice("");
                        setLightningQuoteId("");
                        setLightningAmount("");
                        setCheckingPayment(false);
                        setPaymentConfirmed(false);
                      }}
                      className="glass rounded-xl px-6 py-3 font-semibold border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Cashu Token Deposit UI */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your token will be verified and added to your secure server-side balance
              </p>

              {/* Mode-specific Warning */}
              <div className={`mb-4 p-3 rounded-xl border ${
                walletMode === "demo"
                  ? "bg-neon-yellow/10 border-neon-yellow/40"
                  : "bg-neon-green/10 border-neon-green/40"
              }`}>
                <div className="flex items-start gap-2">
                  {walletMode === "demo" && <span className="text-xl">⚠️</span>}
                  <div>
                    <p className="text-xs text-gray-300">
                      {walletMode === "demo" ? (
                        <>
                          <span className="font-bold text-neon-yellow">Demo Mode - Test tokens only:</span> Tokens must be from <code className="text-neon-blue">{mintUrl}</code> mint.
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-neon-green">Real Mode - Cashu tokens:</span> Tokens must be from <code className="text-neon-blue">{mintUrl}</code> mint.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <textarea
                value={depositToken}
                onChange={(e) => setDepositToken(e.target.value)}
                placeholder="Paste your Cashu token here (cashuA...)..."
                className="w-full p-4 rounded-xl bg-black/20 dark:bg-white/5 border-2 border-gray-300 dark:border-gray-700 focus:border-neon-blue focus:outline-none min-h-32 text-sm font-mono transition-all duration-300 resize-none"
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className={`bg-neon-blue text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
                  }`}
                >
                  {loading ? "Processing..." : "Add to Balance"}
                </button>
                <button
                  onClick={() => {
                    setShowDeposit(false);
                    setDepositToken("");
                  }}
                  disabled={loading}
                  className="glass rounded-xl px-6 py-3 font-semibold border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Withdraw Input Section */}
      {showWithdrawInput && (
        <div className="mb-6 glass rounded-2xl p-6 border border-neon-purple/30 animate-fade-in">
          <h4 className="text-xl font-bold mb-2 bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
            Withdraw Amount
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Available balance: <span className="font-bold text-casino-gold">{balance} sat</span>
          </p>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount to withdraw"
            className="w-full p-4 rounded-xl bg-black/20 dark:bg-white/5 border-2 border-gray-300 dark:border-gray-700 focus:border-neon-purple focus:outline-none text-lg font-semibold transition-all duration-300"
            disabled={loading}
            min="1"
            max={balance}
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className={`bg-gradient-to-r from-neon-purple to-neon-pink text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
              }`}
            >
              {loading ? "Processing..." : "Withdraw"}
            </button>
            <button
              onClick={() => {
                setShowWithdrawInput(false);
                setWithdrawAmount("");
              }}
              disabled={loading}
              className="glass rounded-xl px-6 py-3 font-semibold border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nostr Withdraw Input Section */}
      {showNostrWithdraw && (
        <div className="mb-6 glass rounded-2xl p-6 border border-purple-500/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💜</span>
            <h4 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Instant Nostr Withdraw
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Token will be sent directly to your Nostr wallet via encrypted DM
          </p>
          <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <p className="text-xs text-gray-300">
              <span className="font-bold text-purple-400">⚡ Instant Transfer:</span> Your Cashu token will be encrypted and sent to you via Nostr DM. Check your Nostr client!
            </p>
          </div>
          <input
            type="number"
            value={nostrWithdrawAmount}
            onChange={(e) => setNostrWithdrawAmount(e.target.value)}
            placeholder="Enter amount to withdraw"
            className="w-full p-4 rounded-xl bg-black/20 dark:bg-white/5 border-2 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:outline-none text-lg font-semibold transition-all duration-300"
            disabled={loading}
            min="1"
            max={balance}
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleNostrWithdraw}
              disabled={loading}
              className={`bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
              } flex items-center justify-center gap-2`}
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <span>⚡</span>
                  Send via Nostr
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowNostrWithdraw(false);
                setNostrWithdrawAmount("");
              }}
              disabled={loading}
              className="glass rounded-xl px-6 py-3 font-semibold border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Token Section */}
      {showWithdraw && withdrawToken && (
        <div className="mb-6 glass rounded-2xl p-6 border border-neon-green/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">🎉</span>
            <h4 className="text-xl font-bold bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
              Withdrawal Complete!
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Copy this token and paste it into your Cashu wallet to receive your funds:
          </p>
          <div className="p-4 glass rounded-xl break-all text-sm font-mono border border-neon-green/30 mb-4 max-h-40 overflow-y-auto">
            {withdrawToken}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={copyWithdrawToken}
              className="bg-neon-green text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Token
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowWithdraw(false);
                setWithdrawToken("");
              }}
              className="glass rounded-xl px-6 py-3 font-semibold border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="glass rounded-xl p-4 border border-white/5">
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-500">
          <div className="flex items-start gap-2">
            <span className="text-base">🔐</span>
            <p>Balance stored securely on the server and tied to your account</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">⚡</span>
            <p>Deposit once, play many times - no mint rate limits!</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">🚀</span>
            <p>Withdraw anytime to get your Cashu token back</p>
          </div>
        </div>
      </div>

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
