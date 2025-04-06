// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase"; // Adjust path if needed
import { GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { LogIn } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext"; // Adjust path if needed

interface LoginPageProps {
  currentUser: User | null;
  authLoading: boolean;
}

function LoginPage({ currentUser, authLoading }: LoginPageProps) {
  const { theme } = useTheme();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged in App.tsx handles the redirect indirectly
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(`Sign in failed: ${error.code} - ${error.message}`);
      setIsSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace />; // Redirect to home if already logged in
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 ${
        theme === "dark"
          ? "bg-[#202124] text-gray-200"
          : "bg-gray-100 text-gray-900"
      }`}
    >
      <div
        className={`p-8 rounded-xl shadow-lg ${
          theme === "dark" ? "bg-[#2d2d2d]" : "bg-white"
        }`}
      >
        <div className="text-center mb-6">
          <img
            src="https://cloud.withgoogle.com/next/25/assets/img/lockup-cloud-25.dca34f7.png"
            alt="Secret Agents Game Logo"
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#1a73e8] mb-2">
            Secret Agents
          </h1>
          <p
            className={`text-lg ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Please sign in to continue
          </p>
        </div>

        {error && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm text-center ${
              theme === "dark"
                ? "bg-red-500/10 text-red-200 border-red-500/20"
                : "bg-red-50 text-red-800 border-red-100"
            } border`}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className={`w-full px-6 py-3 rounded-xl font-medium text-base transition-all duration-300 ease-in-out flex items-center justify-center gap-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white transform hover:scale-102 active:scale-98 border border-transparent disabled:opacity-60 disabled:cursor-not-allowed ${
            isSigningIn ? "animate-pulse" : ""
          }`}
        >
          <LogIn className="w-5 h-5" />
          {isSigningIn ? "Signing In..." : "Sign In with Google"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
