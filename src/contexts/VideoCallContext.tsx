import React, { createContext, useContext } from 'react';
import { useWebRTC, type UseWebRTCProps } from '@/hooks/useWebRTC';

type VideoCallContextType = ReturnType<typeof useWebRTC>;

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export function VideoCallProvider({ 
  children, 
  userId, 
  username 
}: { children: React.ReactNode } & UseWebRTCProps) {
  const webrtc = useWebRTC({ userId, username });
  // useMemo ensures the context value reference remains stable across renders
  // as long as the underlying hook's returned object properties don't change identity.
  const value = React.useMemo(() => webrtc, [
    webrtc.localStream,
    webrtc.remoteStream,
    webrtc.callState,
    webrtc.incomingCaller,
    webrtc.activeCallWith,
    webrtc.callUser,
    webrtc.acceptCall,
    webrtc.rejectCall,
    webrtc.endCall,
    webrtc.toggleVideo,
    webrtc.toggleAudio,
  ]);

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const ctx = useContext(VideoCallContext);
  if (!ctx) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return ctx;
}
