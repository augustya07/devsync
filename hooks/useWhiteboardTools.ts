// useWhiteboardTools - Tool state management
// Staff engineer architecture: Single hook for all tool-related state

import { useCallback, useEffect, useState } from 'react';
import { ToolType, BackgroundType } from '@/lib/whiteboard/types';
import { COLORS, BRUSH_SIZES, OPACITY } from '@/lib/whiteboard/constants';

interface UseWhiteboardToolsReturn {
    tool: ToolType;
    setTool: (tool: ToolType) => void;
    color: string;
    setColor: (color: string) => void;
    brushSize: number;
    setBrushSize: (size: number) => void;
    opacity: number;
    background: BackgroundType;
    setBackground: (bg: BackgroundType) => void;
    // Derived state
    isDrawingTool: boolean;
    isShapeTool: boolean;
}

export function useWhiteboardTools(): UseWhiteboardToolsReturn {
    const [tool, setToolState] = useState<ToolType>('pen');
    const [color, setColor] = useState<string>(COLORS[0]);
    const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES.default);
    const [background, setBackground] = useState<BackgroundType>('blank');

    // Compute opacity based on tool
    const opacity = tool === 'highlighter' ? OPACITY.highlighter : OPACITY.pen;

    // Computed derived state
    const isDrawingTool = ['pen', 'highlighter', 'eraser', 'laser'].includes(tool);
    const isShapeTool = ['rectangle', 'ellipse', 'arrow', 'line'].includes(tool);

    // Tool setter with side effects (e.g., adjust brush size for highlighter)
    const setTool = useCallback((newTool: ToolType) => {
        setToolState(prev => {
            // Auto-adjust brush size when switching to/from highlighter
            if (newTool === 'highlighter' && prev !== 'highlighter') {
                setBrushSize(BRUSH_SIZES.highlighter);
            } else if (newTool !== 'highlighter' && prev === 'highlighter') {
                setBrushSize(BRUSH_SIZES.default);
            }
            return newTool;
        });
    }, []);

    return {
        tool,
        setTool,
        color,
        setColor,
        brushSize,
        setBrushSize,
        opacity,
        background,
        setBackground,
        isDrawingTool,
        isShapeTool,
    };
}
