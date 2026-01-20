'use client';

import { LiveKitRoom, RoomAudioRenderer, StartAudio, useRoomContext, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, use, useCallback, useRef } from 'react';
import { RoomEvent } from 'livekit-client';
import { AnimatePresence } from 'framer-motion';
import StageLayout from '@/components/StageLayout';
import Controls from '@/components/Controls';
import Whiteboard, { Stroke } from '@/components/Whiteboard';
import FileSharing, { SharedFile, FILE_TOPIC } from '@/components/FileSharing';
import DebugPanel from '@/components/DebugPanel';
import { toast } from 'sonner';

interface PageProps {
    params: Promise<{ roomName: string }>;
    searchParams: Promise<{ user?: string }>;
}

export default function RoomPage({ params, searchParams }: PageProps) {
    const { roomName } = use(params);
    const { user } = use(searchParams);
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user || !roomName) return;

        (async () => {
            try {
                const resp = await fetch('/api/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomName,
                        identity: user,
                    }),
                });

                if (!resp.ok) {
                    throw new Error('Failed to fetch token');
                }

                const data = await resp.json();
                setToken(data.token);
            } catch (e) {
                console.error(e);
                setError('Failed to join room. Please try again.');
            }
        })();
    }, [user, roomName]);

    if (!user) {
        return <div className="flex h-screen items-center justify-center text-white">Missing Username</div>;
    }

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
                <div className="rounded-xl bg-red-500/10 p-4 text-red-500 border border-red-500/20">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-zinc-400">Joining room...</p>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            className="h-screen w-screen bg-zinc-950 overflow-hidden"
        >
            <RoomActiveContent />
        </LiveKitRoom>
    );
}

