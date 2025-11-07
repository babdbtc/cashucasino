"use client";

import { useState } from "react";
import { useAuth, type WalletMode } from "@/lib/auth-context";

export default function WalletPanel() {
  const { user, updateBalance, refreshUser, switchWalletMode } = useAuth();
  const balance = user?.balance || 0;
  const walletMode = user?.walletMode || "demo";

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

  // Nostr-specific state
  const [showNostrWithdraw, setShowNostrWithdraw] = useState(false);
  const [nostrWithdrawAmount, setNostrWithdrawAmount] = useState("");
  const hasNostrAccount = user?.nostrPubkey !== null;

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
        setMessage(`✅ Deposited ${data.amount} sats!`);
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
      setMessage(`❌ Insufficient balance. You have ${balance} sats`);
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
        setMessage(`✅ Withdrew ${amount} sats`);

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
    setMessage(`Switching to ${newMode} mode...`);

    const result = await switchWalletMode(newMode);

    if (result.success) {
      setMessage(`✅ Switched to ${newMode} mode!`);
      setTimeout(() => setMessage(""), 3000);
    } else {
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
      setMessage(`❌ Insufficient balance. You have ${balance} sats`);
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
          setMessage(`✅ ${data.message || `Sent ${amount} sats to your Nostr wallet!`}`);
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
        setMessage(`✅ ${data.message || `Sent ${balance} sats via nutzap!`}`);
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
    <div className="relative max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent">
          Wallet
        </h2>
      </div>

      {/* Wallet Mode Toggle */}
      <div className="mb-6 glass rounded-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-1">Wallet Mode</p>
            <p className="text-xs text-gray-600 dark:text-gray-500">
              {walletMode === "demo" ? "Test tokens only" : "Real Bitcoin"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSwitchMode("demo")}
              disabled={switchingMode}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                walletMode === "demo"
                  ? "bg-neon-blue text-white border-2 border-neon-blue"
                  : "glass border border-white/10 hover:border-neon-blue/50"
              } ${switchingMode ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Demo
            </button>
            <button
              onClick={() => handleSwitchMode("real")}
              disabled={switchingMode}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                walletMode === "real"
                  ? "bg-gradient-to-r from-neon-green to-casino-gold text-white border-2 border-casino-gold"
                  : "glass border border-white/10 hover:border-casino-gold/50"
              } ${switchingMode ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Real
            </button>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-casino-gold via-neon-yellow to-casino-gold rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500 animate-gradient bg-[length:200%_auto]" />
        <div className="relative glass rounded-2xl p-6 border border-casino-gold/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
              Balance {walletMode === "demo" && <span className="text-neon-blue ml-1">(Demo)</span>}
            </span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-5xl font-black bg-gradient-to-r from-casino-gold to-neon-yellow bg-clip-text text-transparent mb-1">
            {balance.toLocaleString()}
          </div>
          <div className="text-lg text-gray-500 dark:text-gray-500">sats</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setShowDeposit(!showDeposit)}
          className="bg-neon-blue/20 border-2 border-neon-blue hover:border-neon-purple text-white px-6 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Deposit
        </button>

        <button
          onClick={handleWithdrawAll}
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

      {/* Nostr Quick Actions - Show only if user has Nostr account */}
      {hasNostrAccount && (
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
          <h4 className="text-xl font-bold mb-2 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            Deposit Cashu Token
          </h4>
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
              <span className="text-xl">{walletMode === "demo" ? "⚠️" : "💰"}</span>
              <div>
                <p className="text-xs text-gray-300">
                  {walletMode === "demo" ? (
                    <>
                      <span className="font-bold text-neon-yellow">Demo Mode - Test tokens only:</span> Tokens must be from <code className="text-neon-blue">{mintUrl}</code> mint.
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-neon-green">Real Mode - Bitcoin tokens:</span> Tokens must be from <code className="text-neon-blue">{mintUrl}</code> mint.
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
        </div>
      )}

      {/* Withdraw Input Section */}
      {showWithdrawInput && (
        <div className="mb-6 glass rounded-2xl p-6 border border-neon-purple/30 animate-fade-in">
          <h4 className="text-xl font-bold mb-2 bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
            Withdraw Amount
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Available balance: <span className="font-bold text-casino-gold">{balance} sats</span>
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
              className="bg-gradient-to-r from-neon-green to-neon-blue text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
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
    </div>
  );
}
