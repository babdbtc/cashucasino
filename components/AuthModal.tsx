"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function AuthModal() {
  const { user, login, loginWithNostr, register, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [showAccountId, setShowAccountId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If user is logged in, don't show anything (logged in section moved to SideNav)
  if (user) {
    return null;
  }

  // Otherwise show login/register modal
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(accountId);

    if (!result.success) {
      setError(result.error || "Login failed");
    }

    setIsLoading(false);
  }

  async function handleRegister() {
    setError("");
    setIsLoading(true);

    const result = await register();

    if (result.success && result.accountId) {
      setNewAccountId(result.accountId);
    } else {
      setError(result.error || "Registration failed");
    }

    setIsLoading(false);
  }

  async function handleNostrLogin() {
    setError("");
    setIsLoading(true);

    const result = await loginWithNostr();

    if (!result.success) {
      setError(result.error || "Nostr login failed");
    }

    setIsLoading(false);
  }

  // Show the new account ID after registration
  if (newAccountId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-green-400">Account Created!</h2>
          <p className="text-gray-300 mb-4">
            Your account ID is:
          </p>
          <div className="bg-gray-900 p-4 rounded-lg mb-4 font-mono text-lg text-center border-2 border-green-500">
            {newAccountId}
          </div>
          <div className="bg-yellow-900 border border-yellow-600 p-4 rounded-lg mb-4">
            <p className="text-yellow-200 text-sm font-bold mb-2">⚠️ IMPORTANT</p>
            <p className="text-yellow-100 text-sm">
              Save this ID somewhere safe! You&apos;ll need it to log in. There is no password recovery.
            </p>
          </div>
          <button
            onClick={() => {
              setAccountId(newAccountId);
              setNewAccountId("");
              login(newAccountId);
            }}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-bold"
          >
            I&apos;ve Saved My ID - Login Now
          </button>
        </div>
      </div>
    );
  }

  // Show login/register form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Login" : "Create Account"}
        </h2>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="mb-4 bg-red-900 border border-red-600 p-3 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold mb-4"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNostrLogin}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold mb-4 flex items-center justify-center gap-2"
            >
              <span>💜</span>
              {isLoading ? "Connecting..." : "Login with Nostr"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className="w-full text-blue-400 hover:text-blue-300 text-sm"
            >
              Don&apos;t have an account? Create one
            </button>
          </form>
        ) : (
          <div>
            <div className="mb-6 bg-gray-900 border border-gray-700 p-4 rounded-lg">
              <p className="text-gray-300 text-sm mb-2">
                You&apos;ll receive a 16-digit account ID that serves as both your username and password.
              </p>
              <p className="text-yellow-200 text-sm">
                ⚠️ No email, no personal info - just save your ID safely!
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-900 border border-red-600 p-3 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold mb-4"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNostrLogin}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold mb-4 flex items-center justify-center gap-2"
            >
              <span>💜</span>
              {isLoading ? "Connecting..." : "Continue with Nostr"}
            </button>

            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="w-full text-blue-400 hover:text-blue-300 text-sm"
            >
              Already have an account? Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
