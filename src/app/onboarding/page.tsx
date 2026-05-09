"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, User, Briefcase, Stars, CheckCircle, ArrowRight, Camera, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

const steps = [
  { id: "personal", title: "Personal Details", icon: <User className="w-5 h-5" /> },
  { id: "professional", title: "Professional", icon: <Briefcase className="w-5 h-5" /> },
  { id: "astrology", title: "Astrology", icon: <Stars className="w-5 h-5" /> },
  { id: "photo", title: "Profile Photo", icon: <Heart className="w-5 h-5" /> },
  { id: "bio", title: "Your Bio", icon: <Sparkles className="w-5 h-5" /> },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    religion: "Hindu",
    occupation: "",
    income: "",
    gotra: "",
    rashi: "",
    bio: "",
    photoURL: "",
    phoneNumber: "",
  });
  const { user, loading } = useAuth();
  const router = useRouter();

  // Strict Protection: Redirect if not logged in OR if already onboarded
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      if (!loading) {
        if (!user) {
          router.push("/");
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (!isMounted) return;

          if (userDoc.exists() && userDoc.data().onboarded) {
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Status check error:", error);
        }
      }
    };

    checkStatus();
    return () => { isMounted = false; };
  }, [user, loading, router]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
      window.scrollTo(0, 0);
    } else {
      router.push("/");
    }
  };

  const generateAIBio = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      if (!user) throw new Error("Unauthorized");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ai/generate-bio", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          age: formData.age,
          occupation: formData.occupation,
          religion: formData.religion,
          hobbies: "loves family values, traditional culture, and career growth"
        }),
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error("Our royal AI scribe encountered a technical barrier. Please try again later.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to generate bio");
      
      setFormData({ ...formData, bio: data.bio });
    } catch (err: any) {
      console.error("Bio Gen Error:", err);
      setError(err.message || "Failed to connect to AI Scribe.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    try {
      await updateProfile(user, {
        displayName: formData.fullName,
        photoURL: formData.photoURL
      });

      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        uid: user.uid,
        email: user.email,
        onboarded: true,
        createdAt: new Date().toISOString(),
      });

      // Trigger Welcome Email (Await to prevent cancellation on navigation)
      if (user.email) {
        try {
          const idToken = await user.getIdToken();
          await fetch("/api/email/send", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({
              to: user.email,
              templateType: "welcome",
              templateData: { name: formData.fullName }
            })
          });
          console.log("Welcome email request dispatched.");
        } catch (e) {
          console.error("Welcome email failed:", e);
        }
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile. Please check your connection.");
    }
  };

  if (loading || !user) return null; // Let AuthGuard handle the loading UI

  return (
    <div className="min-h-screen text-white flex flex-col selection:bg-gold/30">
      {/* Cinematic Progress Header */}
      <header className="bg-[#0a0a0a]/60 backdrop-blur-2xl border-b border-gold/10 px-6 py-6 md:py-10 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-gold/20 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="text-gold w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-xl md:text-2xl font-serif font-bold text-white tracking-tighter">
                Royal <span className="text-gold">Circle</span>
              </span>
            </div>
            <div className="text-[10px] md:text-xs font-bold text-gold uppercase tracking-[0.4em]">
              Divine Milestone {currentStep + 1} / {steps.length}
            </div>
          </div>
          
          <div className="flex justify-between relative px-2">
            <div className="absolute top-1/2 left-0 w-full h-px bg-gold/10 -translate-y-1/2 z-0" />
            <motion.div 
              className="absolute top-1/2 left-0 h-px bg-gold -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(197,160,89,0.5)]"
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((step, i) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: i === currentStep ? 1.2 : 1,
                    backgroundColor: i <= currentStep ? "#c5a059" : "rgba(255,255,255,0.05)",
                    borderColor: i <= currentStep ? "#c5a059" : "rgba(197,160,89,0.2)"
                  }}
                  className={`w-10 h-10 md:w-14 md:h-14 rounded-full border flex items-center justify-center transition-all duration-700 shadow-2xl`}
                >
                  {i < currentStep ? <CheckCircle className="w-5 h-5 md:w-7 md:h-7 text-black" /> : 
                   <div className={i <= currentStep ? "text-black" : "text-gold/40"}>{step.icon}</div>}
                </motion.div>
                <span className={`hidden md:block absolute -bottom-10 text-[9px] font-bold uppercase tracking-[0.2em] transition-colors whitespace-nowrap ${
                  i <= currentStep ? "text-gold" : "text-white/20"
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-2xl bg-white/5 backdrop-blur-3xl p-8 md:p-16 rounded-[3.5rem] border border-white/10 shadow-2xl relative"
          >
            <div className="mb-10 md:mb-14 text-center md:text-left">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 md:mb-6 leading-tight">{steps[currentStep].title}</h2>
              <p className="text-sm md:text-xl text-white/40 leading-relaxed font-light tracking-wide">
                {currentStep === 0 && "Begin your divine identity. How shall Vivah Bandhan know you?"}
                {currentStep === 1 && "Your professional journey is a testament to your prestige and character."}
                {currentStep === 2 && "The stars hold the blueprint of your destiny and sacred alignment."}
                {currentStep === 3 && "A picture is worth a thousand prayers. Share your royal presence."}
                {currentStep === 4 && "Words that resonate from the soul. Scribe your unique story."}
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-center gap-4 text-sm"
              >
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-8">
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Aditi Sharma"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Age</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 24"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Phone Number (WhatsApp Preferred)</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all font-mono tracking-wider"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Occupation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Software Architect"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all"
                      value={formData.occupation}
                      onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Annual Income</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 25 LPA"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all"
                      value={formData.income}
                      onChange={(e) => setFormData({...formData, income: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Gotra</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Vatsa"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all"
                      value={formData.gotra}
                      onChange={(e) => setFormData({...formData, gotra: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] ml-1">Rashi</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mesha"
                      className="w-full px-8 py-5 rounded-2xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 transition-all"
                      value={formData.rashi}
                      onChange={(e) => setFormData({...formData, rashi: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col items-center gap-8">
                   <div className="w-40 h-40 md:w-56 md:h-56 rounded-full border-2 border-gold/20 p-2 relative group shadow-2xl">
                      <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-gold/10">
                        {formData.photoURL ? (
                          <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover scale-110" />
                        ) : (
                          <Camera className="w-12 h-12 md:w-20 md:h-20 text-gold/20" />
                        )}
                      </div>
                      <label className="absolute inset-0 bg-gold/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer backdrop-blur-sm">
                        <Sparkles className="text-black w-8 h-8 md:w-12 md:h-12" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setIsGenerating(true); 

                            try {
                              // Client-side compression
                              const imageCompression = (await import("browser-image-compression")).default;
                              const options = {
                                maxSizeMB: 0.5,
                                maxWidthOrHeight: 1200,
                                useWebWorker: true,
                              };
                              const compressedFile = await imageCompression(file, options);

                              const idToken = await user.getIdToken();
                              
                              // 1. Get signature from our API
                              const signRes = await fetch("/api/cloudinary/sign", {
                                method: "POST",
                                headers: { 
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${idToken}`
                                }
                              });
                              
                              const signData = await signRes.json();
                              if (!signRes.ok) throw new Error(signData.error);

                              // 2. Upload to Cloudinary with signature
                              const formDataUpload = new FormData();
                              formDataUpload.append("file", compressedFile);
                              formDataUpload.append("api_key", signData.api_key);
                              formDataUpload.append("timestamp", signData.timestamp);
                              formDataUpload.append("signature", signData.signature);
                              formDataUpload.append("folder", "user_profiles");

                              const res = await fetch(
                                `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`,
                                { method: "POST", body: formDataUpload }
                              );
                              
                              const data = await res.json();
                              if (data.secure_url) {
                                setFormData({ ...formData, photoURL: data.secure_url });
                              }
                            } catch (err) {
                              console.error("Upload error:", err);
                              setError("Failed to upload your royal portrait. Please try again.");
                            } finally {
                              setIsGenerating(false);
                            }
                          }}
                        />
                      </label>
                   </div>
                   <p className="text-[10px] font-bold text-gold uppercase tracking-[0.4em] text-center">Click to unveil your royal presence</p>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-[0.3em]">Your Royal Scribe</label>
                    <button 
                      onClick={generateAIBio}
                      disabled={isGenerating}
                      className="text-[10px] font-bold text-gold flex items-center gap-2 hover:bg-gold/10 px-4 py-2 rounded-full transition-all disabled:opacity-50 border border-gold/20"
                    >
                      {isGenerating ? <div className="animate-spin h-3 w-3 border-b-2 border-gold rounded-full" /> : <Sparkles className="w-3 h-3" />}
                      {isGenerating ? "Scribing..." : "AI Auto-Scribe"}
                    </button>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="Tell us about your deep cultural values, modern aspirations, and what you seek in a soulmate..."
                    className="w-full px-8 py-6 rounded-3xl border border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white/5 text-white placeholder:text-white/10 text-sm md:text-lg font-light leading-relaxed transition-all resize-none"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-12 md:mt-16">
              <button 
                onClick={handleBack}
                className="px-8 md:px-12 py-5 md:py-6 bg-white/5 border border-white/10 text-white/60 rounded-2xl md:rounded-[2rem] font-bold text-sm md:text-lg hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
              >
                {currentStep === 0 ? "Gateway" : "Back"}
              </button>
              <button 
                onClick={handleNext}
                className="flex-1 py-5 md:py-6 gold-gradient text-white rounded-2xl md:rounded-[2rem] font-bold text-sm md:text-xl shadow-[0_20px_50px_rgba(197,160,89,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.1em]"
              >
                <span>{currentStep === steps.length - 1 ? "Complete Divine Union" : "Next Milestone"}</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
