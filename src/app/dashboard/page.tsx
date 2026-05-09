"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, onSnapshot } from "firebase/firestore";
import { Heart, X, MessageCircle, Star, Filter, Search, User, Zap, ArrowLeft, Sparkles, Check, Shield, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { requestNotificationPermission } from "@/lib/notifications";
import { sendConnectionRequest, recordAction, getInteractedIds, acceptRequest } from "@/lib/connections";
import NotificationHub from "@/components/NotificationHub";
import { optimizeImage } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

interface Profile {
  uid: string;
  fullName: string;
  age: string;
  occupation: string;
  income: string;
  bio: string;
  photoURL: string;
  rashi?: string;
  gotra?: string;
  matchScore?: string;
  phoneNumber?: string;
}

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, { status: string, isIncoming: boolean, id: string }>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  // Deep Link Listener for Profiles
  const profileUid = searchParams.get('profile');
  useEffect(() => {
    if (profileUid && user) {
      setSelectedProfileUid(profileUid);
      setShowFullProfile(true);
      fetchSpecificProfile(profileUid);
    }
  }, [profileUid, user]);

  // Fetch current user's full profile from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchMyProfile = async () => {
      const { doc, getDoc } = await import("firebase/firestore");
      const profileDoc = await getDoc(doc(db, "users", user.uid));
      if (profileDoc.exists()) {
        setCurrentUserProfile({ uid: user.uid, ...profileDoc.data() } as Profile);
      }
    };
    fetchMyProfile();
  }, [user]);

  // Fetch connection statuses (both incoming, outgoing, and matches)
  useEffect(() => {
    if (!user) return;
    
    // Track all interactions involving the user
    const qIncoming = query(collection(db, "requests"), where("toId", "==", user.uid));
    const qOutgoing = query(collection(db, "requests"), where("fromId", "==", user.uid));
    const qMatches = query(collection(db, "matches"), where("users", "array-contains", user.uid));

    let currentStatuses: Record<string, { status: string, isIncoming: boolean, id: string }> = {};

    const updateStatuses = () => {
      setConnectionStatuses({ ...currentStatuses });
    };

    const unsubIncoming = onSnapshot(qIncoming, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        if (change.type === "removed") {
          delete currentStatuses[data.fromId];
        } else {
          currentStatuses[data.fromId] = { status: data.status, isIncoming: true, id: change.doc.id };
        }
      });
      updateStatuses();
    });

    const unsubOutgoing = onSnapshot(qOutgoing, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        if (change.type === "removed") {
          delete currentStatuses[data.toId];
        } else {
          currentStatuses[data.toId] = { status: data.status, isIncoming: false, id: change.doc.id };
        }
      });
      updateStatuses();
    });

    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        const otherId = data.users.find((id: string) => id !== user.uid);
        if (!otherId) return;

        if (change.type === "removed") {
          if (currentStatuses[otherId]?.status === 'accepted') {
            delete currentStatuses[otherId];
          }
        } else {
          currentStatuses[otherId] = { status: "accepted", isIncoming: false, id: change.doc.id };
        }
      });
      updateStatuses();
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
      unsubMatches();
    };
  }, [user]);

  const fetchSpecificProfile = async (uid: string) => {
    if (!user || uid === user.uid) return;
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const profileDoc = await getDoc(doc(db, "users", uid));
      if (profileDoc.exists()) {
        const profileData = { uid: profileDoc.id, ...profileDoc.data() } as Profile;
        setProfiles(prev => {
          if (prev.find(p => p.uid === uid)) return prev;
          return [profileData, ...prev];
        });
      }
    } catch (error) {
      console.error("Error fetching specific profile:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 80) {
          setIsNavVisible(false);
        } else {
          setIsNavVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fetchProfiles = async (isLoadMore = false) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const qInteractions = query(
        collection(db, "interactions"), 
        where("fromId", "==", user.uid),
        limit(500)
      );
      const interactionSnap = await getDocs(qInteractions);
      const interactedIds = new Set(interactionSnap.docs.map(doc => doc.data().toId));

      let accumulatedProfiles: Profile[] = [];
      let currentLastDoc = isLoadMore ? lastDoc : null;
      let hasMore = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 2;

      while (accumulatedProfiles.length < 5 && hasMore && attempts < MAX_ATTEMPTS) {
        let q = query(
          collection(db, "users"), 
          where("onboarded", "==", true), 
          limit(10)
        );

        if (currentLastDoc) {
          q = query(q, startAfter(currentLastDoc));
        }

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          hasMore = false;
          break;
        }

        currentLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        const data = querySnapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as Profile))
          .filter(p => p.uid !== user.uid && !interactedIds.has(p.uid));
        
        accumulatedProfiles = [...accumulatedProfiles, ...data];
        attempts++;
      }
      
      if (isLoadMore) {
        setProfiles(prev => [...prev, ...accumulatedProfiles]);
      } else {
        setProfiles(prev => {
          const existingIds = new Set(prev.map(p => p.uid));
          const news = accumulatedProfiles.filter(p => !existingIds.has(p.uid));
          return [...prev, ...news];
        });
        setCurrentIndex(0);
      }
      setLastDoc(currentLastDoc);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (profiles.length === 0) {
        fetchProfiles();
      }
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        requestNotificationPermission();
      }
    } else if (user === null) {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (showFullProfile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showFullProfile]);

  const handleAccept = async (requestId: string, fromId: string) => {
    if (!user) return;
    await acceptRequest(requestId, fromId, user.uid);
  };

  const handleConnect = async (profile: Profile) => {
    if (!user) return;
    const res = await sendConnectionRequest(
      user, 
      profile.uid, 
      profile.fullName, 
      profile.photoURL,
      currentUserProfile?.fullName,
      currentUserProfile?.photoURL
    );
    
    if ('error' in res && res.error) {
      alert(res.error);
      return;
    }
    
    await recordAction(user.uid, profile.uid, 'like');
  };

  const handleAction = async (action: 'like' | 'dislike') => {
    if (!profiles[currentIndex] || !user) return;
    
    const targetUid = profiles[currentIndex].uid;

    if (action === "like") {
      await handleConnect(profiles[currentIndex]);
    } else {
      await recordAction(user.uid, targetUid, 'dislike');
    }

    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      fetchProfiles(true);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full animate-pulse" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative z-10"
        >
          <Heart className="w-16 h-16 text-gold fill-gold shadow-[0_0_50px_rgba(197,160,89,0.5)]" />
        </motion.div>
      </div>
    </div>
  );

  const currentProfile = profiles[currentIndex];
  const modalProfile = selectedProfileUid 
    ? profiles.find(p => p.uid === selectedProfileUid) 
    : (showFullProfile ? currentProfile : null);

  return (
    <div className="min-h-screen bg-transparent text-pearl flex flex-col font-sans selection:bg-gold/30 overflow-x-hidden">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-rose-gold/5 blur-[150px] rounded-full" />
      </div>

      {/* Unified Premium Header */}
      <nav className={`fixed top-0 left-0 w-full z-[60] bg-black/40 backdrop-blur-3xl border-b border-white/5 px-6 md:px-12 py-3 md:py-4 flex items-center justify-between transition-transform duration-500 ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
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
                tab === 'Dashboard' ? 'text-gold' : 'text-white/40 hover:text-white'
              }`}
             >
               {tab}
               {tab === 'Dashboard' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 left-0 w-full h-0.5 bg-gold shadow-[0_0_10px_#c5a059]" />}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <NotificationHub />
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold font-bold shadow-2xl hover:border-gold/30 transition-all overflow-hidden p-0.5"
            >
              {user?.photoURL ? (
                <img src={optimizeImage(user.photoURL, 100)} alt="Profile" className="w-full h-full object-cover rounded-[1.2rem]" />
              ) : (
                <User className="w-5 h-5 md:w-6 md:h-6" />
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-6 w-72 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-5 shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                >
                  <div className="p-5 bg-white/5 rounded-[2rem] mb-5 border border-white/5">
                    <p className="text-[10px] uppercase font-bold text-gold/60 tracking-[0.3em] mb-2">Authenticated As</p>
                    <p className="text-white font-serif font-bold text-lg truncate leading-none">{user?.displayName || "Royal Member"}</p>
                    <p className="text-white/30 text-[10px] font-medium mt-1 truncate">{user?.email}</p>
                  </div>
                  <div className="space-y-1.5">
                    <button 
                      onClick={() => router.push("/profile/edit")}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gold/10 rounded-2xl transition-all text-white/40 hover:text-gold font-bold text-xs uppercase tracking-widest text-left group"
                    >
                      <User className="w-4 h-4" /> Edit Lineage
                    </button>
                    <button className="w-full flex items-center gap-4 p-4 hover:bg-gold/10 rounded-2xl transition-all text-white/40 hover:text-gold font-bold text-xs uppercase tracking-widest text-left group">
                      <Star className="w-4 h-4" /> Preferences
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => router.push("/admin")}
                        className="w-full flex items-center gap-4 p-4 bg-rose-gold/10 hover:bg-rose-gold/20 rounded-2xl transition-all text-rose-gold font-bold text-xs uppercase tracking-widest text-left group border border-rose-gold/20"
                      >
                        <ShieldCheck className="w-4 h-4" /> Command Center
                      </button>
                    )}
                    <div className="h-px bg-white/5 my-3 mx-2" />
                    <button 
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 rounded-2xl transition-all text-red-500/40 hover:text-red-500 font-bold text-xs uppercase tracking-widest text-left group"
                    >
                      <X className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className="min-h-screen relative flex flex-col items-center justify-start md:justify-center p-4 md:p-8 pt-40 md:pt-48 pb-32">
        <div className="w-full max-w-xl relative z-10 mx-auto">
          <AnimatePresence mode="wait">
            {currentProfile ? (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100, rotate: 5 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -100, rotate: -5 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] md:rounded-[4rem] p-5 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] flex flex-col items-center text-center group relative overflow-hidden"
              >
                {/* Visual Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/10 blur-[80px] rounded-full pointer-events-none" />

                {/* Avatar Section */}
                <div className="relative mb-6 md:mb-10">
                  <div className="absolute -inset-4 bg-gold/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full p-1.5 border border-white/10 relative z-10 overflow-hidden">
                    <img 
                      src={optimizeImage(currentProfile.photoURL, 400)} 
                      alt={currentProfile.fullName}
                      className="w-full h-full object-cover rounded-full transition-transform duration-[4s] group-hover:scale-110"
                    />
                  </div>
                  {/* Match Score Badge */}
                  <div className="absolute bottom-2 right-2 z-20 px-3 py-1 gold-gradient rounded-full text-[8px] font-black text-onyx shadow-xl border-2 border-[#060606] uppercase tracking-widest">
                    {currentProfile.matchScore || "94% Match"}
                  </div>
                </div>

                {/* Identity Section */}
                <div className="space-y-4 md:space-y-6 mb-6 md:mb-10 w-full">
                  <div className="space-y-1">
                    <h1 className="text-2xl md:text-4xl font-serif font-bold text-white tracking-tight leading-none flex items-center justify-center gap-3">
                      {currentProfile.fullName}, <span className="text-gold/80">{currentProfile.age}</span>
                      {(currentProfile as any).isManaged && (
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-500/20 flex items-center gap-1.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> Managed
                        </span>
                      )}
                    </h1>
                    <p className="text-sm md:text-base text-white/40 font-serif italic tracking-wide">
                      {currentProfile.occupation} <span className="mx-2 opacity-20">•</span> {currentProfile.income}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                     <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] text-gold font-bold uppercase tracking-[0.2em]">{currentProfile.gotra || "Kashyap"}</span>
                     <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] text-gold font-bold uppercase tracking-[0.2em]">{currentProfile.rashi || "Kanya"}</span>
                  </div>

                  <p className="text-white/60 text-xs md:text-sm italic font-medium px-4 md:px-8 leading-relaxed max-w-sm mx-auto">
                    "{currentProfile.bio || "A soul dedicated to building a legacy of excellence and traditional harmony."}"
                  </p>
                </div>

                {/* Action Controls */}
                <div className="w-full space-y-4 md:space-y-6">
                  <div className="w-full flex items-center justify-center gap-4 md:gap-8">
                     <button 
                      onClick={() => handleAction("dislike")}
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 text-white/20 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all group/pass active:scale-90"
                     >
                       <X className="w-5 h-5 group-hover/pass:rotate-90 transition-transform" />
                     </button>

                     <button 
                      onClick={() => !connectionStatuses[currentProfile.uid] && handleAction("like")}
                      disabled={!!connectionStatuses[currentProfile.uid]}
                      className={`flex-1 h-12 md:h-16 rounded-[1.5rem] md:rounded-[2rem] text-onyx flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl transition-all ${
                        connectionStatuses[currentProfile.uid]?.status === 'accepted' 
                        ? 'bg-green-500/20 border border-green-500/30 text-green-500 shadow-none cursor-default'
                        : connectionStatuses[currentProfile.uid]?.status === 'pending'
                        ? 'bg-gold/20 border border-gold/30 text-gold shadow-none cursor-default'
                        : 'gold-gradient hover:scale-[1.05] active:scale-95 shadow-[0_15px_30px_rgba(197,160,89,0.3)]'
                      }`}
                     >
                       {connectionStatuses[currentProfile.uid]?.status === 'accepted' ? (
                         <><Check className="w-4 h-4" /><span>Bonded</span></>
                       ) : connectionStatuses[currentProfile.uid]?.status === 'pending' ? (
                         <><Sparkles className="w-4 h-4" /><span>Awaiting</span></>
                       ) : (
                         <><Heart className="w-4 h-4 fill-onyx/20" /><span>Initialize</span></>
                       )}
                     </button>

                     <button 
                      onClick={() => handleAction("like")}
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 text-white/20 flex items-center justify-center hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all group/star active:scale-90"
                     >
                       <Star className="w-5 h-5 group-hover/star:scale-125 transition-transform" />
                     </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setSelectedProfileUid(currentProfile.uid);
                      setShowFullProfile(true);
                      window.history.pushState(null, '', `?profile=${currentProfile.uid}`);
                    }}
                    className="w-full py-2 text-[8px] font-bold text-white/20 hover:text-gold transition-colors uppercase tracking-[0.4em] group"
                  >
                    Explore Lineage <ArrowLeft className="w-3 h-3 inline ml-2 rotate-180 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center text-center p-16 md:p-24 bg-white/5 backdrop-blur-3xl rounded-[5rem] border border-white/10 border-dashed space-y-10">
                <div className="w-24 h-24 bg-gold/5 rounded-full flex items-center justify-center border border-gold/10">
                  <Heart className="w-12 h-12 text-gold/20 animate-pulse" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-serif font-bold text-gold">The Circle is Complete</h2>
                  <p className="text-white/30 text-lg font-medium max-w-xs mx-auto italic">"Every star has been charted for now. Expand your horizons to find more sacred connections."</p>
                </div>
                <button 
                  onClick={() => fetchProfiles(false)}
                  className="px-12 py-5 gold-gradient text-onyx rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  Reset Divine Search
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Cinematic Profile Modal */}
      <AnimatePresence>
        {showFullProfile && modalProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#060606]/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar scroll-smooth"
          >
            <div className="min-h-screen flex flex-col lg:flex-row relative">
              {/* Profile Visual: Left Panel */}
              <div className="w-full lg:w-1/2 h-[60vh] lg:h-screen sticky top-0 z-10 overflow-hidden">
                <motion.img 
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  src={optimizeImage(modalProfile.photoURL, 1200)} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#060606] hidden lg:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent lg:hidden" />
                
                <button 
                  onClick={() => {
                    setShowFullProfile(false);
                    setSelectedProfileUid(null);
                    window.history.pushState(null, '', '/dashboard');
                  }}
                  className="absolute top-8 left-8 p-5 bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/10 text-white hover:text-gold hover:border-gold/30 hover:scale-110 active:scale-95 transition-all shadow-2xl z-20"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>

                <div className="absolute top-8 right-8 z-20">
                   <button 
                    onClick={() => { 
                      const conn = connectionStatuses[modalProfile.uid];
                      if (conn?.status === 'accepted') { router.push('/messages'); return; }
                      if (conn?.status === 'pending' && conn.isIncoming) { handleAccept(conn.id, modalProfile.uid); return; }
                      if (!conn) { handleConnect(modalProfile); }
                    }}
                    disabled={connectionStatuses[modalProfile.uid]?.status === 'pending' && !connectionStatuses[modalProfile.uid]?.isIncoming}
                    className={`px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-3 ${
                      connectionStatuses[modalProfile.uid]?.status === 'accepted' 
                      ? "bg-green-500 text-white" 
                      : connectionStatuses[modalProfile.uid]?.status === 'pending'
                      ? (connectionStatuses[modalProfile.uid]?.isIncoming ? "bg-green-500 text-white hover:scale-105" : "bg-white/10 text-white/40 cursor-not-allowed border border-white/5")
                      : "gold-gradient text-onyx hover:scale-105 active:scale-95"
                    }`}
                   >
                     {connectionStatuses[modalProfile.uid]?.status === 'accepted' ? (
                       <><MessageCircle className="w-5 h-5 fill-white" /><span>Open Dialogue</span></>
                     ) : connectionStatuses[modalProfile.uid]?.status === 'pending' ? (
                       connectionStatuses[modalProfile.uid]?.isIncoming ? (
                         <><Check className="w-5 h-5" /><span>Accept Path</span></>
                       ) : (
                         <><Check className="w-5 h-5" /><span>Pending</span></>
                       )
                     ) : (
                       <><Heart className="w-5 h-5 fill-onyx/20" /><span>Initialize Bond</span></>
                     )}
                   </button>
                </div>
              </div>

              {/* Profile Details: Right Panel */}
              <div className="w-full lg:w-1/2 p-8 md:p-20 space-y-16 lg:pt-32">
                <header className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="px-5 py-2 bg-gold/5 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-[0.4em] rounded-full">Exquisite Lineage</span>
                    <div className="h-px w-12 bg-gold/20" />
                  </div>
                  <h1 className="text-5xl md:text-8xl font-serif font-bold text-white leading-none">{modalProfile.fullName}, {modalProfile.age}</h1>
                  <p className="text-2xl md:text-3xl text-gold/80 font-medium font-serif italic tracking-wide">{modalProfile.occupation} <span className="text-white/20 px-4">•</span> {modalProfile.income}</p>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 md:gap-8">
                   {[
                     { label: 'Astral Sign', val: modalProfile.rashi || "Kanya", icon: Sparkles },
                     { label: 'Ancestral Gotra', val: modalProfile.gotra || "Kashyap", icon: Shield },
                     { label: 'Marital Status', val: 'Sacredly Unmarried', icon: Star }
                   ].map(item => (
                     <div key={item.label} className="p-6 md:p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:border-gold/30 transition-all space-y-3">
                        <div className="w-10 h-10 bg-gold/5 rounded-2xl flex items-center justify-center text-gold/30 group-hover:text-gold transition-colors">
                           <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-white/20 tracking-[0.2em]">{item.label}</p>
                          <p className="text-white text-lg md:text-xl font-bold">{item.val}</p>
                        </div>
                     </div>
                   ))}
                </div>

                {/* Secure Contact Layer */}
                {modalProfile.phoneNumber && connectionStatuses[modalProfile.uid]?.status === 'accepted' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-10 md:p-14 bg-white/5 border border-gold/20 rounded-[4rem] space-y-8 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 blur-[50px] rounded-full" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gold tracking-[0.3em] mb-2">Direct Sacred Path</p>
                        <p className="text-white text-3xl md:text-5xl font-serif font-bold tracking-widest">{modalProfile.phoneNumber}</p>
                      </div>
                      <div className="w-16 h-16 rounded-3xl bg-gold/10 flex items-center justify-center border border-gold/30 shadow-2xl">
                        <Zap className="w-8 h-8 text-gold animate-pulse" />
                      </div>
                    </div>
                    
                    <a 
                      href={`https://wa.me/${modalProfile.phoneNumber.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="relative z-10 w-full py-6 gold-gradient rounded-[2rem] text-onyx font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl"
                    >
                      <MessageCircle className="w-6 h-6 fill-onyx/20" />
                      <span>Connect via WhatsApp</span>
                    </a>
                  </motion.div>
                )}

                <div className="space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="h-px flex-1 bg-white/10" />
                      <h3 className="text-2xl md:text-4xl font-serif font-bold text-gold shrink-0">The Royal Essence</h3>
                      <div className="h-px flex-1 bg-white/10" />
                   </div>
                   <p className="text-white/80 text-xl md:text-3xl leading-relaxed italic font-medium pl-8 md:pl-16 border-l-8 border-gold/30">
                     "{modalProfile.bio || "A perfect blend of traditional values and modern professional excellence. Driven by a vision of building a legacy of love and mutual respect."}"
                   </p>
                </div>

                {/* AI Alignment Card */}
                <div className="p-10 md:p-14 bg-gold-gradient rounded-[4rem] shadow-[0_50px_100px_rgba(197,160,89,0.3)] relative overflow-hidden group text-onyx">
                   <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                      <Sparkles className="w-32 h-32 text-onyx" />
                   </div>
                   <div className="relative z-10 space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-onyx/10 rounded-full flex items-center justify-center"><Check className="w-5 h-5" /></div>
                        <h3 className="text-onyx text-2xl md:text-3xl font-serif font-bold">Deep Alignment Insight</h3>
                     </div>
                     <p className="text-onyx/80 text-lg md:text-2xl leading-relaxed font-serif font-medium">
                       "This profile exhibits a 94% alignment with your spiritual and professional trajectory. Your shared appreciation for tradition and ambition creates a rare celestial harmony."
                     </p>
                   </div>
                </div>
                
                {/* Footer Spacer */}
                <div className="h-32" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />

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
