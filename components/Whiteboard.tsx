// Whiteboard.tsx - Backwards-compatible wrapper
// Staff engineer architecture: Preserves existing interface while using new modular implementation

'use client';

import WhiteboardPro, { WhiteboardElement } from './whiteboard/index';

// Re-export types for backwards compatibility
export type { WhiteboardElement } from './whiteboard/index';

// Legacy Stroke type - alias for backwards compatibility
export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    width: number;
    id: string;
    // Extended fields for shape support
    tool?: 'pen' | 'highlighter' | 'rectangle' | 'ellipse' | 'arrow' | 'line';
    type?: 'stroke' | 'shape';
}

// Props interface matching the original Whiteboard component
interface WhiteboardProps {
    isOpen: boolean;
    onClose: () => void;
    strokes: Stroke[];
    onAddStroke: (stroke: Stroke) => void;
    onRemoveStroke?: (id: string) => void;
    onSetStrokes?: (strokes: Stroke[]) => void;
    onClear: () => void;
}

/**
 * Backwards-compatible Whiteboard wrapper
 * 
 * This component maintains the original interface (strokes, onAddStroke) while
 * internally using the new WhiteboardPro component with extended functionality.
 * 
 * For new integrations, use WhiteboardPro directly with WhiteboardElement type.
 */
export default function Whiteboard({
    isOpen,
    onClose,
    strokes,
    onAddStroke,
    onRemoveStroke,
    onSetStrokes,
    onClear,
}: WhiteboardProps) {
    // Convert legacy Stroke to WhiteboardElement
    const elements: WhiteboardElement[] = strokes.map(stroke => {
        // Check if this is a shape (has type/tool info and exactly 2 points)
        if (stroke.type === 'shape' && stroke.tool && stroke.points.length === 2) {
            return {
                id: stroke.id,
                type: 'shape' as const,
                tool: stroke.tool,
                startPoint: stroke.points[0],
                endPoint: stroke.points[1],
                color: stroke.color,
                width: stroke.width,
                opacity: 1,
            };
        }
        // Default: treat as stroke
        return {
            id: stroke.id,
            type: 'stroke' as const,
            tool: (stroke.tool || 'pen') as 'pen' | 'highlighter',
            points: stroke.points,
            color: stroke.color,
            width: stroke.width,
            opacity: 1,
        };
    });

    // Handle new element from WhiteboardPro
    const handleAddElement = (element: WhiteboardElement) => {
        // Convert WhiteboardElement back to legacy Stroke format for parent
        if (element.type === 'stroke' && element.points) {
            const legacyStroke: Stroke = {
                id: element.id,
                points: element.points,
                color: element.color,
                width: element.width,
                tool: element.tool as Stroke['tool'],
                type: 'stroke',
            };
            onAddStroke(legacyStroke);
        } else if (element.type === 'shape' && element.startPoint && element.endPoint) {
            // For shapes, convert to a stroke-like representation
            // Preserve tool and type for proper reconstruction
            const legacyStroke: Stroke = {
                id: element.id,
                points: [element.startPoint, element.endPoint],
                color: element.color,
                width: element.width,
                tool: element.tool as Stroke['tool'],
                type: 'shape',
            };
            onAddStroke(legacyStroke);
        }
        // Note: Sticky notes are not synced in legacy mode
    };

    // Handle setting all elements at once (for undo/redo)
    const handleSetElements = (newElements: WhiteboardElement[]) => {
        if (!onSetStrokes) return;

        const legacyStrokes: Stroke[] = newElements.map(element => {
            if (element.type === 'shape' && element.startPoint && element.endPoint) {
                return {
                    id: element.id,
                    points: [element.startPoint, element.endPoint],
                    color: element.color,
                    width: element.width,
                    tool: element.tool as Stroke['tool'],
                    type: 'shape' as const,
                };
            }
            return {
                id: element.id,
                points: element.points || [],
                color: element.color,
                width: element.width,
                tool: element.tool as Stroke['tool'],
                type: 'stroke' as const,
            };
        });

        onSetStrokes(legacyStrokes);
    };

    return (
        <WhiteboardPro
            isOpen={isOpen}
            onClose={onClose}
            elements={elements}
            onAddElement={handleAddElement}
            onRemoveElement={onRemoveStroke}
            onSetElements={handleSetElements}
            onClear={onClear}
        />
    );
}
