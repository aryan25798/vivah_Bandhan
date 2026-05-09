"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  addDoc,
  limit,
  startAfter,
  getDoc
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  Users, 
  MessageSquare, 
  Zap, 
  Activity, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  ChevronRight, 
  ArrowLeft,
  X,
  Send,
  User,
  ShieldCheck,
  Check,
  Clock,
  ExternalLink,
  RefreshCw,
  LogOut
} from "lucide-react";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function ShadowFleetPortal() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState<'intelligence' | 'chat'>('intelligence');
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSignals, setActiveSignals] = useState<any[]>([]); // Interests
  const [fleetMatches, setFleetMatches] = useState<any[]>([]); // Active Conversations
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [impersonateUid, setImpersonateUid] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

  // Pagination
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // 1. Initial Data Fetch
  const fetchFleet = async (isLoadMore = false) => {
    if (!user) return;
    setLoading(true);
    try {
      console.log("Fetching Fleet souls...");
      const q = isLoadMore && lastDoc 
        ? query(collection(db, "users"), where("isManaged", "==", true), startAfter(lastDoc), limit(50))
        : query(collection(db, "users"), where("isManaged", "==", true), limit(50));
      
      const snap = await getDocs(q);
      const newUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setManagedUsers(prev => isLoadMore ? [...prev, ...newUsers] : newUsers);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 50);

      // Cache profiles
      const newProfiles = { ...userProfiles };
      newUsers.forEach(u => newProfiles[u.id] = u);
      setUserProfiles(newProfiles);
      console.log("Fleet decrypted. Managed souls:", newUsers.length);
    } catch (err) {
      console.error("Fleet intelligence failure:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchFleet();

    // 2. Listen for Signals (Requests)
    const signalsUnsub = onSnapshot(
      query(collection(db, "requests"), where("status", "==", "pending")),
      (snap) => {
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setActiveSignals(reqs);
        
        // Resolve target profiles to check if managed
        reqs.forEach(async (req: any) => {
           if (!userProfiles[req.toId]) {
              const uDoc = await getDoc(doc(db, "users", req.toId));
              if (uDoc.exists()) {
                 const data = uDoc.data();
                 setUserProfiles(prev => ({ ...prev, [req.toId]: { id: req.toId, ...data } }));
                 // If it's a new managed user we haven't seen, add to registry
                 if (data.isManaged) {
                    setManagedUsers(prev => prev.some(u => u.id === req.toId) ? prev : [...prev, { id: req.toId, ...data }]);
                 }
              }
           }
           if (!userProfiles[req.fromId]) {
              const uDoc = await getDoc(doc(db, "users", req.fromId));
              if (uDoc.exists()) {
                 setUserProfiles(prev => ({ ...prev, [req.fromId]: { id: req.fromId, ...uDoc.data() } }));
              }
           }
        });
      }
    );

    // 3. Listen for Fleet Matches
    const matchesUnsub = onSnapshot(
      query(collection(db, "matches"), where("isManagedMatch", "==", true)),
      (snap) => {
        const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFleetMatches(matches);

        // Resolve participants
        matches.forEach(m => {
          m.users.forEach(async (uid: string) => {
            if (!userProfiles[uid]) {
               const uDoc = await getDoc(doc(db, "users", uid));
               if (uDoc.exists()) {
                 setUserProfiles(prev => ({ ...prev, [uid]: { id: uid, ...uDoc.data() } }));
               }
            }
          });
        });
      }
    );

    return () => {
      signalsUnsub();
      matchesUnsub();
    };
  }, [user]);

  // Chat Listener
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, "matches", selectedChat.id, "messages"), orderBy("createdAt", "asc")),
      (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => unsub();
  }, [selectedChat]);

  // Actions
  const handleAcceptRequest = async (request: any) => {
    setIsProcessing(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/connections/auto-match', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fromUid: request.fromId,
          toUid: request.toId,
          toName: request.toName,
          fromName: request.fromName
        })
      });
      const data = await res.json();
      if (!res.ok) alert("Command Error: " + data.error);
    } catch (err) {
      console.error(err);
    }
    setIsProcessing(false);
  };

  const handleBulkAccept = async () => {
    if (!confirm(`Are you sure you want to accept all ${filteredSignals.length} pending requests?`)) return;
    setIsProcessing(true);
    for (const signal of filteredSignals) {
       await handleAcceptRequest(signal);
    }
    setIsProcessing(false);
  };

  const toggleAutoPilot = async (targetUser: any) => {
     try {
        await updateDoc(doc(db, "users", targetUser.id), {
           autoPilot: !targetUser.autoPilot
        });
        setManagedUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, autoPilot: !u.autoPilot } : u));
     } catch (err) {
        console.error(err);
     }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim()) return;

    try {
      const msgData: any = {
        text: newMessage,
        createdAt: serverTimestamp(),
        isAdminMediated: true
      };

      if (impersonateUid) {
        msgData.senderId = impersonateUid;
        msgData.isGhostwritten = true;
      } else {
        msgData.senderId = user?.uid;
        msgData.isAdminMessage = true;
      }

      await addDoc(collection(db, "matches", selectedChat.id, "messages"), msgData);
      
      // Update match document to trigger real-time updates for the user
      await updateDoc(doc(db, "matches", selectedChat.id), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp()
      });

      setNewMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSignals = activeSignals.filter(s => userProfiles[s.toId]?.isManaged);

  return (
    <div className="min-h-screen bg-[#060606] text-white font-sans selection:bg-blue-500/30">
      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 flex justify-around py-4 z-[60] xl:hidden">
         <button onClick={() => router.push('/admin')} className="p-3 text-zinc-500"><ArrowLeft className="w-6 h-6" /></button>
         <button onClick={() => setActiveTab('intelligence')} className={`p-3 ${activeTab === 'intelligence' ? 'text-blue-400' : 'text-zinc-500'}`}><Activity className="w-6 h-6" /></button>
         <button onClick={() => setActiveTab('chat')} className={`p-3 ${activeTab === 'chat' ? 'text-blue-400' : 'text-zinc-500'}`}><MessageSquare className="w-6 h-6" /></button>
         <button 
           onClick={() => {
             if (confirm("Terminate secure administrative session?")) {
               signOut(auth).then(() => router.push("/admin/login"));
             }
           }}
           className="p-3 text-red-500/50"
         >
           <LogOut className="w-6 h-6" />
         </button>
      </div>

      {/* Sidebar Navigation (Hidden on Mobile) */}
      <div className="fixed left-0 top-0 bottom-0 w-24 bg-black border-r border-white/5 hidden xl:flex flex-col items-center py-10 z-50">
         <button onClick={() => router.push('/admin')} className="p-4 text-zinc-600 hover:text-white transition-all mb-10 group">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
         </button>
         <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] mb-12">
            <Shield className="w-6 h-6 text-white" />
         </div>
         <div className="flex flex-col gap-6">
            <button 
              onClick={() => setActiveTab('intelligence')}
              className={`p-4 rounded-2xl border transition-all ${activeTab === 'intelligence' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-zinc-600 hover:text-white border-transparent'}`}
            >
              <Activity className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`p-4 rounded-2xl border transition-all ${activeTab === 'chat' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-zinc-600 hover:text-white border-transparent'}`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-auto pb-10">
            <button 
              onClick={() => {
                if (confirm("Terminate secure administrative session?")) {
                  signOut(auth).then(() => router.push("/admin/login"));
                }
              }}
              className="p-4 rounded-2xl text-red-500/30 hover:text-red-500 hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/20"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="xl:ml-24 p-4 md:p-8 lg:p-12 pb-32 xl:pb-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
           <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                 <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
                    {activeTab === 'intelligence' ? 'Shadow Fleet Hub' : 'Chat Command Center'}
                 </h1>
              </div>
              <p className="text-zinc-500 font-medium tracking-wide leading-relaxed">
                 {activeTab === 'intelligence' 
                   ? 'Monitor new interests and manage the user database for your 10k+ managed souls.' 
                   : 'Securely mediate conversations and ghostwrite responses for the fleet.'}
              </p>
           </div>
           <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <button 
                onClick={() => fetchFleet()}
                className="flex-1 lg:flex-none p-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                 <RefreshCw className={`w-5 h-5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                 <span className="lg:hidden text-[10px] font-black uppercase">Refresh</span>
              </button>
              <div className="flex-1 lg:flex-none glass px-8 py-4 rounded-[1.5rem] border border-white/5 min-w-[140px]">
                 <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 tracking-widest">Active Fleet</p>
                 <p className="text-2xl font-serif font-bold text-blue-400">{managedUsers.length}</p>
              </div>
              <div className="flex-1 lg:flex-none glass px-8 py-4 rounded-[1.5rem] border border-white/5 min-w-[140px]">
                 <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 tracking-widest">Interests</p>
                 <p className="text-2xl font-serif font-bold text-rose-gold">{filteredSignals.length}</p>
              </div>
           </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'intelligence' ? (
            <motion.div 
              key="intelligence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
               {/* 1. NEW INTERESTS SECTION */}
               <section className="glass rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-rose-gold/10 to-transparent flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-gold/20 flex items-center justify-center">
                           <Zap className="w-5 h-5 text-rose-gold" />
                        </div>
                        <div>
                           <h2 className="text-xl font-bold text-rose-gold">Intelligence Feed</h2>
                           <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Action Required</p>
                        </div>
                     </div>
                     {filteredSignals.length > 0 && (
                        <button 
                          onClick={handleBulkAccept}
                          disabled={isProcessing}
                          className="w-full md:w-auto px-6 py-3 bg-rose-gold text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                           <Check className="w-4 h-4" />
                           Accept All ({filteredSignals.length})
                        </button>
                     )}
                  </div>
                  <div className="p-4 md:p-8 max-h-[500px] overflow-y-auto custom-scrollbar space-y-4">
                     {filteredSignals.map(signal => (
                        <div key={signal.id} className="p-5 md:p-6 bg-white/2 border border-white/5 rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-6 group hover:bg-white/5 transition-all">
                           <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 shadow-lg">
                                 {userProfiles[signal.fromId]?.photoURL ? <img src={userProfiles[signal.fromId].photoURL} className="w-full h-full object-cover" /> : <User className="w-6 h-6 m-4 text-zinc-700" />}
                              </div>
                              <div className="min-w-0">
                                 <p className="font-bold text-base md:text-lg text-white truncate">
                                    {userProfiles[signal.fromId]?.fullName || "User"} 
                                    <span className="text-zinc-600 font-normal mx-3">→</span> 
                                    {userProfiles[signal.toId]?.fullName || "Managed Soul"}
                                 </p>
                                 <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-zinc-600" />
                                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Received {signal.createdAt?.toDate ? formatDistanceToNow(signal.createdAt.toDate()) : "moment"} ago</p>
                                 </div>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleAcceptRequest(signal)}
                             disabled={isProcessing}
                             className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-gold hover:text-black hover:border-rose-gold transition-all disabled:opacity-50"
                           >
                             Accept & Reply
                           </button>
                        </div>
                     ))}
                     {filteredSignals.length === 0 && (
                        <div className="text-center py-10 opacity-20">
                           <Zap className="w-12 h-12 mx-auto mb-4" />
                           <p className="text-sm font-bold uppercase tracking-widest">Intelligence feed cleared.</p>
                        </div>
                     )}
                  </div>
               </section>

               {/* 2. USER DATABASE SECTION */}
               <section className="glass rounded-[3rem] border border-white/5 overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                           <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                           <h2 className="text-xl font-bold">User Database</h2>
                           <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Managed Profiles Registry</p>
                        </div>
                     </div>
                     <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative group flex-1 sm:w-80">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                           <input 
                             type="text" 
                             placeholder="Search 10k+ profiles..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full bg-white/5 border border-white/10 rounded-[1.25rem] py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                           />
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-[1.25rem] border border-white/5">
                           <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Grid className="w-5 h-5" /></button>
                           <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><List className="w-5 h-5" /></button>
                        </div>
                     </div>
                  </div>
                  
                  <div className="p-4 md:p-8">
                     {viewMode === 'list' ? (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left min-w-[700px]">
                              <thead>
                                 <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                    <th className="pb-6 px-4">User Details</th>
                                    <th className="pb-6 px-4 text-center">Auto-Pilot</th>
                                    <th className="pb-6 px-4">Performance</th>
                                    <th className="pb-6 px-4 text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/2">
                                 {managedUsers.filter(u => u.fullName?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                                    <tr key={u.id} className="group hover:bg-white/[0.02] transition-all">
                                       <td className="py-6 px-4">
                                          <div className="flex items-center gap-4">
                                             <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shadow-md">
                                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-3.5 text-zinc-700" />}
                                             </div>
                                             <div>
                                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{u.fullName}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.city}, {u.occupation}</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="py-6 px-4">
                                          <div className="flex justify-center">
                                             <button 
                                               onClick={() => toggleAutoPilot(u)}
                                               className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${u.autoPilot ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}
                                             >
                                                {u.autoPilot ? 'Active' : 'Disabled'}
                                             </button>
                                          </div>
                                       </td>
                                       <td className="py-6 px-4">
                                          <div className="flex flex-col gap-1">
                                             <p className="text-sm font-bold text-white">{activeSignals.filter(s => s.toId === u.id).length} Interests</p>
                                             <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (activeSignals.filter(s => s.toId === u.id).length / 10) * 100)}%` }} />
                                             </div>
                                          </div>
                                       </td>
                                       <td className="py-6 px-4 text-right">
                                          <button onClick={() => setSelectedUser(u)} className="p-3 bg-white/5 rounded-xl hover:bg-blue-500/10 hover:text-blue-400 transition-all">
                                             <Eye className="w-5 h-5" />
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                           {managedUsers.filter(u => u.fullName?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                              <div key={u.id} className="p-8 bg-white/2 border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-blue-500/30 transition-all relative overflow-hidden">
                                 {u.autoPilot && (
                                    <div className="absolute top-4 right-4 px-2 py-1 bg-blue-500 rounded-lg text-[7px] font-black uppercase tracking-widest flex items-center gap-1">
                                       <Zap className="w-2 h-2 fill-current" /> Auto
                                    </div>
                                 )}
                                 <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 border-2 border-white/5 overflow-hidden mb-6 group-hover:scale-105 transition-transform shadow-2xl">
                                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <User className="w-10 h-10 m-7 text-zinc-700" />}
                                 </div>
                                 <h3 className="font-bold text-xl mb-1 text-white">{u.fullName}</h3>
                                 <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6 font-black">{u.occupation}</p>
                                 <div className="flex gap-2 w-full">
                                    <button onClick={() => setSelectedUser(u)} className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/10 hover:text-blue-400 transition-all">View Details</button>
                                    <button onClick={() => toggleAutoPilot(u)} className="p-3 bg-white/5 rounded-xl hover:bg-blue-500/10 hover:text-blue-400 transition-all">
                                       <Zap className={`w-4 h-4 ${u.autoPilot ? 'fill-blue-400 text-blue-400' : 'text-zinc-600'}`} />
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                     
                     {hasMore && (
                        <div className="mt-12 flex justify-center">
                           <button onClick={() => fetchFleet(true)} className="px-10 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">Load Fleet Expansion</button>
                        </div>
                     )}
                  </div>
               </section>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
               {/* CHAT LIST (4 cols) */}
               <div className="lg:col-span-4 space-y-6">
                  <section className="glass rounded-[3rem] border border-white/5 p-6 h-[700px] flex flex-col">
                     <div className="mb-6 px-4">
                        <h2 className="text-xl font-bold">Conversations</h2>
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Active Fleet Bonds</p>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-2">
                        {fleetMatches.map(chat => (
                           <button 
                             key={chat.id}
                             onClick={() => setSelectedChat(chat)}
                             className={`w-full p-6 rounded-[2rem] text-left transition-all group relative border ${
                               selectedChat?.id === chat.id 
                                 ? 'bg-blue-500/10 border-blue-500/30 shadow-lg' 
                                 : 'bg-white/2 border-white/5 hover:bg-white/5'
                             }`}
                           >
                              <div className="flex -space-x-3 mb-4">
                                 {chat.users.map((uid: string) => (
                                    <div key={uid} className="w-10 h-10 rounded-xl border-4 border-[#0a0a0a] bg-zinc-900 overflow-hidden shrink-0 shadow-lg">
                                       {userProfiles[uid]?.photoURL ? <img src={userProfiles[uid].photoURL} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-3 text-zinc-700" />}
                                    </div>
                                 ))}
                              </div>
                              <h4 className={`font-bold text-sm truncate ${selectedChat?.id === chat.id ? 'text-blue-400' : 'text-white'}`}>
                                 {chat.users.map((uid: string) => userProfiles[uid]?.fullName?.split(' ')[0] || "User").join(" & ")}
                              </h4>
                              <p className="text-[10px] text-zinc-500 italic mt-1.5 line-clamp-1">"{chat.lastMessage}"</p>
                           </button>
                        ))}
                     </div>
                  </section>
               </div>

               {/* MESSAGE VIEW (8 cols) */}
               <div className="lg:col-span-8">
                  <section className="glass rounded-[3rem] border border-white/5 h-[700px] flex flex-col overflow-hidden shadow-2xl relative">
                     {!selectedChat ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center p-12">
                           <MessageSquare className="w-20 h-20 mb-6" />
                           <h3 className="text-2xl font-serif font-bold">Chat Command Center</h3>
                           <p className="text-sm font-medium tracking-wide max-w-xs mt-2 italic">Select a Fleet Bond from the registry to begin secure administrative mediation.</p>
                        </div>
                     ) : (
                        <div className="flex flex-col h-full">
                           <header className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-500/5 to-transparent flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                 <button onClick={() => setSelectedChat(null)} className="lg:hidden p-3 bg-white/5 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
                                 <div>
                                    <h2 className="text-xl font-bold">
                                       {selectedChat.users.map((uid: string) => userProfiles[uid]?.fullName || "User").join(" & ")}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                       <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest">Administrative Interception Active</span>
                                    </div>
                                 </div>
                              </div>
                           </header>

                           <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 scroll-smooth">
                              {messages.map((m, i) => {
                                 const isMe = m.senderId === user?.uid;
                                 const isManaged = m.isGhostwritten;
                                 const isMember = !isMe && !isManaged;
                                 const sender = userProfiles[m.senderId];

                                 return (
                                    <div key={i} className={`flex flex-col ${isMe || isManaged ? 'items-end' : 'items-start'}`}>
                                       <div className={`max-w-[80%] p-5 rounded-3xl text-[13px] leading-relaxed shadow-xl relative group transition-all ${
                                          m.isAdminMessage ? 'bg-gradient-to-br from-rose-gold to-orange-400 text-black font-bold' :
                                          isManaged ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' :
                                          isMember ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 
                                          'bg-white/5 text-zinc-400'
                                       }`}>
                                          {isMember && (
                                             <div className="absolute -top-3 left-6 px-2 py-0.5 bg-amber-500 rounded text-[7px] font-black uppercase text-black tracking-widest shadow-lg">
                                                Received from User
                                             </div>
                                          )}
                                          {m.text}
                                       </div>
                                       <div className="flex items-center gap-2 mt-2 px-2">
                                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isMember ? 'text-amber-500' : 'text-zinc-600'}`}>
                                             {m.isAdminMessage ? "Admin System" : isManaged ? `Ghostwritten (${sender?.fullName?.split(' ')[0]})` : `Member (${sender?.fullName})`}
                                          </span>
                                          {m.createdAt?.toDate && (
                                             <span className="text-[8px] text-zinc-800 tracking-tighter">
                                                {formatDistanceToNow(m.createdAt.toDate(), { addSuffix: true })}
                                             </span>
                                          )}
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>

                           <footer className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
                              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                                 <button 
                                   onClick={() => setImpersonateUid(null)}
                                   className={`shrink-0 px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${!impersonateUid ? 'bg-rose-gold border-rose-gold text-black' : 'bg-white/5 border-white/10 text-zinc-500'}`}
                                 >
                                   System
                                 </button>
                                 {selectedChat.users.map((uid: string) => (
                                    <button 
                                      key={uid}
                                      onClick={() => setImpersonateUid(uid)}
                                      className={`shrink-0 px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${impersonateUid === uid ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-zinc-500'}`}
                                    >
                                      As {userProfiles[uid]?.fullName?.split(' ')[0] || "User"}
                                    </button>
                                 ))}
                              </div>
                              <form onSubmit={handleSendMessage} className="relative">
                                 <input 
                                   type="text" 
                                   value={newMessage}
                                   onChange={(e) => setNewMessage(e.target.value)}
                                   placeholder={impersonateUid ? `Ghostwrite as ${userProfiles[impersonateUid]?.fullName?.split(' ')[0]}...` : "Execute system command..."}
                                   className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                 />
                                 <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-4 bg-blue-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
                                    <Send className="w-5 h-5" />
                                 </button>
                              </form>
                           </footer>
                        </div>
                     )}
                  </section>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Management Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl glass rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative">
               <button onClick={() => setSelectedUser(null)} className="absolute top-8 right-8 p-3 text-zinc-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
               <div className="p-10">
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10">
                     <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-900 border-2 border-blue-500/30 overflow-hidden shrink-0">
                        {selectedUser.photoURL ? <img src={selectedUser.photoURL} className="w-full h-full object-cover" /> : <User className="w-12 h-12 m-10 text-zinc-700" />}
                     </div>
                     <div className="flex-1 text-center md:text-left pt-4">
                        <h3 className="text-4xl font-bold mb-2">{selectedUser.fullName}</h3>
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Administrative Registry • {selectedUser.city}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-10">
                     <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                        <p className="text-[9px] font-black uppercase text-zinc-500 mb-2">Fleet Signals</p>
                        <p className="text-2xl font-serif font-bold text-white">{activeSignals.filter(s => s.toId === selectedUser.id).length}</p>
                     </div>
                     <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                        <p className="text-[9px] font-black uppercase text-zinc-500 mb-2">Active Bonds</p>
                        <p className="text-2xl font-serif font-bold text-white">{fleetMatches.filter(m => m.users.includes(selectedUser.id)).length}</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <button className="w-full py-5 bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                        <ShieldCheck className="w-5 h-5" /> Execute Fleet Commands
                     </button>
                     <div className="grid grid-cols-2 gap-4">
                        <button className="py-4 bg-white/5 text-zinc-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">Edit Registry</button>
                        <button className="py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all">Decommission Soul</button>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Processing State */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed bottom-10 right-10 z-[110] glass p-6 rounded-2xl border border-blue-500/30 flex items-center gap-4">
             <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
             <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Syncing Intelligence...</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
