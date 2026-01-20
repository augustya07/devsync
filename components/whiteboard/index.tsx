// Whiteboard Pro - Main Orchestrator Component
// Staff engineer architecture: Thin orchestrator that composes child components

'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { Point, WhiteboardElement, LaserPoint } from '@/lib/whiteboard/types';
import { STICKY_COLORS, STICKY, LASER } from '@/lib/whiteboard/constants';
import { generateId } from '@/lib/whiteboard/utils';
import { usePresence } from '@/hooks/usePresence';
import { useWhiteboardTools } from '@/hooks/useWhiteboardTools';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import StickyNote from './StickyNote';
import GhostCursors from '../GhostCursors';

// Re-export types for backwards compatibility
export type { WhiteboardElement, Point } from '@/lib/whiteboard/types';
// Legacy alias
export type Stroke = WhiteboardElement;

interface WhiteboardProProps {
    isOpen: boolean;
    onClose: () => void;
    elements: WhiteboardElement[];
    onAddElement: (element: WhiteboardElement) => void;
    onUpdateElement?: (id: string, updates: Partial<WhiteboardElement>) => void;
    onRemoveElement?: (id: string) => void;
    onSetElements?: (elements: WhiteboardElement[]) => void;
    onClear: () => void;
}

export default function WhiteboardPro({
    isOpen,
    onClose,
    elements,
    onAddElement,
    onUpdateElement,
    onRemoveElement,
    onSetElements,
    onClear,
}: WhiteboardProProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tool state
    const {
        tool,
        setTool,
        color,
        setColor,
        brushSize,
        setBrushSize,
        opacity,
        background,
        setBackground,
    } = useWhiteboardTools();

    // History state (for local undo/redo)
    const [history, setHistory] = useState<WhiteboardElement[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Initialize history with current elements when whiteboard opens
    useEffect(() => {
        if (isOpen && history.length === 1 && history[0].length === 0 && elements.length > 0) {
            setHistory([elements]);
        }
    }, [isOpen, elements, history]);

    // Laser pointer state
    const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);

    // Ghost cursors
    const { cursors, broadcastCursor } = usePresence();

    // Container dimensions for sticky notes
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({ width: rect.width, height: rect.height });
            }
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isOpen]);

    // Clean up old laser points
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setLaserPoints(prev => prev.filter(p => now - p.timestamp < LASER.fadeMs));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // History management
    const pushToHistory = useCallback((newElements: WhiteboardElement[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newElements);
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => {
        if (!canUndo || !onSetElements) return;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        onSetElements(history[newIndex]);
    }, [canUndo, historyIndex, history, onSetElements]);

    const handleRedo = useCallback(() => {
        if (!canRedo || !onSetElements) return;
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        onSetElements(history[newIndex]);
    }, [canRedo, historyIndex, history, onSetElements]);

    // Element handlers
    const handleAddElement = useCallback((element: WhiteboardElement) => {
        onAddElement(element);
        pushToHistory([...elements, element]);
    }, [elements, onAddElement, pushToHistory]);

    const handleEraseElement = useCallback((id: string) => {
        onRemoveElement?.(id);
    }, [onRemoveElement]);

    const handleAddStickyNote = useCallback((position: Point) => {
        const newSticky: WhiteboardElement = {
            id: generateId(),
            type: 'sticky',
            tool: 'sticky',
            color: '#000000',
            width: 1,
            opacity: 1,
            position,
            size: { w: STICKY.defaultWidth, h: STICKY.defaultHeight },
            backgroundColor: STICKY_COLORS[0],
            text: '',
        };
        onAddElement(newSticky);
    }, [onAddElement]);

    const handleUpdateStickyNote = useCallback((id: string, updates: Partial<WhiteboardElement>) => {
        onUpdateElement?.(id, updates);
    }, [onUpdateElement]);

    const handleLaserPoint = useCallback((point: Point) => {
        setLaserPoints(prev => {
            const newPoints = [...prev, { point, timestamp: Date.now() }];
            if (newPoints.length > LASER.maxPoints) {
                return newPoints.slice(-LASER.maxPoints);
            }
            return newPoints;
        });
        // Broadcast cursor for laser too
        broadcastCursor(point);
    }, [broadcastCursor]);

    const handleClear = useCallback(() => {
        pushToHistory([]);
        onClear();
    }, [onClear, pushToHistory]);

    if (!isOpen) return null;

    // Filter elements by type
    const drawingElements = elements.filter(e => e.type !== 'sticky');
    const stickyElements = elements.filter(e => e.type === 'sticky');

    return (
        <div className="h-full w-full flex flex-col min-h-0 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
            <Toolbar
                tool={tool}
                onToolChange={setTool}
                color={color}
                onColorChange={setColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                background={background}
                onBackgroundChange={setBackground}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClear}
                onClose={onClose}
            />

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative w-full touch-none overflow-hidden bg-zinc-800"
            >
                <Canvas
                    elements={drawingElements}
                    tool={tool}
                    color={color}
                    brushSize={brushSize}
                    opacity={opacity}
                    background={background}
                    onAddElement={handleAddElement}
                    onEraseElement={handleEraseElement}
                    onAddStickyNote={handleAddStickyNote}
                    onLaserPoint={handleLaserPoint}
                    laserPoints={laserPoints}
                    canvasRef={canvasRef}
                    containerRef={containerRef}
                />

                {/* Sticky Notes Layer */}
                {stickyElements.map(sticky => (
                    <StickyNote
                        key={sticky.id}
                        element={sticky}
                        containerWidth={containerSize.width}
                        containerHeight={containerSize.height}
                        onUpdate={handleUpdateStickyNote}
                        onDelete={handleEraseElement}
                    />
                ))}

                {/* Empty state */}
                {elements.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-zinc-500">
                            <p className="text-lg font-medium">Start drawing to collaborate</p>
                            <p className="text-sm mt-1">Use tools above</p>
                        </div>
                    </div>
                )}

                {/* Ghost Cursors */}
                <GhostCursors cursors={cursors} containerRef={containerRef} />
            </div>
        </div>
    );
}
