"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Heart } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isOnboarded, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const publicPaths = ["/", "/admin/login"];
      const isPublicPath = publicPaths.includes(pathname);
      const isOnboardingPath = pathname === "/onboarding";

      // 1. Auth Gate: Redirect to landing if not logged in
      if (!user && !isPublicPath) {
        router.push("/");
        return;
      }

      // 2. Onboarding Gate: Redirect to onboarding if profile incomplete
      // Skip for admins and public paths and onboarding itself
      if (user && !isAdmin && !isOnboarded && !isPublicPath && !isOnboardingPath) {
        router.push("/onboarding");
        return;
      }

      // 3. Prevent Onboarding path if already onboarded
      if (user && isOnboarded && isOnboardingPath) {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, isOnboarded, loading, pathname, router, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        {/* Animated Sacred Geometry or Heart */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-gold/20 rounded-full flex items-center justify-center shadow-2xl">
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-gold fill-gold/20 animate-bounce" />
          </div>
        </div>
        <p className="font-serif text-gold font-bold tracking-[0.4em] text-[10px] md:text-xs uppercase animate-pulse">Securing Royal Session...</p>
        <div className="mt-4 w-48 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
