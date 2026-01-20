'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useRoomContext,
    useLocalParticipant,
    useRemoteParticipants,
    useConnectionState,
} from '@livekit/components-react';
import { ConnectionState, ConnectionQuality, Track, RoomEvent } from 'livekit-client';
import {
    Bug,
    X,
    Wifi,
    WifiOff,
    Users,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Copy,
    Check,
} from 'lucide-react';

interface DebugPanelProps {
    isOpen: boolean;
    onClose: () => void;
    whiteboardStrokesCount?: number;
    sharedFilesCount?: number;
    joinStartTime?: number;
}

interface NetworkStats {
    audioPacketsLostOut: number;
    videoPacketsLostOut: number;
    audioPacketsLostIn: number;
    videoPacketsLostIn: number;
    audioBitrateOut: number;
    videoBitrateOut: number;
    audioBitrateIn: number;
    videoBitrateIn: number;
    rtt: number;
    packetLossPercent: number;
    totalPacketsSent: number;
    totalPacketsReceived: number;
}

const defaultNetworkStats: NetworkStats = {
    audioPacketsLostOut: 0,
    videoPacketsLostOut: 0,
    audioPacketsLostIn: 0,
    videoPacketsLostIn: 0,
    audioBitrateOut: 0,
    videoBitrateOut: 0,
    audioBitrateIn: 0,
    videoBitrateIn: 0,
    rtt: 0,
    packetLossPercent: 0,
    totalPacketsSent: 0,
    totalPacketsReceived: 0,
};

