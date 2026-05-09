"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  getDocs, 
  limit, 
  startAfter, 
  getCountFromServer, 
  QueryDocumentSnapshot, 
  DocumentData, 
  where, 
  onSnapshot, 
  doc, 
  orderBy, 
  updateDoc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  TrendingUp, 
  Search, 
  MoreVertical,
  Activity,
  UserCheck,
  X,
  FileDown,
  Upload,
  Globe,
  Shield,
  Star,
  Trash2,
  Ban,
  CheckCircle,
  Eye,
  Settings,
  LayoutDashboard,
  Zap,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Script from "next/script";

declare global {
  interface Window {
    L: any;
  }
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    managedUsers: 0,
    activeChats: 0,
    bannedUsers: 0,
    growth: 12.5
  });
  
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [lastUserDoc, setLastUserDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'chats' | 'managed' | 'map' | 'hotline'>('overview');
  const hasInitialized = useRef(false);
  const loadMoreRef = useRef<HTMLButtonElement>(null);

  // Multi-Layer Tab Persistence (URL Hash + LocalStorage)
  useEffect(() => {
    const savedTab = localStorage.getItem('admin_active_tab') as any;
    const hash = window.location.hash.replace('#', '') as any;
    const validTabs = ['overview', 'database', 'chats', 'managed', 'map'];
    
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    } else if (savedTab && validTabs.includes(savedTab)) {
      setActiveTab(savedTab);
    }
    
    setTimeout(() => {
      hasInitialized.current = true;
    }, 100);
  }, []);

  useEffect(() => {
    if (hasInitialized.current) {
      localStorage.setItem('admin_active_tab', activeTab);
      window.location.hash = activeTab;
      // Reset pagination when switching tabs to avoid offset conflicts
      setLastUserDoc(null);
      setRecentUsers([]);
      fetchAdminData(false);
    }
  }, [activeTab]);

  // Real-time Activity Surveillance: Global Interaction Tracking
  useEffect(() => {
    if (!user || activeTab !== 'overview') return;
    
    // Listen for recent pending requests to highlight active users
    const q = query(collection(db, "requests"), where("status", "==", "pending"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const stats: Record<string, { incoming: number, total: number }> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (!stats[data.toId]) stats[data.toId] = { incoming: 0, total: 0 };
        stats[data.toId].incoming += 1;
      });
      setGlobalInteractions(stats);
    });

    return () => unsub();
  }, [user, activeTab]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (activeTab !== 'database' && activeTab !== 'managed') return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        fetchAdminData(true);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [activeTab, loading]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<{ requests: any[], matches: any[] }>({ requests: [], matches: [] });
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Activity for Selected User
  useEffect(() => {
    if (!selectedUser) {
      setUserActivity({ requests: [], matches: [] });
      return;
    }

    const fetchActivity = async () => {
      const qReq = query(collection(db, "requests"), where("fromId", "==", selectedUser.id));
      const qRec = query(collection(db, "requests"), where("toId", "==", selectedUser.id));
      const qMat = query(collection(db, "matches"), where("users", "array-contains", selectedUser.id));

      const [reqSnap, recSnap, matSnap] = await Promise.all([
        getDocs(qReq),
        getDocs(qRec),
        getDocs(qMat)
      ]);

      setUserActivity({
        requests: [
          ...reqSnap.docs.map(d => ({ ...d.data(), type: 'Sent', id: d.id })),
          ...recSnap.docs.map(d => ({ ...d.data(), type: 'Received', id: d.id }))
        ],
        matches: matSnap.docs.map(d => ({ ...d.data(), id: d.id }))
      });
    };

    fetchActivity();
  }, [selectedUser]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [allUserLocations, setAllUserLocations] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [globalInteractions, setGlobalInteractions] = useState<Record<string, { incoming: number, total: number }>>({});
  const [impersonateUid, setImpersonateUid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showManagedSurveillance, setShowManagedSurveillance] = useState(false);

  const handleBulkAction = async (action: 'ban' | 'premium' | 'unban' | 'delete') => {
    if (selectedUsers.size === 0) return;

    if (action === 'delete') {
      const confirm = window.confirm(`WARNING: This will PERMANENTLY DELETE ${selectedUsers.size} users, including their Auth accounts and Cloudinary images. This cannot be undone. Proceed?`);
      if (!confirm) return;
    }

    setIsBulkProcessing(true);
    try {
      if (action === 'delete') {
        const uids = Array.from(selectedUsers);
        const CHUNK_SIZE = 50; // Deleting images takes time, smaller chunks
        
        for (let i = 0; i < uids.length; i += CHUNK_SIZE) {
          const chunk = uids.slice(i, i + CHUNK_SIZE);
          const res = await fetch("/api/admin/nuke", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uids: chunk }),
          });
          if (!res.ok) throw new Error("Bulk deletion failed");
        }
      } else {
        const { writeBatch } = await import("firebase/firestore");
        const uids = Array.from(selectedUsers);
        const CHUNK_SIZE = 450;
        
        for (let i = 0; i < uids.length; i += CHUNK_SIZE) {
          const chunk = uids.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          
          chunk.forEach(uid => {
            const userRef = doc(db, "users", uid);
            if (action === 'ban') batch.update(userRef, { isBanned: true });
            if (action === 'unban') batch.update(userRef, { isBanned: false });
            if (action === 'premium') batch.update(userRef, { isPremium: true, tier: 'premium' });
          });
          
          await batch.commit();
        }
      }
      
      alert(`Bulk ${action} successful for ${selectedUsers.size} users.`);
      setSelectedUsers(new Set());
      fetchAdminData();
    } catch (error) {
      console.error("Bulk action failed:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const fetchAdminData = async (isLoadMore = false, search = "") => {
    if (!isLoadMore && !search) setLoading(true);
    if (search) setIsSearching(true);
    
    try {
      const { where, orderBy, query, collection, getDocs, limit, startAfter, getCountFromServer } = await import("firebase/firestore");
      
      // Only fetch stats on initial load or non-search refreshes to save reads
      if (!isLoadMore && !search) {
        const [
          userCountSnap,
          managedCountSnap,
          matchCountSnap,
          bannedCountSnap
        ] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(query(collection(db, "users"), where("isManaged", "==", true))),
          getCountFromServer(collection(db, "matches")),
          getCountFromServer(query(collection(db, "users"), where("isBanned", "==", true)))
        ]);
        
        setStats({
          totalUsers: userCountSnap.data().count,
          managedUsers: managedCountSnap.data().count,
          activeChats: matchCountSnap.data().count,
          bannedUsers: bannedCountSnap.data().count,
          growth: 12.5 
        });
      }
      
      let q;
      if (search) {
        // Multi-field search strategy: Primary Name Prefix Search
        const capitalizedSearch = search.charAt(0).toUpperCase() + search.slice(1);
        q = query(
          collection(db, "users"),
          where("fullName", ">=", capitalizedSearch),
          where("fullName", "<=", capitalizedSearch + "\uf8ff"),
          limit(50)
        );
      } else if (activeTab === 'managed') {
        // Specific query for Shadow Ops to ensure all 100+ managed users are fetched
        q = query(collection(db, "users"), where("isManaged", "==", true), limit(30));
        if (isLoadMore && lastUserDoc) {
          q = query(q, startAfter(lastUserDoc));
        }
      } else {
        q = query(collection(db, "users"), limit(20));
        if (isLoadMore && lastUserDoc) {
          q = query(q, startAfter(lastUserDoc));
        }
      }

      const querySnapshot = await getDocs(q);
      const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      const data = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.role !== 'admin' && !u.isAdmin);

      setRecentUsers(prev => {
        if (search && !isLoadMore) return data; // Replace results for new search
        const combined = isLoadMore ? [...prev, ...data] : data;
        const unique = Array.from(new Map(combined.map(u => [u.id, u])).values());
        return unique;
      });
      
      if (!search) setLastUserDoc(newLastDoc);

      const locations = data
        .filter((u: any) => u.lastLoginLocation)
        .map((u: any) => ({
          id: u.id,
          uid: u.id,
          fullName: u.fullName,
          photoURL: u.photoURL,
          lat: u.lastLoginLocation.lat,
          lng: u.lastLoginLocation.lng,
          city: u.lastLoginLocation.city,
          country: u.lastLoginLocation.country,
          isLive: false
        }));
      setAllUserLocations(prev => {
        const combined = isLoadMore ? [...prev, ...locations] : locations;
        return Array.from(new Map(combined.map(l => [l.id, l])).values());
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Debounced Search Effect
  useEffect(() => {
    if (!hasInitialized.current) return;
    
    const handler = setTimeout(() => {
      fetchAdminData(false, searchTerm);
    }, 600);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "active_sessions"), orderBy("lastActive", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setActiveSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const initMap = () => {
      if (activeTab === 'map' && typeof window !== 'undefined' && window.L && !mapRef.current) {
        const container = document.getElementById('command-map');
        if (container) {
          try {
            mapRef.current = window.L.map('command-map', {
              center: [20, 0],
              zoom: 2,
              zoomControl: false,
              attributionControl: false
            });

            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            }).addTo(mapRef.current);

            window.L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
            setMapReady(true);
            console.log("Command Map initialized successfully");
          } catch (e) {
            console.error("Map init error:", e);
          }
        }
      }
    };

    if (activeTab === 'map') {
      // Try immediately
      initMap();
      // Also try after a short delay to ensure DOM is ready
      const timer = setTimeout(initMap, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    if (mapRef.current && window.L && mapReady) {
      // Combine Live and Historical Data
      const liveUids = new Set(activeSessions.map(s => s.uid || s.id));
      const combined = [
        ...activeSessions.map(s => ({ ...s, isLive: true })),
        ...allUserLocations.filter(loc => !liveUids.has(loc.uid)).map(loc => ({ ...loc, isLive: false }))
      ];

      const currentIds = new Set(combined.map(s => s.id));
      
      // Remove old markers
      Object.keys(markersRef.current).forEach(id => {
        if (!currentIds.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });

      const bounds: any[] = [];

      // Add/Update markers
      combined.forEach(session => {
        const lat = parseFloat(session.lat || session.latitude) || 0;
        const lon = parseFloat(session.lng || session.longitude || session.lon) || 0;
        
        // Even if at 0,0, let's show them for debugging if requested, but user wants "real" map
        if (lat === 0 && lon === 0) return;

        bounds.push([lat, lon]);

        if (markersRef.current[session.id]) {
          markersRef.current[session.id].setLatLng([lat, lon]);
        } else {
          const customIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="relative">
                ${session.isLive ? '<div class="absolute inset-0 w-8 h-8 -left-2.5 -top-2.5 bg-rose-gold/40 rounded-full animate-ping"></div>' : ''}
                <div class="w-3 h-3 ${session.isLive ? 'bg-rose-gold' : 'bg-zinc-600'} rounded-full border-2 border-white shadow-xl"></div>
              </div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          const marker = window.L.marker([lat, lon], { icon: customIcon }).addTo(mapRef.current);
          
          marker.bindPopup(`
            <div class="p-3 min-w-[180px] bg-black text-white rounded-2xl border border-white/10 shadow-2xl">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-1.5 rounded-full ${session.isLive ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}"></div>
                <span class="text-[9px] font-black uppercase tracking-widest ${session.isLive ? 'text-green-400' : 'text-zinc-500'}">
                  ${session.isLive ? 'Online Now' : 'Last Known'}
                </span>
              </div>
              <p class="font-bold text-xs">${session.fullName}</p>
              <p class="text-[9px] text-rose-gold uppercase mt-0.5">${session.city || 'Unknown'}, ${session.country || 'Global'}</p>
            </div>
          `, { className: 'premium-popup' });

          markersRef.current[session.id] = marker;
        }
      });

      // Auto-fit bounds if we have points
      if (bounds.length > 0 && mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
      }
    }
  }, [activeTab, activeSessions, allUserLocations, mapReady]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "matches"), orderBy("updatedAt", "desc"), limit(20));
    const unsub = onSnapshot(q, async (snap) => {
      const matchDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllMatches(matchDocs);

      const uids = new Set<string>();
      matchDocs.forEach((m: any) => m.users.forEach((uid: string) => uids.add(uid)));
      
      const newProfiles = { ...userProfiles };
      const missingUids = Array.from(uids).filter(uid => !newProfiles[uid]);

      if (missingUids.length > 0) {
        const { query, collection, where, getDocs } = await import("firebase/firestore");
        
        for (let i = 0; i < missingUids.length; i += 30) {
          const chunk = missingUids.slice(i, i + 30);
          const pSnap = await getDocs(query(collection(db, "users"), where("uid", "in", chunk)));
          pSnap.forEach(d => {
            newProfiles[d.id] = d.data();
          });
        }
        setUserProfiles(newProfiles);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const idTokenResult = await user.getIdTokenResult();
        if (!idTokenResult.claims.admin) {
          router.push("/");
          return;
        }
        await fetchAdminData();
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };
    checkAdmin();
  }, [user, router]);

  const exportToExcel = async () => {
    setIsProcessing(true);
    try {
      const { collection, getDocs, query, limit, startAfter } = await import("firebase/firestore");
      let allUsers: any[] = [];
      let lastDoc: any = null;
      const CHUNK_SIZE = 1000;
      let hasMore = true;

      // Paginated fetch to avoid memory/timeout issues
      while (hasMore) {
        let q = query(collection(db, "users"), limit(CHUNK_SIZE));
        if (lastDoc) q = query(q, startAfter(lastDoc));
        
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
          break;
        }

        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        allUsers = [...allUsers, ...data];
        lastDoc = snap.docs[snap.docs.length - 1];
        
        if (snap.docs.length < CHUNK_SIZE) hasMore = false;
        console.log(`Export Progress: ${allUsers.length} users fetched...`);
      }

      const dataToExport = allUsers
        .filter(u => u.role !== 'admin' && !u.isAdmin)
        .map(u => {
          const { bio, password, role, isAdmin, lastLoginLocation, ...rest } = u;
          return {
            UID: u.id,
            Name: u.fullName || "N/A",
            Email: u.email || "N/A",
            Display_Picture: u.photoURL || "N/A",
            Tier: u.isPremium ? "Premium" : "Standard",
            Status: u.isBanned ? "Banned" : "Active",
            ...rest
          };
        });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master_Registry");
      XLSX.writeFile(workbook, `Vivah_Master_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Master Export sequence failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const { writeBatch } = await import("firebase/firestore");
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const CHUNK_SIZE = 450;
        let totalImported = 0;

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);

          chunk.forEach((row) => {
            const profileId = `managed_${Math.random().toString(36).substr(2, 9)}`;
            const userRef = doc(db, "users", profileId);
            
            // Intelligent Dynamic Mapping
            const userData: any = {
              onboarded: true,
              isManaged: true,
              badges: ["Admin Managed"],
              createdAt: new Date().toISOString(),
              role: "user",
              isAdmin: false,
              isBanned: false,
              isPremium: false,
              tier: "standard"
            };

            // Map all Excel columns to Firestore fields
            Object.keys(row).forEach(key => {
              const firestoreKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
              userData[firestoreKey] = row[key];
            });

            // Fallback for critical missing fields
            if (!userData.fullName) userData.fullName = row.Name || "Royal Member";
            if (!userData.email) userData.email = `member_${Math.random().toString(36).substr(2, 5)}@system.com`;

            batch.set(userRef, userData);
          });

          await batch.commit();
          totalImported += chunk.length;
          console.log(`Imported ${totalImported} / ${data.length}`);
        }

        alert(`Strategic Infiltration Complete: ${totalImported} souls successfully added to the registry.`);
        fetchAdminData();
      } catch (err) {
        console.error("Import failed:", err);
        alert("Bulk import sequence failed. Ensure spreadsheet formatting is valid.");
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleNuke = async (userId: string) => {
    if (!confirm("CRITICAL WARNING: This will permanently wipe this soul from existence (Firestore, Auth, Matches, Messages). This cannot be undone. Proceed?")) return;
    
    setIsProcessing(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/admin/nuke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, idToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Target neutralized and wiped.");
      fetchAdminData();
    } catch (err: any) {
      alert(`Nuke failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setSelectedUser(null);
    }
  };

  const handleBan = async (userId: string, currentBanned: boolean) => {
    setIsProcessing(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: currentBanned ? 'unban' : 'ban', idToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`User ${currentBanned ? 'restored' : 'banned'} successfully.`);
      fetchAdminData();
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePremium = async (userId: string, currentPremium: boolean) => {
    setIsProcessing(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isPremium: !currentPremium, idToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Royal Premium status updated.");
      fetchAdminData();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !searchTerm.trim()) return;

    try {
      const msgData: any = {
        text: searchTerm,
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
      setSearchTerm("");
    } catch (err) {
      console.error("Failed to send divine message:", err);
    }
  };

  const openChatPlayback = (match: any) => {
    setSelectedChat(match);
    const q = query(collection(db, "matches", match.id, "messages"), orderBy("createdAt", "asc"));
    onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 md:p-10 font-sans selection:bg-rose-gold/30">
      <Script 
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
        strategy="afterInteractive"
      />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      
      {/* Dynamic Background Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1a1a1a,transparent)] pointer-events-none" />
      
      {/* Command Header */}
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-rose-gold animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-gold/60">System Level: God Mode</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tighter text-white">Command Center</h1>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-none">
            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 text-rose-gold hover:bg-rose-gold/10 transition-all cursor-pointer border border-rose-gold/20 font-bold text-xs uppercase tracking-widest">
              <Upload className="w-4 h-4" />
              Bulk Import
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" disabled={isProcessing} />
            </div>
          </label>
          <button 
            onClick={exportToExcel}
            className="glass px-6 py-3 rounded-2xl flex items-center gap-3 text-zinc-400 hover:text-white transition-all border border-white/5 font-bold text-xs uppercase tracking-widest"
          >
            <FileDown className="w-4 h-4" />
            Export
          </button>

          <button 
            onClick={() => {
              if (confirm("Terminate secure administrative session?")) {
                signOut(auth).then(() => router.push("/admin/login"));
              }
            }}
            className="glass px-6 py-3 rounded-2xl flex items-center gap-3 text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all border border-red-400/10 font-bold text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <nav className="relative z-10 flex bg-white/5 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/5 mb-10 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Surveillance', icon: <Activity className="w-4 h-4" /> },
          { id: 'hotline', label: 'Active Hub', icon: <Zap className="w-4 h-4" /> },
          { id: 'database', label: 'Registry', icon: <Users className="w-4 h-4" /> },
          { id: 'chats', label: 'Interceptions', icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'map', label: 'Global Map', icon: <Globe className="w-4 h-4" /> },
          { id: 'shadow', label: 'Shadow Fleet', icon: <Shield className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'shadow') {
                router.push('/admin/shadow');
              } else {
                setActiveTab(tab.id as any);
              }
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-rose-gold text-black shadow-[0_0_20px_rgba(197,160,89,0.4)]" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'hotline' && (
            <motion.div key="hotline" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
               <div className="glass rounded-[3rem] border border-white/5 overflow-hidden">
                 <div className="p-10 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-rose-gold/5">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-rose-gold animate-ping" />
                        <h2 className="text-3xl font-serif font-bold text-rose-gold">Signal Intelligence</h2>
                      </div>
                      <p className="text-zinc-500 text-sm">Priority Interception Queue: Isolating active engagement for immediate action.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                       <div className="px-6 py-3 bg-rose-gold text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {Object.keys(globalInteractions).length} Active Signals
                       </div>
                    </div>
                 </div>

                 {/* Signal Triage Filters */}
                 <div className="px-10 py-6 border-b border-white/5 flex gap-4">
                    <button className="px-5 py-2 bg-rose-gold/20 text-rose-gold rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-gold/30">All Signals</button>
                    <button className="px-5 py-2 bg-white/5 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Pending Requests</button>
                    <button className="px-5 py-2 bg-white/5 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Active Chats</button>
                 </div>

                 <div className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {/* Priority Queue: Users with PENDING incoming requests first */}
                       {recentUsers
                         .filter(u => globalInteractions[u.id]?.incoming > 0 || allMatches.some(m => m.users.includes(u.id)))
                         .sort((a, b) => (globalInteractions[b.id]?.incoming || 0) - (globalInteractions[a.id]?.incoming || 0))
                         .map((u) => (
                          <div key={u.id} className={`glass p-6 rounded-[2.5rem] border transition-all group flex gap-6 items-center ${globalInteractions[u.id]?.incoming > 0 ? 'border-rose-gold/40 bg-rose-gold/5 ring-1 ring-rose-gold/20' : 'border-white/10'}`}>
                             <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-900 border border-white/10 overflow-hidden shrink-0 shadow-2xl relative">
                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 m-7 text-zinc-700" />}
                                {globalInteractions[u.id]?.incoming > 0 && <div className="absolute inset-0 bg-rose-gold/10 animate-pulse" />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                   <h3 className="font-bold text-white truncate">{u.fullName}</h3>
                                   {globalInteractions[u.id]?.incoming > 0 && (
                                      <span className="px-2 py-0.5 bg-rose-gold text-black text-[8px] font-black uppercase tracking-widest rounded-lg animate-bounce">
                                         {globalInteractions[u.id].incoming} NEW
                                      </span>
                                   )}
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                   <div className={`w-1.5 h-1.5 rounded-full ${activeSessions.some(s => s.uid === u.id) ? 'bg-green-500' : 'bg-zinc-700'}`} />
                                   <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">{activeSessions.some(s => s.uid === u.id) ? 'Live Intercept' : 'Stored Profile'}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                   <button 
                                     onClick={() => setSelectedUser(u)}
                                     className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                   >
                                     Monitor
                                   </button>
                                   <button 
                                     onClick={() => {
                                       const m = allMatches.find(match => match.users.includes(u.id));
                                       if (m) {
                                         setActiveTab('chats');
                                         openChatPlayback(m);
                                       } else {
                                          setSelectedUser(u);
                                       }
                                     }}
                                     className="flex-1 py-3 bg-rose-gold/10 hover:bg-rose-gold/20 text-rose-gold rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-rose-gold/20"
                                   >
                                     Respond
                                   </button>
                                </div>
                             </div>
                          </div>
                       ))}
                       {recentUsers.filter(u => globalInteractions[u.id]?.incoming > 0 || allMatches.some(m => m.users.includes(u.id))).length === 0 && (
                          <div className="col-span-full py-32 text-center">
                             <div className="w-20 h-20 bg-white/2 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                                <Activity className="w-8 h-8 text-zinc-800" />
                             </div>
                             <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">No active signals detected in current range.</p>
                             <p className="text-[10px] text-zinc-700 mt-2">The system is monitoring 10k+ souls for any signs of engagement.</p>
                          </div>
                       )}
                    </div>
                 </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Stats High-Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                  { label: "Total Managed Souls", value: stats.managedUsers, icon: <Users className="w-5 h-5" />, trend: "+2.4%", color: "text-rose-gold" },
                  { label: "Active Connections", value: stats.activeChats, icon: <Activity className="w-5 h-5" />, trend: "Live", color: "text-green-400" },
                  { label: "Daily Throughput", value: stats.totalUsers * 12, icon: <TrendingUp className="w-5 h-5" />, trend: "Optimal", color: "text-blue-400" },
                  { label: "Security Alerts", value: stats.bannedUsers, icon: <ShieldAlert className="w-5 h-5" />, trend: `${stats.bannedUsers} Critical`, color: "text-red-400" },
                ].map((stat, i) => (
                  <div key={i} className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      {stat.icon}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${stat.color}`}>{stat.trend}</span>
                    </div>
                    <h3 className="text-4xl font-bold mb-1 tracking-tighter text-white">{stat.value}</h3>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass rounded-3xl border border-white/5 p-8">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-rose-gold" />
                    Growth Analytics
                  </h2>
                  <div className="h-64 flex items-end gap-2">
                    {[40, 70, 45, 90, 65, 80, 95].map((h, i) => (
                      <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group transition-all hover:bg-rose-gold/20">
                        <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className="absolute bottom-0 left-0 right-0 bg-rose-gold/10 rounded-t-lg" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass rounded-3xl border border-white/5 p-8">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                    System Anomalies
                  </h2>
                  <div className="space-y-4">
                    {[
                      "Suspicious login from Northern Region",
                      "Duplicate IP detected for User #8291",
                      "Chat keyword 'payment' triggered filter",
                    ].map((alert, i) => (
                      <div key={i} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-xs text-red-400 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {alert}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div key="database" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-2xl font-bold">Registry Surveillance</h2>
                  <div className="relative w-full md:w-96">
                    {isSearching ? (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-rose-gold/50 border-t-rose-gold animate-spin rounded-full" />
                    ) : (
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    )}
                    <input 
                      type="text" 
                      placeholder="Search 10k+ Souls in Real-time..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-rose-gold transition-all"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                        <th className="px-8 py-6 font-black w-10">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-rose-gold"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(new Set(recentUsers.map(u => u.id)));
                              } else {
                                setSelectedUsers(new Set());
                              }
                            }}
                          />
                        </th>
                        <th className="px-8 py-6 font-black">User Profile</th>
                        <th className="px-8 py-6 font-black">Tier</th>
                        <th className="px-8 py-6 font-black">Verification</th>
                        <th className="px-8 py-6 font-black">Managed</th>
                        <th className="px-8 py-6 font-black text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentUsers.map((u) => (
                        <tr key={u.id} className={`hover:bg-white/2 transition-colors group ${selectedUsers.has(u.id) ? 'bg-rose-gold/5' : ''}`}>
                          <td className="px-8 py-5">
                            <input 
                              type="checkbox" 
                              checked={selectedUsers.has(u.id)}
                              onChange={(e) => {
                                const next = new Set(selectedUsers);
                                if (e.target.checked) next.add(u.id);
                                else next.delete(u.id);
                                setSelectedUsers(next);
                              }}
                              className="w-4 h-4 rounded border-white/10 bg-white/5 accent-rose-gold"
                            />
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden">
                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-zinc-700" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-white group-hover:text-rose-gold transition-colors">{u.fullName}</p>
                                  {u.isPremium && <Star className="w-3 h-3 text-rose-gold fill-current" />}
                                  {u.isBanned && <Ban className="w-3 h-3 text-red-500" />}
                                </div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.email || "No Email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            {u.isPremium ? (
                              <span className="flex items-center gap-1.5 text-rose-gold text-[10px] font-black uppercase tracking-widest">
                                <Star className="w-3 h-3 fill-rose-gold" />
                                Royal
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Standard</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            {u.onboarded ? (
                              <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-black uppercase tracking-widest">
                                <CheckCircle className="w-3 h-3" />
                                Secured
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Pending</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                             {u.isManaged ? (
                               <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest">Shadow</span>
                             ) : (
                               <span className="text-zinc-700 text-[8px] font-black uppercase tracking-widest">Direct</span>
                             )}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={() => setSelectedUser(u)}
                              className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                              <Settings className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bulk Command Bar */}
                <AnimatePresence>
                  {selectedUsers.size > 0 && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6"
                    >
                      <div className="glass p-6 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-rose-gold text-black flex items-center justify-center font-black">
                             {selectedUsers.size}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-white">Souls Selected</p>
                             <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Ready for Command</p>
                           </div>
                        </div>

                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => handleBulkAction('premium')}
                             disabled={isBulkProcessing}
                             className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
                           >
                             Make Premium
                           </button>
                           <button 
                             onClick={() => handleBulkAction('ban')}
                             disabled={isBulkProcessing}
                             className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                           >
                             Ban
                           </button>
                           <button 
                             onClick={() => handleBulkAction('delete')}
                             disabled={isBulkProcessing}
                             className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                           >
                             Total Wipeout
                           </button>
                           <button 
                             onClick={() => handleBulkAction('unban')}
                             disabled={isBulkProcessing}
                             className="px-6 py-3 bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all disabled:opacity-50"
                           >
                             Unban
                           </button>
                           <button 
                             onClick={() => setSelectedUsers(new Set())}
                             className="p-3 text-zinc-500 hover:text-white transition-colors"
                           >
                             <X className="w-5 h-5" />
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-8 border-t border-white/5 flex justify-center">
                  <button 
                    onClick={() => fetchAdminData(true)}
                    disabled={loading}
                    className="px-10 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
                  >
                    {loading ? "Decrypting..." : "Scan More Souls"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chats' && (
            <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 glass rounded-3xl border border-white/5 flex flex-col h-[70vh]">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    Live Feeds
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                       <button 
                         onClick={() => setShowManagedSurveillance(false)}
                         className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!showManagedSurveillance ? 'bg-rose-gold text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                       >
                         Human
                       </button>
                       <button 
                         onClick={() => setShowManagedSurveillance(true)}
                         className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showManagedSurveillance ? 'bg-blue-500 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                       >
                         Fleet
                       </button>
                    </div>
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {allMatches.filter(m => showManagedSurveillance ? m.isManagedMatch : !m.isManagedMatch).map((match) => (
                    <button 
                      key={match.id} 
                      onClick={() => openChatPlayback(match)}
                      className={`w-full p-5 rounded-[2rem] border text-left transition-all ${selectedChat?.id === match.id ? 'bg-rose-gold/10 border-rose-gold/30' : 'bg-white/2 border-white/5 hover:bg-white/5'}`}
                    >
                      <div className="flex -space-x-3 mb-3">
                        {match.users.map((uid: string) => (
                          <div key={uid} className="w-8 h-8 rounded-full border-2 border-[#060606] bg-zinc-900 overflow-hidden shrink-0">
                            {userProfiles[uid]?.photoURL ? <img src={userProfiles[uid].photoURL} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 m-2 text-zinc-700" />}
                          </div>
                        ))}
                      </div>
                      <p className="font-bold text-xs mb-1 truncate text-white">
                        {match.users.map((uid: string) => userProfiles[uid]?.fullName || "Unknown").join(" & ")}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate italic">"{match.lastMessage}"</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-3 glass rounded-3xl border border-white/5 flex flex-col h-[70vh]">
                {selectedChat ? (
                  <>
                    <div className="p-8 border-b border-white/5 bg-white/2 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-4">
                           {selectedChat.users.map((uid: string) => (
                             <div key={uid} className="w-12 h-12 rounded-2xl border-4 border-[#060606] bg-zinc-900 overflow-hidden shrink-0 shadow-xl">
                               {userProfiles[uid]?.photoURL ? <img src={userProfiles[uid].photoURL} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 m-3 text-zinc-700" />}
                             </div>
                           ))}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-xl text-white">
                            {selectedChat.users.map((uid: string) => userProfiles[uid]?.fullName || "Unknown").join(" & ")}
                          </h3>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em]">Interception Active</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right hidden md:block">
                           <p className="text-[10px] font-black uppercase text-rose-gold">Live Stream</p>
                           <p className="text-[9px] text-zinc-600">Encrypted AES-256</p>
                         </div>
                         <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_#ef4444]" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.02)_0%,transparent_70%)]">
                      {messages.map((m, i) => {
                        const isMe = m.senderId === user?.uid;
                        const sender = userProfiles[m.senderId];
                        return (
                          <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`flex gap-4 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                               <div className="w-8 h-8 rounded-xl bg-zinc-900 overflow-hidden shrink-0 mt-1 border border-white/10">
                                  {m.isAdminMessage ? <ShieldCheck className="w-5 h-5 m-1.5 text-rose-gold" /> : (sender?.photoURL ? <img src={sender.photoURL} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 m-2 text-zinc-700" />)}
                               </div>
                               <div className={`space-y-2 ${isMe ? 'items-end' : 'items-start'}`}>
                                  <div className="flex items-center gap-2 px-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                      {m.isAdminMessage ? "Divine Command" : (sender?.fullName || "Unknown Soul")}
                                    </span>
                                  </div>
                                  <div className={`p-4 rounded-2xl text-sm relative ${
                                    m.isAdminMessage 
                                    ? 'bg-rose-gold text-black font-bold shadow-[0_10px_20px_rgba(197,160,89,0.2)]' 
                                    : m.isGhostwritten
                                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                                    : isMe 
                                    ? 'bg-white/10 border border-white/10 text-white' 
                                    : 'bg-zinc-900 border border-white/5 text-zinc-300'
                                  }`}>
                                    {m.text}
                                    {m.isGhostwritten && (
                                       <div className="absolute -bottom-5 right-0 text-[7px] font-black text-blue-400 uppercase tracking-widest opacity-60">
                                          Proxy Mediated
                                       </div>
                                    )}
                                  </div>
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Divine Intermediary Input Hub */}
                    <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
                       {/* Ghostwriting Controls */}
                       <div className="flex gap-2 mb-6">
                          <button 
                            onClick={() => setImpersonateUid(null)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!impersonateUid ? 'bg-rose-gold text-black' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                          >
                            <Shield className="w-3 h-3 inline mr-2" /> System Voice
                          </button>
                          {selectedChat.users.map((uid: string) => (
                            <button 
                              key={uid}
                              onClick={() => setImpersonateUid(uid)}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${impersonateUid === uid ? 'bg-blue-500 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                            >
                               <div className="w-4 h-4 rounded-full bg-zinc-900 overflow-hidden border border-white/10">
                                  {userProfiles[uid]?.photoURL ? <img src={userProfiles[uid].photoURL} className="w-full h-full object-cover" /> : <Users className="w-2.5 h-2.5 m-0.5 text-zinc-700" />}
                               </div>
                               As {userProfiles[uid]?.fullName?.split(' ')[0] || "Soul"}
                            </button>
                          ))}
                       </div>

                       <form onSubmit={sendMessage} className="relative group">
                          <input 
                            type="text" 
                            placeholder={impersonateUid ? `Speaking as ${userProfiles[impersonateUid]?.fullName}...` : "Broadcast as System Admin..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-sm focus:outline-none focus:ring-1 focus:ring-rose-gold transition-all"
                          />
                          <button 
                            type="submit"
                            disabled={!searchTerm.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-rose-gold text-black rounded-xl hover:shadow-[0_0_20px_rgba(197,160,89,0.4)] transition-all disabled:opacity-20"
                          >
                             <Zap className="w-4 h-4" />
                          </button>
                       </form>
                       <p className="text-[8px] text-zinc-600 uppercase tracking-[0.3em] mt-4 text-center">
                          Proxy Mode Active • All messages are logged for Divine Audit
                       </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">Select a feed to intercept</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-[4rem] border border-white/5 h-[80vh] relative overflow-hidden bg-black shadow-[0_0_100px_rgba(0,0,0,0.8)]">
               <div className="relative z-10 p-12 h-full flex flex-col md:flex-row gap-10">
                  {/* Map Visualization Area */}
                  <div className="flex-1 relative bg-white/2 rounded-[3rem] border border-white/5 overflow-hidden group">
                     <div id="command-map" className="absolute inset-0 z-10" />
                     
                     {!mapReady && (
                        <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center gap-6">
                           <Globe className="w-12 h-12 text-rose-gold animate-spin-slow" />
                           <div className="text-center">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">Initializing Command Map...</p>
                              <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-zinc-400"
                              >
                                Force Recalibrate
                              </button>
                           </div>
                        </div>
                     )}

                      {/* Tactical Overlay */}
                      <div className="absolute top-6 left-6 p-6 glass rounded-2xl border border-rose-gold/20 pointer-events-none z-20">
                         <div className="flex items-center gap-3 mb-2">
                           <div className="w-2 h-2 rounded-full bg-rose-gold animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-gold">Live Telemetry</span>
                         </div>
                         <p className="text-4xl font-serif font-bold text-white leading-none">{activeSessions.length}</p>
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Souls in Motion</p>
                      </div>
                   </div>

                   {/* Sidebar: Activity Log */}
                   <div className="w-full md:w-96 flex flex-col gap-6 relative z-20">
                      <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex-1 overflow-hidden flex flex-col">
                         <h3 className="text-lg font-bold mb-6 flex items-center gap-3 text-white">
                            <Activity className="w-4 h-4 text-rose-gold" />
                            Global Activity
                         </h3>
                         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {activeSessions.map((session) => (
                              <div 
                                key={session.id} 
                                className="p-4 bg-white/2 border border-white/5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                                onClick={() => {
                                  if (session.uid) {
                                    const u = recentUsers.find(ru => ru.id === session.uid);
                                    if (u) setSelectedUser(u);
                                  }
                                }}
                              >
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                       {session.photoURL ? <img src={session.photoURL} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 m-2.5 text-zinc-700" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-xs font-bold text-white truncate">{session.fullName}</p>
                                       <p className="text-[9px] text-zinc-500 truncate">{session.city}, {session.country}</p>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Management Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl glass rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <div className="p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-900 border-2 border-rose-gold/30 overflow-hidden shrink-0 shadow-2xl">
                   {selectedUser.photoURL ? <img src={selectedUser.photoURL} className="w-full h-full object-cover" /> : <Users className="w-12 h-12 m-10 text-zinc-700" />}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                    <h3 className="text-3xl font-bold tracking-tight">{selectedUser.fullName}</h3>
                    {selectedUser.isManaged && <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full self-center">Managed</span>}
                  </div>
                  <p className="text-zinc-500 mb-6 font-mono text-sm">UID: {selectedUser.id}</p>

                  {/* Interception Feed: Connection Hub */}
                  <div className="mb-8 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-rose-gold tracking-[0.2em] flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Interception Feed
                    </h4>
                       <div className="grid grid-cols-2 gap-3">
                       <div className="glass p-4 rounded-2xl border border-white/5">
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Interactions</p>
                         <p className="text-xl font-serif font-bold text-white">{userActivity.requests.length}</p>
                       </div>
                       <div className="glass p-4 rounded-2xl border border-white/5">
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Active Bonds</p>
                         <p className="text-xl font-serif font-bold text-white">{userActivity.matches.length}</p>
                       </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-3 mt-6">
                       {/* Section: Pending Actions */}
                       {userActivity.requests.filter(r => r.type === 'Received' && r.status === 'pending').length > 0 && (
                          <div className="space-y-2">
                             <p className="text-[8px] font-black uppercase text-rose-gold tracking-widest">Pending Interceptions</p>
                             {userActivity.requests.filter(r => r.type === 'Received' && r.status === 'pending').map((req, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-rose-gold/5 border border-rose-gold/20 shadow-lg">
                                   <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-1.5 rounded-full bg-rose-gold animate-ping" />
                                      <p className="text-[10px] font-bold text-white">Signal from {req.otherName || "External Soul"}</p>
                                   </div>
                                   <button 
                                     onClick={async () => {
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
                                              fromUid: req.otherId,
                                              toUid: selectedUser.id,
                                              toName: selectedUser.fullName,
                                              fromName: req.otherName
                                            })
                                          });
                                        if (res.ok) {
                                          setSelectedUser(null);
                                          setShowManagedSurveillance(true);
                                          setActiveTab('chats');
                                        }
                                        } catch (err) { console.error(err); }
                                        setIsProcessing(false);
                                     }}
                                     className="px-4 py-2 bg-rose-gold text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                   >
                                     Initialize Bond
                                   </button>
                                </div>
                             ))}
                          </div>
                       )}

                       {/* Section: Active Bonds */}
                       {userActivity.matches.length > 0 && (
                          <div className="space-y-2 mt-4">
                             <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest">Active Fleet Bonds</p>
                             {userActivity.matches.map((m, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                   <p className="text-[10px] font-bold text-white">Match with {m.users.find((id: string) => id !== selectedUser.id) ? (userProfiles[m.users.find((id: string) => id !== selectedUser.id)!]?.fullName || "Soul") : "Soul"}</p>
                                   <button 
                                     onClick={() => {
                                       setSelectedUser(null);
                                       setActiveTab('chats');
                                       openChatPlayback(m);
                                     }}
                                     className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                                   >
                                     Intercept
                                   </button>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {userActivity.requests.map((req, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5">
                           <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${req.type === 'Sent' ? 'bg-blue-400' : 'bg-green-400'}`} />
                              <p className="text-[10px] font-bold text-white">{req.type} Request</p>
                           </div>
                           <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{req.status}</p>
                        </div>
                      ))}
                      {userActivity.requests.length === 0 && (
                        <p className="text-[10px] text-center text-zinc-600 italic py-2">No active interactions detected.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Status</p>
                      <p className={`text-[10px] font-bold ${selectedUser.banned ? 'text-red-400' : 'text-green-400'}`}>{selectedUser.banned ? 'Banned' : 'Active'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Religion</p>
                      <p className="text-[10px] font-bold text-white">{selectedUser.religion}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Tier</p>
                      <p className="text-[10px] font-bold text-rose-gold">{selectedUser.isPremium ? 'Premium' : 'Free'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Daily Ops</p>
                      <p className="text-[10px] font-bold text-white">{selectedUser.dailyRequestCount || 0}/5</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => handleBan(selectedUser.id, selectedUser.banned)}
                      disabled={isProcessing}
                      className={`flex-1 min-w-[140px] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${selectedUser.banned ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}`}
                    >
                      <Ban className="w-4 h-4" />
                      {selectedUser.banned ? 'Restore Soul' : 'Ban Soul'}
                    </button>
                    <button 
                      onClick={() => handlePremium(selectedUser.id, selectedUser.isPremium)}
                      disabled={isProcessing}
                      className="flex-1 min-w-[140px] py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-gold text-black hover:shadow-[0_0_20px_rgba(197,160,89,0.4)] transition-all flex items-center justify-center gap-2"
                    >
                      <Star className={`w-4 h-4 ${selectedUser.isPremium ? 'fill-black' : ''}`} />
                      {selectedUser.isPremium ? 'Revoke Premium' : 'Grant Premium'}
                    </button>
                    <button 
                      onClick={() => handleNuke(selectedUser.id)}
                      disabled={isProcessing}
                      className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_10px_30px_rgba(220,38,38,0.2)]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Execute Nuke Sequence
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Loader */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-10 right-10 z-[110] glass p-6 rounded-3xl border border-rose-gold/30 shadow-2xl flex items-center gap-4">
            <div className="w-5 h-5 border-2 border-rose-gold border-t-transparent animate-spin rounded-full" />
            <p className="text-xs font-black uppercase tracking-widest text-rose-gold">Executing System Commands...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
