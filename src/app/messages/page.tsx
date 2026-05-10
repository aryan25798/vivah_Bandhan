"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  User, 
  Search, 
  MoreVertical, 
  Phone, 
  Video,
  Zap,
  Heart,
  Sparkles,
  Shield,
  ShieldCheck,
  Star,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import NotificationHub from "@/components/NotificationHub";
import { optimizeImage } from "@/lib/utils";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";

interface Chat {
  id: string;
  users: string[];
  lastMessage: string;
  updatedAt: Timestamp;
  otherUser?: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  // Fetch Chats
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const chatList = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data() as Chat;
        const otherId = data.users.find(id => id !== user.uid);
        
        if (otherId) {
          const userDoc = await getDoc(doc(db, "users", otherId));
          data.otherUser = userDoc.exists() ? userDoc.data() : { fullName: "Royal Member" };
        }
        
        return { ...data, id: d.id };
      }));
      
      const currentChatIds = new Set(chatList.map(c => c.id));
      if (selectedChat && !currentChatIds.has(selectedChat.id)) {
        setSelectedChat(null);
        setShowChatMobile(false);
      }
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filtered Chats for Search
  const filteredChats = chats.filter(chat => 
    chat.otherUser?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch Messages for Selected Chat
  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, `matches/${selectedChat.id}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[]);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    const text = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, `matches/${selectedChat.id}/messages`), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "matches", selectedChat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full animate-pulse" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Heart className="w-16 h-16 text-gold fill-gold" />
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-transparent flex flex-col overflow-hidden font-sans selection:bg-gold/30">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-rose-gold/5 blur-[150px] rounded-full" />
      </div>

      {/* Unified Premium Header - Compact */}
      <nav className="relative z-[60] bg-black/40 backdrop-blur-3xl border-b border-white/5 px-4 md:px-12 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/dashboard")}>
          <div className="w-8 h-8 gold-gradient rounded-xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
            <Heart className="text-white w-4 h-4 fill-white" />
          </div>
          <span className="font-serif font-bold text-lg text-gold tracking-tight">Vivah Bandhan</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-8">
           {['Dashboard', 'Discover', 'Matches', 'Messages'].map((tab) => (
             <button 
              key={tab}
              onClick={() => router.push(`/${tab === 'Discover' ? 'search' : tab.toLowerCase()}`)} 
              className={`text-xs font-bold tracking-wide transition-all relative py-1 ${
                tab === 'Messages' ? 'text-gold' : 'text-white/40 hover:text-white'
              }`}
             >
               {tab}
               {tab === 'Messages' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 left-0 w-full h-0.5 bg-gold shadow-[0_0_10px_#c5a059]" />}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
          <NotificationHub />
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white/60 font-bold text-xs hover:bg-gold/10 hover:text-gold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline uppercase tracking-widest text-[8px]">Return</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* SIDEBAR: CONVERSATION LIST */}
        <motion.div 
          initial={false}
          animate={{ 
            x: (isMobile && showChatMobile) ? '-100%' : '0%',
            opacity: (isMobile && showChatMobile) ? 0 : 1
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`${isMobile ? 'absolute inset-0' : 'relative'} w-full md:w-[320px] lg:w-[380px] flex flex-col bg-black/40 backdrop-blur-3xl border-r border-white/5 z-20`}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-serif font-bold text-white tracking-tight leading-none">Divine Dialogues</h1>
                <p className="text-gold/40 text-[8px] font-bold uppercase tracking-[0.3em] mt-1.5">Private Consultations</p>
              </div>
              <div className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center text-onyx shadow-2xl">
                <MessageCircle className="w-4 h-4 fill-onyx/20" />
              </div>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-gold transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search your matches..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-gold/30 text-xs text-white placeholder-white/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-8 space-y-1">
            {filteredChats.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5 border-dashed">
                  <Sparkles className="w-6 h-6 text-gold/10" />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-serif font-bold text-sm">The Silence is Sacred</p>
                  <p className="text-white/20 text-[10px] font-medium italic px-4">"Every great journey begins with a single word."</p>
                </div>
              </div>
            ) : (
              filteredChats.map(chat => (
                <motion.button 
                  key={chat.id}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setSelectedChat(chat);
                    setShowChatMobile(true);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all group relative overflow-hidden ${
                    selectedChat?.id === chat.id 
                      ? 'bg-gold/10 border border-gold/30' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full border-2 p-0.5 transition-all duration-700 relative ${selectedChat?.id === chat.id ? 'border-gold rotate-[360deg]' : 'border-white/10'}`}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-onyx relative">
                        {chat.otherUser?.photoURL ? (
                          <Image 
                            src={optimizeImage(chat.otherUser.photoURL, 100)} 
                            alt="" 
                            fill
                            className="object-cover" 
                            sizes="40px"
                          />
                        ) : (
                          <User className="w-full h-full p-2 text-white/20" />
                        )}
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black/40 rounded-full shadow-2xl" />
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`text-sm font-serif font-bold truncate ${selectedChat?.id === chat.id ? 'text-gold' : 'text-white'}`}>
                        {chat.otherUser?.fullName}
                        {chat.otherUser?.isManaged && <ShieldCheck className="inline-block ml-1.5 w-3 h-3 text-blue-400" />}
                      </h3>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                        {chat.updatedAt ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: false }).replace('about ', '') : 'now'}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate font-medium tracking-wide ${selectedChat?.id === chat.id ? 'text-gold/60' : 'text-white/40'}`}>
                      {chat.lastMessage || "Establish a celestial dialogue..."}
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>

        {/* MAIN CHAT AREA */}
        <motion.div 
          initial={false}
          animate={{ 
            x: (isMobile && !showChatMobile) ? '100%' : '0%',
            opacity: (isMobile && !showChatMobile) ? 0 : 1
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`flex-1 flex flex-col bg-black/60 relative z-30 overflow-hidden ${isMobile ? 'absolute inset-0' : 'relative'}`}
        >
          <AnimatePresence mode="wait">
            {selectedChat ? (
              <motion.div 
                key={selectedChat.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full"
              >
                {/* Chat Header - Compact */}
                <header className="px-4 md:px-8 py-3 bg-black/60 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between shadow-2xl relative">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowChatMobile(false)} 
                      className="md:hidden p-2 bg-white/5 rounded-xl text-gold active:scale-90 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-full border border-gold/20 p-0.5 relative">
                      <div className="w-full h-full rounded-full overflow-hidden bg-onyx cursor-pointer relative" onClick={() => router.push(`/dashboard?profile=${selectedChat.users.find(id => id !== user?.uid)}`)}>
                        {selectedChat.otherUser?.photoURL ? (
                          <Image 
                            src={optimizeImage(selectedChat.otherUser.photoURL, 150)} 
                            alt="" 
                            fill
                            className="object-cover" 
                            sizes="40px"
                          />
                        ) : (
                          <User className="w-full h-full p-2 text-white/20" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-serif font-bold text-white leading-tight">{selectedChat.otherUser?.fullName}</h2>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-[8px] text-green-500/80 font-black uppercase tracking-[0.3em]">Celestial Presence</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 md:gap-2">
                    <button className="w-9 h-9 flex items-center justify-center text-white/20 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"><Phone className="w-4 h-4" /></button>
                    <button className="w-9 h-9 flex items-center justify-center text-white/20 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"><Video className="w-4 h-4" /></button>
                    <div className="h-6 w-px bg-white/5 mx-1" />
                    <button className="w-9 h-9 flex items-center justify-center text-white/20 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                </header>

                {/* Message Canvas - Compact bubbles */}
                <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-4 custom-scrollbar scroll-smooth">
                  <div className="flex flex-col items-center mb-8">
                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent mb-4" />
                    <div className="px-5 py-1.5 bg-white/5 border border-white/10 rounded-full text-gold text-[8px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                      <Shield className="w-2.5 h-2.5" /> Encrypted Divine Dialogue
                    </div>
                  </div>
                  
                  {messages.map((msg, idx) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] md:max-w-[70%] group relative`}>
                        <div className={`px-4 py-3 rounded-2xl shadow-xl transition-all ${
                          msg.senderId === user?.uid 
                            ? 'gold-gradient text-onyx font-bold rounded-tr-none' 
                            : 'bg-white/5 border border-white/10 text-white rounded-tl-none backdrop-blur-3xl'
                        }`}>
                          <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
                        </div>
                        <div className={`mt-1.5 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-30 ${
                          msg.senderId === user?.uid ? 'justify-end' : 'justify-start'
                        }`}>
                          <span>{msg.createdAt ? format(msg.createdAt.toDate(), 'p') : 'consulting...'}</span>
                          {msg.senderId === user?.uid && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer - Compact */}
                <footer className="p-4 md:p-6 bg-black/80 backdrop-blur-3xl border-t border-white/5 relative">
                  <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                    <button type="button" className="hidden sm:flex w-10 h-10 items-center justify-center bg-white/5 border border-white/10 text-white/20 hover:text-gold hover:border-gold/30 rounded-xl transition-all shadow-xl active:scale-90">
                      <Zap className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative group">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Express your soul's intent..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 focus:outline-none focus:ring-1 focus:ring-gold/30 text-white placeholder-white/20 transition-all font-medium text-xs md:text-sm relative z-10"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-10 h-10 gold-gradient text-onyx rounded-xl shadow-2xl hover:scale-105 active:scale-90 transition-all disabled:opacity-20 flex items-center justify-center flex-shrink-0 z-10"
                    >
                      <Send className="w-4 h-4 fill-onyx/20" />
                    </button>
                  </form>
                </footer>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-8"
              >
                 <div className="relative">
                    <div className="absolute -inset-10 bg-gold/5 blur-[60px] rounded-full animate-pulse" />
                    <div className="relative w-28 h-28 md:w-40 md:h-40 gold-gradient rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-12 group hover:rotate-0 transition-transform duration-700">
                       <MessageCircle className="text-white w-12 h-12 md:w-20 md:h-20 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                    </div>
                 </div>
                 <div className="space-y-4 max-w-sm">
                    <h2 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight">Divine Dialogues</h2>
                    <p className="text-white/30 text-sm md:text-base font-medium leading-relaxed italic">
                      "Dialogue is the melody of two spirits finding resonance."
                    </p>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(197, 160, 89, 0.2); }
        .gold-gradient { background: linear-gradient(135deg, #c5a059 0%, #e8d5b5 50%, #c5a059 100%); }
      `}</style>
      {(!showChatMobile || !isMobile) && <BottomNav />}
    </div>
  );
}
