import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';

export type CallState = 'IDLE' | 'CALLING' | 'INCOMING' | 'CONNECTED';

export interface UseWebRTCProps {
  userId: string | undefined;
  username: string | null;
}

export function useWebRTC({ userId, username }: UseWebRTCProps) {
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCaller, setIncomingCaller] = useState<{ id: string; username: string } | null>(null);
  const [activeCallWith, setActiveCallWith] = useState<{ id: string; username: string } | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingChannel = useRef<any>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Initialize WebRTC and Signaling Channel via Socket.io
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    // Register this user for global peer-to-peer signaling routing
    socket.emit('register_user', { userId });

    const handleSignal = async (payload: any) => {
      const { type, from, fromName, data } = payload;

      switch (type) {
        case 'offer':
          if (peerConnection.current !== null) {
            // Already in a call or incoming call, reject automatically
            sendSignal(from, 'reject', { reason: 'busy' });
            return;
          }
          setIncomingCaller({ id: from, username: fromName });
          setCallState('INCOMING');
          // Store the offer to be processed when accepted
          peerConnection.current = createPeerConnection(from);
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
          break;

        case 'answer':
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
            processIceQueue();
          }
          break;

        case 'ice-candidate':
          if (peerConnection.current && peerConnection.current.remoteDescription) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
          } else {
            iceCandidatesQueue.current.push(data);
          }
          break;

        case 'reject':
          cleanupCall();
          toast.error(`${fromName} declined the call.`);
          break;

        case 'end':
          cleanupCall();
          toast.info('Call ended.');
          break;
      }
    };

    socket.on('webrtc_signal_receive', handleSignal);
    
    socket.on('webrtc_error', (err: any) => {
      cleanupCall();
      toast.error(err.message || 'Call failed: user unavailable');
    });

    return () => {
      socket.off('webrtc_signal_receive', handleSignal);
      socket.off('webrtc_error');
      cleanupCall();
    };
  }, [userId]); // Intentionally omitting username to prevent unnecessary re-subscriptions

  const sendSignal = (targetId: string, type: string, data: any) => {
    const socket = getSocket();
    if (!socket.connected) return;
    
    socket.emit('webrtc_signal', {
      targetId,
      type,
      from: userId,
      fromName: username,
      payload: data,
    });
  };

  const createPeerConnection = (targetId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(targetId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupCall();
        toast.error('Call connection lost');
      }
      if (pc.connectionState === 'connected') {
        setCallState('CONNECTED');
      }
    };

    return pc;
  };

  const processIceQueue = () => {
    if (!peerConnection.current) return;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  };

  const startLocalVideo = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera & Microphone access requires a secure connection (HTTPS) or localhost.');
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      toast.error(`Media error: ${err?.message || 'Camera/mic access denied.'}`);
      return null;
    }
  };

  const callUser = async (targetId: string, targetName: string) => {
    if (!userId) {
      toast.error('You must be logged in to start a video call.');
      return;
    }
    if (callState !== 'IDLE') return;
    
    setCallState('CALLING');
    setActiveCallWith({ id: targetId, username: targetName });

    const stream = await startLocalVideo();
    if (!stream) {
      cleanupCall();
      return;
    }

    const pc = createPeerConnection(targetId);
    peerConnection.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(targetId, 'offer', offer);
  };

  const acceptCall = async () => {
    if (!incomingCaller || !peerConnection.current) return;

    const stream = await startLocalVideo();
    if (!stream) {
      rejectCall();
      return;
    }

    stream.getTracks().forEach(track => peerConnection.current!.addTrack(track, stream));

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    sendSignal(incomingCaller.id, 'answer', answer);
    setActiveCallWith(incomingCaller);
    setIncomingCaller(null);
    setCallState('CONNECTED');
    processIceQueue();
  };

  const rejectCall = () => {
    if (incomingCaller) {
      sendSignal(incomingCaller.id, 'reject', { reason: 'declined' });
      cleanupCall();
    }
  };

  const endCall = () => {
    if (activeCallWith) {
      sendSignal(activeCallWith.id, 'end', {});
    } else if (incomingCaller) {
      rejectCall();
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('IDLE');
    setIncomingCaller(null);
    setActiveCallWith(null);
    iceCandidatesQueue.current = [];
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  };

  return {
    callState,
    localStream,
    remoteStream,
    incomingCaller,
    activeCallWith,
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
