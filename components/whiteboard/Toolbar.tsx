// Toolbar Component - Glassmorphism tool palette
// Staff engineer architecture: Presentational component, receives all state via props

'use client';

import { memo } from 'react';
import {
    Pen,
    Highlighter,
    Eraser,
    Crosshair,
    Square,
    Circle,
    ArrowUpRight,
    Minus,
    StickyNote,
    Undo2,
    Redo2,
    Trash2,
    Grid3X3,
    X,
} from 'lucide-react';
import { ToolType, BackgroundType } from '@/lib/whiteboard/types';
import { COLORS, BRUSH_SIZES, TOOLS } from '@/lib/whiteboard/constants';

interface ToolbarProps {
    tool: ToolType;
    onToolChange: (tool: ToolType) => void;
    color: string;
    onColorChange: (color: string) => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    background: BackgroundType;
    onBackgroundChange: (bg: BackgroundType) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onClose: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Pen,
    Highlighter,
    Eraser,
    Crosshair,
    Square,
    Circle,
    ArrowUpRight,
    Minus,
    StickyNote,
};

const ToolButton = memo(function ToolButton({
    tool,
    currentTool,
    onSelect,
}: {
    tool: (typeof TOOLS)[number];
    currentTool: ToolType;
    onSelect: (tool: ToolType) => void;
}) {
    const Icon = ICON_MAP[tool.icon];
    const isActive = currentTool === tool.type;

    return (
        <button
            onClick={() => onSelect(tool.type)}
            className={`
        group relative p-2.5 rounded-xl transition-all duration-150
        ${isActive
                    ? 'bg-white/20 text-white shadow-lg scale-105'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }
      `}
            title={tool.label}
        >
            {Icon && <Icon size={18} />}
        </button>
    );
});

const Divider = () => (
    <div className="h-8 w-px bg-white/10 mx-1" />
);

export default memo(function Toolbar({
    tool,
    onToolChange,
    color,
    onColorChange,
    brushSize,
    onBrushSizeChange,
    background,
    onBackgroundChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClear,
    onClose,
}: ToolbarProps) {
    const drawTools = TOOLS.filter(t => t.group === 'draw');
    const shapeTools = TOOLS.filter(t => t.group === 'shape');
    const extraTools = TOOLS.filter(t => t.group === 'extra');

    return (
        <div className="
      flex-shrink-0 
      flex items-center justify-between 
      px-4 py-3
      bg-zinc-900/80 backdrop-blur-xl
      border-b border-white/10
      shadow-2xl
    ">
            {/* Left: Tools */}
            <div className="flex items-center gap-1">
                {/* Drawing Tools */}
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-white/5">
                    {drawTools.map(t => (
                        <ToolButton
                            key={t.type}
                            tool={t}
                            currentTool={tool}
                            onSelect={onToolChange}
                        />
                    ))}
                </div>

                <Divider />

                {/* Shape Tools */}
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-white/5">
                    {shapeTools.map(t => (
                        <ToolButton
                            key={t.type}
                            tool={t}
                            currentTool={tool}
                            onSelect={onToolChange}
                        />
                    ))}
                </div>

                <Divider />

                {/* Extra Tools */}
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-white/5">
                    {extraTools.map(t => (
                        <ToolButton
                            key={t.type}
                            tool={t}
                            currentTool={tool}
                            onSelect={onToolChange}
                        />
                    ))}
                </div>
            </div>

            {/* Center: Color & Size */}
            <div className="flex items-center gap-4">
                {/* Color Picker */}
                <div className="flex items-center gap-1.5">
                    {COLORS.slice(0, 6).map(c => (
                        <button
                            key={c}
                            onClick={() => onColorChange(c)}
                            className={`
                h-6 w-6 rounded-full border-2 transition-all duration-150
                hover:scale-110
                ${color === c
                                    ? 'border-white scale-110 shadow-lg'
                                    : 'border-transparent hover:border-white/50'
                                }
              `}
                            style={{ backgroundColor: c }}
                        />
                    ))}

                    {/* Custom color input */}
                    <div className="relative">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onColorChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
                        />
                        <div
                            className="h-6 w-6 rounded-full border-2 border-dashed border-white/30 hover:border-white/60 transition-colors"
                            style={{
                                background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`
                            }}
                        />
                    </div>
                </div>

                <Divider />

                {/* Brush Size */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-4 h-4 rounded-full bg-white/80 transition-all duration-150"
                        style={{
                            transform: `scale(${0.3 + (brushSize / BRUSH_SIZES.max) * 0.7})`,
                        }}
                    />
                    <input
                        type="range"
                        min={BRUSH_SIZES.min}
                        max={BRUSH_SIZES.max}
                        value={brushSize}
                        onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                        className="w-20 h-1.5 accent-white cursor-pointer"
                    />
                    <span className="text-xs text-white/50 font-mono w-5">{brushSize}</span>
                </div>

                <Divider />

                {/* Background Toggle */}
                <button
                    onClick={() => {
                        const next: BackgroundType[] = ['blank', 'grid', 'dots'];
                        onBackgroundChange(next[(next.indexOf(background) + 1) % 3]);
                    }}
                    className={`
            p-2 rounded-lg transition-colors
            ${background !== 'blank'
                            ? 'text-white bg-white/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }
          `}
                    title={`Background: ${background}`}
                >
                    <Grid3X3 size={18} />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                {/* Undo/Redo */}
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`
            p-2 rounded-lg transition-colors
            ${canUndo
                            ? 'text-white/80 hover:text-white hover:bg-white/10'
                            : 'text-white/20 cursor-not-allowed'
                        }
          `}
                    title="Undo"
                >
                    <Undo2 size={18} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`
            p-2 rounded-lg transition-colors
            ${canRedo
                            ? 'text-white/80 hover:text-white hover:bg-white/10'
                            : 'text-white/20 cursor-not-allowed'
                        }
          `}
                    title="Redo"
                >
                    <Redo2 size={18} />
                </button>

                <Divider />

                {/* Clear */}
                <button
                    onClick={onClear}
                    className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Clear Board"
                >
                    <Trash2 size={18} />
                </button>

                <Divider />

                {/* Close */}
                <button
                    onClick={onClose}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Close Whiteboard"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
});
