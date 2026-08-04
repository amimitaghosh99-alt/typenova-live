import React, { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '@/contexts/VideoCallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';

export function VideoCallOverlay() {
  const { 
    callState, 
    incomingCaller, 
    activeCallWith, 
    acceptCall, 
    rejectCall, 
    endCall,
    localStream,
    remoteStream,
    toggleVideo,
    toggleAudio
  } = useVideoCall();

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Handle Dragging
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const onMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const handleToggleVideo = () => {
    toggleVideo();
    setVideoEnabled(!videoEnabled);
  };

  const handleToggleAudio = () => {
    toggleAudio();
    setAudioEnabled(!audioEnabled);
  };

  if (callState === 'IDLE') return null;

  if (callState === 'INCOMING' && incomingCaller) {
    return (
      <div className="fixed top-6 right-6 z-[9999] bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-right-8 w-80">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
              <Phone className="text-emerald-400" size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold">{incomingCaller.username}</h4>
              <p className="text-sm text-zinc-400">Incoming Video Call...</p>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <button 
              onClick={acceptCall}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Phone size={16} /> Accept
            </button>
            <button 
              onClick={rejectCall}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <PhoneOff size={16} /> Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callState === 'CONNECTED' || callState === 'CALLING') {
    return (
      <div 
        className={`fixed z-[9999] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${isExpanded ? 'w-[800px] h-[450px]' : 'w-72 h-48'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        {/* Drag Handle Bar */}
        <div 
          className="w-full h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 hover:bg-zinc-800 transition-colors"
          onMouseDown={onMouseDown}
        >
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{activeCallWith?.username || 'Calling...'}</span>
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-zinc-500 hover:text-white">
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* Video Area */}
        <div className="relative w-full h-[calc(100%-2rem)] bg-black">
          {/* Remote Video (Main) */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          
          {/* Local Video (PiP) */}
          <div className={`absolute bottom-4 right-4 border border-white/20 rounded-lg overflow-hidden bg-zinc-900 shadow-xl ${isExpanded ? 'w-48 h-32' : 'w-24 h-16'}`}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          </div>

          {/* Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 opacity-0 hover:opacity-100 transition-opacity">
            <button 
              onClick={handleToggleAudio}
              className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
            >
              {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button 
              onClick={handleToggleVideo}
              className={`p-3 rounded-full transition-colors ${videoEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
            >
              {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button 
              onClick={endCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
