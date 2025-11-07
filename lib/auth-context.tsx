"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type WalletMode = "demo" | "real";

interface User {
  id: number;
  accountId: string;
  nostrPubkey: string | null;
  balance: number;
  walletMode: WalletMode;
  createdAt: number;
  lastLogin: number | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  loginWithNostr: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: () => Promise<{ success: boolean; accountId?: string; error?: string }>;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  switchWalletMode: (mode: WalletMode) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cross-tab communication channel for balance updates
  const [balanceChannel] = useState<BroadcastChannel | null>(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel('casino-balance-sync');
    }
    return null;
  });

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for balance updates and wallet mode changes from other tabs
  useEffect(() => {
    if (!balanceChannel) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'balance-update' && user) {
        // Only update if the message is for the current user
        if (event.data.userId === user.id) {
          setUser(prev => prev ? { ...prev, balance: event.data.balance } : null);
        }
      } else if (event.data.type === 'wallet-mode-change' && user) {
        // Update wallet mode and balance when changed in another tab
        if (event.data.userId === user.id) {
          setUser(prev => prev ? {
            ...prev,
            walletMode: event.data.walletMode,
            balance: event.data.balance
          } : null);
        }
      } else if (event.data.type === 'logout') {
        // If user logged out in another tab, log out here too
        setUser(null);
      } else if (event.data.type === 'login' && !user) {
        // If user logged in from another tab, refresh auth
        checkAuth();
      }
    };

    balanceChannel.addEventListener('message', handleMessage);

    return () => {
      balanceChannel.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceChannel, user]);

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      balanceChannel?.close();
    };
  }, [balanceChannel]);

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (response.ok) {
        await checkAuth(); // Refresh user data

        // Notify other tabs that user logged in
        balanceChannel?.postMessage({ type: 'login' });

        return { success: true };
      } else {
        return { success: false, error: data.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
    }
  }

  async function loginWithNostr(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if window.nostr is available (NIP-07)
      if (typeof window === 'undefined' || !window.nostr) {
        return {
          success: false,
          error: "No Nostr extension found. Please install Alby, nos2x, or another NIP-07 compatible extension."
        };
      }

      // Get user's public key from extension
      const pubkey = await window.nostr.getPublicKey();

      // Get challenge from server
      const challengeResponse = await fetch("/api/auth/nostr-login");
      const { challenge } = await challengeResponse.json();

      // Create auth event
      const authEvent = {
        kind: 27235, // NIP-98 HTTP Auth
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["challenge", challenge],
          ["method", "POST"],
          ["u", window.location.origin + "/api/auth/nostr-login"],
        ],
        content: "",
      };

      // Sign event with extension
      const signedEvent = await window.nostr.signEvent(authEvent);

      // Send to server
      const response = await fetch("/api/auth/nostr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: signedEvent, pubkey }),
      });

      const data = await response.json();

      if (response.ok) {
        await checkAuth(); // Refresh user data

        // Notify other tabs that user logged in
        balanceChannel?.postMessage({ type: 'login' });

        return { success: true };
      } else {
        return { success: false, error: data.error || "Nostr login failed" };
      }
    } catch (error) {
      console.error("Nostr login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to login with Nostr"
      };
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);

      // Notify other tabs that user logged out
      balanceChannel?.postMessage({ type: 'logout' });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async function register(): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, accountId: data.accountId };
      } else {
        return { success: false, error: data.error || "Registration failed" };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "Network error" };
    }
  }

  async function refreshUser() {
    await checkAuth();
  }

  function updateBalance(newBalance: number) {
    if (user) {
      setUser({ ...user, balance: newBalance });

      // Broadcast balance update to all other tabs
      balanceChannel?.postMessage({
        type: 'balance-update',
        userId: user.id,
        balance: newBalance
      });
    }
  }

  async function switchWalletMode(mode: WalletMode): Promise<{ success: boolean; error?: string }> {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await fetch("/api/wallet/switch-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state with new mode and balance
        setUser(prev => prev ? {
          ...prev,
          walletMode: data.user.wallet_mode,
          balance: data.user.balance
        } : null);

        // Broadcast wallet mode change to all other tabs
        balanceChannel?.postMessage({
          type: 'wallet-mode-change',
          userId: user.id,
          walletMode: data.user.wallet_mode,
          balance: data.user.balance
        });

        return { success: true };
      } else {
        return { success: false, error: data.error || "Failed to switch wallet mode" };
      }
    } catch (error) {
      console.error("Switch wallet mode error:", error);
      return { success: false, error: "Network error" };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithNostr,
        logout,
        register,
        refreshUser,
        updateBalance,
        switchWalletMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
