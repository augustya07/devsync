import { useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { ReactNode } from 'react';
import { VideoTrack } from '@livekit/components-react';
import ParticipantTile from './ParticipantTile';
import CodeEditor from './CodeEditor';

interface StageLayoutProps {
    isWhiteboardOpen: boolean;
    isCodeEditorOpen: boolean;
    onCloseCodeEditor: () => void;
    children?: ReactNode;
}

export default function StageLayout({ isWhiteboardOpen, isCodeEditorOpen, onCloseCodeEditor, children }: StageLayoutProps) {
    const trackRefs = useTracks([
        Track.Source.Camera,
        Track.Source.ScreenShare,
    ]);

    // Derived state: Determine if we should be in "Focus Mode"
    // Prefer screen share unless whiteboard or code editor is explicitly open.
    const screenShareTrack = trackRefs.find(t => t.source === Track.Source.ScreenShare);
    const hasScreenShare = !!screenShareTrack;
    const isFocusMode = isWhiteboardOpen || isCodeEditorOpen || hasScreenShare;

    // RENDER: FOCUS MODE (Stage + Filmstrip)
    if (isFocusMode) {
        // Exclude the focused track from the filmstrip if it's a screen share
        // If whiteboard is open, we show everyone in filmstrip including screen share participants (but their camera)
        const filmstripTracks = stripTracks(trackRefs, hasScreenShare && !isWhiteboardOpen ? screenShareTrack : undefined);

        // If whiteboard is open, render it full-size with participant sidebar
        if (isWhiteboardOpen || isCodeEditorOpen) {
            return (
                <div className="flex h-full w-full gap-4">
                    {/* Main Tools Area */}
                    <div className="flex-1 min-w-0 h-full flex gap-4">
                        {/* Whiteboard Panel */}
                        {isWhiteboardOpen && (
                            <div className={`${isCodeEditorOpen ? 'w-1/2' : 'w-full'} h-full rounded-2xl overflow-hidden bg-zinc-800 border border-white/10 shadow-2xl`}>
                                {children}
                            </div>
                        )}

                        {/* Code Editor Panel */}
                        {isCodeEditorOpen && (
                            <div className={`${isWhiteboardOpen ? 'w-1/2' : 'w-full'} h-full`}>
                                <CodeEditor
                                    isOpen={isCodeEditorOpen}
                                    onClose={onCloseCodeEditor}
                                />
                            </div>
                        )}
                    </div>

                    {/* Side Filmstrip - always visible */}
                    <div className="w-48 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                        {filmstripTracks.map((track) => (
                            <div key={track.participant.identity + track.source} className="aspect-video flex-shrink-0">
                                <ParticipantTile
                                    trackRef={track}
                                    className="h-full w-full border-none ring-1 ring-white/10 bg-zinc-800"
                                    showInfo={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex h-full w-full gap-4">
                {/* Main Stage Area */}
                <div className="flex-1 min-w-0 h-full relative rounded-2xl overflow-hidden bg-zinc-900/50 border border-white/5 ring-1 ring-white/10 shadow-2xl">
                    {hasScreenShare ? (
                        <div className="relative h-full w-full bg-zinc-950">
                            <VideoTrack trackRef={screenShareTrack} className="h-full w-full object-contain" />
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-sm font-medium border border-white/10 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                {screenShareTrack.participant.identity} is sharing
                            </div>
                        </div>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-500">
                            <p>Collaboration Active</p>
                        </div>
                    )}
                </div>

                {/* Side Filmstrip */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {filmstripTracks.map((track) => (
                        <div key={track.participant.identity + track.source} className="aspect-video flex-shrink-0">
                            <ParticipantTile
                                trackRef={track}
                                className="h-full w-full border-none ring-1 ring-white/10 bg-zinc-800"
                                showInfo={true}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // RENDER: GRID MODE (Standard Gallery)
    return (
        <div className={`grid h-full w-full gap-4 ${getGridClass(trackRefs.length)} auto-rows-fr`}>
            {trackRefs.map((track) => (
                <ParticipantTile
                    key={track.participant.identity + track.source}
                    trackRef={track}
                />
            ))}

            {trackRefs.length === 0 && (
                <div className="col-span-full flex h-full flex-col items-center justify-center text-zinc-500 gap-4">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-zinc-700 animate-[spin_10s_linear_infinite]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-zinc-600" />
                        </div>
                    </div>
                    <p className="text-zinc-500 font-medium">Waiting for team to join...</p>
                </div>
            )}
        </div>
    );
}

// Helpers
function stripTracks(allTracks: any[], ignoreTrack?: any) {
    if (!ignoreTrack) return allTracks;
    return allTracks.filter(t => t !== ignoreTrack);
}

function getGridClass(count: number) {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2 md:grid-cols-2';
    if (count <= 9) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}

