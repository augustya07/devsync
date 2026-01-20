// Canvas Component - Drawing surface with pointer events
// Staff engineer architecture: Handles all drawing logic, delegates rendering to pure functions

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Point, WhiteboardElement, ToolType, BackgroundType, LaserPoint } from '@/lib/whiteboard/types';
import { OPACITY, LASER, BACKGROUND } from '@/lib/whiteboard/constants';
import { generateId, shouldEraseElement } from '@/lib/whiteboard/utils';
import {
    drawStroke,
    drawRectangle,
    drawEllipse,
    drawArrow,
    drawLine,
    drawGridBackground,
    drawDotsBackground,
    drawLaserTrail,
} from '@/lib/whiteboard/shapes';

interface CanvasProps {
    elements: WhiteboardElement[];
    tool: ToolType;
    color: string;
    brushSize: number;
    opacity: number;
    background: BackgroundType;
    onAddElement: (element: WhiteboardElement) => void;
    onEraseElement: (id: string) => void;
    onAddStickyNote: (position: Point) => void;
    onLaserPoint?: (point: Point) => void;
    laserPoints?: LaserPoint[];
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function Canvas({
    elements,
    tool,
    color,
    brushSize,
    opacity,
    background,
    onAddElement,
    onEraseElement,
    onAddStickyNote,
    onLaserPoint,
    laserPoints = [],
    canvasRef,
    containerRef,
}: CanvasProps) {
    const [isDrawing, setIsDrawing] = useState(false);
    const currentPointsRef = useRef<Point[]>([]);
    const startPointRef = useRef<Point | null>(null);

    // Use refs for values that change during drawing to avoid stale closures
    const isDrawingRef = useRef(false);
    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);

    // Keep refs in sync
    useEffect(() => {
        toolRef.current = tool;
        colorRef.current = color;
        brushSizeRef.current = brushSize;
    }, [tool, color, brushSize]);

