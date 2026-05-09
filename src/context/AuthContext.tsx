"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isOnboarded: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isOnboarded: false,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Synchronize with server-side session cookie
        const idToken = await user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });

        // 1. Check Admin Status from Claims
        const token = await user.getIdTokenResult();
        const adminStatus = !!token.claims.admin;
        setIsAdmin(adminStatus);
        
        // ... rest of the logic ...
        if (!adminStatus) {
          try {
            const { db } = await import("@/lib/firebase");
            const { doc, getDoc } = await import("firebase/firestore");
            const userDoc = await getDoc(doc(db, "users", user.uid));
            setIsOnboarded(userDoc.exists() && !!userDoc.data().onboarded);
          } catch (err) {
            console.error("Onboarding check failed:", err);
            setIsOnboarded(false);
          }
        } else {
          setIsOnboarded(true);
        }
      } else {
        // Clear session cookie
        await fetch("/api/auth/session", { method: "DELETE" });
        setIsAdmin(false);
        setIsOnboarded(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      alert("Firebase configuration is missing. Please check your .env.local file.");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isOnboarded, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
