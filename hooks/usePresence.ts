/**
 * usePresence Hook
 * 
 * Broadcasts the local user's cursor position to other participants via LiveKit data channels.
 * Receives and tracks cursor positions from all remote participants.
 * 
 * @description This hook demonstrates advanced WebRTC data channel usage for real-time
 * presence/awareness features. Uses throttled broadcasts (max 30Hz) to balance
 * responsiveness with bandwidth efficiency.
 * 
 * @example
 * ```tsx
 * const { cursors, broadcastCursor } = usePresence();
 * 
 * // Broadcast local cursor
 * onMouseMove={(e) => broadcastCursor({ x: e.clientX, y: e.clientY })}
 * 
 * // Render remote cursors
 * {Object.values(cursors).map(cursor => <GhostCursor key={cursor.identity} {...cursor} />)}
 * ```
 */

import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Cursor position normalized to 0-1 range relative to container */
export interface CursorPosition {
    x: number;
    y: number;
}

/** Remote participant's cursor data */
export interface ParticipantCursor extends CursorPosition {
    identity: string;
    color: string;
    timestamp: number;
}

/** Map of participant identity to their cursor data */
export type CursorMap = Record<string, ParticipantCursor>;

// Predefined colors for participants - generates consistent colors based on identity
const CURSOR_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
];

/** Get a consistent color for a participant based on their identity */
function getParticipantColor(identity: string): string {
    let hash = 0;
    for (let i = 0; i < identity.length; i++) {
        hash = identity.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/** Data channel topic for cursor presence */
const PRESENCE_TOPIC = 'cursor-presence';

/** Maximum broadcast rate (30 Hz) */
const BROADCAST_INTERVAL_MS = 33;

/** How long before a cursor is considered stale and removed */
const CURSOR_STALE_MS = 3000;

interface UsePresenceOptions {
    /** Enable presence broadcasting. Default: true */
    enabled?: boolean;
}

export function usePresence(options: UsePresenceOptions = {}) {
    const { enabled = true } = options;
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();

    const [cursors, setCursors] = useState<CursorMap>({});
    const lastBroadcastRef = useRef<number>(0);
    const pendingPositionRef = useRef<CursorPosition | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Clean up stale cursors periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setCursors(prev => {
                const updated = { ...prev };
                let hasChanges = false;

                for (const identity in updated) {
                    if (now - updated[identity].timestamp > CURSOR_STALE_MS) {
                        delete updated[identity];
                        hasChanges = true;
                    }
                }

                return hasChanges ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Handle incoming cursor data from other participants
    useEffect(() => {
        if (!room || !enabled) return;

        const handleData = (
            payload: Uint8Array,
            participant: any,
            kind?: DataPacket_Kind,
            topic?: string
        ) => {
            if (topic !== PRESENCE_TOPIC) return;
            if (participant?.identity === localParticipant?.identity) return;

            try {
                const decoder = new TextDecoder();
                const data = JSON.parse(decoder.decode(payload)) as CursorPosition;

                setCursors(prev => ({
                    ...prev,
                    [participant.identity]: {
                        ...data,
                        identity: participant.identity,
                        color: getParticipantColor(participant.identity),
                        timestamp: Date.now(),
                    },
                }));
            } catch (err) {
                console.error('[usePresence] Failed to parse cursor data:', err);
            }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room, enabled, localParticipant?.identity]);

    // Remove cursors when participants leave
    useEffect(() => {
        if (!room) return;

        const handleParticipantDisconnected = (participant: any) => {
            setCursors(prev => {
                const updated = { ...prev };
                delete updated[participant.identity];
                return updated;
            });
        };

        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        return () => {
            room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        };
    }, [room]);

    // Throttled cursor broadcast using requestAnimationFrame
    const broadcastCursor = useCallback((position: CursorPosition) => {
        if (!enabled || !localParticipant) return;

        pendingPositionRef.current = position;

        // Use requestAnimationFrame for smooth throttling
        if (animationFrameRef.current !== null) return;

        animationFrameRef.current = requestAnimationFrame(() => {
            animationFrameRef.current = null;

            const now = Date.now();
            if (now - lastBroadcastRef.current < BROADCAST_INTERVAL_MS) return;

            const pos = pendingPositionRef.current;
            if (!pos) return;

            lastBroadcastRef.current = now;

            const data = JSON.stringify(pos);
            const encoder = new TextEncoder();

            localParticipant.publishData(encoder.encode(data), {
                reliable: false, // Use unreliable for low-latency cursor updates
                topic: PRESENCE_TOPIC,
            }).catch(err => {
                console.error('[usePresence] Failed to broadcast cursor:', err);
            });
        });
    }, [enabled, localParticipant]);

    // Clear pending animation frame on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return {
        /** Map of remote participant cursors */
        cursors,
        /** Broadcast the local cursor position to other participants */
        broadcastCursor,
        /** Color assigned to the local participant */
        localColor: localParticipant ? getParticipantColor(localParticipant.identity) : CURSOR_COLORS[0],
    };
}

export default usePresence;
