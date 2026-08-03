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

  return (
    <VideoCallContext.Provider value={webrtc}>
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
