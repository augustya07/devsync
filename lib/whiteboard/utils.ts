// Whiteboard Utilities - Pure functions for whiteboard operations
// Staff engineer architecture: Testable pure functions, no side effects

import { Point, WhiteboardElement } from './types';

/**
 * Generate a unique ID for whiteboard elements
 */
export function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Check if a point is near a stroke (for eraser hit testing)
 * Uses normalized coordinates (0-1)
 */
export function isPointNearStroke(
    point: Point,
    element: WhiteboardElement,
    threshold: number = 0.02
): boolean {
    if (!element.points || element.points.length < 2) return false;

    for (let i = 1; i < element.points.length; i++) {
        const p1 = element.points[i - 1];
        const p2 = element.points[i];

        // Point-to-line-segment distance
        const dist = pointToSegmentDistance(point, p1, p2);
        if (dist < threshold) return true;
    }

    return false;
}

/**
 * Check if a point is near a shape element
 */
export function isPointNearShape(
    point: Point,
    element: WhiteboardElement,
    threshold: number = 0.02
): boolean {
    if (!element.startPoint || !element.endPoint) return false;

    const { startPoint, endPoint, tool } = element;

    switch (tool) {
        case 'rectangle':
            return isPointNearRectangle(point, startPoint, endPoint, threshold);
        case 'ellipse':
            return isPointNearEllipse(point, startPoint, endPoint, threshold);
        case 'line':
        case 'arrow':
            return pointToSegmentDistance(point, startPoint, endPoint) < threshold;
        default:
            return false;
    }
}

/**
 * Check if point is near rectangle edges
 */
function isPointNearRectangle(
    point: Point,
    start: Point,
    end: Point,
    threshold: number
): boolean {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Check all four edges
    const edges: [Point, Point][] = [
        [{ x: minX, y: minY }, { x: maxX, y: minY }], // Top
        [{ x: maxX, y: minY }, { x: maxX, y: maxY }], // Right
        [{ x: maxX, y: maxY }, { x: minX, y: maxY }], // Bottom
        [{ x: minX, y: maxY }, { x: minX, y: minY }], // Left
    ];

    return edges.some(([p1, p2]) => pointToSegmentDistance(point, p1, p2) < threshold);
}

/**
 * Check if point is near ellipse edge
 */
function isPointNearEllipse(
    point: Point,
    start: Point,
    end: Point,
    threshold: number
): boolean {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;

    if (radiusX === 0 || radiusY === 0) return false;

    // Normalized distance from center
    const normalizedDist = Math.pow((point.x - centerX) / radiusX, 2) +
        Math.pow((point.y - centerY) / radiusY, 2);

    // Check if near the edge (normalized distance ≈ 1)
    return Math.abs(normalizedDist - 1) < threshold * 10;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function pointToSegmentDistance(p: Point, v: Point, w: Point): number {
    const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
    if (l2 === 0) return distance(p, v);

    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projection = {
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y)
    };

    return distance(p, projection);
}

/**
 * Check if an element should be erased based on click point
 */
export function shouldEraseElement(
    point: Point,
    element: WhiteboardElement,
    threshold: number = 0.02
): boolean {
    if (element.type === 'stroke') {
        return isPointNearStroke(point, element, threshold);
    } else if (element.type === 'shape') {
        return isPointNearShape(point, element, threshold);
    } else if (element.type === 'sticky') {
        return isPointInStickyNote(point, element);
    }
    return false;
}

/**
 * Check if point is inside a sticky note
 */
function isPointInStickyNote(point: Point, element: WhiteboardElement): boolean {
    if (!element.position || !element.size) return false;

    return (
        point.x >= element.position.x &&
        point.x <= element.position.x + element.size.w &&
        point.y >= element.position.y &&
        point.y <= element.position.y + element.size.h
    );
}

/**
 * Export canvas to PNG data URL
 */
export function exportCanvasToPng(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
}

/**
 * Download canvas as PNG file
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string = 'whiteboard'): void {
    const dataUrl = exportCanvasToPng(canvas);
    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.click();
}

/**
 * Simplify stroke path using Ramer-Douglas-Peucker algorithm
 * Reduces points while maintaining visual quality
 */
export function simplifyPath(points: Point[], tolerance: number = 0.001): Point[] {
    if (points.length <= 2) return points;

    // Find the point with maximum distance from the line between first and last
    let maxDist = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const dist = pointToSegmentDistance(points[i], start, end);
        if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
        }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
        const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
        const right = simplifyPath(points.slice(maxIndex), tolerance);
        return [...left.slice(0, -1), ...right];
    }

    return [start, end];
}

/**
 * Smooth path using Catmull-Rom spline interpolation
 */
export function smoothPath(points: Point[], tension: number = 0.5): Point[] {
    if (points.length < 3) return points;

    const result: Point[] = [points[0]];

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[Math.min(points.length - 1, i + 1)];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        // Add intermediate points using Catmull-Rom
        for (let t = 0.2; t < 1; t += 0.2) {
            const t2 = t * t;
            const t3 = t2 * t;

            const x = 0.5 * (
                2 * p1.x +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            );

            const y = 0.5 * (
                2 * p1.y +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            );

            result.push({ x, y });
        }
    }

    result.push(points[points.length - 1]);
    return result;
}
