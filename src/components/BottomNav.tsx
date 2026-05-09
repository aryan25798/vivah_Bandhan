"use client";

import { User, Search, Zap, Heart, MessageCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: User, path: "/dashboard", label: "Profile" },
    { icon: Search, path: "/search", label: "Discover" },
    { icon: Zap, path: "/dashboard", label: "Divine", primary: true }, // Zap usually returns to main deck
    { icon: Heart, path: "/matches", label: "Matches", badge: true },
    { icon: MessageCircle, path: "/messages", label: "Dialogue" }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-[100] px-6 py-3 pb-6 flex items-center justify-between bg-black/60 backdrop-blur-3xl border-t border-white/5 rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
      {navItems.map((item, idx) => {
        const isActive = pathname === item.path;
        
        if (item.primary) {
          return (
            <button 
              key={idx}
              onClick={() => router.push(item.path)}
              className="relative -mt-10 group"
            >
              <div className="w-14 h-14 gold-gradient rounded-2xl flex items-center justify-center text-onyx shadow-[0_15px_30px_rgba(197,160,89,0.4)] group-hover:scale-110 active:scale-95 transition-all duration-500 border border-gold/30">
                <item.icon className={`w-7 h-7 ${isActive ? 'fill-onyx' : 'fill-onyx/20'}`} />
              </div>
              <div className="absolute -inset-2 bg-gold/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        }

        return (
          <button 
            key={idx}
            onClick={() => router.push(item.path)}
            className="p-3 relative group"
          >
            <item.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-gold scale-110' : 'text-white/30 group-hover:text-gold/60'}`} />
            {item.badge && !isActive && (
              <div className="absolute top-3 right-3 w-2 h-2 bg-gold rounded-full shadow-[0_0_8px_#c5a059]" />
            )}
            {isActive && (
              <motion.div 
                layoutId="bottom-nav-active"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full shadow-[0_0_5px_#c5a059]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
