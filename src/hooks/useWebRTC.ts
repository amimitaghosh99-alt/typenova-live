import { useState, useEffect, useRef, useCallback } from 'react';
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
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const usernameRef = useRef(username);
  const userIdRef = useRef(userId);
  const mountedRef = useRef(true);

  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  // Track mounted status and ensure all media tracks are explicitly stopped on unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, []);

  // Initialize WebRTC and Signaling Channel via Socket.io
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    // Register this user for global peer-to-peer signaling routing
    socket.emit('register_user', { userId });
    // Re-register on every (re)connect so the user stays reachable after
    // network blips — otherwise calls fail silently after a reconnect.
    socket.on('connect', registerUser);

    const handleSignal = async (payload: { type: string; from: string; fromName: string; data: unknown }) => {
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
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit));
          break;

        case 'answer':
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit));
            processIceQueue();
          }
          break;

        case 'ice-candidate':
          if (peerConnection.current) {
            if (peerConnection.current.remoteDescription) {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit));
            } else {
              iceCandidatesQueue.current.push(data as RTCIceCandidateInit);
            }
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

    socket.on('webrtc_error', (err: Error) => {
      cleanupCall();
      toast.error(err.message || 'Call failed: user unavailable');
    });

    return () => {
      socket.off('webrtc_signal_receive', handleSignal);
      socket.off('webrtc_error');
      socket.off('connect', registerUser);
      cleanupCall();
    };
  }, [userId]); // Intentionally omitting username to prevent unnecessary re-subscriptions

  function sendSignal(targetId: string, type: string, data: unknown) {
    const socket = getSocket();
    if (!socket.connected) return;

    socket.emit('webrtc_signal', {
      targetId,
      type,
      from: userIdRef.current,
      fromName: usernameRef.current,
      data,
    });
  }

  /** Register with signaling server, re-sending on reconnect to avoid being unreachable. */
  function registerUser() {
    const socket = getSocket();
    if (socket.connected && userIdRef.current) {
      socket.emit('register_user', { userId: userIdRef.current });
    }
  }

  function createPeerConnection(targetId: string) {
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
  }

  function processIceQueue() {
    if (!peerConnection.current) return;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  }

  const startLocalVideo = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera & Microphone access requires a secure connection (HTTPS) or localhost.');
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // If the component unmounted while we were waiting for the user to
      // grant camera permissions, stop all tracks immediately so the
      // camera LED turns off. Do NOT update state on a dead component.
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return null;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: unknown) {
      console.error('getUserMedia error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Camera/mic access denied.';
      if (mountedRef.current) {
        toast.error(`Media error: ${errorMessage}`);
      }
      return null;
    }
  };

  const callUser = useCallback(async (targetId: string, targetName: string) => {
    if (!userId) {
      toast.error('You must be logged in to start a video call.');
      return;
    }
    if (callState !== 'IDLE') return;

    setCallState('CALLING');
    setActiveCallWith({ id: targetId, username: targetName });

    // Create the peer connection BEFORE the async getUserMedia call
    // so the connection is ready when camera resolves.
    const pc = createPeerConnection(targetId);
    peerConnection.current = pc;

    const stream = await startLocalVideo();
    if (!stream) {
      cleanupCall();
      return;
    }
    // Re-check after async boundary — call may have been
    // cancelled/cleaned up while we waited for camera permissions.
    if (!peerConnection.current) {
      stream.getTracks().forEach(t => t.stop());
      cleanupCall();
      return;
    }

    stream.getTracks().forEach(track => peerConnection.current!.addTrack(track, stream));

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    sendSignal(targetId, 'offer', offer);
  }, [userId, callState]);

  const rejectCall = useCallback(() => {
    if (incomingCaller) {
      sendSignal(incomingCaller.id, 'reject', { reason: 'declined' });
      cleanupCall();
    }
  }, [incomingCaller]);

  const acceptCall = useCallback(async () => {
    if (!incomingCaller || !peerConnection.current) return;

    const callerId = incomingCaller.id;
    const stream = await startLocalVideo();
    if (!stream) {
      rejectCall();
      return;
    }
    // Re-check after async boundary — call may have been rejected or
    // cleaned up while we were waiting for camera permissions.
    if (!peerConnection.current) {
      stream.getTracks().forEach(t => t.stop());
      cleanupCall();
      return;
    }

    stream.getTracks().forEach(track => peerConnection.current!.addTrack(track, stream));

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    sendSignal(callerId, 'answer', answer);
    setActiveCallWith(incomingCaller);
    setIncomingCaller(null);
    setCallState('CONNECTED');
    processIceQueue();
  }, [incomingCaller, rejectCall]);

  const endCall = useCallback(() => {
    if (activeCallWith) {
      sendSignal(activeCallWith.id, 'end', {});
    } else if (incomingCaller) {
      rejectCall();
    }
    cleanupCall();
  }, [activeCallWith, incomingCaller, rejectCall]);

  function cleanupCall() {
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
  }

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  }, []);

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
