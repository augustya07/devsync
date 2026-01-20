// Shape Rendering Functions - Pure drawing functions for canvas shapes
// Staff engineer architecture: Stateless, testable rendering logic

import { Point, DrawStyle } from './types';

/**
 * Draw a rectangle on canvas
 */
export function drawRectangle(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    width: number,
    height: number,
    style: DrawStyle
): void {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const x = start.x * width;
    const y = start.y * height;
    const w = (end.x - start.x) * width;
    const h = (end.y - start.y) * height;

    ctx.beginPath();
    ctx.strokeRect(x, y, w, h);
    ctx.globalAlpha = 1;
}

/**
 * Draw an ellipse on canvas
 */
export function drawEllipse(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    width: number,
    height: number,
    style: DrawStyle
): void {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const centerX = ((start.x + end.x) / 2) * width;
    const centerY = ((start.y + end.y) / 2) * height;
    const radiusX = (Math.abs(end.x - start.x) / 2) * width;
    const radiusY = (Math.abs(end.y - start.y) / 2) * height;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw a line on canvas
 */
export function drawLine(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    width: number,
    height: number,
    style: DrawStyle
): void {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw an arrow on canvas
 */
export function drawArrow(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    width: number,
    height: number,
    style: DrawStyle
): void {
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const x1 = start.x * width;
    const y1 = start.y * height;
    const x2 = end.x * width;
    const y2 = end.y * height;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw arrowhead
    const headLength = Math.min(20, style.width * 5);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}

/**
 * Draw a freehand stroke on canvas
 */
export function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    width: number,
    height: number,
    style: DrawStyle
): void {
    if (points.length < 2) return;

    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x * width, points[0].y * height);

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * width, points[i].y * height);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw grid background
 */
export function drawGridBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    gridSize: number = 20,
    color: string = 'rgba(255, 255, 255, 0.1)'
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;

    ctx.beginPath();

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();
}

/**
 * Draw dots background
 */
export function drawDotsBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    spacing: number = 20,
    dotSize: number = 2,
    color: string = 'rgba(255, 255, 255, 0.15)'
): void {
    ctx.fillStyle = color;

    for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

/**
 * Draw laser pointer trail
 */
export function drawLaserTrail(
    ctx: CanvasRenderingContext2D,
    points: Array<{ point: Point; timestamp: number }>,
    width: number,
    height: number,
    color: string = '#ef4444',
    maxAge: number = 2000
): void {
    const now = Date.now();

    points.forEach((p, index) => {
        const age = now - p.timestamp;
        if (age > maxAge) return;

        const opacity = 1 - age / maxAge;
        const size = 6 * opacity + 2;

        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(p.point.x * width, p.point.y * height, size, 0, 2 * Math.PI);
        ctx.fill();

        // Draw connecting line to next point
        if (index < points.length - 1) {
            const nextP = points[index + 1];
            ctx.strokeStyle = color;
            ctx.lineWidth = 3 * opacity;
            ctx.beginPath();
            ctx.moveTo(p.point.x * width, p.point.y * height);
            ctx.lineTo(nextP.point.x * width, nextP.point.y * height);
            ctx.stroke();
        }
    });

    ctx.globalAlpha = 1;
}
