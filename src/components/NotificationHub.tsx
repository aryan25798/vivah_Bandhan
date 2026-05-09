"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Heart, Check, X, User, MessageCircle, Star, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { acceptRequest, declineRequest, ConnectionRequest } from "@/lib/connections";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

export default function NotificationHub() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ConnectionRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming connection requests
    const q = query(
      collection(db, "requests"),
      where("toId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConnectionRequest[];
      
      const filtered = newNotifications.filter(n => n.fromId !== user.uid);
      
      // Enrich with photos if missing
      const enriched = await Promise.all(filtered.map(async (notif: any) => {
        if (!notif.fromPhoto) {
          const { doc, getDoc } = await import("firebase/firestore");
          const userDoc = await getDoc(doc(db, "users", notif.fromId));
          if (userDoc.exists()) {
            return { ...notif, fromPhoto: userDoc.data().photoURL };
          }
        }
        return notif;
      }));
      
      setNotifications(enriched);
      setUnreadCount(enriched.filter(n => n.status === "pending").length);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async (id: string, fromId: string) => {
    if (!user) return;
    await acceptRequest(id, fromId, user.uid);
  };

  const handleDecline = async (id: string) => {
    await declineRequest(id);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all group ${
          isOpen ? 'bg-gold text-onyx shadow-[0_0_20px_rgba(197,160,89,0.4)]' : 'bg-white/5 border border-white/10 text-gold hover:bg-gold/10'
        }`}
      >
        <Bell className={`w-6 h-6 ${isOpen ? 'fill-onyx/20' : 'group-hover:animate-swing'}`} />
        {unreadCount > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-onyx text-[10px] font-black rounded-full flex items-center justify-center shadow-2xl border-4 border-[#060606]"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed md:absolute right-4 md:right-0 inset-x-4 md:inset-x-auto top-24 md:top-auto md:mt-6 w-auto md:w-[400px] bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] z-[110] overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div>
                  <h3 className="text-xl font-serif font-bold text-white">Sacred Alerts</h3>
                  <p className="text-[9px] font-black text-gold/60 uppercase tracking-[0.3em] mt-1">Celestial Updates</p>
                </div>
                <div className="px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full">
                  <span className="text-[10px] font-black text-gold uppercase tracking-widest">{unreadCount} Pending</span>
                </div>
              </div>

              <div className="max-h-[60vh] md:max-h-[32rem] overflow-y-auto custom-scrollbar p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center space-y-6">
                    <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto border border-white/5">
                      <Sparkles className="w-8 h-8 text-gold/10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/60 font-serif font-bold text-lg">Pure Stillness</p>
                      <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest italic">No divine updates yet.</p>
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <motion.div 
                      layout
                      key={notif.id}
                      className={`p-5 rounded-[2rem] border transition-all ${
                        notif.status === "pending" ? "bg-white/5 border-white/10 hover:border-gold/30" : "bg-transparent border-transparent opacity-40"
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-full border-2 border-white/5 p-1">
                            <div className="w-full h-full rounded-full overflow-hidden bg-onyx">
                              {notif.fromPhoto ? (
                                <img src={notif.fromPhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                  <User className="text-white/20 w-6 h-6" />
                                </div>
                              )}
                            </div>
                          </div>
                          {notif.status === "pending" && <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gold rounded-full flex items-center justify-center text-onyx shadow-xl border-2 border-[#0a0a0a]"><Heart className="w-3 h-3 fill-current" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <button 
                            onClick={() => {
                              setIsOpen(false);
                              router.push(`/dashboard?profile=${notif.fromId}`);
                            }}
                            className="text-base font-serif font-bold text-white hover:text-gold transition-colors text-left truncate w-full block"
                          >
                            {notif.fromName}
                          </button>
                          <p className="text-[10px] text-white/30 font-medium tracking-wide mt-0.5">
                            {notif.status === "pending" ? "requests a sacred connection" : `Status: ${notif.status}`}
                          </p>
                          {notif.createdAt && (
                            <p className="text-[8px] text-gold/40 mt-1.5 uppercase font-black tracking-widest">
                              {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>

                      {notif.status === "pending" && (
                        <div className="flex gap-3 mt-5">
                          <button 
                            onClick={() => handleAccept(notif.id, notif.fromId)}
                            className="flex-1 py-3 gold-gradient text-onyx rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button 
                            onClick={() => handleDecline(notif.id)}
                            className="px-6 py-3 bg-white/5 border border-white/10 text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center"
                            title="Decline"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      {notif.status === "accepted" && (
                        <div className="mt-5 flex items-center gap-3 text-gold px-2">
                           <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center">
                              <MessageCircle className="w-4 h-4 fill-gold/20" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Destiny Aligned! Begin Dialogue</span>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/2 text-center">
                <button className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-gold transition-colors group">
                  Enshrine All Alerts <ArrowRight className="w-3 h-3 inline ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(197,160,89,0.3); }
        .gold-gradient { background: linear-gradient(135deg, #c5a059 0%, #e8d5b5 50%, #c5a059 100%); }
      `}</style>
    </div>
  );
}

// Add ArrowRight for the footer button
import { ArrowRight } from "lucide-react";
