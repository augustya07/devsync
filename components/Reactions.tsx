
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTIONS = [
    { emoji: '👍', label: 'Thumbs up' },
    { emoji: '❤️', label: 'Heart' },
    { emoji: '🎉', label: 'Celebrate' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '🔥', label: 'Fire' },
];

const REACTION_TOPIC = 'reactions';

interface FloatingReaction {
    id: string;
    emoji: string;
    identity: string;
    x: number;
}

interface ReactionsProps {
    /** Whether the reaction picker is currently visible */
    isOpen: boolean;
    /** Toggle the picker */
    onToggle: () => void;
}

/**
 * Floating reaction that animates upward and fades out
 */
function FloatingEmoji({ emoji, x }: { emoji: string; x: number }) {
    return (
        <motion.div
            className="fixed pointer-events-none text-4xl z-50"
            style={{ left: `${x}%`, bottom: '120px' }}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{
                opacity: 0,
                y: -200,
                scale: 1.5,
                rotate: [0, -10, 10, -5, 5, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 2,
                ease: 'easeOut',
                rotate: {
                    duration: 0.5,
                    repeat: 2,
                },
            }}
        >
            {emoji}
        </motion.div>
    );
}

/**
 * Reaction picker button group
 */
function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
    return (
        <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex gap-1 p-2 rounded-full bg-zinc-800/95 backdrop-blur-xl border border-white/10 shadow-2xl"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
        >
            {REACTIONS.map(({ emoji, label }) => (
                <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="p-2 text-xl hover:scale-125 hover:bg-white/10 rounded-full transition-all duration-150"
                    title={label}
                    aria-label={label}
                >
                    {emoji}
                </button>
            ))}
        </motion.div>
    );
}

export default function Reactions({ isOpen, onToggle }: ReactionsProps) {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

    // Listen for incoming reactions
    useEffect(() => {
        if (!room) return;

        const handleData = (
            payload: Uint8Array,
            participant: any,
            kind?: any,
            topic?: string
        ) => {
            if (topic !== REACTION_TOPIC) return;

            try {
                const decoder = new TextDecoder();
                const data = JSON.parse(decoder.decode(payload));

                const reaction: FloatingReaction = {
                    id: `${Date.now()}-${Math.random()}`,
                    emoji: data.emoji,
                    identity: participant?.identity || 'unknown',
                    x: 20 + Math.random() * 60, // Random position 20-80%
                };

                setFloatingReactions(prev => [...prev, reaction]);

                // Remove after animation
                setTimeout(() => {
                    setFloatingReactions(prev =>
                        prev.filter(r => r.id !== reaction.id)
                    );
                }, 2500);
            } catch (err) {
                console.error('[Reactions] Failed to parse reaction:', err);
            }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room]);

    const sendReaction = useCallback(async (emoji: string) => {
        if (!localParticipant) return;

        // Also show locally
        const reaction: FloatingReaction = {
            id: `${Date.now()}-${Math.random()}`,
            emoji,
            identity: localParticipant.identity,
            x: 20 + Math.random() * 60,
        };
        setFloatingReactions(prev => [...prev, reaction]);
        setTimeout(() => {
            setFloatingReactions(prev =>
                prev.filter(r => r.id !== reaction.id)
            );
        }, 2500);

        // Broadcast to others
        const data = JSON.stringify({ emoji });
        const encoder = new TextEncoder();

        await localParticipant.publishData(encoder.encode(data), {
            reliable: false, // Reactions are ephemeral, use unreliable for speed
            topic: REACTION_TOPIC,
        });

        onToggle(); // Close picker after sending
    }, [localParticipant, onToggle]);

    return (
        <>
            {/* Floating reactions overlay */}
            <AnimatePresence>
                {floatingReactions.map(reaction => (
                    <FloatingEmoji
                        key={reaction.id}
                        emoji={reaction.emoji}
                        x={reaction.x}
                    />
                ))}
            </AnimatePresence>

            {/* Reaction picker - positioned above the controls bar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-1 p-2 rounded-full bg-zinc-800/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50"
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                    >
                        {REACTIONS.map(({ emoji, label }) => (
                            <button
                                key={emoji}
                                onClick={() => sendReaction(emoji)}
                                className="p-2 text-xl hover:scale-125 hover:bg-white/10 rounded-full transition-all duration-150"
                                title={label}
                                aria-label={label}
                            >
                                {emoji}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
