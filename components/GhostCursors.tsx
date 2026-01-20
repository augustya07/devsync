

import { CursorMap } from '@/hooks/usePresence';
import { motion, AnimatePresence } from 'framer-motion';

interface GhostCursorsProps {
    /** Map of remote participant cursors from usePresence hook */
    cursors: CursorMap;
    /** Container dimensions for converting normalized positions to pixels */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Individual ghost cursor component with smooth animations
 */
function GhostCursor({
    x,
    y,
    identity,
    color,
    containerWidth,
    containerHeight,
}: {
    x: number;
    y: number;
    identity: string;
    color: string;
    containerWidth: number;
    containerHeight: number;
}) {
    // Convert normalized position (0-1) to pixel position
    const pixelX = x * containerWidth;
    const pixelY = y * containerHeight;

    return (
        <motion.div
            className="absolute pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
                opacity: 1,
                scale: 1,
                x: pixelX,
                y: pixelY,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
                opacity: { duration: 0.15 },
                scale: { duration: 0.15 },
                x: { type: 'spring', stiffness: 300, damping: 30 },
                y: { type: 'spring', stiffness: 300, damping: 30 },
            }}
            style={{ left: 0, top: 0 }}
        >
            {/* Cursor pointer SVG */}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="filter drop-shadow-lg"
                style={{ transform: 'translate(-2px, -2px)' }}
            >
                <path
                    d="M5.65376 12.4563L5.06519 11.5642L5.65376 12.4563ZM12.4563 5.65375L11.5642 5.06517L12.4563 5.65375ZM3 4.23607V3.23607C2.44772 3.23607 2 3.68379 2 4.23607H3ZM3 16.7639L2.10557 17.2111L2.44721 17.8944L3.13064 17.7586L3 16.7639ZM7.23607 18L6.78886 18.8944L6.89441 18.9472L7.01046 18.9861L7.23607 18ZM18 7.23607L18.9861 7.01046L18.9472 6.89442L18.8944 6.78885L18 7.23607ZM16.7639 3L17.7586 3.13063L17.8944 2.44721L17.2111 2.10557L16.7639 3ZM5.06519 11.5642L2.55279 7.5279L0.894472 8.47214L3.40688 12.5085L5.06519 11.5642ZM13.3485 6.24232L6.24232 13.3485L7.65654 14.7627L14.7627 7.65653L13.3485 6.24232ZM6.24232 13.3485L5.06519 11.5642L3.40688 12.5085L4.58401 14.2927L6.24232 13.3485ZM11.5642 5.06517C10.0166 3.50764 7.50588 3.50764 5.95836 5.06517L7.37257 6.47938C8.14362 5.70833 9.37888 5.70833 10.1499 6.47938L11.5642 5.06517ZM4.58401 14.2927C3.03648 12.7452 3.03648 10.2344 4.58401 8.68692L3.16979 7.27271C0.845535 9.59697 0.845535 13.3827 3.16979 15.7069L4.58401 14.2927ZM6.47938 10.1499C5.70834 9.37889 5.70834 8.14362 6.47938 7.37258L5.06517 5.95836C3.50764 7.50589 3.50764 10.0166 5.06517 11.5642L6.47938 10.1499ZM6.24232 13.3485C6.24232 13.3485 6.24232 13.3485 6.24232 13.3485L7.65654 14.7627C7.65654 14.7627 7.65654 14.7627 7.65654 14.7627L6.24232 13.3485Z"
                    fill={color}
                />
                <path
                    d="M3 4.23607V16.7639L7.23607 18L18 7.23607L16.7639 3H3Z"
                    fill={color}
                    fillOpacity="0.9"
                />
            </svg>

            {/* Name label */}
            <div
                className="absolute left-5 top-4 whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-white shadow-lg"
                style={{
                    backgroundColor: color,
                    boxShadow: `0 2px 8px ${color}40`,
                }}
            >
                {identity}
            </div>
        </motion.div>
    );
}

/**
 * Container for all ghost cursors
 */
export default function GhostCursors({ cursors, containerRef }: GhostCursorsProps) {
    const container = containerRef.current;

    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const cursorList = Object.values(cursors);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <AnimatePresence>
                {cursorList.map((cursor) => (
                    <GhostCursor
                        key={cursor.identity}
                        x={cursor.x}
                        y={cursor.y}
                        identity={cursor.identity}
                        color={cursor.color}
                        containerWidth={rect.width}
                        containerHeight={rect.height}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