function RoomActiveContent() {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [isFileSharingOpen, setIsFileSharingOpen] = useState(false);
    const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);

    // UX Timing: Track when room connection started
    // This ref is set once on mount and used to calculate join latency
    const joinStartTimeRef = useRef(Date.now());

    // Shared files state - managed at room level so files are received even when panel is closed
    const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
    const fileHandlerRegisteredRef = useRef(false);

    // Use a ref to access current strokes inside the event listener without re-binding it constantly
    const strokesRef = useRef<Stroke[]>([]);
    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    // Register byte stream handler for incoming files at the ROOM level
    // This ensures files are received even when the FileSharing panel is closed
    useEffect(() => {
        if (!room) return;

        // Prevent duplicate registration
        if (fileHandlerRegisteredRef.current) return;

        const handleByteStream = async (reader: any, participantInfo: any) => {
            const info = reader.info;
            const fileId = info.id || `${Date.now()}-${Math.random()}`;

            // Add file to list with progress tracking
            const newFile: SharedFile = {
                id: fileId,
                name: info.name || 'Unnamed file',
                size: info.size || 0,
                mimeType: info.mimeType || 'application/octet-stream',
                sender: participantInfo?.identity || 'Unknown',
                timestamp: new Date(info.timestamp || Date.now()),
                status: 'uploading',
                progress: 0,
            };

            setSharedFiles(prev => [newFile, ...prev]);

            // Show toast notification for incoming file
            toast.info(`${participantInfo?.identity || 'Someone'} shared a file`, {
                description: info.name || 'Unnamed file'
            });

            // Track progress
            reader.onProgress = (progress: number) => {
                setSharedFiles(prev =>
                    prev.map(f => f.id === fileId ? { ...f, progress: progress * 100 } : f)
                );
            };

            try {
                // Read all data
                const chunks = await reader.readAll();
                const blob = new Blob(chunks, { type: info.mimeType });

                setSharedFiles(prev =>
                    prev.map(f => f.id === fileId ? {
                        ...f,
                        data: blob,
                        status: 'complete',
                        progress: 100
                    } : f)
                );
            } catch (err) {
                console.error('[FileSharing] Error receiving file:', err);
                setSharedFiles(prev =>
                    prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
                );
            }
        };

        // Register the handler
        try {
            room.registerByteStreamHandler(FILE_TOPIC, handleByteStream);
            fileHandlerRegisteredRef.current = true;
            console.log('[FileSharing] Byte stream handler registered at room level');
        } catch (err) {
            console.warn('[FileSharing] Handler already registered or error:', err);
        }

        return () => {
            // Note: LiveKit may not have an unregister API
        };
    }, [room]);

    // Callbacks for FileSharing component
    const handleFileUploaded = useCallback((file: SharedFile) => {
        setSharedFiles(prev => [file, ...prev]);
    }, []);

    const handleFileProgress = useCallback((id: string, progress: number) => {
        setSharedFiles(prev =>
            prev.map(f => f.id === id ? { ...f, progress } : f)
        );
    }, []);

    const handleFileComplete = useCallback((id: string, data?: Blob) => {
        setSharedFiles(prev =>
            prev.map(f => f.id === id ? { ...f, status: 'complete', progress: 100, data } : f)
        );
    }, []);

    const handleFileError = useCallback((id: string) => {
        setSharedFiles(prev =>
            prev.map(f => f.id === id ? { ...f, status: 'error' } : f)
        );
    }, []);

    // Handle incoming whiteboard data
    useEffect(() => {
        if (!room) return;

        let isCleanedUp = false;

        const handleData = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
            if (topic !== 'whiteboard') return;
            // Ignore messages from ourselves
            if (participant?.identity === localParticipant?.identity) return;

            try {
                const decoder = new TextDecoder();
                const json = JSON.parse(decoder.decode(payload));

                if (json.type === 'stroke') {
                    setStrokes(prev => [...prev, json.data]);
                } else if (json.type === 'clear') {
                    setStrokes([]);
                } else if (json.type === 'sync-request') {
                    // Send our current state to the requester
                    const currentStrokes = strokesRef.current;
                    if (currentStrokes.length > 0 && room.state === 'connected') {
                        const data = JSON.stringify({ type: 'sync-response', strokes: currentStrokes });
                        const encoder = new TextEncoder();
                        localParticipant.publishData(encoder.encode(data), { reliable: true, topic: 'whiteboard' })
                            .catch(err => console.warn('[Whiteboard] Failed to send sync response:', err));
                    }
                } else if (json.type === 'remove') {
                    // Remove the specified stroke
                    if (json.id) {
                        setStrokes(prev => prev.filter(s => s.id !== json.id));
                    }
                } else if (json.type === 'sync-response') {
                    // Replace our state with the received full state
                    if (json.strokes && Array.isArray(json.strokes)) {
                        setStrokes(json.strokes);
                    }
                }
            } catch (err) {
                console.error("Error decoding whiteboard data", err);
            }
        };

        room.on(RoomEvent.DataReceived, handleData);

        // Initial Sync Request on mount
        const requestSync = async () => {
            // Give a small delay to ensure connection is ready
            await new Promise(r => setTimeout(r, 1500));

            // Check if cleaned up or room disconnected
            if (isCleanedUp || room.state !== 'connected') {
                console.log('[Whiteboard] Skipping sync request - not connected');
                return;
            }

            try {
                const data = JSON.stringify({ type: 'sync-request' });
                const encoder = new TextEncoder();
                await localParticipant.publishData(encoder.encode(data), { reliable: true, topic: 'whiteboard' });
                console.log('[Whiteboard] Sent sync request');
            } catch (err) {
                console.warn('[Whiteboard] Failed to send sync request:', err);
            }
        };

        requestSync();

        return () => {
            isCleanedUp = true;
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room, localParticipant]);

    // Handlers for Whiteboard component
    const handleAddStroke = useCallback(async (stroke: Stroke) => {
        setStrokes(prev => [...prev, stroke]);
        if (room?.state !== 'connected') return;
        try {
            const data = JSON.stringify({ type: 'stroke', data: stroke });
            const encoder = new TextEncoder();
            await localParticipant.publishData(encoder.encode(data), { reliable: true, topic: 'whiteboard' });
        } catch (err) {
            console.warn('[Whiteboard] Failed to broadcast stroke:', err);
        }
    }, [room, localParticipant]);

    const handleRemoveStroke = useCallback(async (id: string) => {
        setStrokes(prev => prev.filter(s => s.id !== id));
        if (room?.state !== 'connected') return;
        try {
            const data = JSON.stringify({ type: 'remove', id });
            const encoder = new TextEncoder();
            await localParticipant.publishData(encoder.encode(data), { reliable: true, topic: 'whiteboard' });
        } catch (err) {
            console.warn('[Whiteboard] Failed to broadcast stroke removal:', err);
        }
    }, [room, localParticipant]);

    const handleClear = useCallback(async () => {
        setStrokes([]);
        if (room?.state !== 'connected') return;
        try {
            const data = JSON.stringify({ type: 'clear' });
            const encoder = new TextEncoder();
            await localParticipant.publishData(encoder.encode(data), { reliable: true, topic: 'whiteboard' });
        } catch (err) {
            console.warn('[Whiteboard] Failed to broadcast clear:', err);
        }
    }, [room, localParticipant]);

    // Handle setting all strokes at once (for undo/redo - local only, no broadcast)
    const handleSetStrokes = useCallback((newStrokes: Stroke[]) => {
        setStrokes(newStrokes);
    }, []);

    return (
        <div className="relative h-full w-full flex flex-col min-h-0">
            {/* Main Video Grid */}
            <div className="flex-1 min-h-0 overflow-hidden p-4 pb-20">
                <StageLayout
                    isWhiteboardOpen={isWhiteboardOpen}
                    isCodeEditorOpen={isCodeEditorOpen}
                    onCloseCodeEditor={() => setIsCodeEditorOpen(false)}
                >
                    <Whiteboard
                        isOpen={isWhiteboardOpen}
                        onClose={() => setIsWhiteboardOpen(false)}
                        strokes={strokes}
                        onAddStroke={handleAddStroke}
                        onRemoveStroke={handleRemoveStroke}
                        onSetStrokes={handleSetStrokes}
                        onClear={handleClear}
                    />
                </StageLayout>
            </div>

            {/* File Sharing Panel */}
            <AnimatePresence>
                {isFileSharingOpen && (
                    <FileSharing
                        isOpen={isFileSharingOpen}
                        onClose={() => setIsFileSharingOpen(false)}
                        sharedFiles={sharedFiles}
                        onFileUploaded={handleFileUploaded}
                        onFileProgress={handleFileProgress}
                        onFileComplete={handleFileComplete}
                        onFileError={handleFileError}
                    />
                )}
            </AnimatePresence>

            {/* Controls - always visible at bottom */}
            <Controls
                onToggleWhiteboard={() => setIsWhiteboardOpen(prev => !prev)}
                isWhiteboardOpen={isWhiteboardOpen}
                onToggleCodeEditor={() => setIsCodeEditorOpen(prev => !prev)}
                isCodeEditorOpen={isCodeEditorOpen}
                onToggleFileSharing={() => setIsFileSharingOpen(prev => !prev)}
                isFileSharingOpen={isFileSharingOpen}
                onToggleDebugPanel={() => setIsDebugPanelOpen(prev => !prev)}
                isDebugPanelOpen={isDebugPanelOpen}
            />

            {/* Debug Panel */}
            <DebugPanel
                isOpen={isDebugPanelOpen}
                onClose={() => setIsDebugPanelOpen(false)}
                whiteboardStrokesCount={strokes.length}
                sharedFilesCount={sharedFiles.length}
                joinStartTime={joinStartTimeRef.current}
            />

            <RoomAudioRenderer />
            <StartAudio label="Click to allow audio" />
        </div>
    );
}
