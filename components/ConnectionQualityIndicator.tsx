

import { ConnectionQuality } from 'livekit-client';
import { motion } from 'framer-motion';

interface ConnectionQualityIndicatorProps {
    quality: ConnectionQuality;
    className?: string;
    showTooltip?: boolean;
}

/** Maps quality to visual properties */
function getQualityConfig(quality: ConnectionQuality) {
    switch (quality) {
        case ConnectionQuality.Excellent:
            return { bars: 4, color: '#22c55e', label: 'Excellent connection' };
        case ConnectionQuality.Good:
            return { bars: 3, color: '#84cc16', label: 'Good connection' };
        case ConnectionQuality.Poor:
            return { bars: 2, color: '#eab308', label: 'Fair connection' };
        case ConnectionQuality.Lost:
            return { bars: 1, color: '#ef4444', label: 'Poor connection' };
        default:
            return { bars: 0, color: '#71717a', label: 'Connecting...' };
    }
}

export default function ConnectionQualityIndicator({
    quality,
    className = '',
    showTooltip = true,
}: ConnectionQualityIndicatorProps) {
    const config = getQualityConfig(quality);
    const numBars = 4;

    return (
        <div
            className={`relative group ${className}`}
            title={showTooltip ? config.label : undefined}
        >
            <div className="flex items-end gap-0.5 h-3">
                {Array.from({ length: numBars }).map((_, i) => {
                    const isActive = i < config.bars;
                    const height = 4 + (i * 2); // 4px, 6px, 8px, 10px

                    return (
                        <motion.div
                            key={i}
                            className="w-1 rounded-sm"
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{
                                opacity: isActive ? 1 : 0.3,
                                scaleY: 1,
                                backgroundColor: isActive ? config.color : '#71717a',
                            }}
                            transition={{
                                duration: 0.2,
                                delay: i * 0.05,
                            }}
                            style={{
                                height: `${height}px`,
                                transformOrigin: 'bottom',
                            }}
                        />
                    );
                })}
            </div>

            {/* Tooltip on hover */}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-black/80 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {config.label}
                </div>
            )}
        </div>
    );
}
