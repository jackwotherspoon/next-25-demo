// src/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth } from "./firebase"; // Adjust path if needed
import { onAuthStateChanged, User } from "firebase/auth";

import LoginPage from "./pages/LoginPage"; // Adjust path if needed
import HomePage from "./pages/HomePage"; // Adjust path if needed
import ProtectedRoute from "./components/ProtectedRoute"; // Adjust path if needed
import { ThemeProvider, useTheme } from "./contexts/ThemeContext"; // Adjust path if needed

// A small component to apply theme background to the whole router context if needed
function ThemedApp() {
  const { theme } = useTheme(); // Access theme within the provider context

  // This outer div might not be strictly necessary if your pages handle their own backgrounds,
  // but can be useful for global background consistency.
  return (
    <div
      className={`app-container ${
        theme === "dark" ? "dark-theme-background" : "light-theme-background"
      }`}
    >
      {/* Define specific background classes in App.css or index.css if needed */}
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          // Pass state needed by LoginPage
          element={
            <LoginPage
              currentUser={auth.currentUser}
              authLoading={false /* Auth state known by now */}
            />
          }
        />

        {/* Protected Home Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              currentUser={auth.currentUser}
              authLoading={false /* Auth state known by now */}
            >
              {/* Pass user down - ProtectedRoute ensures user is non-null */}
              <HomePage currentUser={auth.currentUser!} />
            </ProtectedRoute>
          }
        />

        {/* Add other routes here */}
      </Routes>
    </div>
  );
}

function App() {
  // Top-level state for auth status
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Start loading

  useEffect(() => {
    // Central listener for auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false); // Update loading state once check is complete
      console.log(
        "App Level Auth State Updated:",
        currentUser ? currentUser.uid : "No user"
      );
    });
    return () => unsubscribe(); // Cleanup
  }, []);

  // Pass the loading state and user down to the router setup
  // The ProtectedRoute component will handle logic based on these props.
  return (
    <ThemeProvider>
      <Router>
        {/* Pass loading and user state to children that need it */}
        {/* We use ProtectedRoute to handle rendering based on auth state */}
        <Routes>
          <Route
            path="/login"
            element={<LoginPage currentUser={user} authLoading={authLoading} />}
          />
          <Route
            path="/*" // Match home and any potential future nested routes
            element={
              <ProtectedRoute currentUser={user} authLoading={authLoading}>
                {/* HomePage now receives user directly */}
                <HomePage currentUser={user!} />
                {/* If you had more nested routes under '/', define them here or inside HomePage */}
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
