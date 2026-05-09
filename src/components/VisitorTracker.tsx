"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function VisitorTracker() {
  const { user } = useAuth();

  useEffect(() => {
    const trackVisitor = async () => {
      try {
        // 0. Check Session Cache
        const cachedGeo = sessionStorage.getItem("vivah_geo");
        let geo = cachedGeo ? JSON.parse(cachedGeo) : null;

        if (!geo) {
          // 1. Call internal API (No CORS issues, silent server-side fetch)
          const res = await fetch("/api/geo");
          if (!res.ok) return;
          const data = await res.json();
          
          if (data.city) {
            geo = data;
            sessionStorage.setItem("vivah_geo", JSON.stringify(geo));
          }
        }

        if (!geo || !db) return;

        // 2. Prepare Session Data
        const randomId = Math.random().toString(36).substr(2, 9);
        const sessionId = user?.uid || `anon_${randomId}`;
        const sessionRef = doc(db, "active_sessions", sessionId);

        await setDoc(sessionRef, {
          uid: user?.uid || null,
          fullName: user?.displayName || "Anonymous Soul",
          photoURL: user?.photoURL || null,
          city: geo.city,
          country: geo.country,
          lat: geo.latitude,
          lng: geo.longitude,
          lastActive: serverTimestamp(),
          userAgent: navigator.userAgent
        }, { merge: true });

        // 3. Update User Profile if Authenticated
        if (user?.uid) {
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, {
            lastLoginLocation: {
              city: geo.city,
              country: geo.country,
              lat: geo.latitude,
              lng: geo.longitude,
              timestamp: serverTimestamp()
            }
          }, { merge: true });
        }

      } catch (error) {
        // Absolute silence
      }
    };

    trackVisitor();
    const interval = setInterval(trackVisitor, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return null;
}
