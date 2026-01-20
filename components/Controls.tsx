import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Monitor, Mic, Camera, MicOff, CameraOff, X, PenTool, PhoneOff, Smile, Code2, Paperclip, Bug } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import Reactions from './Reactions';

interface ControlsProps {
    onToggleWhiteboard: () => void;
    isWhiteboardOpen: boolean;
    onToggleCodeEditor: () => void;
    isCodeEditorOpen: boolean;
    onToggleFileSharing: () => void;
    isFileSharingOpen: boolean;
    onToggleDebugPanel: () => void;
    isDebugPanelOpen: boolean;
}

export default function Controls({
    onToggleWhiteboard,
    isWhiteboardOpen,
    onToggleCodeEditor,
    isCodeEditorOpen,
    onToggleFileSharing,
    isFileSharingOpen,
    onToggleDebugPanel,
    isDebugPanelOpen,
}: ControlsProps) {
    const room = useRoomContext();
    const router = useRouter();
    const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
    const [isReactionsOpen, setIsReactionsOpen] = useState(false);

    const handleLeave = async () => {
        try {
            await room.disconnect();
            router.push('/');
        } catch (e) {
            console.error(e);
            toast.error("Failed to disconnect");
        }
    };

    const handleScreenShareClick = async () => {
        const isSomeoneSharing = Array.from(room.remoteParticipants.values()).some((p) =>
            p.isScreenShareEnabled
        );

        if (isSomeoneSharing && !localParticipant.isScreenShareEnabled) {
            toast.warning("Someone else is sharing", {
                description: "You cannot share while someone else is presenting.",
                action: {
                    label: "Take Over",
                    onClick: async () => {
                        await toggleScreenShare();
                    }
                }
            });
            return;
        }

        await toggleScreenShare();
    };

    const toggleScreenShare = async () => {
        try {
            await localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled);
        } catch (e) {
            console.error(e);
            toast.error("Failed to toggle screen share");
        }
    };

    const toggleMic = async () => {
        if (!localParticipant) return;
        try {
            await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
            toast.info(isMicrophoneEnabled ? "Microphone muted" : "Microphone unmuted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to toggle microphone");
        }
    };

    const toggleCam = async () => {
        if (!localParticipant) return;
        try {
            await localParticipant.setCameraEnabled(!isCameraEnabled);
            toast.info(isCameraEnabled ? "Camera disabled" : "Camera enabled");
        } catch (e) {
            console.error(e);
            toast.error("Failed to toggle camera");
        }
    };

    return (
        <>
            {/* Reactions floating emojis overlay */}
            <Reactions
                isOpen={isReactionsOpen}
                onToggle={() => setIsReactionsOpen(false)}
            />

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-zinc-900/90 p-2 pl-4 pr-2 shadow-2xl backdrop-blur-xl border border-white/10 z-50 ring-1 ring-white/5">

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMic}
                        className={`p-3 rounded-full transition-all duration-200 ${isMicrophoneEnabled
                            ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        title={isMicrophoneEnabled ? "Mute" : "Unmute"}
                        aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
                    >
                        {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <button
                        onClick={toggleCam}
                        className={`p-3 rounded-full transition-all duration-200 ${isCameraEnabled
                            ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        title={isCameraEnabled ? "Stop Video" : "Start Video"}
                        aria-label={isCameraEnabled ? "Disable camera" : "Enable camera"}
                    >
                        {isCameraEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
                    </button>
                </div>

                <div className="h-8 w-px bg-white/10 mx-1" />

                <button
                    onClick={onToggleWhiteboard}
                    className={`p-3 rounded-full transition-all duration-200 ${isWhiteboardOpen
                        ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Toggle Whiteboard"
                    aria-label="Toggle whiteboard"
                >
                    <PenTool size={20} />
                </button>

                <button
                    onClick={onToggleCodeEditor}
                    className={`p-3 rounded-full transition-all duration-200 ${isCodeEditorOpen
                        ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Toggle Code Editor"
                    aria-label="Toggle code editor"
                >
                    <Code2 size={20} />
                </button>

                {/* File Sharing Button */}
                <button
                    onClick={onToggleFileSharing}
                    className={`p-3 rounded-full transition-all duration-200 ${isFileSharingOpen
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Share Files"
                    aria-label="Share files"
                >
                    <Paperclip size={20} />
                </button>

                <button
                    onClick={handleScreenShareClick}
                    className={`p-3 rounded-full transition-all duration-200 ${localParticipant.isScreenShareEnabled
                        ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Share Screen"
                    aria-label="Share screen"
                >
                    {localParticipant.isScreenShareEnabled ? <X size={20} /> : <Monitor size={20} />}
                </button>

                {/* Reactions Button */}
                <div className="relative">
                    <button
                        onClick={() => setIsReactionsOpen(!isReactionsOpen)}
                        className={`p-3 rounded-full transition-all duration-200 ${isReactionsOpen
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                        title="Send Reaction"
                        aria-label="Send reaction"
                    >
                        <Smile size={20} />
                    </button>
                </div>

                {/* Debug Panel Button */}
                <button
                    onClick={onToggleDebugPanel}
                    className={`p-3 rounded-full transition-all duration-200 ${isDebugPanelOpen
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Debug Panel"
                    aria-label="Toggle debug panel"
                >
                    <Bug size={20} />
                </button>

                <div className="h-8 w-px bg-white/10 mx-1" />

                <button
                    onClick={handleLeave}
                    className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg hover:shadow-red-600/30"
                    title="End Call"
                    aria-label="Leave call"
                >
                    <PhoneOff size={20} />
                </button>
            </div>
        </>
    );
}
