"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

export default function VideoCall({ remoteUserId }: { remoteUserId: string }) {
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const startCall = async () => {
    setIsCalling(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // WebRTC signaling logic would go here
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const endCall = () => {
    setIsCalling(false);
    // Cleanup stream
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-4xl bg-zinc-900 overflow-hidden rounded-3xl">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-zinc-500 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full royal-gradient animate-pulse" />
            <p className="font-serif text-xl">Connecting with Matched Soul...</p>
          </div>
          <video ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute top-8 right-8 w-48 h-64 bg-zinc-800 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
          <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover mirror" />
        </div>

        {/* Controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500' : 'bg-white/10 backdrop-blur-md'}`}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </button>
          
          <button 
            onClick={isCalling ? endCall : startCall}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${isCalling ? 'bg-red-500 rotate-[135deg]' : 'bg-green-500'}`}
          >
            <Phone className="w-10 h-10 text-white fill-white" />
          </button>

          <button 
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500' : 'bg-white/10 backdrop-blur-md'}`}
          >
            {isVideoOff ? <VideoOff /> : <Video />}
          </button>
        </div>
      </div>
    </div>
  );
}
