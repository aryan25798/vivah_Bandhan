"use client";

import { motion } from "framer-motion";
import { Heart, ShieldCheck, Zap, ArrowRight, Star, Sparkles, Shield, User, MessageCircle, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LandingPage() {
  const { user, isOnboarded, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      if (isOnboarded) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }, [user, isOnboarded, loading, router]);

  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-gold/30 selection:text-gold overflow-x-hidden font-sans">
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-gold/5 blur-[200px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[1000px] h-[1000px] bg-rose-gold/5 blur-[200px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Signature Premium Navbar */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-black/40 backdrop-blur-3xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-24 md:h-28 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => router.push("/")}>
            <div className="w-12 h-12 md:w-14 md:h-14 gold-gradient rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform duration-700">
              <Heart className="text-white w-6 h-6 md:w-7 md:h-7 fill-white" />
            </div>
            <span className="text-2xl md:text-3xl font-serif font-bold tracking-tighter text-gold">
              Vivah <span className="text-white">Bandhan</span>
            </span>
          </div>

          <div className="flex items-center gap-6 md:gap-10">
            <button 
              onClick={() => router.push("/admin/login")}
              className="hidden lg:flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-gold transition-all group"
            >
              <Shield className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Authority Access
            </button>
            <button 
              onClick={signInWithGoogle}
              className="px-8 py-3.5 md:px-12 md:py-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gold hover:text-onyx transition-all duration-700 shadow-2xl group relative overflow-hidden"
            >
              <span className="relative z-10">Enter Sanctuary</span>
              <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero: The Sacred Gateway */}
      <main className="relative z-10 pt-40 md:pt-56 pb-24 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Sacred Marker */}
          <div className="flex flex-col items-center mb-8 md:mb-12">
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 80 }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="w-px bg-gradient-to-b from-transparent via-gold to-transparent opacity-40" 
            />
            <div className="px-6 py-2 border border-gold/10 rounded-full text-[9px] md:text-[10px] text-gold/60 font-black uppercase tracking-[0.4em] backdrop-blur-3xl bg-gold/5 mt-4 shadow-[0_0_30px_rgba(197,160,89,0.05)]">
               Vedic Lineage Protocol • Established 2026
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold text-white tracking-tight leading-[1.1] mb-8 max-w-5xl">
            Where <span className="text-gold italic drop-shadow-[0_0_20px_rgba(197,160,89,0.2)]">Destiny</span> <br className="hidden sm:block" /> 
            Meets <span className="relative inline-block">Divine<div className="absolute -bottom-1 left-0 w-full h-1.5 gold-gradient opacity-30 blur-sm" /></span> Tradition
          </h1>
          
          <p className="text-base sm:text-xl md:text-2xl text-white/30 max-w-2xl mx-auto leading-relaxed mb-12 md:mb-20 font-medium italic tracking-wide px-4">
            "An elite sanctuary for sacred unions, curated with AI precision and nurtured by timeless Vedic values."
          </p>

          <div className="flex flex-col items-center gap-10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={signInWithGoogle}
              className="group relative flex items-center gap-4 px-12 py-5 md:px-20 md:py-7 gold-gradient text-onyx rounded-2xl md:rounded-[2.5rem] font-black text-base md:text-xl shadow-[0_30px_60px_rgba(197,160,89,0.3)] overflow-hidden transition-all duration-700"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1s] skew-x-12" />
              <Heart className="w-6 h-6 md:w-8 md:h-8 fill-onyx/10 animate-pulse" />
              <span className="uppercase tracking-[0.2em] relative z-10">Begin Your Onboarding</span>
            </motion.button>
            
            <div className="flex items-center gap-8 opacity-20">
               {['Free Forever', 'Verified Only', 'Encrypted'].map(tag => (
                 <div key={tag} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-gold" />
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{tag}</span>
                 </div>
               ))}
            </div>

            {checking && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-gold/60 font-black animate-pulse text-[10px] md:text-xs tracking-[0.4em] uppercase mt-10 bg-gold/5 px-6 py-2 rounded-full border border-gold/10"
              >
                <Sparkles className="w-4 h-4" /> Validating Royal Lineage...
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Feature Grid: Pillars of Excellence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-48 md:mt-72 text-left">
          {[
            {
              icon: <Zap className="w-8 h-8 text-gold" />,
              title: "AI Divine Matchmaking",
              desc: "Gemini-powered soul mapping that transcends basic filters, understanding the deepest spiritual and lifestyle resonances."
            },
            {
              icon: <ShieldCheck className="w-8 h-8 text-gold" />,
              title: "Imperial Verification",
              desc: "A zero-compromise authentication protocol ensuring every member of the Vivah Bandhan circle is verified and prestigious."
            },
            {
              icon: <Star className="w-8 h-8 text-gold" />,
              title: "Ancestral Depth",
              desc: "Deep-rooted genealogical integration including Gotra, Rashi, and Kundali alignment for truly sacred traditional unions."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: i * 0.2 }}
              className="bg-white/5 backdrop-blur-3xl p-12 md:p-16 rounded-[4rem] md:rounded-[5rem] border border-white/5 group hover:border-gold/30 hover:bg-white/[0.08] transition-all duration-1000 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/5 blur-[50px] rounded-full group-hover:bg-gold/10 transition-all" />
              <div className="w-16 h-16 md:w-20 md:h-20 gold-gradient rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 shadow-2xl">
                <div className="text-onyx">{feature.icon}</div>
              </div>
              <h3 className="text-2xl md:text-4xl font-serif font-bold mb-6 md:mb-8 text-white tracking-tight leading-tight">{feature.title}</h3>
              <p className="text-lg md:text-xl text-white/30 leading-relaxed font-medium italic">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Interactive Experience Teaser */}
      <section className="relative py-48 md:py-72 overflow-hidden">
        <div className="absolute inset-0 bg-gold/5 skew-y-3 transform scale-110" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-20">
           <div className="flex-1 space-y-10 text-center md:text-left">
              <div className="inline-flex items-center gap-3 px-6 py-2 bg-gold/10 rounded-full border border-gold/20">
                 <Sparkles className="w-4 h-4 text-gold" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Modern Interface</span>
              </div>
              <h2 className="text-5xl md:text-8xl font-serif font-bold text-white leading-none tracking-tight">Experience <span className="text-gold">Elegance</span></h2>
              <p className="text-xl md:text-2xl text-white/40 leading-relaxed italic max-w-2xl">
                "Our cinematic dashboard is designed for those who appreciate the finer threads of interaction. High-fidelity glassmorphism meets fluid gesture-ready animations."
              </p>
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                 {[User, MessageCircle, Heart, Zap].map((Icon, idx) => (
                    <div key={idx} className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 text-gold/40 shadow-2xl">
                       <Icon className="w-8 h-8" />
                    </div>
                 ))}
              </div>
           </div>
           <div className="flex-1 relative">
              <div className="absolute -inset-20 bg-gold/10 blur-[100px] rounded-full animate-pulse" />
              <motion.div 
                whileHover={{ rotate: -2, scale: 1.05 }}
                className="relative w-full aspect-square bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[5rem] shadow-[0_60px_120px_rgba(0,0,0,0.8)] p-12 overflow-hidden group"
              >
                 <div className="absolute inset-0 gold-gradient opacity-5" />
                 <div className="h-full w-full border border-white/5 rounded-[4rem] flex flex-col items-center justify-center space-y-8">
                    <div className="w-32 h-32 rounded-full border-4 border-gold/30 p-2">
                       <div className="w-full h-full rounded-full bg-gold/10 flex items-center justify-center">
                          <User className="w-12 h-12 text-gold/20" />
                       </div>
                    </div>
                    <div className="w-3/4 h-4 bg-white/5 rounded-full" />
                    <div className="w-1/2 h-4 bg-white/5 rounded-full opacity-50" />
                    <div className="w-full flex gap-4 pt-10">
                       <div className="flex-1 h-16 bg-white/5 rounded-[2rem]" />
                       <div className="flex-1 h-16 gold-gradient rounded-[2rem] shadow-2xl" />
                    </div>
                 </div>
              </motion.div>
           </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-48 md:py-72 text-center px-6">
         <div className="max-w-5xl mx-auto space-y-16">
            <h2 className="text-6xl md:text-9xl font-serif font-bold text-white tracking-tighter">Your Sacred <span className="text-gold">Chapter</span> Awaits</h2>
            <p className="text-2xl md:text-4xl text-white/30 font-medium italic">"Join the circle of 10,000+ souls seeking their divine resonance."</p>
            <motion.button 
               whileHover={{ scale: 1.1 }}
               onClick={signInWithGoogle}
               className="px-20 py-8 gold-gradient text-onyx rounded-[3rem] font-black text-2xl uppercase tracking-[0.3em] shadow-[0_60px_100px_rgba(197,160,89,0.5)]"
            >
               Claim Your Legacy
            </motion.button>
         </div>
      </section>

      {/* Signature Royal Footer */}
      <footer className="relative z-10 border-t border-white/5 py-32 md:py-56 bg-[#030303]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-24">
          <div className="col-span-1 md:col-span-2 space-y-12">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 gold-gradient rounded-2xl flex items-center justify-center shadow-2xl">
                <Heart className="text-white w-7 h-7 fill-white" />
              </div>
              <span className="font-serif font-bold text-4xl tracking-tighter text-gold">Vivah <span className="text-white">Bandhan</span></span>
            </div>
            <p className="text-xl text-white/20 max-w-md leading-relaxed font-medium italic">
              "The world's most prestigious zero-cost, AI-powered matrimonial sanctuary for the elite community. Built on the timeless pillars of trust, tradition, and cinematic elegance."
            </p>
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-gold transition-colors cursor-pointer"><Shield className="w-5 h-5" /></div>
               <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-gold transition-colors cursor-pointer"><Heart className="w-5 h-5" /></div>
               <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-gold transition-colors cursor-pointer"><Star className="w-5 h-5" /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-16 col-span-1 md:col-span-2">
            <div className="space-y-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-gold/60">Gateway</h4>
              <ul className="space-y-6 text-lg text-white/30 font-medium italic">
                <li><a href="#" className="hover:text-gold transition-colors">Our Ethos</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Imperial Blog</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Royal Lineage</a></li>
              </ul>
            </div>
            <div className="space-y-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-gold/60">Sanctuary</h4>
              <ul className="space-y-6 text-lg text-white/30 font-medium italic">
                <li><button onClick={() => router.push("/admin/login")} className="hover:text-gold transition-colors text-left flex items-center gap-3">
                   Authority Portal
                </button></li>
                <li><a href="#" className="hover:text-gold transition-colors">Data Privacy</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Vedic Verification</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Royal Support</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-48 pt-16 border-t border-white/5 text-center text-[10px] text-white/10 font-black uppercase tracking-[0.6em] px-6">
          © 2026 Vivah Bandhan Matrimonial Corporation. All rights reserved. <span className="text-gold/20 mx-4">|</span> Purveyors of Sacred Unions
        </div>
      </footer>

      <style jsx global>{`
        .gold-gradient { background: linear-gradient(135deg, #c5a059 0%, #e8d5b5 50%, #c5a059 100%); }
        .onyx { color: #060606; }
        .bg-onyx { background-color: #060606; }
      `}</style>
    </div>
  );
}
