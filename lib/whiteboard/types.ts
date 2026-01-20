// Whiteboard Types - Centralized type definitions
// Staff engineer architecture: Single source of truth for all whiteboard types

export interface Point {
    x: number;
    y: number;
}

export type ToolType =
    | 'pen'
    | 'highlighter'
    | 'eraser'
    | 'laser'
    | 'rectangle'
    | 'ellipse'
    | 'arrow'
    | 'line'
    | 'sticky'
    | 'select';

export type BackgroundType = 'blank' | 'grid' | 'dots';

export type ElementType = 'stroke' | 'shape' | 'sticky';

export interface DrawStyle {
    color: string;
    width: number;
    opacity: number;
}

export interface WhiteboardElement {
    id: string;
    type: ElementType;
    tool: ToolType;
    color: string;
    width: number;
    opacity: number;

    // For strokes (pen, highlighter)
    points?: Point[];

    // For shapes (rectangle, ellipse, arrow, line)
    startPoint?: Point;
    endPoint?: Point;

    // For sticky notes
    text?: string;
    position?: Point;
    size?: { w: number; h: number };
    backgroundColor?: string;
}

// Legacy Stroke type - alias for backwards compatibility with page.tsx
export type Stroke = WhiteboardElement;

export interface ToolConfig {
    type: ToolType;
    icon: string;
    label: string;
    shortcut?: string;
    group: 'draw' | 'shape' | 'extra';
}

export interface WhiteboardState {
    elements: WhiteboardElement[];
    tool: ToolType;
    color: string;
    brushSize: number;
    background: BackgroundType;
    isDrawing: boolean;
}

// History state for undo/redo
export interface HistoryState {
    past: WhiteboardElement[][];
    present: WhiteboardElement[];
    future: WhiteboardElement[][];
}

// Laser pointer state
export interface LaserPoint {
    point: Point;
    timestamp: number;
    participantId?: string;
}
