// StickyNote Component - Draggable, resizable sticky notes
// Staff engineer architecture: Isolated component with its own state

'use client';

import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { Point, WhiteboardElement } from '@/lib/whiteboard/types';
import { STICKY_COLORS, STICKY } from '@/lib/whiteboard/constants';

interface StickyNoteProps {
    element: WhiteboardElement;
    containerWidth: number;
    containerHeight: number;
    onUpdate: (id: string, updates: Partial<WhiteboardElement>) => void;
    onDelete: (id: string) => void;
}

export default memo(function StickyNote({
    element,
    containerWidth,
    containerHeight,
    onUpdate,
    onDelete,
}: StickyNoteProps) {
    const [isEditing, setIsEditing] = useState(!element.text);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const initialPosRef = useRef<Point | null>(null);
    const initialSizeRef = useRef<{ w: number; h: number } | null>(null);

    const position = element.position || { x: 0.1, y: 0.1 };
    const size = element.size || { w: STICKY.defaultWidth, h: STICKY.defaultHeight };
    const bgColor = element.backgroundColor || STICKY_COLORS[0];

    // Focus textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleDragStart = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPosRef.current = position;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [position]);

    const handleDragMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging || !dragStartRef.current || !initialPosRef.current) return;

        const dx = (e.clientX - dragStartRef.current.x) / containerWidth;
        const dy = (e.clientY - dragStartRef.current.y) / containerHeight;

        const newX = Math.max(0, Math.min(1 - size.w / containerWidth, initialPosRef.current.x + dx));
        const newY = Math.max(0, Math.min(1 - size.h / containerHeight, initialPosRef.current.y + dy));

        onUpdate(element.id, { position: { x: newX, y: newY } });
    }, [isDragging, containerWidth, containerHeight, size, element.id, onUpdate]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
        initialPosRef.current = null;
    }, []);

    const handleResizeStart = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialSizeRef.current = size;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [size]);

    const handleResizeMove = useCallback((e: React.PointerEvent) => {
        if (!isResizing || !dragStartRef.current || !initialSizeRef.current) return;

        const dw = e.clientX - dragStartRef.current.x;
        const dh = e.clientY - dragStartRef.current.y;

        const newW = Math.max(STICKY.minWidth, Math.min(STICKY.maxWidth, initialSizeRef.current.w + dw));
        const newH = Math.max(STICKY.minHeight, Math.min(STICKY.maxHeight, initialSizeRef.current.h + dh));

        onUpdate(element.id, { size: { w: newW, h: newH } });
    }, [isResizing, element.id, onUpdate]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        dragStartRef.current = null;
        initialSizeRef.current = null;
    }, []);

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate(element.id, { text: e.target.value });
    }, [element.id, onUpdate]);

    const handleColorChange = useCallback((newColor: string) => {
        onUpdate(element.id, { backgroundColor: newColor });
    }, [element.id, onUpdate]);

    return (
        <div
            className="absolute shadow-xl rounded-lg overflow-hidden select-none"
            style={{
                left: `${position.x * 100}%`,
                top: `${position.y * 100}%`,
                width: size.w,
                height: size.h,
                backgroundColor: bgColor,
                zIndex: isDragging || isResizing ? 100 : 10,
            }}
        >
            {/* Header / Drag handle */}
            <div
                className="flex items-center justify-between px-2 py-1.5 cursor-move"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerLeave={handleDragEnd}
            >
                <GripHorizontal size={14} className="text-black/40" />

                {/* Color picker */}
                <div className="flex gap-1">
                    {STICKY_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => handleColorChange(c)}
                            className={`
                w-3 h-3 rounded-full border transition-transform hover:scale-125
                ${bgColor === c ? 'border-black/50 scale-110' : 'border-transparent'}
              `}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <button
                    onClick={() => onDelete(element.id)}
                    className="p-0.5 rounded hover:bg-black/10 transition-colors"
                >
                    <X size={14} className="text-black/50" />
                </button>
            </div>

            {/* Content */}
            <div className="p-2 h-[calc(100%-32px)]">
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={element.text || ''}
                        onChange={handleTextChange}
                        onBlur={() => setIsEditing(false)}
                        placeholder="Type here..."
                        className="w-full h-full resize-none bg-transparent border-none outline-none text-sm text-black/80 placeholder-black/30"
                        style={{ fontFamily: 'inherit' }}
                    />
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className="w-full h-full cursor-text text-sm text-black/80 whitespace-pre-wrap overflow-auto"
                    >
                        {element.text || <span className="text-black/30">Click to edit...</span>}
                    </div>
                )}
            </div>

            {/* Resize handle */}
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onPointerDown={handleResizeStart}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                onPointerLeave={handleResizeEnd}
            >
                <svg
                    viewBox="0 0 16 16"
                    className="w-full h-full text-black/30"
                    fill="currentColor"
                >
                    <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14Z" />
                </svg>
            </div>
        </div>
    );
});
