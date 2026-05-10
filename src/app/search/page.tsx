"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  startAfter, 
  QueryDocumentSnapshot, 
  DocumentData,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { Heart, Search, Filter, User, Zap, Star, MessageCircle, X, ChevronRight, SlidersHorizontal, Sparkles, Check, ArrowLeft, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { sendConnectionRequest, recordAction } from "@/lib/connections";
import { optimizeImage } from "@/lib/utils";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import { ProfileCardSkeleton } from "@/components/Skeletons";

interface Profile {
  uid: string;
  fullName: string;
  age: string;
  occupation: string;
  income: string;
  bio: string;
  photoURL: string;
  gender: string;
  religion: string;
  rashi?: string;
  gotra?: string;
  phoneNumber?: string;
  isManaged?: boolean;
  isPremium?: boolean;
  badges?: string[];
  lineage?: string;
}

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  // Fetch current user's profile
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

  // Filter State
  const [filters, setFilters] = useState({
    minAge: "18",
    maxAge: "50",
    religion: "All",
    occupation: "All",
  });

  const [tempFilters, setTempFilters] = useState(filters);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastProfileRef = useRef<HTMLDivElement | null>(null);

  // Fetch connection statuses
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "requests"), where("fromId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statuses: Record<string, string> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        statuses[data.toId] = data.status;
      });
      setConnectionStatuses(statuses);
    });
    return () => unsubscribe();
  }, [user]);

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

  const [searchTerm, setSearchTerm] = useState("");

  const fetchProfiles = async (isLoadMore = false, search = "") => {
    if (!user) return;
    if (!isLoadMore && !search) setLoading(true);
    else setLoadingMore(true);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          searchTerm: search || searchTerm,
          minAge: filters.minAge,
          maxAge: filters.maxAge,
          religion: filters.religion,
          occupation: filters.occupation,
          lastUid: isLoadMore ? (profiles[profiles.length - 1]?.uid) : null,
          limitCount: 12
        })
      });

      const data = await response.json();
      
      if (data.success) {
        if (isLoadMore) {
          setProfiles(prev => [...prev, ...data.profiles]);
        } else {
          setProfiles(data.profiles);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounced Search Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setLastDoc(null);
      fetchProfiles(false, searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm, filters]);

  // Lock body scroll when modal is open
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

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchProfiles(true);
      }
    });

    if (lastProfileRef.current) {
      observer.current.observe(lastProfileRef.current);
    }
  }, [loading, hasMore, loadingMore]);

  const modalProfile = profiles.find(p => p.uid === selectedProfileUid);

  return (
    <div className="min-h-screen bg-transparent text-pearl flex flex-col font-sans selection:bg-gold/30">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-rose-gold/5 blur-[150px] rounded-full" />
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
                tab === 'Discover' ? 'text-gold' : 'text-white/40 hover:text-white'
              }`}
             >
               {tab}
               {tab === 'Discover' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 left-0 w-full h-0.5 bg-gold shadow-[0_0_10px_#c5a059]" />}
             </button>
           ))}
        </div>

        <button 
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-bold text-xs hover:bg-gold/10 hover:text-gold transition-all"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-12 max-w-7xl mx-auto w-full pt-28 md:pt-40 pb-32 relative z-10">
        {/* Header Section */}
        <div className="mb-12 md:mb-16 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">Divine Discovery</h1>
          <p className="text-white/30 text-sm md:text-lg font-medium max-w-xl italic">
            "Find the soul that resonates with your spirit. Every connection is a step toward a sacred legacy."
          </p>
        </div>

        {/* Search Bar - Premium Floating Glass */}
        <div className="relative mb-16 group z-20">
          <div className="absolute inset-0 bg-gold/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-[3rem]" />
          <div className="relative flex items-center bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl group-focus-within:border-gold/30 transition-all">
            <Search className="ml-8 text-gold/40 w-6 h-6 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Search by name, occupation, or lineage..."
              className="w-full px-6 py-6 md:py-8 bg-transparent focus:outline-none text-lg md:text-xl text-white placeholder-white/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="mr-4 md:mr-6 px-6 py-3 gold-gradient text-onyx rounded-[1.5rem] md:rounded-[2rem] font-bold text-xs md:text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all hidden sm:block">
              Search
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {loading && !loadingMore ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <ProfileCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
            <AnimatePresence mode="popLayout">
              {profiles.map((profile, index) => (
                <motion.div
                  key={profile.uid}
                  ref={index === profiles.length - 1 ? lastProfileRef : null}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (index % 12) * 0.05, type: "spring", stiffness: 100, damping: 20 }}
                  className="group relative aspect-[3/4.2] bg-white/5 rounded-[3rem] overflow-hidden shadow-xl hover:shadow-[0_40px_80px_rgba(0,0,0,0.7)] transition-all border border-white/5 hover:border-gold/30 cursor-pointer"
                  onClick={() => {
                    setSelectedProfileUid(profile.uid);
                    setShowFullProfile(true);
                    window.history.pushState(null, '', `?profile=${profile.uid}`);
                  }}
                >
                  <div className="relative aspect-[3/4.2] w-full h-full">
                    {profile.photoURL ? (
                      <Image 
                        src={optimizeImage(profile.photoURL, 400)} 
                        alt={profile.fullName}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-onyx flex items-center justify-center">
                        <User className="w-16 h-16 text-white/10" />
                      </div>
                    )}
                  </div>
                  
                  {/* Glass Overlay Info */}
                  <div className="absolute inset-x-4 bottom-4 p-5 bg-black/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold uppercase text-gold/80 tracking-[0.2em]">Divine Match</span>
                    </div>
                    <h3 className="text-sm md:text-base font-serif font-bold text-white truncate flex items-center gap-2">
                      {profile.fullName}, {profile.age}
                      {profile.isManaged && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                    </h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">
                      {profile.isManaged ? <span className="text-blue-400/60 tracking-widest">Managed</span> : profile.occupation}
                    </p>
                  </div>

                  {/* Like Button Badge */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                    <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center text-onyx shadow-2xl">
                      <Heart className="w-5 h-5 fill-onyx/20" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center mt-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full animate-pulse" />
              <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin relative" />
            </div>
          </div>
        )}

        {!hasMore && profiles.length > 0 && (
          <div className="mt-24 text-center space-y-4">
             <div className="w-px h-12 bg-gradient-to-b from-gold/50 to-transparent mx-auto" />
             <p className="text-white/20 text-xs font-bold uppercase tracking-[0.5em]">The Circle is Complete</p>
          </div>
        )}
      </main>

      {/* Modern Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#060606] border-l border-white/10 z-[110] p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="space-y-1">
                  <h2 className="text-3xl font-serif font-bold text-gold">Refine Search</h2>
                  <p className="text-white/20 text-xs font-medium uppercase tracking-widest">Tailor your destiny</p>
                </div>
                <button onClick={() => setShowFilters(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 hover:text-gold hover:bg-gold/10 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-10 flex-1 overflow-y-auto custom-scrollbar pr-4">
                <div className="space-y-6">
                  <label className="text-[10px] font-bold uppercase text-gold/60 tracking-[0.3em]">Age Horizon</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-[9px] text-white/20 font-bold uppercase">Min Age</p>
                       <input 
                        type="number" 
                        value={tempFilters.minAge}
                        onChange={(e) => setTempFilters({...tempFilters, minAge: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] text-white/20 font-bold uppercase">Max Age</p>
                       <input 
                        type="number" 
                        value={tempFilters.maxAge}
                        onChange={(e) => setTempFilters({...tempFilters, maxAge: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white font-bold" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-bold uppercase text-gold/60 tracking-[0.3em]">Faith & Belief</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['All', 'Hindu', 'Sikh', 'Jain', 'Muslim'].map(r => (
                      <button
                        key={r}
                        onClick={() => setTempFilters({...tempFilters, religion: r})}
                        className={`py-3 rounded-xl border text-[11px] font-bold transition-all ${
                          tempFilters.religion === r 
                          ? 'bg-gold/10 border-gold/40 text-gold shadow-lg shadow-gold/10' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-bold uppercase text-gold/60 tracking-[0.3em]">Professional Pillar</label>
                  <select 
                    value={tempFilters.occupation}
                    onChange={(e) => setTempFilters({...tempFilters, occupation: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-gold/30 text-white font-bold appearance-none cursor-pointer"
                  >
                    <option value="All">All Traditions</option>
                    <option value="Engineer">Engineering</option>
                    <option value="Doctor">Medicine</option>
                    <option value="Business">Entrepreneurship</option>
                    <option value="Software">Technology</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => {
                  setFilters(tempFilters);
                  setShowFilters(false);
                }}
                className="mt-12 w-full py-5 gold-gradient text-onyx rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                Apply Sacred Filters
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cinematic Profile Modal */}
      <AnimatePresence>
        {showFullProfile && modalProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#060606]/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar scroll-smooth"
          >
            <div className="min-h-screen flex flex-col lg:flex-row relative">
              {/* Profile Visual: Left Panel */}
              <div className="w-full lg:w-1/2 h-[60vh] lg:h-screen sticky top-0 z-10 overflow-hidden relative">
                <motion.div
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image 
                    src={optimizeImage(modalProfile.photoURL, 1200)} 
                    alt="" 
                    fill
                    className="object-cover" 
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#060606] hidden lg:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent lg:hidden" />
                
                {/* Admin Verification Layer */}
                {modalProfile.badges && modalProfile.badges.length > 0 && (
                  <div className="absolute top-28 left-8 flex flex-wrap gap-3 z-20">
                    {modalProfile.badges.map((badge: string) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={badge} 
                        className="px-5 py-2 bg-gold/10 backdrop-blur-2xl border border-gold/40 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-gold shadow-2xl flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 fill-gold/20" />
                        {badge}
                      </motion.div>
                    ))}
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setShowFullProfile(false);
                    window.history.pushState(null, '', '/search');
                  }}
                  className="absolute top-8 left-8 p-5 bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/10 text-white hover:text-gold hover:border-gold/30 hover:scale-110 active:scale-95 transition-all shadow-2xl z-20"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>

                <div className="absolute top-8 right-8 z-20">
                   <button 
                    onClick={() => { 
                      const status = connectionStatuses[modalProfile.uid];
                      if (status === 'accepted') { router.push('/messages'); return; }
                      if (!status) { handleConnect(modalProfile); }
                    }}
                    disabled={connectionStatuses[modalProfile.uid] === 'pending'}
                    className={`px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all flex items-center gap-3 ${
                      connectionStatuses[modalProfile.uid] === 'accepted' 
                      ? "bg-green-500 text-white" 
                      : connectionStatuses[modalProfile.uid] === 'pending'
                      ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/5"
                      : "gold-gradient text-onyx hover:scale-105 active:scale-95"
                    }`}
                   >
                     {connectionStatuses[modalProfile.uid] === 'accepted' ? (
                       <><MessageCircle className="w-5 h-5 fill-white" /><span>Open Dialogue</span></>
                     ) : connectionStatuses[modalProfile.uid] === 'pending' ? (
                       <><Check className="w-5 h-5" /><span>Awaiting Blessing</span></>
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
                  <h1 className="text-5xl md:text-8xl font-serif font-bold text-white leading-none flex flex-wrap items-center gap-4 md:gap-8">
                    {modalProfile.fullName}, {modalProfile.age}
                    {modalProfile.isManaged && (
                      <span className="px-5 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-[12px] font-black uppercase tracking-[0.4em] text-blue-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Managed by Admin
                      </span>
                    )}
                  </h1>
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
                {modalProfile.phoneNumber && connectionStatuses[modalProfile.uid] === 'accepted' && (
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
                        <h3 className="text-onyx text-2xl md:text-3xl font-serif font-bold">Sacred Harmony</h3>
                     </div>
                     <p className="text-onyx/80 text-lg md:text-2xl leading-relaxed font-serif font-medium">
                       "Your spiritual and professional trajectories show profound resonance. A shared path built on tradition and ambition awaits your discovery."
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
      `}</style>
    </div>
  );
}