    // Get normalized point (0-1 coordinates)
    const getPoint = useCallback((e: React.PointerEvent): Point | null => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        };
    }, [canvasRef]);

    // Resize handler
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const resizeCanvas = () => {
            if (!containerRef.current || !canvasRef.current) return;
            const container = containerRef.current;
            const canvas = canvasRef.current;

            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }
        };

        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(containerRef.current);
        resizeCanvas();

        return () => resizeObserver.disconnect();
    }, [containerRef, canvasRef]);

    // Redraw function - called on every change
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        // Clear canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw background
        if (background === 'grid') {
            drawGridBackground(ctx, width, height, BACKGROUND.gridSize, BACKGROUND.gridColor);
        } else if (background === 'dots') {
            drawDotsBackground(ctx, width, height, BACKGROUND.gridSize, BACKGROUND.dotSize, BACKGROUND.dotColor);
        }

        // Draw all elements
        elements.forEach(element => {
            const style = {
                color: element.color,
                width: element.width,
                opacity: element.opacity,
            };

            if (element.type === 'stroke' && element.points) {
                drawStroke(ctx, element.points, width, height, style);
            } else if (element.type === 'shape' && element.startPoint && element.endPoint) {
                switch (element.tool) {
                    case 'rectangle':
                        drawRectangle(ctx, element.startPoint, element.endPoint, width, height, style);
                        break;
                    case 'ellipse':
                        drawEllipse(ctx, element.startPoint, element.endPoint, width, height, style);
                        break;
                    case 'arrow':
                        drawArrow(ctx, element.startPoint, element.endPoint, width, height, style);
                        break;
                    case 'line':
                        drawLine(ctx, element.startPoint, element.endPoint, width, height, style);
                        break;
                }
            }
        });

        // Draw current stroke in progress
        if (isDrawingRef.current && currentPointsRef.current.length > 0) {
            const currentTool = toolRef.current;
            const currentColor = colorRef.current;
            const currentBrushSize = brushSizeRef.current;

            const style = {
                color: currentColor,
                width: currentBrushSize,
                opacity: currentTool === 'highlighter' ? OPACITY.highlighter : OPACITY.pen,
            };

            if (['pen', 'highlighter'].includes(currentTool)) {
                drawStroke(ctx, currentPointsRef.current, width, height, style);
            } else if (startPointRef.current && currentPointsRef.current.length > 0) {
                const end = currentPointsRef.current[currentPointsRef.current.length - 1];
                switch (currentTool) {
                    case 'rectangle':
                        drawRectangle(ctx, startPointRef.current, end, width, height, style);
                        break;
                    case 'ellipse':
                        drawEllipse(ctx, startPointRef.current, end, width, height, style);
                        break;
                    case 'arrow':
                        drawArrow(ctx, startPointRef.current, end, width, height, style);
                        break;
                    case 'line':
                        drawLine(ctx, startPointRef.current, end, width, height, style);
                        break;
                }
            }
        }

        // Draw laser trail
        if (laserPoints.length > 0) {
            drawLaserTrail(ctx, laserPoints, width, height, LASER.color, LASER.fadeMs);
        }
    }, [elements, background, laserPoints, canvasRef]);

    // Redraw when elements or background change
    useEffect(() => {
        redraw();
    }, [redraw]);

    // Animation frame for smooth drawing
    const animationFrameRef = useRef<number | undefined>(undefined);

    const startAnimationLoop = useCallback(() => {
        const animate = () => {
            redraw();
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
    }, [redraw]);

    const stopAnimationLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }, []);

    // Pointer handlers
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = getPoint(e);
        if (!point) return;

        if (tool === 'eraser') {
            const elementToErase = elements.find(el => shouldEraseElement(point, el));
            if (elementToErase) {
                onEraseElement(elementToErase.id);
            }
            return;
        }

        if (tool === 'sticky') {
            onAddStickyNote(point);
            return;
        }

        if (tool === 'laser') {
            onLaserPoint?.(point);
            return;
        }

        if (tool === 'select') {
            return;
        }

        // Start drawing
        setIsDrawing(true);
        isDrawingRef.current = true;
        currentPointsRef.current = [point];
        startPointRef.current = point;
        startAnimationLoop();
    }, [tool, elements, getPoint, onEraseElement, onAddStickyNote, onLaserPoint, startAnimationLoop]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const point = getPoint(e);
        if (!point) return;

        if (tool === 'laser') {
            onLaserPoint?.(point);
            return;
        }

        if (!isDrawingRef.current) return;

        currentPointsRef.current.push(point);
    }, [tool, getPoint, onLaserPoint]);

    const handlePointerUp = useCallback(() => {
        if (!isDrawingRef.current) return;

        stopAnimationLoop();
        setIsDrawing(false);
        isDrawingRef.current = false;

        if (currentPointsRef.current.length < 2) {
            currentPointsRef.current = [];
            startPointRef.current = null;
            redraw();
            return;
        }

        const currentTool = toolRef.current;
        const currentColor = colorRef.current;
        const currentBrushSize = brushSizeRef.current;

        const newElement: WhiteboardElement = {
            id: generateId(),
            color: currentColor,
            width: currentBrushSize,
            opacity: currentTool === 'highlighter' ? OPACITY.highlighter : OPACITY.pen,
            type: ['pen', 'highlighter'].includes(currentTool) ? 'stroke' : 'shape',
            tool: currentTool,
            ...((['pen', 'highlighter'].includes(currentTool))
                ? { points: [...currentPointsRef.current] }
                : {
                    startPoint: startPointRef.current!,
                    endPoint: currentPointsRef.current[currentPointsRef.current.length - 1],
                }
            ),
        };

        onAddElement(newElement);
        currentPointsRef.current = [];
        startPointRef.current = null;
    }, [onAddElement, stopAnimationLoop, redraw]);

    // Cursor style based on tool
    const getCursor = () => {
        switch (tool) {
            case 'eraser':
                return 'pointer';
            case 'sticky':
                return 'cell';
            case 'select':
                return 'default';
            default:
                return 'crosshair';
        }
    };

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="absolute inset-0 w-full h-full block touch-none"
            style={{ cursor: getCursor() }}
        />
    );
}
