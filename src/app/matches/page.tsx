"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from "firebase/firestore";
import { Heart, User, Check, X, MessageCircle, ArrowLeft, Stars, Search, Zap, Send, Sparkles, Shield, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptRequest, declineRequest, unfriend } from "@/lib/connections";
import NotificationHub from "@/components/NotificationHub";
import { optimizeImage } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

export default function MatchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'matches' | 'declined'>(
    (searchParams.get('tab') as any) || 'incoming'
  );
  
  // Sync tab with URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.pushState(null, '', `?${params.toString()}`);
  };

  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [declined, setDeclined] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleUnfriend = async (partnerId: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to remove this connection? Your private chat will be locked.")) {
      await unfriend(user.uid, partnerId);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Listen for Incoming Requests
    const qIncoming = query(
      collection(db, "requests"),
      where("toId", "==", user.uid),
      where("status", "==", "pending"),
      limit(50)
    );
    const unsubIncoming = onSnapshot(qIncoming, async (snap) => {
      const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((r: any) => r.fromId !== user.uid);
      
      const fromIds = Array.from(new Set(requests.map((r: any) => r.fromId)));
      const profileMap: Record<string, any> = {};
      
      if (fromIds.length > 0) {
        // Batch fetch profiles in chunks of 30 (Firestore limit)
        for (let i = 0; i < fromIds.length; i += 30) {
          const chunk = fromIds.slice(i, i + 30);
          const q = query(collection(db, "users"), where("uid", "in", chunk));
          const pSnap = await getDocs(q);
          pSnap.forEach(d => profileMap[d.id] = d.data());
        }
      }

      const enriched = requests.map((req: any) => ({
        ...req,
        fromPhoto: req.fromPhoto || profileMap[req.fromId]?.photoURL
      }));

      setIncoming(enriched);
    });

    // Listen for Outgoing Requests
    const qOutgoing = query(
      collection(db, "requests"),
      where("fromId", "==", user.uid),
      where("status", "==", "pending"),
      limit(50)
    );
    const unsubOutgoing = onSnapshot(qOutgoing, (snap) => {
      setOutgoing(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((r: any) => r.toId !== user.uid));
    });

    // Listen for Matches
    const qMatches = query(
      collection(db, "matches"),
      where("users", "array-contains", user.uid),
      limit(50)
    );
    const unsubMatches = onSnapshot(qMatches, async (snap) => {
      const matchDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const partnerIds = Array.from(new Set(matchDocs.map((m: any) => m.users.find((id: string) => id !== user.uid))));
      
      const profileMap: Record<string, any> = {};
      if (partnerIds.length > 0) {
        for (let i = 0; i < partnerIds.length; i += 30) {
          const chunk = partnerIds.slice(i, i + 30);
          const q = query(collection(db, "users"), where("uid", "in", chunk));
          const pSnap = await getDocs(q);
          pSnap.forEach(d => profileMap[d.id] = d.data());
        }
      }

      const enriched = matchDocs.map((m: any) => {
        const otherId = m.users.find((id: string) => id !== user.uid);
        return { 
          ...m, 
          partner: profileMap[otherId] ? { uid: otherId, ...profileMap[otherId] } : null 
        };
      });
      setMatches(enriched);
    });

    // Listen for Declined Requests
    const qDeclined = query(
      collection(db, "requests"),
      where("toId", "==", user.uid),
      where("status", "==", "declined")
    );
    const unsubDeclined = onSnapshot(qDeclined, async (snap) => {
      const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((r: any) => r.fromId !== user.uid);
      
      const fromIds = Array.from(new Set(requests.map((r: any) => r.fromId)));
      const profileMap: Record<string, any> = {};
      
      if (fromIds.length > 0) {
        for (let i = 0; i < fromIds.length; i += 30) {
          const chunk = fromIds.slice(i, i + 30);
          const q = query(collection(db, "users"), where("uid", "in", chunk));
          const pSnap = await getDocs(q);
          pSnap.forEach(d => profileMap[d.id] = d.data());
        }
      }

      const enriched = requests.map((req: any) => ({
        ...req,
        fromPhoto: req.fromPhoto || profileMap[req.fromId]?.photoURL
      }));
      
      setDeclined(enriched);
    });

    setLoading(false);
    return () => {
      unsubIncoming();
      unsubOutgoing();
      unsubMatches();
      unsubDeclined();
    };
  }, [user]);

  const handleAccept = async (req: any) => {
    await acceptRequest(req.id, req.fromId, req.toId);
  };

  const handleDecline = async (reqId: string) => {
    await declineRequest(reqId);
  };

  return (
    <div className="min-h-screen bg-transparent text-pearl flex flex-col font-sans selection:bg-gold/30">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-rose-gold/5 blur-[150px] rounded-full" />
      </div>

      {/* Unified Premium Header */}
      <nav className="fixed top-0 left-0 w-full z-[60] bg-black/40 backdrop-blur-3xl border-b border-white/5 px-6 md:px-12 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/dashboard")}>
          <div className="w-10 h-10 gold-gradient rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
            <Heart className="text-white w-5 h-5 fill-white" />
          </div>
          <span className="font-serif font-bold text-xl md:text-2xl text-gold tracking-tight">Vivah Bandhan</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-10">
           {['Dashboard', 'Discover', 'Matches', 'Messages'].map((tab) => (
             <button 
              key={tab}
              onClick={() => router.push(`/${tab === 'Discover' ? 'search' : tab.toLowerCase()}`)} 
              className={`text-sm font-bold tracking-wide transition-all relative py-2 ${
                tab === 'Matches' ? 'text-gold' : 'text-white/40 hover:text-white'
              }`}
             >
               {tab}
               {tab === 'Matches' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 left-0 w-full h-0.5 bg-gold shadow-[0_0_10px_#c5a059]" />}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
          <NotificationHub />
          <button 
            onClick={() => router.push("/search")}
            className="hidden md:flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-bold text-xs hover:bg-gold/10 hover:text-gold transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Discover</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-12 max-w-6xl mx-auto w-full pt-28 md:pt-40 pb-32 relative z-10">
        {/* Header Section */}
        <div className="mb-12 md:mb-16 text-center md:text-left">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center md:justify-start gap-3 mb-4"
          >
            <div className="h-px w-12 bg-gold/30" />
            <span className="text-gold text-[10px] font-bold uppercase tracking-[0.4em]">Sacred Registry</span>
          </motion.div>
          <h1 className="text-4xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight leading-none">Your Connections</h1>
          <p className="text-white/30 text-base md:text-xl font-medium max-w-2xl italic leading-relaxed">
            "Every interaction is a thread in the tapestry of destiny. Manage your sacred bonds and awaiting invitations."
          </p>
        </div>

        {/* Sophisticated Tab Navigation */}
        <div className="flex bg-white/5 backdrop-blur-3xl p-2 rounded-[2.5rem] border border-white/10 mb-16 shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'incoming', label: 'Invitations', icon: Heart, count: incoming.length },
            { id: 'outgoing', label: 'Sent Requests', icon: Send, count: outgoing.length },
            { id: 'matches', label: 'Sacred Matches', icon: Stars, count: matches.length },
            { id: 'declined', label: 'Past Paths', icon: X, count: declined.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-[150px] py-4 rounded-[2rem] font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all relative flex items-center justify-center gap-3 ${
                activeTab === tab.id ? "text-onyx" : "text-white/40 hover:text-white"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-tab-bg" 
                  className="absolute inset-0 gold-gradient rounded-[2rem] shadow-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? 'fill-onyx/20' : ''}`} />
              <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`relative z-10 px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab.id ? "bg-onyx/10 text-onyx" : "bg-gold/10 text-gold"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {loading ? (
             <div className="flex justify-center items-center h-64">
                <div className="relative">
                  <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full animate-pulse" />
                  <Heart className="w-12 h-12 text-gold animate-bounce relative" />
                </div>
             </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'incoming' && (
                <motion.div 
                  key="incoming"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
                >
                  {incoming.length === 0 ? (
                    <EmptyState 
                      icon={Sparkles} 
                      title="The Stars are Aligning" 
                      subtitle="No invitations at the moment. Your celestial match may be just one discovery away."
                      actionLabel="Explore Discover"
                      onAction={() => router.push("/search")}
                    />
                  ) : (
                    incoming.map(req => (
                      <ConnectionCard 
                        key={req.id}
                        profile={req}
                        type="incoming"
                        onAccept={() => handleAccept(req)}
                        onDecline={() => handleDecline(req.id)}
                        onView={() => router.push(`/dashboard?profile=${req.fromId}`)}
                      />
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'outgoing' && (
                <motion.div 
                  key="outgoing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
                >
                  {outgoing.length === 0 ? (
                    <EmptyState 
                      icon={Send} 
                      title="Begin Your Journey" 
                      subtitle="Your lineage awaits its first interaction. Discover profiles that resonate with your essence."
                      actionLabel="Explore Discover"
                      onAction={() => router.push("/search")}
                    />
                  ) : (
                    outgoing.map(req => (
                      <ConnectionCard 
                        key={req.id}
                        profile={{ ...req, fullName: req.toName, photoURL: req.toPhoto }}
                        type="outgoing"
                        onDecline={() => handleDecline(req.id)}
                        onView={() => router.push(`/dashboard?profile=${req.toId}`)}
                      />
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'matches' && (
                <motion.div 
                  key="matches"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
                >
                  {matches.length === 0 ? (
                    <EmptyState 
                      icon={Stars} 
                      title="Destiny Awaits" 
                      subtitle="Accept invitations or send connections to build your circle of sacred matches."
                      actionLabel="View Invitations"
                      onAction={() => handleTabChange("incoming")}
                    />
                  ) : (
                    matches.map(match => (
                      <MatchCard 
                        key={match.id}
                        match={match}
                        user={user}
                        onUnfriend={handleUnfriend}
                        router={router}
                      />
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'declined' && (
                <motion.div 
                  key="declined"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
                >
                  {declined.length === 0 ? (
                    <EmptyState 
                      icon={X} 
                      title="Clear Horizons" 
                      subtitle="You haven't declined any invitations yet. Your path remains open to all possibilities."
                    />
                  ) : (
                    declined.map(req => (
                      <ConnectionCard 
                        key={req.id}
                        profile={req}
                        type="declined"
                        onView={() => router.push(`/dashboard?profile=${req.fromId}`)}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      <BottomNav />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .gold-gradient { background: linear-gradient(135deg, #c5a059 0%, #e8d5b5 50%, #c5a059 100%); }
      `}</style>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: any) {
  return (
    <div className="col-span-full text-center py-24 md:py-32 bg-white/5 backdrop-blur-3xl rounded-[4rem] border border-white/10 border-dashed space-y-8">
      <div className="w-24 h-24 bg-gold/5 rounded-[2rem] flex items-center justify-center mx-auto border border-gold/10">
        <Icon className="w-10 h-10 text-gold/20" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-serif font-bold text-gold tracking-tight">{title}</h2>
        <p className="text-white/30 font-medium max-w-sm mx-auto text-base italic">{subtitle}</p>
      </div>
      {actionLabel && (
        <button onClick={onAction} className="px-12 py-5 gold-gradient text-onyx rounded-[2rem] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-[0.3em]">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ConnectionCard({ profile, type, onAccept, onDecline, onView }: any) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className={`bg-white/5 backdrop-blur-3xl p-6 md:p-10 rounded-[3.5rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 group hover:shadow-[0_40px_80px_rgba(0,0,0,0.6)] hover:border-gold/30 transition-all ${type === 'declined' ? 'opacity-40 grayscale' : ''}`}
    >
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/5 p-1.5 group-hover:border-gold/30 transition-all duration-700">
            {profile.fromPhoto || profile.photoURL ? (
              <img 
                src={optimizeImage(profile.fromPhoto || profile.photoURL, 400)} 
                className="w-full h-full object-cover rounded-full" 
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center rounded-full">
                <User className="text-white/10 w-10 h-10" />
              </div>
            )}
          </div>
          {type === 'incoming' && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 gold-gradient rounded-2xl flex items-center justify-center text-onyx shadow-2xl border-4 border-[#060606]">
              <Heart className="w-5 h-5 fill-onyx/20" />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <button 
            onClick={onView}
            className="font-serif font-bold text-3xl md:text-4xl text-white hover:text-gold transition-colors block leading-none tracking-tight"
          >
            {profile.fromName || profile.fullName}
            {profile.isManaged && <ShieldCheck className="inline-block ml-3 w-5 h-5 text-blue-400 align-middle" />}
          </button>
          <div className="flex items-center justify-center md:justify-start gap-3">
             <div className="w-2 h-2 rounded-full bg-gold/50 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
               {type === 'incoming' ? 'Incoming Invitation' : type === 'outgoing' ? 'Sent Sacred Request' : 'Path Crossed'}
             </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-center">
        {type === 'incoming' && (
          <>
            <button 
              onClick={onDecline} 
              className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white/20 rounded-3xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all shadow-2xl active:scale-90"
              title="Decline Path"
            >
              <X className="w-6 h-6" />
            </button>
            <button 
              onClick={onAccept} 
              className="flex-1 md:flex-none h-14 md:h-16 px-8 flex items-center justify-center gold-gradient text-onyx rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(197,160,89,0.3)] font-black uppercase tracking-widest text-xs"
            >
              <Check className="w-5 h-5 mr-2" /> Accept
            </button>
          </>
        )}
        {type === 'outgoing' && (
          <button 
            onClick={onDecline} 
            className="px-8 py-4 bg-white/5 border border-white/10 text-white/20 hover:text-red-500 hover:border-red-500/30 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-[0.3em]"
          >
            Revoke Path
          </button>
        )}
        {(type === 'declined' || type === 'outgoing') && (
          <button 
            onClick={onView} 
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-white/5 border border-white/10 text-gold rounded-3xl hover:bg-gold/10 transition-all active:scale-90"
          >
            <ArrowLeft className="w-6 h-6 rotate-180" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function MatchCard({ match, user, onUnfriend, router }: any) {
  const partner = match.partner || { fullName: "Royal Soul", occupation: "Partner" };
  
  return (
    <motion.div 
      whileHover={{ y: -15 }}
      className="bg-white/5 backdrop-blur-3xl p-10 md:p-12 rounded-[4rem] border border-white/10 flex flex-col gap-10 hover:shadow-[0_60px_120px_rgba(0,0,0,0.8)] hover:border-gold/40 transition-all group overflow-hidden relative"
    >
      {/* Premium Visual Elements */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-gold/20 transition-all duration-1000" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-gold/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
         <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
            <div className="relative">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-gold/20 p-2 group-hover:border-gold/50 transition-all duration-700">
                <img 
                  src={optimizeImage(partner.photoURL, 400)}
                  className="w-full h-full object-cover rounded-full transition-transform duration-[4s] group-hover:scale-110"
                />
              </div>
              <div className="absolute top-2 right-2 w-10 h-10 gold-gradient rounded-2xl flex items-center justify-center text-onyx shadow-2xl border-4 border-[#060606] rotate-12">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => router.push(`/dashboard?profile=${partner.uid}`)}
                className="font-serif font-bold text-4xl md:text-5xl text-white hover:text-gold transition-colors block tracking-tight leading-none"
              >
                {partner.fullName}
              </button>
              <div className="flex items-center justify-center md:justify-start gap-4">
                 <div className="px-3 py-1 bg-gold/10 rounded-full border border-gold/20">
                    <p className="text-[10px] text-gold font-black uppercase tracking-widest">{partner.occupation || "Royal Member"}</p>
                 </div>
                 <div className="h-px w-6 bg-white/10" />
                 <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none">{partner.income || "Exquisite"}</p>
              </div>
            </div>
         </div>
         
         <button 
          onClick={() => onUnfriend(partner.uid)}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-90"
          title="Sever Sacred Connection"
         >
            <X className="w-5 h-5" />
         </button>
      </div>

      <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 group-hover:border-gold/10 transition-colors relative z-10">
         <div className="flex items-center gap-3 mb-4">
            <Shield className="w-4 h-4 text-gold/40" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60">Vedic Verified Bond</p>
         </div>
         <p className="text-sm md:text-base font-medium text-white/60 italic leading-relaxed">
           "Your spirits aligned on this terrestrial plane. A foundation of mutual respect and shared legacy has been established."
         </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
        <button 
          onClick={() => router.push(`/dashboard?profile=${partner.uid}`)}
          className="w-full py-5 bg-white/5 border border-white/10 text-white/60 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all"
        >
          Explore Lineage
        </button>
        <button 
          onClick={() => router.push(`/messages`)}
          className="w-full py-5 gold-gradient text-onyx rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(197,160,89,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <MessageCircle className="w-5 h-5 fill-onyx/20" /> Start Dialogue
        </button>
      </div>
    </motion.div>
  );
}
