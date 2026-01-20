// Whiteboard Constants - Single source of truth for defaults
// Staff engineer architecture: All magic numbers and defaults centralized

import { ToolConfig } from './types';

// Color palette - Curated, harmonious colors
export const COLORS = [
    '#3b82f6', // Blue (default)
    '#ef4444', // Red
    '#22c55e', // Green
    '#eab308', // Yellow
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ffffff', // White
    '#000000', // Black
] as const;

// Sticky note colors
export const STICKY_COLORS = [
    '#fef08a', // Yellow
    '#bbf7d0', // Green
    '#bfdbfe', // Blue
    '#fecaca', // Red
    '#e9d5ff', // Purple
    '#fed7aa', // Orange
] as const;

// Brush sizes
export const BRUSH_SIZES = {
    min: 1,
    max: 20,
    default: 3,
    highlighter: 20,
} as const;

// Opacity values
export const OPACITY = {
    pen: 1,
    highlighter: 0.4,
    laser: 0.8,
} as const;

// Tool configurations with icons and shortcuts
export const TOOLS: ToolConfig[] = [
    { type: 'pen', icon: 'Pen', label: 'Pen', shortcut: 'P', group: 'draw' },
    { type: 'highlighter', icon: 'Highlighter', label: 'Highlighter', shortcut: 'H', group: 'draw' },
    { type: 'eraser', icon: 'Eraser', label: 'Eraser', shortcut: 'E', group: 'draw' },
    { type: 'laser', icon: 'Crosshair', label: 'Laser', shortcut: 'L', group: 'draw' },
    { type: 'rectangle', icon: 'Square', label: 'Rectangle', shortcut: 'R', group: 'shape' },
    { type: 'ellipse', icon: 'Circle', label: 'Ellipse', shortcut: 'O', group: 'shape' },
    { type: 'arrow', icon: 'ArrowUpRight', label: 'Arrow', shortcut: 'A', group: 'shape' },
    { type: 'line', icon: 'Minus', label: 'Line', shortcut: 'I', group: 'shape' },
    { type: 'sticky', icon: 'StickyNote', label: 'Sticky Note', shortcut: 'S', group: 'extra' },
] as const;

// Laser pointer configuration
export const LASER = {
    fadeMs: 2000,      // How long laser points last
    maxPoints: 50,     // Max trail length
    color: '#ef4444',  // Laser color (red)
    width: 4,          // Laser width
} as const;

// Background grid configuration  
export const BACKGROUND = {
    gridSize: 20,
    dotSize: 2,
    gridColor: 'rgba(255, 255, 255, 0.1)',
    dotColor: 'rgba(255, 255, 255, 0.15)',
} as const;

// Animation durations
export const ANIMATION = {
    toolSwitch: 150,
    hoverScale: 1.05,
    activeScale: 0.95,
} as const;

// Sticky note defaults
export const STICKY = {
    defaultWidth: 200,
    defaultHeight: 150,
    minWidth: 100,
    minHeight: 80,
    maxWidth: 400,
    maxHeight: 300,
} as const;

// History configuration
export const HISTORY = {
    maxSize: 50,
} as const;