export default function DebugPanel({
    isOpen,
    onClose,
    whiteboardStrokesCount = 0,
    sharedFilesCount = 0,
    joinStartTime,
}: DebugPanelProps) {
    const room = useRoomContext();
    const connectionState = useConnectionState();
    const { localParticipant } = useLocalParticipant();
    const remoteParticipants = useRemoteParticipants();

    const [networkStats, setNetworkStats] = useState<NetworkStats>(defaultNetworkStats);
    const [copied, setCopied] = useState(false);
    const [joinLatency, setJoinLatency] = useState<number | null>(null);

    // Previous byte counts for bitrate calculation
    const prevBytesRef = useRef<{
        audioBytesSent: number;
        videoBytesSent: number;
        audioBytesReceived: number;
        videoBytesReceived: number;
        timestamp: number;
    }>({
        audioBytesSent: 0,
        videoBytesSent: 0,
        audioBytesReceived: 0,
        videoBytesReceived: 0,
        timestamp: Date.now(),
    });

    const prevPacketsRef = useRef<{
        audioPacketsLostOut: number;
        videoPacketsLostOut: number;
        audioPacketsLostIn: number;
        videoPacketsLostIn: number;
        totalPacketsSent: number;
        totalPacketsReceived: number;
    }>({
        audioPacketsLostOut: 0,
        videoPacketsLostOut: 0,
        audioPacketsLostIn: 0,
        videoPacketsLostIn: 0,
        totalPacketsSent: 0,
        totalPacketsReceived: 0,
    });

    // Track join latency
    useEffect(() => {
        if (!room || !joinStartTime) return;
        if (connectionState === ConnectionState.Connected && joinLatency === null) {
            setJoinLatency(Date.now() - joinStartTime);
        }
    }, [room, connectionState, joinStartTime, joinLatency]);

    // Fetch WebRTC stats periodically
    useEffect(() => {
        if (!room || connectionState !== ConnectionState.Connected || !isOpen) return;

        const fetchStats = async () => {
            try {
                const stats: NetworkStats = { ...defaultNetworkStats };
                const now = Date.now();
                const timeDelta = (now - prevBytesRef.current.timestamp) / 1000;

                let currentAudioBytesSent = 0;
                let currentVideoBytesSent = 0;
                let currentAudioBytesReceived = 0;
                let currentVideoBytesReceived = 0;

                // Get stats from local tracks (outbound)
                const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
                const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);

                if (audioTrack?.track) {
                    const trackStats = await audioTrack.track.getRTCStatsReport();
                    trackStats?.forEach((report: any) => {
                        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                            stats.audioPacketsLostOut = report.packetsLost || 0;
                            stats.totalPacketsSent += report.packetsSent || 0;
                            currentAudioBytesSent = report.bytesSent || 0;
                        }
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            stats.rtt = (report.currentRoundTripTime || 0) * 1000;
                        }
                    });
                }

                if (videoTrack?.track) {
                    const trackStats = await videoTrack.track.getRTCStatsReport();
                    trackStats?.forEach((report: any) => {
                        if (report.type === 'outbound-rtp' && report.kind === 'video') {
                            stats.videoPacketsLostOut = report.packetsLost || 0;
                            stats.totalPacketsSent += report.packetsSent || 0;
                            currentVideoBytesSent = report.bytesSent || 0;
                        }
                        if (report.type === 'candidate-pair' && report.state === 'succeeded' && stats.rtt === 0) {
                            stats.rtt = (report.currentRoundTripTime || 0) * 1000;
                        }
                    });
                }

                // Sample up to 2 remote participants for inbound stats
                const sampledParticipants = remoteParticipants.slice(0, 2);
                for (const participant of sampledParticipants) {
                    const remoteAudio = participant.getTrackPublication(Track.Source.Microphone);
                    const remoteVideo = participant.getTrackPublication(Track.Source.Camera);

                    if (remoteAudio?.track) {
                        const trackStats = await remoteAudio.track.getRTCStatsReport();
                        trackStats?.forEach((report: any) => {
                            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                                stats.audioPacketsLostIn += report.packetsLost || 0;
                                stats.totalPacketsReceived += report.packetsReceived || 0;
                                currentAudioBytesReceived += report.bytesReceived || 0;
                            }
                        });
                    }

                    if (remoteVideo?.track) {
                        const trackStats = await remoteVideo.track.getRTCStatsReport();
                        trackStats?.forEach((report: any) => {
                            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                                stats.videoPacketsLostIn += report.packetsLost || 0;
                                stats.totalPacketsReceived += report.packetsReceived || 0;
                                currentVideoBytesReceived += report.bytesReceived || 0;
                            }
                        });
                    }
                }

                // Calculate bitrates (kbps)
                if (timeDelta > 0) {
                    stats.audioBitrateOut = Math.max(0, Math.round(
                        ((currentAudioBytesSent - prevBytesRef.current.audioBytesSent) * 8) / timeDelta / 1000
                    ));
                    stats.videoBitrateOut = Math.max(0, Math.round(
                        ((currentVideoBytesSent - prevBytesRef.current.videoBytesSent) * 8) / timeDelta / 1000
                    ));
                    stats.audioBitrateIn = Math.max(0, Math.round(
                        ((currentAudioBytesReceived - prevBytesRef.current.audioBytesReceived) * 8) / timeDelta / 1000
                    ));
                    stats.videoBitrateIn = Math.max(0, Math.round(
                        ((currentVideoBytesReceived - prevBytesRef.current.videoBytesReceived) * 8) / timeDelta / 1000
                    ));

                    // Calculate packet loss percentage
                    const totalLostDelta = (stats.audioPacketsLostOut - prevPacketsRef.current.audioPacketsLostOut) +
                        (stats.videoPacketsLostOut - prevPacketsRef.current.videoPacketsLostOut) +
                        (stats.audioPacketsLostIn - prevPacketsRef.current.audioPacketsLostIn) +
                        (stats.videoPacketsLostIn - prevPacketsRef.current.videoPacketsLostIn);
                    const sentDelta = stats.totalPacketsSent - prevPacketsRef.current.totalPacketsSent;
                    const receivedDelta = stats.totalPacketsReceived - prevPacketsRef.current.totalPacketsReceived;
                    const totalPackets = totalLostDelta + sentDelta + receivedDelta;
                    if (totalPackets > 0) {
                        stats.packetLossPercent = Math.round((totalLostDelta / totalPackets) * 1000) / 10;
                    }
                }

                prevBytesRef.current = {
                    audioBytesSent: currentAudioBytesSent,
                    videoBytesSent: currentVideoBytesSent,
                    audioBytesReceived: currentAudioBytesReceived,
                    videoBytesReceived: currentVideoBytesReceived,
                    timestamp: now,
                };

                prevPacketsRef.current = {
                    audioPacketsLostOut: stats.audioPacketsLostOut,
                    videoPacketsLostOut: stats.videoPacketsLostOut,
                    audioPacketsLostIn: stats.audioPacketsLostIn,
                    videoPacketsLostIn: stats.videoPacketsLostIn,
                    totalPacketsSent: stats.totalPacketsSent,
                    totalPacketsReceived: stats.totalPacketsReceived,
                };

                setNetworkStats(stats);
            } catch (err) {
                console.warn('[DebugPanel] Error fetching stats:', err);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, [room, connectionState, localParticipant, remoteParticipants, isOpen]);

    const getConnectionColor = () => {
        switch (connectionState) {
            case ConnectionState.Connected: return 'text-green-400';
            case ConnectionState.Connecting:
            case ConnectionState.Reconnecting: return 'text-yellow-400';
            default: return 'text-red-400';
        }
    };

    const getQualityLabel = (quality: ConnectionQuality) => {
        switch (quality) {
            case ConnectionQuality.Excellent: return { label: 'Excellent', color: 'text-green-400' };
            case ConnectionQuality.Good: return { label: 'Good', color: 'text-green-300' };
            case ConnectionQuality.Poor: return { label: 'Poor', color: 'text-yellow-400' };
            case ConnectionQuality.Lost: return { label: 'Lost', color: 'text-red-400' };
            default: return { label: 'Unknown', color: 'text-zinc-400' };
        }
    };

    const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
        if (value <= thresholds.good) return 'text-green-400';
        if (value <= thresholds.warning) return 'text-yellow-400';
        return 'text-red-400';
    };

    const copyRoomInfo = useCallback(() => {
        const info = {
            roomName: room?.name,
            localIdentity: localParticipant?.identity,
            participantCount: remoteParticipants.length + 1,
            connectionState,
            rtt: networkStats.rtt,
            packetLoss: networkStats.packetLossPercent,
            timestamp: new Date().toISOString(),
        };
        navigator.clipboard.writeText(JSON.stringify(info, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [room, localParticipant, remoteParticipants, connectionState, networkStats]);

    if (!isOpen) return null;

    const totalBitrateOut = networkStats.audioBitrateOut + networkStats.videoBitrateOut;
    const totalBitrateIn = networkStats.audioBitrateIn + networkStats.videoBitrateIn;
    const qualityInfo = getQualityLabel(localParticipant?.connectionQuality || ConnectionQuality.Unknown);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed right-4 top-4 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden z-50"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/50 border-b border-zinc-700/50">
                    <div className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-sm text-white">Debug</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={copyRoomInfo}
                            className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
                            title="Copy debug info"
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
                        >
                            <X className="h-4 w-4 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-3">
                    {/* Connection Status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {connectionState === ConnectionState.Connected ? (
                                <Wifi className="h-4 w-4 text-green-400" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-red-400" />
                            )}
                            <span className={`text-sm font-medium ${getConnectionColor()}`}>
                                {connectionState}
                            </span>
                        </div>
                        <span className={`text-xs ${qualityInfo.color}`}>{qualityInfo.label}</span>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* RTT */}
                        <div className="bg-zinc-800/50 rounded-lg p-2">
                            <div className="text-[10px] text-zinc-500 uppercase">RTT</div>
                            <div className={`text-sm font-mono ${getMetricColor(networkStats.rtt, { good: 100, warning: 200 })}`}>
                                {networkStats.rtt.toFixed(0)}ms
                            </div>
                        </div>

                        {/* Packet Loss */}
                        <div className="bg-zinc-800/50 rounded-lg p-2">
                            <div className="text-[10px] text-zinc-500 uppercase">Loss</div>
                            <div className={`text-sm font-mono ${getMetricColor(networkStats.packetLossPercent, { good: 0.5, warning: 2 })}`}>
                                {networkStats.packetLossPercent.toFixed(1)}%
                            </div>
                        </div>

                        {/* Bitrate Out */}
                        <div className="bg-zinc-800/50 rounded-lg p-2">
                            <div className="text-[10px] text-zinc-500 uppercase">↑ Out</div>
                            <div className="text-sm font-mono text-green-400">
                                {totalBitrateOut} <span className="text-[10px] text-zinc-500">kbps</span>
                            </div>
                        </div>

                        {/* Bitrate In */}
                        <div className="bg-zinc-800/50 rounded-lg p-2">
                            <div className="text-[10px] text-zinc-500 uppercase">↓ In</div>
                            <div className="text-sm font-mono text-blue-400">
                                {totalBitrateIn} <span className="text-[10px] text-zinc-500">kbps</span>
                            </div>
                        </div>
                    </div>

                    {/* Room & Participants */}
                    <div className="bg-zinc-800/30 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Room</span>
                            <span className="text-zinc-300 font-mono truncate max-w-[140px]">
                                {room?.name || '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Participants</span>
                            <span className="flex items-center gap-1 text-indigo-400">
                                <Users className="h-3 w-3" />
                                {remoteParticipants.length + 1}
                            </span>
                        </div>
                        {joinLatency !== null && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500">Join time</span>
                                <span className={joinLatency < 1000 ? 'text-green-400' : joinLatency < 2000 ? 'text-yellow-400' : 'text-red-400'}>
                                    {joinLatency}ms
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Local Media Status */}
                    <div className="flex items-center justify-center gap-4 py-1">
                        <div className="flex items-center gap-1">
                            {localParticipant?.isCameraEnabled ? (
                                <Video className="h-4 w-4 text-green-400" />
                            ) : (
                                <VideoOff className="h-4 w-4 text-zinc-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {localParticipant?.isMicrophoneEnabled ? (
                                <Mic className="h-4 w-4 text-green-400" />
                            ) : (
                                <MicOff className="h-4 w-4 text-zinc-500" />
                            )}
                        </div>
                        {(whiteboardStrokesCount > 0 || sharedFilesCount > 0) && (
                            <div className="text-[10px] text-zinc-500">
                                {whiteboardStrokesCount > 0 && <span className="text-amber-400">{whiteboardStrokesCount} strokes</span>}
                                {whiteboardStrokesCount > 0 && sharedFilesCount > 0 && ' · '}
                                {sharedFilesCount > 0 && <span className="text-purple-400">{sharedFilesCount} files</span>}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
