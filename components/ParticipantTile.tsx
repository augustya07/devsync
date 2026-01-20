import { VideoTrack, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { Participant, Track } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ConnectionQualityIndicator from './ConnectionQualityIndicator';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ParticipantTileProps {
    trackRef: TrackReferenceOrPlaceholder;
    className?: string;
    onTileClick?: () => void;
    showInfo?: boolean;
}

export default function ParticipantTile({ trackRef, className, onTileClick, showInfo = true }: ParticipantTileProps) {
    const { participant, source } = trackRef;
    const isCamera = source === Track.Source.Camera;
    const isScreenShare = source === Track.Source.ScreenShare;

    const getInitials = (identity: string) => identity.slice(0, 2).toUpperCase();
    const isLocal = participant.isLocal;
    const isSpeaking = participant.isSpeaking;
    const isMicEnabled = participant.isMicrophoneEnabled;
    const isCamEnabled = participant.isCameraEnabled;
    const connectionQuality = participant.connectionQuality;

    return (
        <div
            onClick={onTileClick}
            className={cn(
                "relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 shadow-xl transition-all duration-300 group",
                isSpeaking && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950",
                className
            )}
        >
            <VideoTrack
                trackRef={trackRef as any}
                className="h-full w-full object-cover"
            />

            {/* Fallback for disabled camera */}
            {isCamera && !isCamEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-2xl font-bold text-zinc-500 border border-white/10">
                        {getInitials(participant.identity)}
                    </div>
                </div>
            )}

            {/* Info Overlay */}
            {showInfo && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white border border-white/10 backdrop-blur-sm">
                                {getInitials(participant.identity)}
                            </div>
                            <span className="text-sm font-medium text-white truncate shadow-sm">
                                {participant.identity} {isLocal && '(You)'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-zinc-400">
                            {isCamera && !isCamEnabled && <VideoOff size={14} />}
                            {!isMicEnabled && <MicOff size={14} className="text-red-400" />}
                            {isMicEnabled && <Mic size={14} className="text-zinc-400" />}
                        </div>

                        {isSpeaking && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                        )}

                        {/* Connection Quality Indicator */}
                        <ConnectionQualityIndicator
                            quality={connectionQuality}
                            className="flex-shrink-0"
                        />
                    </div>
                </div>
            )}

            {/* Screen Share Badge */}
            {isScreenShare && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-indigo-500/90 text-white text-xs font-medium shadow-sm backdrop-blur-sm border border-white/20">
                    Sharing Screen
                </div>
            )}
        </div>
    );
}
