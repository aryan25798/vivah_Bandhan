import React from "react";
import { motion } from "framer-motion";

export const ProfileCardSkeleton = () => (
  <div className="aspect-[3/4.2] bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden relative">
    <div className="w-full h-full bg-gradient-to-b from-white/5 to-transparent animate-pulse" />
    <div className="absolute inset-x-4 bottom-4 p-5 bg-black/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 space-y-3">
      <div className="h-2 w-1/3 bg-white/10 rounded-full animate-pulse" />
      <div className="h-4 w-2/3 bg-white/20 rounded-full animate-pulse" />
      <div className="h-2 w-1/2 bg-white/10 rounded-full animate-pulse" />
    </div>
  </div>
);

export const AdminUserSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl animate-pulse">
    <div className="w-12 h-12 rounded-full bg-white/10" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/4 bg-white/10 rounded-full" />
      <div className="h-2 w-1/3 bg-white/5 rounded-full" />
    </div>
    <div className="w-20 h-8 bg-white/10 rounded-lg" />
  </div>
);
