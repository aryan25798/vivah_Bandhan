"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, ArrowRight, Heart } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Sanctuary Error: Firebase configuration is missing. Check Vercel environment variables.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Force refresh the token to pick up new custom claims immediately
      await userCredential.user.getIdToken(true);
      router.push("/admin");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid administrative credentials. Access Denied.");
      } else {
        setError("Divine Connection Error: " + (err.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[400px] bg-white/[0.02] backdrop-blur-3xl p-8 md:p-10 rounded-[2rem] border border-white/5 relative z-10 shadow-[0_40px_80px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-gold/10">
            <ShieldCheck className="text-onyx w-6 h-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-white mb-2 tracking-tight">Administrative Portal</h1>
          <p className="text-white/20 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black">Secure Authority Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Email ID</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-gold/30 transition-all"
                placeholder="admin@system.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Secret Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-gold/30 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400/80 text-[10px] font-bold text-center bg-red-400/5 py-3 rounded-lg border border-red-400/10 tracking-wider"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 gold-gradient text-onyx rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Verifying..." : "Establish Link"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <button 
            onClick={() => router.push("/")}
            className="text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-gold transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <Heart className="w-3 h-3" />
            Back to Public Site
          </button>
        </div>
      </motion.div>

      <style jsx global>{`
        .gold-gradient { background: linear-gradient(135deg, #c5a059 0%, #e8d5b5 50%, #c5a059 100%); }
        .onyx { color: #060606; }
      `}</style>
    </div>
  );
}
