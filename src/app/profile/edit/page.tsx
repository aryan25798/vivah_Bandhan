"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Save, ArrowLeft, Camera, Sparkles, Shield, User, Zap, Star, Check } from "lucide-react";
import Image from "next/image";
import { optimizeImage } from "@/lib/utils";

export default function EditProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    occupation: "",
    income: "",
    gotra: "",
    rashi: "",
    bio: "",
    photoURL: "",
    phoneNumber: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setFormData(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), formData);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full animate-pulse" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-16 h-16 text-gold" />
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-pearl flex flex-col font-sans selection:bg-gold/30">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-rose-gold/5 blur-[150px] rounded-full" />
      </div>

      <main className="flex-1 p-4 md:p-12 max-w-5xl mx-auto w-full pt-12 md:pt-24 pb-32 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-24">
          <div className="space-y-6">
            <motion.button 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => router.back()}
              className="group flex items-center gap-3 text-gold/60 hover:text-gold transition-colors font-black uppercase tracking-[0.4em] text-[10px]"
            >
              <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-gold/30 transition-all">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </div>
              Return to Sanctuary
            </motion.button>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-8xl font-serif font-bold text-white tracking-tight leading-none">Your Essence</h1>
              <p className="text-white/30 text-lg md:text-2xl font-medium max-w-2xl italic leading-relaxed">
                "Refine the mirror of your soul. Your profile is the sacred threshold through which others perceive your lineage."
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="w-24 h-24 gold-gradient rounded-[2.5rem] flex items-center justify-center text-onyx shadow-2xl rotate-12 group hover:rotate-0 transition-transform duration-700">
               <Shield className="w-10 h-10 fill-onyx/20" />
            </div>
          </div>
        </header>

        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">
          {/* Left Column: Visual Identity */}
          <div className="lg:col-span-4 space-y-12">
            <div className="relative group">
              <div className="absolute -inset-10 bg-gold/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative w-full aspect-square rounded-[4rem] md:rounded-[5rem] overflow-hidden border-2 border-white/5 p-2 bg-white/5 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                <div className="w-full h-full rounded-[3.5rem] md:rounded-[4.5rem] overflow-hidden relative group/inner">
                  {formData.photoURL ? (
                    <Image src={optimizeImage(formData.photoURL, 800)} alt="Profile" fill className="w-full h-full object-cover transition-transform duration-[4s] group-hover/inner:scale-110" sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div className="w-full h-full bg-onyx flex items-center justify-center">
                      <User className="w-20 h-20 text-white/10" />
                    </div>
                  )}
                  
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/inner:opacity-100 transition-all duration-500 flex flex-col items-center justify-center cursor-pointer backdrop-blur-md">
                    <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center text-onyx shadow-2xl mb-4 group-hover/inner:scale-110 transition-transform">
                      <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Ascend New Image</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setSaving(true);
                        const fd = new FormData();
                        fd.append("file", file);
                        fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
                        try {
                          const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.secure_url) setFormData(prev => ({ ...prev, photoURL: data.secure_url }));
                        } catch (err) { console.error(err); } finally { setSaving(false); }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 gold-gradient rounded-3xl flex items-center justify-center shadow-2xl border-8 border-[#060606] rotate-12">
                <Sparkles className="w-8 h-8 text-onyx" />
              </div>
            </div>

            <div className="p-8 md:p-10 bg-white/5 border border-white/10 rounded-[3rem] space-y-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[50px] rounded-full" />
               <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-gold/40" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60">Digital Presence</p>
               </div>
               <p className="text-white/40 text-sm md:text-base leading-relaxed italic">
                 "Your visual aura accounts for 90% of first sacred impressions. Ensure your light shines clearly."
               </p>
            </div>
          </div>

          {/* Right Column: Form Data */}
          <div className="lg:col-span-8 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 ml-2">Appellation</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-serif text-xl"
                  placeholder="Royal Full Name"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 ml-2">Chronological Age</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-serif text-xl"
                  placeholder="Years of Wisdom"
                />
              </div>
              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 ml-2">Sacred Communication (WhatsApp)</label>
                <div className="relative group">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gold/40 font-bold tracking-widest">+91</div>
                  <input 
                    type="tel" 
                    value={formData.phoneNumber || ""}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-20 pr-8 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-serif text-xl tracking-[0.2em]"
                    placeholder="98765 43210"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 ml-2">Professional Vocation</label>
              <input 
                type="text" 
                value={formData.occupation}
                onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-serif text-xl"
                placeholder="Ex: Senior Software Strategist"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 ml-2">Ancestral Gotra</label>
                <input 
                  type="text" 
                  value={formData.gotra}
                  onChange={(e) => setFormData({...formData, gotra: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-serif text-xl"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60 ml-2">Celestial Rashi</label>
                <input 
                  type="text" 
                  value={formData.rashi}
                  onChange={(e) => setFormData({...formData, rashi: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-serif text-xl"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/60">The Soul's Proclamation (Bio)</label>
                <button 
                  type="button"
                  className="px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-[9px] font-black text-gold uppercase tracking-widest flex items-center gap-2 hover:bg-gold/20 transition-all group"
                >
                  <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                  Scribe with AI
                </button>
              </div>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-[3rem] py-8 px-10 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-medium text-lg md:text-xl leading-relaxed italic"
                placeholder="A chronicle of your journey and aspirations..."
              />
            </div>

            <div className="pt-8">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={saving}
                className="w-full py-6 md:py-8 gold-gradient text-onyx rounded-[2.5rem] font-black text-xs md:text-sm uppercase tracking-[0.4em] shadow-[0_40px_80px_rgba(197,160,89,0.3)] flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale transition-all"
              >
                {saving ? (
                  <><Sparkles className="w-6 h-6 animate-spin" /><span>Enshrining Data...</span></>
                ) : (
                  <><Save className="w-6 h-6 fill-onyx/20" /><span>Confirm Sacred Essence</span></>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </main>

      <style jsx global>{`
        .gold-gradient { background: linear-gradient(135deg, #c5a059 0%, #e8d5b5 50%, #c5a059 100%); }
      `}</style>
    </div>
  );
}
